import { getCookie, type H3Event } from "h3";

import { getSessionDurationMs, sessionCookieName } from "~~/src/lib/auth-config";
import { createRandomToken, hashValue, type RequestMeta } from "~~/src/lib/auth/core";
import { prisma } from "~~/src/lib/prisma";

type SessionBundle = {
  token: string;
  expiresAt: Date;
};

export async function createSessionForUser(
  userId: string,
  meta: RequestMeta,
  platform = "h5",
): Promise<SessionBundle> {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + getSessionDurationMs());
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

export async function revokeSessionByCookie(event: H3Event) {
  const token = getCookie(event, sessionCookieName);
  if (!token) return;
  await prisma.userSession.updateMany({
    where: { sessionToken: hashValue(token), status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
}

export async function getCurrentSession(event: H3Event) {
  const token = getCookie(event, sessionCookieName);
  if (!token) return null;
  const session = await prisma.userSession.findFirst({
    where: {
      sessionToken: hashValue(token),
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          profile: true,
          identities: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!session) return null;
  await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return session;
}

export async function getCurrentUser(event: H3Event) {
  const session = await getCurrentSession(event);
  if (!session) return null;
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

export type AuthenticatedUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getGuestUpgradeUserId(event: H3Event) {
  const currentUser = await getCurrentUser(event);
  return currentUser?.kind === "GUEST" ? currentUser.id : null;
}
