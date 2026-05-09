import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  type AuthSession,
  type Gender,
  type User,
  type UserRole
} from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findUserForSignIn(
    phone: string,
    uniqueCode: string,
    role: UserRole
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phone,
        uniqueCode,
        role,
        isActive: true
      }
    });
  }

  public findUserByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone }
    });
  }

  public findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  public findUserByGoogleSub(googleSub: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleSub }
    });
  }

  public createPromoter(payload: {
    fullName: string;
    phone: string;
    gender: Gender;
    regionId?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        gender: payload.gender,
        role: "promoter",
        authProvider: "credentials",
        ...(payload.regionId !== undefined ? { regionId: payload.regionId } : {}),
        uniqueCode: `P-${randomUUID().slice(0, 8)}`
      }
    });
  }

  public createGooglePromoter(payload: {
    fullName: string;
    email: string;
    googleSub: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        googleSub: payload.googleSub,
        authProvider: "google",
        phone: `pending-${randomUUID().slice(0, 12)}`,
        uniqueCode: `P-${randomUUID().slice(0, 8)}`,
        role: "promoter"
      }
    });
  }

  public linkGoogleIdentity(
    userId: string,
    payload: { email: string; googleSub: string }
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: payload.email,
        googleSub: payload.googleSub,
        authProvider: "google"
      }
    });
  }

  public completeProfile(
    userId: string,
    payload: Partial<{
      email: string;
      phone: string;
      gender: Gender;
      fullName: string;
      regionId: string;
    }>
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
        ...(payload.regionId !== undefined ? { regionId: payload.regionId } : {})
      }
    });
  }

  public createOauthNonce(payload: {
    nonce: string;
    provider: string;
    expiresAt: Date;
  }): Promise<void> {
    return this.prisma.oauthNonce
      .create({
        data: payload
      })
      .then(() => undefined);
  }

  public consumeOauthNonce(payload: { nonce: string; provider: string }): Promise<boolean> {
    return this.prisma.oauthNonce
      .updateMany({
        where: {
          nonce: payload.nonce,
          provider: payload.provider,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: {
          usedAt: new Date()
        }
      })
      .then((result) => result.count > 0);
  }

  public createSession(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AuthSession> {
    return this.prisma.authSession.create({
      data
    });
  }

  public getSessionById(sessionId: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId }
    });
  }

  public getActiveSessionById(sessionId: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });
  }

  public listSessionsForUser(userId: string): Promise<AuthSession[]> {
    return this.prisma.authSession.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  public async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  public async replaceSession(data: { oldSessionId: string; newSessionId: string }): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: data.oldSessionId },
      data: {
        revokedAt: new Date(),
        replacedById: data.newSessionId
      }
    });
  }

  public async revokeAllUserSessionsExcept(userId: string, exceptSessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        id: { not: exceptSessionId },
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  public getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId }
    });
  }
}
