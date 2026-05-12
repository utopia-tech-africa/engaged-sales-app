import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TrackingService } from "./tracking.service";

@Controller("admin/tracking")
@ApiTags("Live tracking (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class TrackingController {
  public constructor(@Inject(TrackingService) private readonly trackingService: TrackingService) {}

  @Get("check-ins/:pingId")
  @ApiParam({ name: "pingId", description: "LocationPing id (cuid)" })
  @ApiOperation({
    operationId: "Tracking_getCheckIn",
    summary: "Get one live-map check-in (with selfie)",
    description:
      "Returns the same payload as activation roster check-in detail: coordinates, time, staff, and selfie as a data URL when recorded. For promoters only; used from Live field tracking."
  })
  @ApiOkResponse({ description: "Check-in detail" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiNotFoundResponse({ description: "Ping not found or not a promoter check-in" })
  public getCheckIn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("pingId") pingId: string
  ) {
    return this.trackingService.getCheckInForAdmin(currentUser, pingId);
  }
}
