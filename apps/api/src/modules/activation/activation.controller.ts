import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
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
    description: "Campaigns / activations with region and counts."
  })
  @ApiOkResponse({ description: "Activation list" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listActivations(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activationService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({ summary: "Create activation" })
  @ApiCreatedResponse({ description: "Activation created" })
  @ApiConflictResponse({ description: "Slug already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  @ApiNotFoundResponse({ description: "Region not found" })
  public createActivation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateActivationDto
  ) {
    return this.activationService.createForAdmin(currentUser, body);
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Get activation" })
  @ApiOkResponse({ description: "Activation detail with products and roster" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public getActivation(@CurrentUser() currentUser: AuthenticatedUser, @Param("id") id: string) {
    return this.activationService.getByIdForAdmin(currentUser, id);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({ summary: "Update activation" })
  @ApiOkResponse({ description: "Activation updated" })
  @ApiNotFoundResponse({ description: "Activation or region not found" })
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
