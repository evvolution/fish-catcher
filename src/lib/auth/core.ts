import { createHash, randomBytes } from "node:crypto";

import { deleteCookie, getHeader, setCookie, type H3Event } from "h3";

import type { Prisma } from "~~/src/generated/prisma/client";
import { oauthStateCookieNames, sessionCookieName } from "~~/src/lib/auth-config";

export type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function createRandomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createOAuthState() {
  return createRandomToken(12);
}

export function buildProviderConfigMessage(label: string, missingKeys: string[]) {
  return `${label} 尚未配置，请先在 .env 中填写：${missingKeys.join(", ")}`;
}

export function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function getRequestMeta(event: H3Event): RequestMeta {
  return {
    ipAddress: getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: getHeader(event, "user-agent") ?? null,
  };
}

export function setSessionCookie(event: H3Event, token: string, expiresAt: Date) {
  setCookie(event, sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function setOauthStateCookie(
  event: H3Event,
  provider: keyof typeof oauthStateCookieNames,
  state: string,
) {
  setCookie(event, oauthStateCookieNames[provider], state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function clearOauthStateCookie(event: H3Event, provider: keyof typeof oauthStateCookieNames) {
  deleteCookie(event, oauthStateCookieNames[provider], {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
