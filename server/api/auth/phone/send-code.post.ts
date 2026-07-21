import { issuePhoneCode } from "~~/src/lib/auth";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ phone?: unknown }>(event) ?? {};
    const result = await issuePhoneCode(String(body.phone ?? ""));
    return {
      ok: true,
      provider: result.provider,
      expiresAt: result.expiresAt,
      ...(result.debugCode ? { debugCode: result.debugCode } : {}),
    };
  } catch (error) {
    setResponseStatus(event, 400);
    return { ok: false, message: error instanceof Error ? error.message : "验证码发送失败。" };
  }
});
