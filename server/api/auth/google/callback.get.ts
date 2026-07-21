import { getCookie } from "h3";

import {
  clearOauthStateCookie,
  createSessionForUser,
  ensureUserForIdentity,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
} from "~~/src/lib/auth";
import {
  authConfigKeys,
  getGoogleRedirectUri,
  getMissingEnv,
  oauthStateCookieNames,
} from "~~/src/lib/auth-config";

function errorUrl(event: Parameters<typeof getRequestURL>[0], error: string) {
  const url = new URL("/", getRequestURL(event));
  url.searchParams.set("authError", error);
  return url.toString();
}

export default defineEventHandler(async (event) => {
  const missingKeys = getMissingEnv(authConfigKeys.google);
  if (missingKeys.length) return sendRedirect(event, errorUrl(event, `google_config:${missingKeys.join(",")}`), 302);
  const query = getQuery(event);
  const code = typeof query.code === "string" ? query.code : null;
  const state = typeof query.state === "string" ? query.state : null;
  const stateCookie = getCookie(event, oauthStateCookieNames.google);
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return sendRedirect(event, errorUrl(event, "google_state_invalid"), 302);
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return sendRedirect(event, errorUrl(event, "google_token_exchange_failed"), 302);
  const tokenResult = await tokenResponse.json() as { access_token?: string };
  if (!tokenResult.access_token) return sendRedirect(event, errorUrl(event, "google_access_token_missing"), 302);
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenResult.access_token}` },
  });
  if (!userInfoResponse.ok) return sendRedirect(event, errorUrl(event, "google_userinfo_failed"), 302);
  const userInfo = await userInfoResponse.json() as { sub: string; email?: string; name?: string; picture?: string };
  const user = await ensureUserForIdentity({
    provider: "GOOGLE",
    providerUserId: userInfo.sub,
    email: userInfo.email ?? null,
    displayName: userInfo.name ?? "Google 用户",
    avatarUrl: userInfo.picture ?? null,
    existingGuestUserId: await getGuestUpgradeUserId(event),
  });
  const session = await createSessionForUser(user.id, getRequestMeta(event));
  clearOauthStateCookie(event, "google");
  setSessionCookie(event, session.token, session.expiresAt);
  return sendRedirect(event, "/", 302);
});
