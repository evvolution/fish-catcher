import { NextResponse } from "next/server";

import {
  buildProviderConfigMessage,
  createOAuthState,
  setOauthStateCookie,
} from "@/lib/auth";
import {
  authConfigKeys,
  getGoogleRedirectUri,
  getMissingEnv,
} from "@/lib/auth-config";

export async function POST() {
  const missingKeys = getMissingEnv(authConfigKeys.google);

  if (missingKeys.length) {
    return NextResponse.json(
      {
        ok: false,
        message: buildProviderConfigMessage("Google 登录", [...missingKeys]),
        missingKeys,
      },
      { status: 400 },
    );
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

  const response = NextResponse.json({
    ok: true,
    authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });

  setOauthStateCookie(response, "google", state);

  return response;
}
