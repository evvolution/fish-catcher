import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import {
  getPhoneCodeTtlMs,
  getSessionDurationMs,
  getSmsProvider,
  oauthStateCookieNames,
  sessionCookieName,
} from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

const sessionDurationMs = getSessionDurationMs();
const phoneCodeTtlMs = getPhoneCodeTtlMs();

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type SessionBundle = {
  token: string;
  expiresAt: Date;
};

export type AuthenticatedUser = Awaited<ReturnType<typeof getCurrentUser>>;

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

export function buildProviderConfigMessage(label: string, missingKeys: string[]) {
  return `${label} 尚未配置，请先在 .env 中填写：${missingKeys.join(", ")}`;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function getRequestMeta(request: NextRequest): RequestMeta {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function setOauthStateCookie(
  response: NextResponse,
  provider: keyof typeof oauthStateCookieNames,
  state: string,
) {
  response.cookies.set(oauthStateCookieNames[provider], state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function clearOauthStateCookie(
  response: NextResponse,
  provider: keyof typeof oauthStateCookieNames,
) {
  response.cookies.set(oauthStateCookieNames[provider], "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function createSessionForUser(
  userId: string,
  meta: RequestMeta,
  platform = "h5",
): Promise<SessionBundle> {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await prisma.userSession.create({
    data: {
      userId,
      sessionToken: hashValue(token),
      status: "ACTIVE",
      platform,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      lastSeenAt: new Date(),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function revokeSessionByCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      sessionToken: hashValue(token),
      status: "ACTIVE",
    },
    data: {
      status: "REVOKED",
    },
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findFirst({
    where: {
      sessionToken: hashValue(token),
      status: "ACTIVE",
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          profile: true,
          identities: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  await prisma.userSession.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    kind: session.user.kind,
    role: session.user.role,
    status: session.user.status,
    displayName: session.user.profile?.nickname || session.user.displayName,
    avatarUrl: session.user.avatarUrl,
    city: session.user.profile?.city ?? null,
    bio: session.user.profile?.bio ?? null,
    onboardingCompleted: session.user.profile?.onboardingCompleted ?? false,
    registeredAt: session.user.registeredAt,
    lastLoginAt: session.user.lastLoginAt,
    session: {
      id: session.id,
      platform: session.platform,
      expiresAt: session.expiresAt,
    },
    identities: session.user.identities.map((identity) => ({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      phone: identity.phone,
      email: identity.email,
      isPrimary: identity.isPrimary,
      lastUsedAt: identity.lastUsedAt,
    })),
  };
}

export async function createGuestUser(meta: RequestMeta) {
  const suffix = createRandomToken(4).slice(0, 4);
  const providerUserId = `guest_${createRandomToken(10)}`;

  const user = await ensureUserForIdentity({
    provider: "GUEST",
    providerUserId,
    displayName: `游客${suffix}`,
  });

  const session = await createSessionForUser(user.id, meta);

  return { user, session };
}

type EnsureUserForIdentityInput = {
  provider: "WECHAT" | "GOOGLE" | "PHONE" | "GUEST";
  providerUserId: string;
  providerUnionId?: string | null;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  existingGuestUserId?: string | null;
};

export async function ensureUserForIdentity(input: EnsureUserForIdentityInput) {
  return prisma.$transaction(async (tx) => {
    const existingIdentity = await tx.authIdentity.findFirst({
      where: {
        provider: input.provider,
        providerUserId: input.providerUserId,
      },
      include: {
        user: {
          include: {
            profile: true,
            identities: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (existingIdentity) {
      await tx.authIdentity.update({
        where: {
          id: existingIdentity.id,
        },
        data: {
          lastUsedAt: new Date(),
          providerUnionId: input.providerUnionId ?? existingIdentity.providerUnionId,
          email: input.email ?? existingIdentity.email,
          phone: input.phone ?? existingIdentity.phone,
          metadata: toJsonInput(
            input.metadata ?? ((existingIdentity.metadata as Record<string, unknown> | null) ?? undefined),
          ),
        },
      });

      const updatedUser = await tx.user.update({
        where: {
          id: existingIdentity.userId,
        },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: input.avatarUrl ?? existingIdentity.user.avatarUrl,
          displayName:
            input.displayName && existingIdentity.user.displayName === "摸鱼用户"
              ? input.displayName
              : existingIdentity.user.displayName,
        },
        include: {
          profile: true,
          identities: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return updatedUser;
    }

    let userId = input.existingGuestUserId ?? null;

    if (userId) {
      const guestUser = await tx.user.findFirst({
        where: {
          id: userId,
          kind: "GUEST",
        },
      });

      if (!guestUser) {
        userId = null;
      }
    }

    if (!userId) {
      const createdUser = await tx.user.create({
        data: {
          kind: input.provider === "GUEST" ? "GUEST" : "MEMBER",
          role: "USER",
          status: "ACTIVE",
          displayName: input.displayName ?? "摸鱼用户",
          avatarUrl: input.avatarUrl,
          lastLoginAt: new Date(),
          profile: {
            create: {
              nickname: input.displayName ?? "摸鱼用户",
            },
          },
        },
      });

      userId = createdUser.id;
    } else if (input.provider !== "GUEST") {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          kind: "MEMBER",
          lastLoginAt: new Date(),
          displayName: input.displayName ?? undefined,
          avatarUrl: input.avatarUrl ?? undefined,
          profile: {
            upsert: {
              create: {
                nickname: input.displayName ?? "摸鱼用户",
              },
              update: {
                nickname: input.displayName ?? undefined,
              },
            },
          },
        },
      });
    }

    await tx.authIdentity.create({
      data: {
        userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        providerUnionId: input.providerUnionId,
        email: input.email,
        phone: input.phone,
        status: "ACTIVE",
        isPrimary: input.provider !== "GUEST",
        metadata: toJsonInput(input.metadata),
        lastUsedAt: new Date(),
      },
    });

    const user = await tx.user.findFirstOrThrow({
      where: {
        id: userId,
      },
      include: {
        profile: true,
        identities: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return user;
  });
}

export async function issuePhoneCode(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!/^\+?\d{6,20}$/.test(normalizedPhone)) {
    throw new Error("手机号格式不正确。");
  }

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + phoneCodeTtlMs);

  await prisma.$transaction(async (tx) => {
    await tx.phoneVerificationCode.updateMany({
      where: {
        target: normalizedPhone,
        scene: "SIGN_IN",
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    await tx.phoneVerificationCode.create({
      data: {
        scene: "SIGN_IN",
        target: normalizedPhone,
        codeHash: hashValue(code),
        expiresAt,
      },
    });
  });

  const smsResult = await sendVerificationCode(normalizedPhone, code);

  return {
    phone: normalizedPhone,
    expiresAt,
    ...smsResult,
  };
}

async function sendVerificationCode(phone: string, code: string) {
  const provider = getSmsProvider();

  if (provider === "mock") {
    return {
      provider: "mock",
      debugCode: code,
    };
  }

  if (provider === "webhook") {
    const webhookUrl = process.env.SMS_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error("短信 webhook 未配置，请先设置 SMS_WEBHOOK_URL。");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_WEBHOOK_TOKEN
          ? {
              Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify({
        phone,
        code,
        scene: "SIGN_IN",
        signName: process.env.SMS_SIGN_NAME ?? null,
        templateCode: process.env.SMS_TEMPLATE_CODE ?? null,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("短信服务调用失败，请检查 SMS_WEBHOOK_URL 或服务端实现。");
    }

    return {
      provider: "webhook",
      debugCode: null,
    };
  }

  throw new Error(
    "当前短信提供方未实现。请将 SMS_PROVIDER 设为 mock 或 webhook。",
  );
}

export async function verifyPhoneCodeAndGetUser(params: {
  phone: string;
  code: string;
  existingGuestUserId?: string | null;
}) {
  const normalizedPhone = normalizePhoneNumber(params.phone);
  const normalizedCode = params.code.trim();

  if (!/^\+?\d{6,20}$/.test(normalizedPhone)) {
    throw new Error("手机号格式不正确。");
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("验证码格式不正确。");
  }

  const record = await prisma.phoneVerificationCode.findFirst({
    where: {
      target: normalizedPhone,
      scene: "SIGN_IN",
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      sentAt: "desc",
    },
  });

  if (!record) {
    throw new Error("验证码不存在或已过期。");
  }

  if (record.codeHash !== hashValue(normalizedCode)) {
    await prisma.phoneVerificationCode.update({
      where: {
        id: record.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new Error("验证码不正确。");
  }

  await prisma.phoneVerificationCode.update({
    where: {
      id: record.id,
    },
    data: {
      consumedAt: new Date(),
      attempts: {
        increment: 1,
      },
    },
  });

  const user = await ensureUserForIdentity({
    provider: "PHONE",
    providerUserId: normalizedPhone,
    phone: normalizedPhone,
    displayName: maskPhone(normalizedPhone),
    existingGuestUserId: params.existingGuestUserId,
  });

  return user;
}

export function createOAuthState() {
  return createRandomToken(12);
}

export async function getGuestUpgradeUserId() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.kind !== "GUEST") {
    return null;
  }

  return currentUser.id;
}

function maskPhone(phone: string) {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
