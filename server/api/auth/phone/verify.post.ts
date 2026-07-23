import {
  createSessionForUser,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
  verifyPhoneCodeAndGetUser,
} from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ phone?: unknown; code?: unknown; platform?: unknown }>(event) ?? {};
    const user = await verifyPhoneCodeAndGetUser({
      phone: String(body.phone ?? ""),
      code: String(body.code ?? ""),
      existingGuestUserId: await getGuestUpgradeUserId(event),
    });
    const platform = typeof body.platform === "string" && /^[a-z\d-]{1,32}$/i.test(body.platform)
      ? body.platform.toLowerCase() : "h5";
    const session = await createSessionForUser(user.id, getRequestMeta(event), platform);
    setSessionCookie(event, session.token, session.expiresAt);
    return {
      ok: true,
      session: { token: session.token, expiresAt: session.expiresAt },
      redirectTo: "/",
    };
  } catch (error) {
    setResponseStatus(event, 400);
    return { ok: false, message: error instanceof Error ? error.message : "手机号登录失败。" };
  }
});
