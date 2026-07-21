import {
  buildProviderConfigMessage,
  createOAuthState,
  setOauthStateCookie,
} from "~~/src/lib/auth";
import { authConfigKeys, getMissingEnv, getWechatRedirectUri } from "~~/src/lib/auth-config";

export default defineEventHandler((event) => {
  const missingKeys = getMissingEnv(authConfigKeys.wechat);
  if (missingKeys.length) {
    setResponseStatus(event, 400);
    return {
      ok: false,
      message: buildProviderConfigMessage("微信登录", [...missingKeys]),
      missingKeys,
    };
  }
  const state = createOAuthState();
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID!,
    redirect_uri: getWechatRedirectUri(),
    response_type: "code",
    scope: process.env.WECHAT_OAUTH_SCOPE ?? "snsapi_userinfo",
    state,
  });
  setOauthStateCookie(event, "wechat", state);
  return {
    ok: true,
    authorizeUrl: `https://open.weixin.qq.com/connect/oauth2/authorize?${params}#wechat_redirect`,
  };
});
