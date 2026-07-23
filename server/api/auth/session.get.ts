import { getCurrentUser } from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { ok: false, user: null };
  }
  return { ok: true, user };
});
