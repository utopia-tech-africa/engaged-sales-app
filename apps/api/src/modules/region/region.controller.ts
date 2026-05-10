import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { RegionService } from "./region.service";

@Controller("admin/regions")
@ApiTags("Admin regions (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class RegionController {
  public constructor(@Inject(RegionService) private readonly regionService: RegionService) {}

  @Get()
  @ApiOperation({
    operationId: "AdminRegion_listRegions",
    summary: "List regions (supervisor / admin)",
    description: "Returns all sales regions for assignment and reporting."
  })
  @ApiOkResponse({ description: "List of regions" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listRegions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.regionService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({
    operationId: "AdminRegion_createRegion",
    summary: "Create region (supervisor / admin)",
    description:
      "Creates a region. Slug is generated from `name` if omitted (unique suffix added on collision). User.regionId must match a region id (cuid), not the slug."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", example: "Nairobi West" },
        slug: {
          type: "string",
          example: "nairobi-west",
          description: "Optional; otherwise derived from name"
        },
        isActive: { type: "boolean", example: true }
      }
    }
  })
  @ApiCreatedResponse({ description: "Region created" })
  @ApiConflictResponse({ description: "Slug already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public createRegion(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateRegionDto
  ) {
    return this.regionService.createForAdmin(currentUser, body);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Region id (cuid)" })
  @ApiOperation({
    operationId: "AdminRegion_updateRegion",
    summary: "Update region (supervisor / admin)",
    description: "Partial update (slug, name, isActive)."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        name: { type: "string" },
        isActive: { type: "boolean" }
      }
    }
  })
  @ApiOkResponse({ description: "Region updated" })
  @ApiNotFoundResponse({ description: "Region id not found" })
  @ApiConflictResponse({ description: "Slug already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public updateRegion(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateRegionDto
  ) {
    return this.regionService.updateForAdmin(currentUser, id, body);
  }
}
