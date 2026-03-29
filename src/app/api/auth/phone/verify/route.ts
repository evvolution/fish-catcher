import { NextRequest, NextResponse } from "next/server";

import {
  createSessionForUser,
  getGuestUpgradeUserId,
  getRequestMeta,
  setSessionCookie,
  verifyPhoneCodeAndGetUser,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await verifyPhoneCodeAndGetUser({
      phone: String(body.phone ?? ""),
      code: String(body.code ?? ""),
      existingGuestUserId: await getGuestUpgradeUserId(),
    });

    const session = await createSessionForUser(user.id, getRequestMeta(request));
    const response = NextResponse.json({
      ok: true,
      redirectTo: "/home",
    });

    setSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "手机号登录失败。",
      },
      { status: 400 },
    );
  }
}
