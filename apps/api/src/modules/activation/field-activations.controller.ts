import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import { sendBinaryFile, type BinaryFileResponse } from "../../common/http/send-binary-file";
import {
  ApiBearerAuth,
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

/**
 * BACKEND_PRD §7.3 — activations visible to the caller (roster for promoters and read-only clients;
 * all in-window activations for supervisor/admin).
 */
@Controller("activations")
@ApiTags("Activations (field)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class FieldActivationsController {
  public constructor(
    @Inject(ActivationService) private readonly activationService: ActivationService
  ) {}

  @Get()
  @ApiOperation({
    operationId: "Activations_listForField",
    summary: "List activations (field)",
    description:
      "Promoters and rostered clients see activations they are assigned to that are currently active. Supervisors and admins see all activations in their active date window."
  })
  @ApiOkResponse({ description: "Activation rows with linked regions and product count" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  public listForField(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activationService.listForField(currentUser);
  }

  @Get(":id/team-sales")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    operationId: "Activations_listTeamSalesForClient",
    summary: "List team sales on activation (client)",
    description:
      "Read-only. Rostered clients see sales line items recorded by field staff on this activation."
  })
  @ApiQuery({ name: "limit", required: false, schema: { default: 50, minimum: 1, maximum: 200 } })
  @ApiOkResponse({ description: "Sales rows with seller and line items" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Not a client or not rostered on this activation" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public listTeamSalesForClient(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.activationService.listTeamSalesForClient(currentUser, id, limit);
  }

  @Get(":id/export.xlsx")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    operationId: "Activations_exportClientActivationWorkbook",
    summary: "Download activation Excel report (client)",
    description:
      "Read-only export: activation summary, products, and sales line items for roster field staff. Optional `from` / `to` ISO date-times are intersected with the activation window."
  })
  @ApiQuery({ name: "from", required: false, description: "ISO 8601 date-time (optional filter)" })
  @ApiQuery({ name: "to", required: false, description: "ISO 8601 date-time (optional filter)" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Not a client or not rostered on this activation" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public async exportClientActivationWorkbook(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res() response: BinaryFileResponse
  ): Promise<void> {
    const buffer = await this.activationService.exportClientActivationWorkbook(
      currentUser,
      id,
      from,
      to
    );
    sendBinaryFile(
      response,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `activation-${id}-report.xlsx`
    );
  }

  @Get(":id/products")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    operationId: "Activations_listProductsForField",
    summary: "List products for an activation (field)"
  })
  @ApiQuery({ name: "limit", required: false, schema: { default: 50, minimum: 1, maximum: 100 } })
  @ApiQuery({ name: "offset", required: false, schema: { default: 0, minimum: 0 } })
  @ApiOkResponse({ description: "Paged activation products" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Caller is not assigned to this activation" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public listProductsForField(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number
  ) {
    return this.activationService.listProductsForField(currentUser, id, limit, offset);
  }

  @Get(":id")
  @ApiParam({ name: "id", description: "Activation id (cuid)" })
  @ApiOperation({
    operationId: "Activations_getByIdForField",
    summary: "Get activation (field)",
    description:
      "Full detail including products for supervisor/admin; promoters and clients receive the same shape without the roster list."
  })
  @ApiOkResponse({ description: "Activation detail" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Caller is not assigned to this activation" })
  @ApiNotFoundResponse({ description: "Activation not found" })
  public getByIdForField(@CurrentUser() currentUser: AuthenticatedUser, @Param("id") id: string) {
    return this.activationService.getByIdForField(currentUser, id);
  }
}
