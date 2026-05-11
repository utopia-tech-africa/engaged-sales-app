import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
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
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { UpdateOutletDto } from "./dto/update-outlet.dto";
import { OutletService } from "./outlet.service";

@Controller("admin/outlets")
@ApiTags("Admin outlets (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class OutletController {
  public constructor(@Inject(OutletService) private readonly outletService: OutletService) {}

  @Get()
  @ApiOperation({
    operationId: "AdminOutlet_listOutlets",
    summary: "List outlet database",
    description: "Returns all outlets with distributor, area and contact details."
  })
  @ApiOkResponse({ description: "Outlet database rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listOutlets(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.outletService.listForAdmin(currentUser);
  }

  @Get("visits")
  @ApiOperation({
    operationId: "AdminOutlet_listOutletVisits",
    summary: "List outlet visit reports",
    description: "Returns outlet visits with optional filters for outlet, user and datetime range."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Max rows (1-200, default 100)",
    schema: { type: "integer", default: 100, minimum: 1, maximum: 200 }
  })
  @ApiQuery({
    name: "skip",
    required: false,
    description: "Rows to skip for pagination (default 0)",
    schema: { type: "integer", default: 0, minimum: 0 }
  })
  @ApiQuery({ name: "outletId", required: false, description: "Filter one outlet id" })
  @ApiQuery({ name: "userId", required: false, description: "Filter one field user id" })
  @ApiQuery({ name: "from", required: false, description: "ISO datetime inclusive lower bound" })
  @ApiQuery({ name: "to", required: false, description: "ISO datetime inclusive upper bound" })
  @ApiOkResponse({ description: "Outlet visit report rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listOutletVisits(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("outletId") outletId?: string,
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.outletService.listVisitsForAdmin(currentUser, {
      limit,
      ...(skip > 0 ? { skip } : {}),
      ...(outletId !== undefined ? { outletId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {})
    });
  }

  @Post()
  @ApiOperation({
    operationId: "AdminOutlet_createOutlet",
    summary: "Create outlet",
    description: "Adds a new outlet with category, distributor link and contact details."
  })
  @ApiBody({ type: CreateOutletDto })
  @ApiCreatedResponse({ description: "Outlet created" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public createOutlet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateOutletDto
  ) {
    return this.outletService.createForAdmin(currentUser, body);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Outlet id" })
  @ApiOperation({
    operationId: "AdminOutlet_updateOutlet",
    summary: "Update outlet",
    description: "Partial update for outlet attributes."
  })
  @ApiBody({ type: UpdateOutletDto })
  @ApiOkResponse({ description: "Outlet updated" })
  @ApiNotFoundResponse({ description: "Outlet id not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public updateOutlet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateOutletDto
  ) {
    return this.outletService.updateForAdmin(currentUser, id, body);
  }
}
