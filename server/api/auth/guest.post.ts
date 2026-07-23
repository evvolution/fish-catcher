import {
  createGuestUser,
  getCurrentUser,
  getRequestMeta,
  setSessionCookie,
} from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  const currentUser = await getCurrentUser(event);
  if (currentUser) return { ok: true, user: currentUser, redirectTo: "/" };

  const body = await readBody<{ platform?: unknown }>(event) ?? {};
  const platform = typeof body.platform === "string" && /^[a-z\d-]{1,32}$/i.test(body.platform)
    ? body.platform.toLowerCase() : "h5";
  const { user, session } = await createGuestUser(getRequestMeta(event), platform);
  setSessionCookie(event, session.token, session.expiresAt);
  return {
    ok: true,
    user: {
      id: user.id,
      kind: user.kind,
      displayName: user.profile?.nickname || user.displayName,
    },
    session: { token: session.token, expiresAt: session.expiresAt },
    redirectTo: "/",
  };
});
