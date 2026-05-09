import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { OauthCallbackDto } from "./dto/oauth-callback.dto";
import { OauthStartDto } from "./dto/oauth-start.dto";
import { ProfileCompletionDto } from "./dto/profile-completion.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RevokeUserSessionsDto } from "./dto/revoke-user-sessions.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignOutDto } from "./dto/sign-out.dto";
import { SignUpDto } from "./dto/sign-up.dto";

type AuthControllerService = {
  signUp: (body: SignUpDto, ipAddress?: string) => Promise<unknown>;
  signIn: (body: SignInDto, userAgent?: string, ipAddress?: string) => Promise<unknown>;
  refresh: (body: RefreshTokenDto) => Promise<unknown>;
  oauthCallback: (
    body: OauthCallbackDto,
    userAgent?: string,
    ipAddress?: string
  ) => Promise<unknown>;
  startGoogleOauth: (body: OauthStartDto, ipAddress?: string) => Promise<unknown>;
  profileCompletion: (
    currentUser: AuthenticatedUser,
    body: ProfileCompletionDto
  ) => Promise<unknown>;
  listSessions: (currentUser: AuthenticatedUser) => Promise<unknown>;
  revokeAllSessionsForCurrentUser: (currentUser: AuthenticatedUser) => Promise<void>;
  revokeAllSessionsByAdmin: (
    currentUser: AuthenticatedUser,
    body: RevokeUserSessionsDto
  ) => Promise<void>;
  signOut: (body: SignOutDto) => Promise<void>;
};

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  private readonly authService: AuthControllerService;

  public constructor(@Inject(AuthService) authService: AuthService) {
    this.authService = authService;
  }

  private setDeprecationHeaders(
    response: {
      setHeader: (name: string, value: string) => void;
    },
    successorPath: string
  ): void {
    response.setHeader("Deprecation", "true");
    response.setHeader("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
    response.setHeader("Link", `<${successorPath}>; rel="successor-version"`);
  }

  @Post("sign-up")
  @ApiOperation({
    operationId: "Auth_signUp",
    summary: "Register a promoter account",
    description: "Creates a new promoter user and returns access/refresh tokens."
  })
  @ApiBody({
    type: SignUpDto,
    examples: {
      default: {
        value: {
          fullName: "Jamal Salim",
          phone: "+254712345678",
          gender: "male",
          regionId: "nairobi-west"
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: "User registered successfully",
    schema: {
      example: {
        user: {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          fullName: "Jamal Salim",
          email: null,
          phone: "+254712345678",
          uniqueCode: "P-12ab34cd",
          role: "promoter",
          gender: "male",
          regionId: "nairobi-west",
          authProvider: "credentials",
          requiresProfileCompletion: false,
          missingProfileFields: [],
          createdAt: "2026-05-08T18:00:00.000Z",
          updatedAt: "2026-05-08T18:00:00.000Z"
        },
        accessToken: "<jwt>",
        refreshToken: "<sessionId>.<secret>",
        expiresIn: 900
      }
    }
  })
  @ApiConflictResponse({ description: "User already exists" })
  @ApiForbiddenResponse({ description: "Too many auth attempts from this IP" })
  @ApiBadRequestResponse({ description: "Validation failed or request body missing" })
  public signUp(
    @Body() body: SignUpDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    return this.authService.signUp(body, request.ip);
  }

  @Post("signup")
  @ApiOperation({
    operationId: "Auth_legacySignUp",
    summary: "Deprecated signup alias",
    description: "Deprecated alias of /auth/sign-up; emits deprecation headers."
  })
  @ApiBody({ type: SignUpDto })
  @ApiCreatedResponse({ description: "Same response as /auth/sign-up" })
  public legacySignUp(
    @Body() body: SignUpDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ) {
    this.setDeprecationHeaders(response, "/api/v1/auth/sign-up");
    return this.authService.signUp(body, request.ip);
  }

  @Post("sign-in")
  @ApiOperation({
    operationId: "Auth_signIn",
    summary: "Sign in with phone, code, and role",
    description: "Authenticates a user and returns a fresh token pair."
  })
  @ApiBody({
    type: SignInDto,
    examples: {
      default: {
        value: {
          phone: "+254712345678",
          uniqueCode: "P-12ab34cd",
          role: "promoter"
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Sign-in successful",
    schema: {
      example: {
        user: {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          fullName: "Jamal Salim",
          email: null,
          phone: "+254712345678",
          uniqueCode: "P-12ab34cd",
          role: "promoter",
          gender: "male",
          regionId: "nairobi-west",
          authProvider: "credentials",
          requiresProfileCompletion: false,
          missingProfileFields: []
        },
        accessToken: "<jwt>",
        refreshToken: "<sessionId>.<secret>",
        expiresIn: 900
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @ApiForbiddenResponse({ description: "Rate limit exceeded or phone temporarily locked" })
  @ApiBadRequestResponse({ description: "Validation failed or request body missing" })
  public signIn(
    @Body() body: SignInDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined;
    return this.authService.signIn(body, userAgent, request.ip);
  }

  @Post("login")
  @ApiOperation({
    operationId: "Auth_legacySignIn",
    summary: "Deprecated login alias",
    description: "Deprecated alias of /auth/sign-in; emits deprecation headers."
  })
  @ApiBody({ type: SignInDto })
  @ApiOkResponse({ description: "Same response as /auth/sign-in" })
  public legacySignIn(
    @Body() body: SignInDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ) {
    this.setDeprecationHeaders(response, "/api/v1/auth/sign-in");
    const userAgent =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined;
    return this.authService.signIn(body, userAgent, request.ip);
  }

  @Post("refresh")
  @ApiOperation({
    operationId: "Auth_refresh",
    summary: "Rotate refresh token and issue new access token",
    description: "Rotates refresh token session and returns a new token pair."
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: "Token refresh successful",
    schema: {
      example: {
        accessToken: "<jwt>",
        refreshToken: "<newSessionId>.<newSecret>",
        expiresIn: 900
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Invalid, revoked, expired, or reused refresh token" })
  @ApiForbiddenResponse({ description: "Refresh rate limit exceeded" })
  @ApiBadRequestResponse({ description: "Validation failed or request body missing" })
  public refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post("oauth/callback")
  @ApiOperation({
    operationId: "Auth_oauthCallback",
    summary: "Handle Google OAuth callback",
    description: "Validates state/nonce, exchanges Google code, and returns token pair."
  })
  @ApiBody({
    type: OauthCallbackDto,
    examples: {
      default: {
        value: {
          provider: "google",
          code: "4/0AQSTgQF...",
          redirectUri: "http://localhost:3000/auth/google/callback",
          state: "eyJub25jZSI6Ii4uLiJ9.R5m..."
        }
      }
    }
  })
  @ApiOkResponse({
    description: "OAuth callback successful",
    schema: {
      example: {
        user: {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          fullName: "Jamal Salim",
          email: "jamal@example.com",
          phone: "pending-a8e4c2f7f9d1",
          uniqueCode: "P-12ab34cd",
          role: "promoter",
          gender: null,
          regionId: null,
          authProvider: "google",
          requiresProfileCompletion: true,
          missingProfileFields: ["phone", "regionId"]
        },
        accessToken: "<jwt>",
        refreshToken: "<sessionId>.<secret>",
        expiresIn: 900
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Invalid OAuth state, nonce, or Google code" })
  @ApiForbiddenResponse({ description: "OAuth callback rate limit exceeded" })
  @ApiBadRequestResponse({ description: "Validation failed or malformed body" })
  public oauthCallback(
    @Body() body: OauthCallbackDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined;
    return this.authService.oauthCallback(body, userAgent, request.ip);
  }

  @Post("oauth/google/start")
  @ApiOperation({
    operationId: "Auth_startGoogleOauth",
    summary: "Create Google OAuth authorization URL",
    description: "Creates state/nonce and returns Google authorization URL."
  })
  @ApiBody({ type: OauthStartDto })
  @ApiOkResponse({
    description: "OAuth authorization payload",
    schema: {
      example: {
        provider: "google",
        authorizationUrl:
          "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=...",
        state: "eyJub25jZSI6Ii4uLiJ9.R5m..."
      }
    }
  })
  @ApiForbiddenResponse({ description: "OAuth start rate limit exceeded" })
  @ApiBadRequestResponse({ description: "Validation failed or request body missing" })
  public startGoogleOauth(
    @Body() body: OauthStartDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    return this.authService.startGoogleOauth(body, request.ip);
  }

  @Post("profile-completion")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    operationId: "Auth_profileCompletion",
    summary: "Complete current user profile fields",
    description: "Updates optional profile fields for the authenticated user."
  })
  @ApiBody({ type: ProfileCompletionDto })
  @ApiOkResponse({
    description: "Profile completion successful",
    schema: {
      example: {
        user: {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          fullName: "Jamal Salim",
          email: "jamal@example.com",
          phone: "+254712345678",
          uniqueCode: "P-12ab34cd",
          role: "promoter",
          gender: "male",
          regionId: "nairobi-west",
          authProvider: "google",
          requiresProfileCompletion: false,
          missingProfileFields: []
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiBadRequestResponse({ description: "Validation failed or empty payload" })
  public profileCompletion(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: ProfileCompletionDto
  ) {
    return this.authService.profileCompletion(currentUser, body);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    operationId: "Auth_listSessions",
    summary: "List sessions for current user",
    description: "Returns current and historical sessions for the authenticated user."
  })
  @ApiOkResponse({
    description: "Sessions fetched successfully",
    schema: {
      example: {
        sessions: [
          {
            id: "cmadfk8m50000ii9l5g8qxh4d",
            userId: "cmad4p0bo0000iib0i0l9e8wk",
            userAgent: "Mozilla/5.0",
            ipAddress: "127.0.0.1",
            createdAt: "2026-05-08T18:00:00.000Z",
            updatedAt: "2026-05-08T18:00:00.000Z",
            expiresAt: "2026-06-07T18:00:00.000Z",
            revokedAt: null,
            replacedById: null,
            isCurrent: true,
            isActive: true
          }
        ]
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listSessions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.listSessions(currentUser);
  }

  @Post("sessions/revoke-all")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    operationId: "Auth_revokeAllSessionsForCurrentUser",
    summary: "Revoke all other sessions for current user",
    description: "Revokes all sessions for the current user except current session."
  })
  @ApiNoContentResponse({ description: "Sessions revoked successfully" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public async revokeAllSessionsForCurrentUser(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<void> {
    await this.authService.revokeAllSessionsForCurrentUser(currentUser);
  }

  @Post("sessions/revoke-user")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    operationId: "Auth_revokeUserSessions",
    summary: "Admin: revoke all sessions for a target user",
    description: "Admin-only endpoint to revoke all sessions for target user id."
  })
  @ApiBody({ type: RevokeUserSessionsDto })
  @ApiNoContentResponse({ description: "Target user sessions revoked successfully" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiForbiddenResponse({ description: "Only admin users can call this endpoint" })
  public async revokeUserSessions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: RevokeUserSessionsDto
  ): Promise<void> {
    await this.authService.revokeAllSessionsByAdmin(currentUser, body);
  }

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: "Auth_signOut",
    summary: "Revoke current refresh token session",
    description: "Revokes the session represented by provided refresh token."
  })
  @ApiBody({ type: SignOutDto })
  @ApiNoContentResponse({ description: "Session revoked or already inactive" })
  @ApiBadRequestResponse({ description: "Validation failed or request body missing" })
  public async signOut(@Body() body: SignOutDto): Promise<void> {
    await this.authService.signOut(body);
  }
}
