import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  clearOauthStateCookie,
  createSessionForUser,
  ensureUserForIdentity,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
} from "@/lib/auth";
import {
  authConfigKeys,
  getMissingEnv,
  oauthStateCookieNames,
} from "@/lib/auth-config";

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("authError", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const missingKeys = getMissingEnv(authConfigKeys.wechat);

  if (missingKeys.length) {
    return redirectWithError(request, `wechat_config:${missingKeys.join(",")}`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(oauthStateCookieNames.wechat)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithError(request, "wechat_state_invalid");
  }

  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.search = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID!,
    secret: process.env.WECHAT_APP_SECRET!,
    code,
    grant_type: "authorization_code",
  }).toString();

  const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
  const tokenResult = (await tokenResponse.json()) as {
    access_token?: string;
    openid?: string;
    unionid?: string;
    errcode?: number;
  };

  if (!tokenResponse.ok || tokenResult.errcode || !tokenResult.access_token || !tokenResult.openid) {
    return redirectWithError(request, "wechat_token_exchange_failed");
  }

  const userInfoUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
  userInfoUrl.search = new URLSearchParams({
    access_token: tokenResult.access_token,
    openid: tokenResult.openid,
    lang: "zh_CN",
  }).toString();

  const userInfoResponse = await fetch(userInfoUrl, { cache: "no-store" });
  const userInfo = (await userInfoResponse.json()) as {
    nickname?: string;
    headimgurl?: string;
    unionid?: string;
    openid?: string;
    errcode?: number;
  };

  if (!userInfoResponse.ok || userInfo.errcode) {
    return redirectWithError(request, "wechat_userinfo_failed");
  }

  const user = await ensureUserForIdentity({
    provider: "WECHAT",
    providerUserId: userInfo.openid ?? tokenResult.openid,
    providerUnionId: userInfo.unionid ?? tokenResult.unionid ?? null,
    displayName: userInfo.nickname ?? "微信用户",
    avatarUrl: userInfo.headimgurl ?? null,
    existingGuestUserId: await getGuestUpgradeUserId(),
  });

  const session = await createSessionForUser(user.id, getRequestMeta(request));
  const response = NextResponse.redirect(new URL("/home", request.url));

  clearOauthStateCookie(response, "wechat");
  setSessionCookie(response, session.token, session.expiresAt);

  return response;
}
