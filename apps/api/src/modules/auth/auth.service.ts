import { createHash, createHmac, randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "../../generated/prisma/client";
import * as argon2 from "argon2";

import type { EnvironmentVariables } from "../../config/environment";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GeofenceService } from "../geofence/geofence.service";
import { RedisService } from "../redis/redis.service";
import { AuthRepository } from "./auth.repository";
import type { AuthUserResponse } from "./dto/auth-user.response";
import type { OauthCallbackDto } from "./dto/oauth-callback.dto";
import type { OauthStartDto } from "./dto/oauth-start.dto";
import type { ProfileCompletionDto } from "./dto/profile-completion.dto";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { RevokeUserSessionsDto } from "./dto/revoke-user-sessions.dto";
import type { SignInDto } from "./dto/sign-in.dto";
import type { SignOutDto } from "./dto/sign-out.dto";
import type { SignUpDto } from "./dto/sign-up.dto";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  name: string;
};

type OauthStatePayload = {
  nonce: string;
  provider: "google";
  redirectUri: string;
  issuedAtMs: number;
};

type SessionResponse = {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedById: string | null;
  isCurrent: boolean;
  isActive: boolean;
};

const AUTH_IP_WINDOW_MS = 60 * 1000;
const AUTH_IP_MAX_REQUESTS = 10;
const PHONE_FAILURE_WINDOW_MS = 60 * 60 * 1000;
const PHONE_FAILURE_MAX_ATTEMPTS = 20;
const REFRESH_WINDOW_MS = 60 * 1000;
const REFRESH_MAX_REQUESTS = 60;
const OAUTH_START_WINDOW_MS = 60 * 1000;
const OAUTH_START_MAX_REQUESTS = 20;
const OAUTH_CALLBACK_WINDOW_MS = 60 * 1000;
const OAUTH_CALLBACK_MAX_REQUESTS = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  public constructor(
    @Inject(AuthRepository)
    private readonly authRepository: AuthRepository,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Inject(GeofenceService)
    private readonly geofenceService: GeofenceService
  ) {}

  public async signUp(
    payload: SignUpDto | undefined,
    ipAddress?: string
  ): Promise<{ user: AuthUserResponse } & TokenPair> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    await this.enforceAuthIpLimit(ipAddress ?? "unknown");

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
    return { user: this.toAuthUserResponse(user), ...tokens };
  }

  public async signIn(
    payload: SignInDto | undefined,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: AuthUserResponse } & TokenPair> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    await this.enforceAuthIpLimit(ipAddress ?? "unknown");
    await this.enforcePhoneLockout(payload.phone);

    const user = await this.authRepository.findUserForSignIn(
      payload.phone,
      payload.uniqueCode,
      payload.role
    );

    if (!user) {
      await this.recordPhoneFailure(payload.phone);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.resetPhoneFailures(payload.phone);

    if (this.loginRoleRequiresWorkAreaCheck(user.role)) {
      this.assertCoordinatePair(payload.latitude, payload.longitude);
      await this.geofenceService.assertLoginAllowedForPromoter(
        user.id,
        payload.latitude,
        payload.longitude
      );
    }

    const tokens = await this.issueTokens(user, {
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(ipAddress !== undefined ? { ipAddress } : {})
    });
    return { user: this.toAuthUserResponse(user), ...tokens };
  }

  public async oauthCallback(
    payload: OauthCallbackDto | undefined,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: AuthUserResponse } & TokenPair> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    await this.enforceOauthCallbackLimit(ipAddress ?? "unknown");

    const state = this.parseAndValidateOauthState(payload.state);
    if (state.redirectUri !== payload.redirectUri) {
      throw new UnauthorizedException("OAuth state is invalid");
    }

    const nonceWasConsumed = await this.authRepository.consumeOauthNonce({
      nonce: state.nonce,
      provider: "google"
    });
    if (!nonceWasConsumed) {
      throw new UnauthorizedException("OAuth nonce is invalid or already used");
    }

    const googleToken = await this.exchangeGoogleCode(payload.code, payload.redirectUri);
    const googleProfile = await this.fetchGoogleUserInfo(googleToken.access_token);

    let user = await this.authRepository.findUserByGoogleSub(googleProfile.sub);

    if (!user) {
      const existingByEmail = await this.authRepository.findUserByEmail(googleProfile.email);
      if (existingByEmail) {
        user = await this.authRepository.linkGoogleIdentity(existingByEmail.id, {
          email: googleProfile.email,
          googleSub: googleProfile.sub
        });
      } else {
        user = await this.authRepository.createGooglePromoter({
          fullName: googleProfile.name,
          email: googleProfile.email,
          googleSub: googleProfile.sub
        });
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException("This account has been deactivated");
    }

    if (this.loginRoleRequiresWorkAreaCheck(user.role)) {
      this.assertCoordinatePair(payload.latitude, payload.longitude);
      await this.geofenceService.assertLoginAllowedForPromoter(
        user.id,
        payload.latitude,
        payload.longitude
      );
    }

    const tokens = await this.issueTokens(user, {
      ...(userAgent !== undefined ? { userAgent } : {}),
      ...(ipAddress !== undefined ? { ipAddress } : {})
    });

    return { user: this.toAuthUserResponse(user), ...tokens };
  }

  public async startGoogleOauth(
    payload: OauthStartDto | undefined,
    ipAddress?: string
  ): Promise<{
    provider: "google";
    authorizationUrl: string;
    state: string;
  }> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    await this.enforceOauthStartLimit(ipAddress ?? "unknown");

    const nonce = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.authRepository.createOauthNonce({
      nonce,
      provider: "google",
      expiresAt
    });

    const statePayload: OauthStatePayload = {
      nonce,
      provider: "google",
      redirectUri: payload.redirectUri,
      issuedAtMs: Date.now()
    };

    const state = this.signOauthState(statePayload);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.configService.get("GOOGLE_CLIENT_ID", { infer: true }));
    url.searchParams.set("redirect_uri", payload.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    return {
      provider: "google",
      authorizationUrl: url.toString(),
      state
    };
  }

  public async profileCompletion(
    currentUser: AuthenticatedUser,
    payload: ProfileCompletionDto | undefined
  ): Promise<{ user: AuthUserResponse }> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const updatedUser = await this.authRepository.completeProfile(currentUser.id, {
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
      ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
      ...(payload.regionId !== undefined ? { regionId: payload.regionId } : {})
    });

    return { user: this.toAuthUserResponse(updatedUser) };
  }

  public async refresh(payload: RefreshTokenDto | undefined): Promise<TokenPair> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    const { sessionId, secret } = this.parseRefreshToken(payload.refreshToken);
    await this.enforceRefreshThrottle(sessionId);
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

    if (!user.isActive) {
      await this.authRepository.revokeAllUserSessions(user.id);
      throw new UnauthorizedException("Account is deactivated");
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

  public async signOut(payload: SignOutDto | undefined): Promise<void> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    const { sessionId } = this.parseRefreshToken(payload.refreshToken);
    const session = await this.authRepository.getSessionById(sessionId);

    if (!session) {
      return;
    }

    if (!session.revokedAt) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  public async listSessions(
    currentUser: AuthenticatedUser
  ): Promise<{ sessions: SessionResponse[] }> {
    const sessions = await this.authRepository.listSessionsForUser(currentUser.id);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        userId: session.userId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
        replacedById: session.replacedById,
        isCurrent: session.id === currentUser.sessionId,
        isActive: !session.revokedAt && session.expiresAt.getTime() > Date.now()
      }))
    };
  }

  public async revokeAllSessionsForCurrentUser(currentUser: AuthenticatedUser): Promise<void> {
    await this.authRepository.revokeAllUserSessionsExcept(currentUser.id, currentUser.sessionId);
  }

  public async revokeAllSessionsByAdmin(
    currentUser: AuthenticatedUser,
    payload: RevokeUserSessionsDto | undefined
  ): Promise<void> {
    if (!payload) {
      throw new BadRequestException("Request body is required");
    }

    if (currentUser.role !== "admin") {
      throw new ForbiddenException("Only admin users can revoke sessions for other users");
    }

    await this.authRepository.revokeAllUserSessions(payload.userId);
  }

  public async validateJwtUser(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.authRepository.getUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException("Invalid token user");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    const session = await this.authRepository.getActiveSessionById(payload.sessionId);
    if (session?.userId !== payload.id) {
      throw new UnauthorizedException("Session is invalid, revoked, or expired");
    }

    return payload;
  }

  private assertCoordinatePair(latitude?: number, longitude?: number): void {
    if (latitude === undefined && longitude === undefined) {
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException("Latitude and longitude must both be provided together");
    }
  }

  /** Promoters: sign-in is checked against activation-linked work areas when applicable, else global geofences. */
  private loginRoleRequiresWorkAreaCheck(role: User["role"]): boolean {
    return role === "promoter";
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

  private async exchangeGoogleCode(
    code: string,
    redirectUri: string
  ): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.configService.get("GOOGLE_CLIENT_ID", { infer: true }),
      client_secret: this.configService.get("GOOGLE_CLIENT_SECRET", { infer: true }),
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
      throw this.mapGoogleOAuthError(errorBody.error);
    }

    const data = (await response.json()) as Partial<GoogleTokenResponse>;
    if (!data.access_token) {
      throw new UnauthorizedException("Google OAuth token response is invalid");
    }

    return { access_token: data.access_token };
  }

  private async fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new UnauthorizedException("Failed to fetch Google profile");
    }

    const data = (await response.json()) as Partial<GoogleUserInfo>;
    if (!data.sub || !data.email || !data.name) {
      throw new UnauthorizedException("Google profile data is incomplete");
    }

    return {
      sub: data.sub,
      email: data.email,
      name: data.name
    };
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    const missingProfileFields: string[] = [];
    if (user.phone.startsWith("pending-")) {
      missingProfileFields.push("phone");
    }
    if (!user.regionId) {
      missingProfileFields.push("regionId");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      uniqueCode: user.uniqueCode,
      role: user.role,
      isActive: user.isActive,
      gender: user.gender,
      regionId: user.regionId,
      authProvider: user.authProvider,
      requiresProfileCompletion: missingProfileFields.length > 0,
      missingProfileFields,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private signOauthState(payload: OauthStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac(
      "sha256",
      this.configService.get("JWT_ACCESS_SECRET", { infer: true })
    )
      .update(encodedPayload)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  private parseAndValidateOauthState(state: string): OauthStatePayload {
    const [encodedPayload, signature] = state.split(".");
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException("OAuth state is malformed");
    }

    const expectedSignature = createHmac(
      "sha256",
      this.configService.get("JWT_ACCESS_SECRET", { infer: true })
    )
      .update(encodedPayload)
      .digest("base64url");

    if (expectedSignature !== signature) {
      throw new UnauthorizedException("OAuth state signature is invalid");
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as OauthStatePayload;
    if (Date.now() - payload.issuedAtMs > 10 * 60 * 1000) {
      throw new UnauthorizedException("OAuth state is expired");
    }

    return payload;
  }

  private mapGoogleOAuthError(errorCode?: string): UnauthorizedException | BadRequestException {
    if (errorCode === "invalid_grant") {
      return new UnauthorizedException("Google authorization code is invalid or expired");
    }

    if (errorCode === "invalid_client" || errorCode === "unauthorized_client") {
      return new UnauthorizedException("Google OAuth client configuration is invalid");
    }

    if (errorCode === "invalid_request") {
      return new BadRequestException("Google OAuth request is invalid");
    }

    return new UnauthorizedException("Google OAuth code exchange failed");
  }

  private async enforceAuthIpLimit(ipAddress: string): Promise<void> {
    try {
      const key = `auth:limit:ip:${ipAddress}`;
      const count = await this.redisService.incrementWithWindow(
        key,
        Math.floor(AUTH_IP_WINDOW_MS / 1000)
      );
      if (count > AUTH_IP_MAX_REQUESTS) {
        throw new ForbiddenException("Too many auth attempts from this IP. Try again in a minute.");
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auth IP rate limit skipped (Redis): ${message}`);
    }
  }

  private async enforcePhoneLockout(phone: string): Promise<void> {
    try {
      const key = `auth:lockout:phone:${phone}`;
      const value = await this.redisService.get(key);
      const failures = value ? Number(value) : 0;

      if (failures >= PHONE_FAILURE_MAX_ATTEMPTS) {
        throw new ForbiddenException("Too many failed attempts for this phone. Try again later.");
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Phone lockout check skipped (Redis): ${message}`);
    }
  }

  private async recordPhoneFailure(phone: string): Promise<void> {
    try {
      const key = `auth:lockout:phone:${phone}`;
      await this.redisService.incrementWithWindow(key, Math.floor(PHONE_FAILURE_WINDOW_MS / 1000));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`recordPhoneFailure skipped (Redis): ${message}`);
    }
  }

  private async resetPhoneFailures(phone: string): Promise<void> {
    try {
      const key = `auth:lockout:phone:${phone}`;
      await this.redisService.delete(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`resetPhoneFailures skipped (Redis): ${message}`);
    }
  }

  private async enforceRefreshThrottle(sessionId: string): Promise<void> {
    try {
      const key = `auth:limit:refresh:${sessionId}`;
      const count = await this.redisService.incrementWithWindow(
        key,
        Math.floor(REFRESH_WINDOW_MS / 1000)
      );
      if (count > REFRESH_MAX_REQUESTS) {
        throw new ForbiddenException("Too many refresh attempts. Try again in a minute.");
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Refresh throttle skipped (Redis): ${message}`);
    }
  }

  private async enforceOauthStartLimit(ipAddress: string): Promise<void> {
    try {
      const key = `auth:limit:oauth:start:ip:${ipAddress}`;
      const count = await this.redisService.incrementWithWindow(
        key,
        Math.floor(OAUTH_START_WINDOW_MS / 1000)
      );
      if (count > OAUTH_START_MAX_REQUESTS) {
        throw new ForbiddenException(
          "Too many OAuth start requests from this IP. Try again in a minute."
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OAuth start limit skipped (Redis): ${message}`);
    }
  }

  private async enforceOauthCallbackLimit(ipAddress: string): Promise<void> {
    try {
      const key = `auth:limit:oauth:callback:ip:${ipAddress}`;
      const count = await this.redisService.incrementWithWindow(
        key,
        Math.floor(OAUTH_CALLBACK_WINDOW_MS / 1000)
      );
      if (count > OAUTH_CALLBACK_MAX_REQUESTS) {
        throw new ForbiddenException(
          "Too many OAuth callback requests from this IP. Try again in a minute."
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OAuth callback limit skipped (Redis): ${message}`);
    }
  }
}
