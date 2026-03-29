import { NextRequest, NextResponse } from "next/server";

import {
  createGuestUser,
  getCurrentUser,
  getRequestMeta,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return NextResponse.json({
      ok: true,
      user: currentUser,
      redirectTo: "/home",
    });
  }

  const { user, session } = await createGuestUser(getRequestMeta(request));
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      kind: user.kind,
      displayName: user.profile?.nickname || user.displayName,
    },
    redirectTo: "/home",
  });

  setSessionCookie(response, session.token, session.expiresAt);

  return response;
}
