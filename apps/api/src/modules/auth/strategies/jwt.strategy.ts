import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthenticatedUser } from "../../../common/types/authenticated-user.type";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  public constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env["JWT_ACCESS_SECRET"] ?? "dev-access-secret-change-me"
    });
  }

  public async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return this.authService.validateJwtUser(payload);
  }
}
