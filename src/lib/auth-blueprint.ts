export const authProviders = [
  {
    key: "wechat",
    label: "微信登录",
    entity: "AuthIdentity",
    summary: "用 openid / unionid 识别账号",
  },
  {
    key: "google",
    label: "Google 登录",
    entity: "AuthIdentity",
    summary: "用 Google sub 建立唯一身份",
  },
  {
    key: "phone",
    label: "手机号登录",
    entity: "PhoneVerificationCode",
    summary: "验证码通过后自动登录或注册",
  },
] as const;

export const authFlow = [
  "选择登录方式",
  "校验身份",
  "不存在则自动注册",
  "建立会话进入首页",
] as const;

export const authEntities = [
  {
    name: "User",
    fields: ["id", "kind", "role", "status", "displayName", "avatarUrl"],
  },
  {
    name: "UserProfile",
    fields: ["nickname", "bio", "city", "preferences"],
  },
  {
    name: "AuthIdentity",
    fields: ["provider", "providerUserId", "isPrimary", "lastUsedAt"],
  },
  {
    name: "UserSession",
    fields: ["sessionToken", "platform", "expiresAt"],
  },
] as const;
