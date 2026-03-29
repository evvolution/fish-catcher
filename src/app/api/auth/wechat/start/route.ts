import { NextResponse } from "next/server";

import {
  buildProviderConfigMessage,
  createOAuthState,
  setOauthStateCookie,
} from "@/lib/auth";
import {
  authConfigKeys,
  getMissingEnv,
  getWechatRedirectUri,
} from "@/lib/auth-config";

export async function POST() {
  const missingKeys = getMissingEnv(authConfigKeys.wechat);

  if (missingKeys.length) {
    return NextResponse.json(
      {
        ok: false,
        message: buildProviderConfigMessage("微信登录", [...missingKeys]),
        missingKeys,
      },
      { status: 400 },
    );
  }

  const state = createOAuthState();
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID!,
    redirect_uri: getWechatRedirectUri(),
    response_type: "code",
    scope: process.env.WECHAT_OAUTH_SCOPE ?? "snsapi_userinfo",
    state,
  });

  const response = NextResponse.json({
    ok: true,
    authorizeUrl: `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`,
  });

  setOauthStateCookie(response, "wechat", state);

  return response;
}
