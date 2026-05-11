import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateSubwholesaleDto } from "./dto/create-subwholesale.dto";
import { UpdateSubwholesaleDto } from "./dto/update-subwholesale.dto";
import { SubwholesaleService } from "./subwholesale.service";

@Controller("admin/subwholesales")
@ApiTags("Admin subwholesales (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class SubwholesaleController {
  public constructor(
    @Inject(SubwholesaleService) private readonly subwholesaleService: SubwholesaleService
  ) {}

  @Get()
  @ApiOperation({
    operationId: "AdminSubwholesale_listSubwholesales",
    summary: "List subwholesales",
    description: "Returns subwholesale nodes under regions, optionally filtered by region id."
  })
  @ApiQuery({ name: "regionId", required: false, description: "Filter by parent region id (cuid)" })
  @ApiOkResponse({ description: "List of subwholesales with region summary" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listSubwholesales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("regionId") regionId?: string
  ) {
    return this.subwholesaleService.listForAdmin(currentUser, regionId);
  }

  @Post()
  @ApiOperation({
    operationId: "AdminSubwholesale_createSubwholesale",
    summary: "Create subwholesale",
    description: "Creates a subwholesale under a region. Slug is unique per region."
  })
  @ApiBody({ type: CreateSubwholesaleDto })
  @ApiCreatedResponse({ description: "Subwholesale created" })
  @ApiConflictResponse({ description: "Slug already in use in this region" })
  @ApiNotFoundResponse({ description: "Region not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public createSubwholesale(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSubwholesaleDto
  ) {
    return this.subwholesaleService.createForAdmin(currentUser, body);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Subwholesale id (cuid)" })
  @ApiOperation({
    operationId: "AdminSubwholesale_updateSubwholesale",
    summary: "Update subwholesale",
    description: "Partial update including optional move to another region."
  })
  @ApiBody({ type: UpdateSubwholesaleDto })
  @ApiOkResponse({ description: "Subwholesale updated" })
  @ApiNotFoundResponse({ description: "Subwholesale or region not found" })
  @ApiConflictResponse({ description: "Slug already in use in target region" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public updateSubwholesale(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateSubwholesaleDto
  ) {
    return this.subwholesaleService.updateForAdmin(currentUser, id, body);
  }
}
