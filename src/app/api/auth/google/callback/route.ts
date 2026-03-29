import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  clearOauthStateCookie,
  createSessionForUser,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
  ensureUserForIdentity,
} from "@/lib/auth";
import {
  authConfigKeys,
  getGoogleRedirectUri,
  getMissingEnv,
  oauthStateCookieNames,
} from "@/lib/auth-config";

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("authError", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const missingKeys = getMissingEnv(authConfigKeys.google);

  if (missingKeys.length) {
    return redirectWithError(request, `google_config:${missingKeys.join(",")}`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(oauthStateCookieNames.google)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithError(request, "google_state_invalid");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return redirectWithError(request, "google_token_exchange_failed");
  }

  const tokenResult = (await tokenResponse.json()) as {
    access_token?: string;
  };

  if (!tokenResult.access_token) {
    return redirectWithError(request, "google_access_token_missing");
  }

  const userInfoResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenResult.access_token}`,
      },
      cache: "no-store",
    },
  );

  if (!userInfoResponse.ok) {
    return redirectWithError(request, "google_userinfo_failed");
  }

  const userInfo = (await userInfoResponse.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  const user = await ensureUserForIdentity({
    provider: "GOOGLE",
    providerUserId: userInfo.sub,
    email: userInfo.email ?? null,
    displayName: userInfo.name ?? "Google 用户",
    avatarUrl: userInfo.picture ?? null,
    existingGuestUserId: await getGuestUpgradeUserId(),
  });

  const session = await createSessionForUser(user.id, getRequestMeta(request));
  const response = NextResponse.redirect(new URL("/home", request.url));

  clearOauthStateCookie(response, "google");
  setSessionCookie(response, session.token, session.expiresAt);

  return response;
}
