import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
export class MeController {
  public constructor(private readonly meService: MeService) {}

  @Get()
  public getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getCurrentUser(currentUser);
  }

  @Patch()
  public updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: UpdateMeDto) {
    return this.meService.updateCurrentUser(currentUser, body);
  }

  @Post("location")
  public updateMeLocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdateLocationDto
  ) {
    return this.meService.updateLocation(currentUser, body);
  }
}
