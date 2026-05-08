import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignOutDto } from "./dto/sign-out.dto";
import { SignUpDto } from "./dto/sign-up.dto";

@Controller("auth")
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post("sign-up")
  public signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
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

  @Post("refresh")
  public refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async signOut(@Body() body: SignOutDto): Promise<void> {
    await this.authService.signOut(body);
  }
}
