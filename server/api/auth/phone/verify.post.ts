import {
  createSessionForUser,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
  verifyPhoneCodeAndGetUser,
} from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ phone?: unknown; code?: unknown }>(event) ?? {};
    const user = await verifyPhoneCodeAndGetUser({
      phone: String(body.phone ?? ""),
      code: String(body.code ?? ""),
      existingGuestUserId: await getGuestUpgradeUserId(event),
    });
    const session = await createSessionForUser(user.id, getRequestMeta(event));
    setSessionCookie(event, session.token, session.expiresAt);
    return { ok: true, redirectTo: "/" };
  } catch (error) {
    setResponseStatus(event, 400);
    return { ok: false, message: error instanceof Error ? error.message : "手机号登录失败。" };
  }
});
