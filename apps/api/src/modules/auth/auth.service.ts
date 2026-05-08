import { createHash, randomBytes } from "node:crypto";

import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "../../generated/prisma/client";
import * as argon2 from "argon2";

import type { EnvironmentVariables } from "../../config/environment";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { AuthRepository } from "./auth.repository";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { SignInDto } from "./dto/sign-in.dto";
import type { SignOutDto } from "./dto/sign-out.dto";
import type { SignUpDto } from "./dto/sign-up.dto";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

@Injectable()
export class AuthService {
  public constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  public async signUp(payload: SignUpDto): Promise<{ user: User } & TokenPair> {
    const existingUser = await this.authRepository.findUserByPhone(payload.phone);
    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    const user = await this.authRepository.createPromoter({
      fullName: payload.fullName,
      phone: payload.phone,
      gender: payload.gender,
      ...(payload.regionId !== undefined ? { regionId: payload.regionId } : {})
    });

    const tokens = await this.issueTokens(user, undefined);
    return { user, ...tokens };
  }

  public async signIn(
    payload: SignInDto,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: User } & TokenPair> {
    const user = await this.authRepository.findUserForSignIn(
      payload.phone,
      payload.uniqueCode,
      payload.role
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens(user, {
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(ipAddress !== undefined ? { ipAddress } : {})
    });
    return { user, ...tokens };
  }

  public async refresh(payload: RefreshTokenDto): Promise<TokenPair> {
    const { sessionId, secret } = this.parseRefreshToken(payload.refreshToken);
    const session = await this.authRepository.getSessionById(sessionId);

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (session.revokedAt) {
      await this.authRepository.revokeAllUserSessions(session.userId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.authRepository.revokeSession(session.id);
      throw new UnauthorizedException("Refresh token expired");
    }

    const isValidSecret = await argon2.verify(session.refreshTokenHash, secret);
    if (!isValidSecret) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.authRepository.getUserById(session.userId);
    if (!user) {
      throw new UnauthorizedException("Session user no longer exists");
    }

    const nextSessionSecret = this.generateRefreshSecret();
    const nextSession = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: await this.hashRefreshToken(nextSessionSecret),
      expiresAt: this.buildRefreshExpiryDate(),
      ...(session.userAgent !== null ? { userAgent: session.userAgent } : {}),
      ...(session.ipAddress !== null ? { ipAddress: session.ipAddress } : {})
    });

    await this.authRepository.replaceSession({
      oldSessionId: session.id,
      newSessionId: nextSession.id
    });

    const accessToken = await this.signAccessToken(user, nextSession.id);
    return {
      accessToken,
      refreshToken: `${nextSession.id}.${nextSessionSecret}`,
      expiresIn: this.getAccessTokenTtlSeconds()
    };
  }

  public async signOut(payload: SignOutDto): Promise<void> {
    const { sessionId } = this.parseRefreshToken(payload.refreshToken);
    const session = await this.authRepository.getSessionById(sessionId);

    if (!session) {
      return;
    }

    if (!session.revokedAt) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  public async validateJwtUser(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.authRepository.getUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException("Invalid token user");
    }

    return payload;
  }

  private async issueTokens(
    user: User,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<TokenPair> {
    const refreshSecret = this.generateRefreshSecret();
    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: await this.hashRefreshToken(refreshSecret),
      expiresAt: this.buildRefreshExpiryDate(),
      ...(metadata?.userAgent !== undefined ? { userAgent: metadata.userAgent } : {}),
      ...(metadata?.ipAddress !== undefined ? { ipAddress: metadata.ipAddress } : {})
    });

    const accessToken = await this.signAccessToken(user, session.id);
    return {
      accessToken,
      refreshToken: `${session.id}.${refreshSecret}`,
      expiresIn: this.getAccessTokenTtlSeconds()
    };
  }

  private getAccessTokenTtlSeconds(): number {
    return this.configService.get("JWT_ACCESS_TTL_SECONDS", { infer: true });
  }

  private getRefreshTokenTtlDays(): number {
    return this.configService.get("JWT_REFRESH_TTL_DAYS", { infer: true });
  }

  private async signAccessToken(user: User, sessionId: string): Promise<string> {
    const payload: AuthenticatedUser = {
      id: user.id,
      role: user.role,
      phone: user.phone,
      sessionId
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true }),
      expiresIn: this.getAccessTokenTtlSeconds()
    });
  }

  private buildRefreshExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + this.getRefreshTokenTtlDays());
    return date;
  }

  private generateRefreshSecret(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashRefreshToken(refreshToken: string): Promise<string> {
    return argon2.hash(refreshToken, { type: argon2.argon2id });
  }

  private parseRefreshToken(token: string): { sessionId: string; secret: string } {
    const [sessionId, secret] = token.split(".");
    if (!sessionId || !secret) {
      throw new UnauthorizedException("Malformed refresh token");
    }

    const sessionDigest = createHash("sha256").update(sessionId).digest("hex");
    if (sessionDigest.length !== 64) {
      throw new UnauthorizedException("Malformed refresh token");
    }

    return { sessionId, secret };
  }
}
