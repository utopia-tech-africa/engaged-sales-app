import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
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
import { ActivationService } from "./activation.service";
import { AddActivationRosterBatchDto } from "./dto/add-activation-roster-batch.dto";
import { AddActivationRosterDto } from "./dto/add-activation-roster.dto";
import { CreateActivationDto } from "./dto/create-activation.dto";
import { CreateActivationProductDto } from "./dto/create-activation-product.dto";
import { UpdateActivationDto } from "./dto/update-activation.dto";

@Controller("admin/activations")
@ApiTags("Admin activations (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class ActivationController {
  public constructor(
    @Inject(ActivationService) private readonly activationService: ActivationService
  ) {}

  @Get()
  @ApiOperation({
    summary: "List activations",
    description: "Campaigns / activations with linked regions and counts."
  })
  @ApiOkResponse({ description: "Activation list" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listActivations(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activationService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({ summary: "Create activation" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "startsAt"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 128 },
        slug: { type: "string", minLength: 2, maxLength: 64 },
        description: { type: "string", maxLength: 2000 },
        regionIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional region cuids; activation can span multiple territories."
        },
        startsAt: { type: "string", format: "date-time" },
        endsAt: { type: "string", format: "date-time" },
        isActive: { type: "boolean" },
        geofenceIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional work area ids; rostered promoters must sign in inside one of these while the activation is current."
        }
      }
    }
  })
  @ApiCreatedResponse({ description: "Activation created" })
  @ApiConflictResponse({ description: "Slug already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiBadRequestResponse({ description: "One or more regions or geofences not found" })
  public createActivation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateActivationDto
  ) {
    return this.activationService.createForAdmin(currentUser, body);
  }

  @Get(":id/field-activity/sales")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    summary: "List sales on activation (field activity)",
    description:
      "Sales on this activation from roster members only, with seller and line items. Optional userId, from, and to (ISO 8601) narrow results; time range is intersected with the activation window. Supervisor or admin only."
  })
  @ApiQuery({ name: "limit", required: false, schema: { default: 100, minimum: 1, maximum: 200 } })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Restrict to this roster user (must be on the activation roster)"
  })
  @ApiQuery({
    name: "from",
    required: false,
    description: "Lower bound on sale createdAt (ISO 8601), intersected with activation startsAt"
  })
  @ApiQuery({
    name: "to",
    required: false,
    description:
      "Upper bound on sale createdAt (ISO 8601), intersected with activation endsAt when set"
  })
  @ApiOkResponse({ description: "Sales newest first" })
  @ApiBadRequestResponse({ description: "Invalid date or userId not on roster" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public listFieldActivitySales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.activationService.listFieldActivitySalesForAdmin(
      currentUser,
      id,
      limit,
      userId,
      from,
      to
    );
  }

  @Get(":id/field-activity/locations")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    summary: "List roster location pings (field activity)",
    description:
      "Location pings for users on this activation roster. Time range defaults to the activation window; optional from/to narrow it. Optional userId must be on the roster. Supervisor or admin only."
  })
  @ApiQuery({ name: "limit", required: false, schema: { default: 500, minimum: 1, maximum: 2000 } })
  @ApiQuery({ name: "userId", required: false, description: "Single roster user" })
  @ApiQuery({ name: "from", required: false, description: "ISO 8601 lower bound on recordedAt" })
  @ApiQuery({ name: "to", required: false, description: "ISO 8601 upper bound on recordedAt" })
  @ApiOkResponse({ description: "Location pings, newest first (global ordering)" })
  @ApiBadRequestResponse({ description: "Invalid date or userId not on roster" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public listFieldActivityLocations(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(500), ParseIntPipe) limit: number,
    @Query("userId") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.activationService.listFieldActivityLocationsForAdmin(
      currentUser,
      id,
      limit,
      userId,
      from,
      to
    );
  }

  @Get(":id/field-activity/check-ins/:pingId")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiParam({ name: "pingId", description: "LocationPing id (cuid)" })
  @ApiOperation({
    summary: "Get one roster check-in (with selfie)",
    description:
      "Returns coordinates, time, place label, staff member, and selfie as a data URL when verification was recorded. The ping must be from a roster user within the activation window."
  })
  @ApiOkResponse({ description: "Check-in detail" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiNotFoundResponse({ description: "Activation or check-in not found" })
  public getFieldActivityCheckIn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Param("pingId") pingId: string
  ) {
    return this.activationService.getFieldActivityCheckInForAdmin(currentUser, id, pingId);
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Get activation" })
  @ApiOkResponse({ description: "Activation detail with products, roster, and linked work areas" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public getActivation(@CurrentUser() currentUser: AuthenticatedUser, @Param("id") id: string) {
    return this.activationService.getByIdForAdmin(currentUser, id);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Update activation" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 128 },
        slug: { type: "string", minLength: 2, maxLength: 64 },
        description: { type: "string", maxLength: 2000 },
        regionIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Replace linked regions. Omit to leave unchanged; [] clears. Values are region cuids."
        },
        startsAt: { type: "string", format: "date-time" },
        endsAt: { type: "string", format: "date-time", nullable: true },
        isActive: { type: "boolean" },
        geofenceIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Replace linked work areas. Omit to leave unchanged; [] clears. Promoters on the roster sign in inside one of these while the activation is current."
        }
      }
    }
  })
  @ApiOkResponse({ description: "Activation updated" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  @ApiBadRequestResponse({ description: "Invalid region or geofence ids" })
  @ApiConflictResponse({ description: "Slug already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public updateActivation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateActivationDto
  ) {
    return this.activationService.updateForAdmin(currentUser, id, body);
  }

  @Post(":id/products")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Add product line to activation" })
  @ApiBody({ type: CreateActivationProductDto })
  @ApiCreatedResponse({ description: "Product line created" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public addProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: CreateActivationProductDto
  ) {
    return this.activationService.addProductForAdmin(currentUser, id, body);
  }

  @Delete(":id/products/:productId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiParam({ name: "productId", description: "Activation product id (cuid)" })
  @ApiOperation({ summary: "Remove product line from activation" })
  @ApiNotFoundResponse({ description: "Activation or product not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public async removeProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Param("productId") productId: string
  ): Promise<void> {
    await this.activationService.removeProductForAdmin(currentUser, id, productId);
  }

  @Post(":id/roster/batch")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Add multiple users to activation roster (atomic)" })
  @ApiBody({ type: AddActivationRosterBatchDto })
  @ApiOkResponse({ description: "Activation detail after roster update" })
  @ApiBadRequestResponse({ description: "Invalid user ids or ineligible users" })
  @ApiConflictResponse({ description: "One or more users already on roster" })
  @ApiNotFoundResponse({ description: "Activation or user not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public addToRosterBatch(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: AddActivationRosterBatchDto
  ) {
    return this.activationService.addToRosterBatchForAdmin(currentUser, id, body);
  }

  @Post(":id/roster")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Add user to activation roster" })
  @ApiBody({ type: AddActivationRosterDto })
  @ApiCreatedResponse({ description: "Roster entry created" })
  @ApiConflictResponse({ description: "User already on roster" })
  @ApiNotFoundResponse({ description: "Activation or user not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public addToRoster(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: AddActivationRosterDto
  ) {
    return this.activationService.addToRosterForAdmin(currentUser, id, body);
  }

  @Delete(":id/roster/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiParam({ name: "userId", description: "User id (cuid)" })
  @ApiOperation({ summary: "Remove user from activation roster" })
  @ApiNotFoundResponse({ description: "Activation or roster entry not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public async removeFromRoster(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Param("userId") userId: string
  ): Promise<void> {
    await this.activationService.removeFromRosterForAdmin(currentUser, id, userId);
  }
}
