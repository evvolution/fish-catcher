import { getCookie } from "h3";

import {
  clearOauthStateCookie,
  createSessionForUser,
  ensureUserForIdentity,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
} from "~~/src/lib/auth";
import { authConfigKeys, getMissingEnv, oauthStateCookieNames } from "~~/src/lib/auth-config";

function errorUrl(event: Parameters<typeof getRequestURL>[0], error: string) {
  const url = new URL("/", getRequestURL(event));
  url.searchParams.set("authError", error);
  return url.toString();
}

export default defineEventHandler(async (event) => {
  const missingKeys = getMissingEnv(authConfigKeys.wechat);
  if (missingKeys.length) return sendRedirect(event, errorUrl(event, `wechat_config:${missingKeys.join(",")}`), 302);
  const query = getQuery(event);
  const code = typeof query.code === "string" ? query.code : null;
  const state = typeof query.state === "string" ? query.state : null;
  const stateCookie = getCookie(event, oauthStateCookieNames.wechat);
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return sendRedirect(event, errorUrl(event, "wechat_state_invalid"), 302);
  }
  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.search = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID!,
    secret: process.env.WECHAT_APP_SECRET!,
    code,
    grant_type: "authorization_code",
  }).toString();
  const tokenResponse = await fetch(tokenUrl);
  const tokenResult = await tokenResponse.json() as {
    access_token?: string; openid?: string; unionid?: string; errcode?: number;
  };
  if (!tokenResponse.ok || tokenResult.errcode || !tokenResult.access_token || !tokenResult.openid) {
    return sendRedirect(event, errorUrl(event, "wechat_token_exchange_failed"), 302);
  }
  const userInfoUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
  userInfoUrl.search = new URLSearchParams({
    access_token: tokenResult.access_token,
    openid: tokenResult.openid,
    lang: "zh_CN",
  }).toString();
  const userInfoResponse = await fetch(userInfoUrl);
  const userInfo = await userInfoResponse.json() as {
    nickname?: string; headimgurl?: string; unionid?: string; openid?: string; errcode?: number;
  };
  if (!userInfoResponse.ok || userInfo.errcode) return sendRedirect(event, errorUrl(event, "wechat_userinfo_failed"), 302);
  const user = await ensureUserForIdentity({
    provider: "WECHAT",
    providerUserId: userInfo.openid ?? tokenResult.openid,
    providerUnionId: userInfo.unionid ?? tokenResult.unionid ?? null,
    displayName: userInfo.nickname ?? "微信用户",
    avatarUrl: userInfo.headimgurl ?? null,
    existingGuestUserId: await getGuestUpgradeUserId(event),
  });
  const session = await createSessionForUser(user.id, getRequestMeta(event));
  clearOauthStateCookie(event, "wechat");
  setSessionCookie(event, session.token, session.expiresAt);
  return sendRedirect(event, "/", 302);
});
