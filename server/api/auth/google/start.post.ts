import {
  buildProviderConfigMessage,
  createOAuthState,
  setOauthStateCookie,
} from "~~/src/lib/auth";
import { authConfigKeys, getGoogleRedirectUri, getMissingEnv } from "~~/src/lib/auth-config";

export default defineEventHandler((event) => {
  const missingKeys = getMissingEnv(authConfigKeys.google);
  if (missingKeys.length) {
    setResponseStatus(event, 400);
    return {
      ok: false,
      message: buildProviderConfigMessage("Google 登录", [...missingKeys]),
      missingKeys,
    };
  }
  const state = createOAuthState();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  setOauthStateCookie(event, "google", state);
  return { ok: true, authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
});
