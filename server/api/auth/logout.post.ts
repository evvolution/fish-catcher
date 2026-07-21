import { clearSessionCookie, revokeSessionByCookie } from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  await revokeSessionByCookie(event);
  clearSessionCookie(event);
  return { ok: true };
});
