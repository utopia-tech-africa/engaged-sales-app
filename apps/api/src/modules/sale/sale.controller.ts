import { Body, Controller, Headers, Inject, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { SaleService } from "./sale.service";

@Controller("sales")
@ApiTags("Sales (field)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class SaleController {
  public constructor(@Inject(SaleService) private readonly saleService: SaleService) {}

  @Post()
  @ApiOperation({
    operationId: "Sales_create",
    summary: "Record a sale",
    description:
      "BACKEND_PRD §7.4 — creates a sale with line items. Optional `Idempotency-Key` header dedupes retries per user."
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Optional UUID or opaque string; duplicate requests return the original sale."
  })
  @ApiBody({ type: CreateSaleDto })
  @ApiCreatedResponse({ description: "Sale with line items and activation summary" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Not assigned to activation or not a field role" })
  public createSale(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSaleDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined
  ) {
    return this.saleService.createSale(currentUser, body, idempotencyKey);
  }
}
