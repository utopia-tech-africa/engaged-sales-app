import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
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
import { CreateGeofenceDto } from "./dto/create-geofence.dto";
import { UpdateGeofenceDto } from "./dto/update-geofence.dto";
import { GeofenceService } from "./geofence.service";

@Controller("admin/geofences")
@ApiTags("Admin geofences (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class GeofenceController {
  public constructor(@Inject(GeofenceService) private readonly geofenceService: GeofenceService) {}

  @Get()
  @ApiOperation({
    operationId: "AdminGeofence_listGeofences",
    summary: "List geofences (supervisor / admin)",
    description: "Returns all geofence definitions for the operations dashboard."
  })
  @ApiOkResponse({ description: "List of geofences" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listGeofences(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.geofenceService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({
    operationId: "AdminGeofence_createGeofence",
    summary: "Create geofence (supervisor / admin)",
    description:
      "Creates a circular work area. Sign-in is allowed when the device is inside any active geofence."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["label", "centerLatitude", "centerLongitude", "radiusMeters"],
      properties: {
        label: { type: "string", example: "Nairobi CBD" },
        centerLatitude: { type: "number", example: -1.286389 },
        centerLongitude: { type: "number", example: 36.817223 },
        radiusMeters: {
          type: "number",
          example: 5000,
          description: "Radius from center in meters"
        },
        isActive: { type: "boolean", example: true }
      }
    }
  })
  @ApiCreatedResponse({ description: "Geofence created" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public createGeofence(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateGeofenceDto
  ) {
    return this.geofenceService.createForAdmin(currentUser, body);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Geofence id" })
  @ApiOperation({
    operationId: "AdminGeofence_updateGeofence",
    summary: "Update geofence (supervisor / admin)",
    description: "Partial update (label, center, radius, isActive)."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        label: { type: "string" },
        centerLatitude: { type: "number" },
        centerLongitude: { type: "number" },
        radiusMeters: { type: "number" },
        isActive: { type: "boolean" }
      }
    }
  })
  @ApiOkResponse({ description: "Geofence updated" })
  @ApiNotFoundResponse({ description: "Geofence id not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public updateGeofence(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateGeofenceDto
  ) {
    return this.geofenceService.updateForAdmin(currentUser, id, body);
  }
}
