import {
  createGuestUser,
  getCurrentUser,
  getRequestMeta,
  setSessionCookie,
} from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  const currentUser = await getCurrentUser(event);
  if (currentUser) return { ok: true, user: currentUser, redirectTo: "/" };

  const { user, session } = await createGuestUser(getRequestMeta(event));
  setSessionCookie(event, session.token, session.expiresAt);
  return {
    ok: true,
    user: {
      id: user.id,
      kind: user.kind,
      displayName: user.profile?.nickname || user.displayName,
    },
    redirectTo: "/",
  };
});
