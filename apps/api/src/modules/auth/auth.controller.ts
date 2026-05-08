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
  public signUp(
    @Body() body: SignUpDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    return this.authService.signUp(body, request.ip);
  }

  @Post("signup")
  public legacySignUp(
    @Body() body: SignUpDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ) {
    this.setDeprecationHeaders(response, "/api/v1/auth/sign-up");
    return this.authService.signUp(body, request.ip);
  }

  @Post("sign-in")
  public signIn(
    @Body() body: SignInDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined;
    return this.authService.signIn(body, userAgent, request.ip);
  }

  @Post("login")
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
  public refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post("oauth/callback")
  public oauthCallback(
    @Body() body: OauthCallbackDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined;
    return this.authService.oauthCallback(body, userAgent, request.ip);
  }

  @Post("oauth/google/start")
  public startGoogleOauth(
    @Body() body: OauthStartDto,
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ) {
    return this.authService.startGoogleOauth(body, request.ip);
  }

  @Post("profile-completion")
  @UseGuards(JwtAuthGuard)
  public profileCompletion(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: ProfileCompletionDto
  ) {
    return this.authService.profileCompletion(currentUser, body);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  public listSessions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.listSessions(currentUser);
  }

  @Post("sessions/revoke-all")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revokeAllSessionsForCurrentUser(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<void> {
    await this.authService.revokeAllSessionsForCurrentUser(currentUser);
  }

  @Post("sessions/revoke-user")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revokeUserSessions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: RevokeUserSessionsDto
  ): Promise<void> {
    await this.authService.revokeAllSessionsByAdmin(currentUser, body);
  }

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async signOut(@Body() body: SignOutDto): Promise<void> {
    await this.authService.signOut(body);
  }
}
