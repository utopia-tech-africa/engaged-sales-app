import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
@ApiTags("Me")
@ApiBearerAuth("bearer")
export class MeController {
  public constructor(@Inject(MeService) private readonly meService: MeService) {}

  @Get()
  @ApiOperation({
    operationId: "Me_getMe",
    summary: "Get current user profile",
    description: "Returns the authenticated user's profile details."
  })
  @ApiOkResponse({
    description: "Current user profile",
    schema: {
      example: {
        id: "cmad4p0bo0000iib0i0l9e8wk",
        fullName: "Jamal Salim",
        phone: "+254712345678",
        role: "promoter",
        gender: "male",
        regionId: "nairobi-west"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiNotFoundResponse({ description: "User profile not found" })
  public getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getCurrentUser(currentUser);
  }

  @Patch()
  @ApiOperation({
    operationId: "Me_updateMe",
    summary: "Update current user profile",
    description: "Updates one or more profile fields for the authenticated user."
  })
  @ApiBody({
    type: UpdateMeDto,
    examples: {
      updateNameAndRegion: {
        summary: "Update name and region",
        value: {
          fullName: "Jamal S. Salim",
          regionId: "nairobi-east"
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Updated profile",
    schema: {
      example: {
        id: "cmad4p0bo0000iib0i0l9e8wk",
        fullName: "Jamal S. Salim",
        phone: "+254712345678",
        role: "promoter",
        gender: "male",
        regionId: "nairobi-east"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: UpdateMeDto) {
    return this.meService.updateCurrentUser(currentUser, body);
  }

  @Get("location/history")
  @ApiOperation({
    operationId: "Me_listLocationHistory",
    summary: "List own location check-ins",
    description: "Returns recent location pings for the authenticated user, newest first."
  })
  @ApiOkResponse({
    description: "Location ping rows",
    schema: {
      example: [
        {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          latitude: -1.286389,
          longitude: 36.817223,
          placeLabel: "City Square, Nairobi, Kenya",
          recordedAt: "2026-05-08T18:20:00.000Z"
        }
      ]
    }
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum rows to return (1–100, default 50)",
    schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listLocationHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.meService.listLocationHistory(currentUser, limit);
  }

  @Post("location")
  @ApiOperation({
    operationId: "Me_updateMeLocation",
    summary: "Record user location",
    description: "Stores a location ping for the authenticated user."
  })
  @ApiBody({
    type: UpdateLocationDto,
    examples: {
      nairobiDowntown: {
        summary: "Nairobi CBD location ping",
        value: {
          latitude: -1.286389,
          longitude: 36.817223
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Recorded location ping",
    schema: {
      example: {
        userId: "cmad4p0bo0000iib0i0l9e8wk",
        latitude: -1.286389,
        longitude: 36.817223,
        placeLabel: "City Square, Nairobi, Kenya",
        recordedAt: "2026-05-08T18:20:00.000Z"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public updateMeLocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdateLocationDto
  ) {
    return this.meService.updateLocation(currentUser, body);
  }
}
