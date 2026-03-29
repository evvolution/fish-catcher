import { NextResponse } from "next/server";

import { clearSessionCookie, revokeSessionByCookie } from "@/lib/auth";

export async function POST() {
  await revokeSessionByCookie();

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}
