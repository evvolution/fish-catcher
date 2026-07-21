import { getPhoneCodeTtlMs, getSmsProvider } from "~~/src/lib/auth-config";
import {
  createVerificationCode,
  hashValue,
  normalizePhoneNumber,
} from "~~/src/lib/auth/core";
import { ensureUserForIdentity } from "~~/src/lib/auth/identity";
import { prisma } from "~~/src/lib/prisma";

export async function issuePhoneCode(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!/^\+?\d{6,20}$/.test(normalizedPhone)) throw new Error("手机号格式不正确。");
  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + getPhoneCodeTtlMs());
  await prisma.$transaction(async (tx) => {
    await tx.phoneVerificationCode.updateMany({
      where: { target: normalizedPhone, scene: "SIGN_IN", consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await tx.phoneVerificationCode.create({
      data: { scene: "SIGN_IN", target: normalizedPhone, codeHash: hashValue(code), expiresAt },
    });
  });
  return { phone: normalizedPhone, expiresAt, ...await sendVerificationCode(normalizedPhone, code) };
}

async function sendVerificationCode(phone: string, code: string) {
  const provider = getSmsProvider();
  if (provider === "mock") return { provider: "mock", debugCode: code };
  if (provider === "webhook") {
    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("短信 webhook 未配置，请先设置 SMS_WEBHOOK_URL。");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        phone,
        code,
        scene: "SIGN_IN",
        signName: process.env.SMS_SIGN_NAME ?? null,
        templateCode: process.env.SMS_TEMPLATE_CODE ?? null,
      }),
    });
    if (!response.ok) throw new Error("短信服务调用失败，请检查 SMS_WEBHOOK_URL 或服务端实现。");
    return { provider: "webhook", debugCode: null };
  }
  throw new Error("当前短信提供方未实现。请将 SMS_PROVIDER 设为 mock 或 webhook。");
}

export async function verifyPhoneCodeAndGetUser(params: {
  phone: string;
  code: string;
  existingGuestUserId?: string | null;
}) {
  const normalizedPhone = normalizePhoneNumber(params.phone);
  const normalizedCode = params.code.trim();
  if (!/^\+?\d{6,20}$/.test(normalizedPhone)) throw new Error("手机号格式不正确。");
  if (!/^\d{6}$/.test(normalizedCode)) throw new Error("验证码格式不正确。");
  const record = await prisma.phoneVerificationCode.findFirst({
    where: {
      target: normalizedPhone,
      scene: "SIGN_IN",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { sentAt: "desc" },
  });
  if (!record) throw new Error("验证码不存在或已过期。");
  if (record.codeHash !== hashValue(normalizedCode)) {
    await prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("验证码不正确。");
  }
  await prisma.phoneVerificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date(), attempts: { increment: 1 } },
  });
  return ensureUserForIdentity({
    provider: "PHONE",
    providerUserId: normalizedPhone,
    phone: normalizedPhone,
    displayName: maskPhone(normalizedPhone),
    existingGuestUserId: params.existingGuestUserId,
  });
}

function maskPhone(phone: string) {
  return phone.length < 7 ? phone : `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
