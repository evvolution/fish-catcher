import { NextRequest, NextResponse } from "next/server";

import { issuePhoneCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await issuePhoneCode(String(body.phone ?? ""));

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      expiresAt: result.expiresAt,
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "验证码发送失败。",
      },
      { status: 400 },
    );
  }
}
