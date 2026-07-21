import { createRandomToken, toJsonInput, type RequestMeta } from "~~/src/lib/auth/core";
import { createSessionForUser } from "~~/src/lib/auth/session";
import { prisma } from "~~/src/lib/prisma";

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

export async function createGuestUser(meta: RequestMeta) {
  const suffix = createRandomToken(4).slice(0, 4);
  const user = await ensureUserForIdentity({
    provider: "GUEST",
    providerUserId: `guest_${createRandomToken(10)}`,
    displayName: `游客${suffix}`,
  });
  const session = await createSessionForUser(user.id, meta);
  return { user, session };
}

export async function ensureUserForIdentity(input: EnsureUserForIdentityInput) {
  return prisma.$transaction(async (tx) => {
    const existingIdentity = await tx.authIdentity.findFirst({
      where: { provider: input.provider, providerUserId: input.providerUserId },
      include: {
        user: {
          include: {
            profile: true,
            identities: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (existingIdentity) {
      await tx.authIdentity.update({
        where: { id: existingIdentity.id },
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
      return tx.user.update({
        where: { id: existingIdentity.userId },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: input.avatarUrl ?? existingIdentity.user.avatarUrl,
          displayName: input.displayName && existingIdentity.user.displayName === "摸鱼用户"
            ? input.displayName : existingIdentity.user.displayName,
        },
        include: {
          profile: true,
          identities: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    let userId = input.existingGuestUserId ?? null;
    if (userId) {
      const guestUser = await tx.user.findFirst({ where: { id: userId, kind: "GUEST" } });
      if (!guestUser) userId = null;
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
          profile: { create: { nickname: input.displayName ?? "摸鱼用户" } },
        },
      });
      userId = createdUser.id;
    } else if (input.provider !== "GUEST") {
      await tx.user.update({
        where: { id: userId },
        data: {
          kind: "MEMBER",
          lastLoginAt: new Date(),
          displayName: input.displayName ?? undefined,
          avatarUrl: input.avatarUrl ?? undefined,
          profile: {
            upsert: {
              create: { nickname: input.displayName ?? "摸鱼用户" },
              update: { nickname: input.displayName ?? undefined },
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

    return tx.user.findFirstOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        identities: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });
}
