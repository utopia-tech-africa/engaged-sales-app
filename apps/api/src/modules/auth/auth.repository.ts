import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  type AuthSession,
  type Gender,
  type User,
  type UserRole
} from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public findUserForSignIn(
    phone: string,
    uniqueCode: string,
    role: UserRole
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phone,
        uniqueCode,
        role
      }
    });
  }

  public findUserByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone }
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
        ...(payload.regionId !== undefined ? { regionId: payload.regionId } : {}),
        uniqueCode: `P-${randomUUID().slice(0, 8)}`
      }
    });
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

  public getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId }
    });
  }
}
