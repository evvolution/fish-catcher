const DEFAULT_SESSION_DAYS = 30;
const DEFAULT_PHONE_CODE_TTL_MINUTES = 5;

export const sessionCookieName = "moyu_session";

export const oauthStateCookieNames = {
  google: "moyu_google_state",
  wechat: "moyu_wechat_state",
} as const;

export const authConfigKeys = {
  app: ["NEXT_PUBLIC_APP_URL"] as const,
  google: ["NEXT_PUBLIC_APP_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const,
  wechat: ["NEXT_PUBLIC_APP_URL", "WECHAT_APP_ID", "WECHAT_APP_SECRET"] as const,
  smsWebhook: ["SMS_WEBHOOK_URL"] as const,
} as const;

export function getSessionDurationMs() {
  const days = Number(process.env.AUTH_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  return days * 24 * 60 * 60 * 1000;
}

export function getPhoneCodeTtlMs() {
  const minutes = Number(
    process.env.PHONE_CODE_TTL_MINUTES ?? DEFAULT_PHONE_CODE_TTL_MINUTES,
  );

  return minutes * 60 * 1000;
}

export function getSmsProvider() {
  return process.env.SMS_PROVIDER ?? "mock";
}

export function getBaseAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export function getGoogleRedirectUri() {
  return `${getBaseAppUrl()}/api/auth/google/callback`;
}

export function getWechatRedirectUri() {
  return `${getBaseAppUrl()}/api/auth/wechat/callback`;
}

export function getMissingEnv(keys: readonly string[]) {
  return keys.filter((key) => !process.env[key]);
}
