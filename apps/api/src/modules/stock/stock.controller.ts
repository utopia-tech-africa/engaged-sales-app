import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateStockPickupDto } from "./dto/create-stock-pickup.dto";
import { CreateStockSaleDto } from "./dto/create-stock-sale.dto";
import { StockService } from "./stock.service";

@Controller("stock")
@ApiTags("Stock & sales tracking (field)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class StockController {
  public constructor(@Inject(StockService) private readonly stockService: StockService) {}

  @Post("pickups")
  @ApiOperation({
    operationId: "Stock_recordPickup",
    summary: "Record stock pick-up",
    description:
      "Captures distributor name, SKU picked, quantity, cost price and pickup datetime for field inventory receipts."
  })
  @ApiBody({ type: CreateStockPickupDto })
  @ApiOkResponse({ description: "Stock pickup recorded" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public recordPickup(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateStockPickupDto
  ) {
    return this.stockService.recordPickup(currentUser, body);
  }

  @Post("sales")
  @ApiOperation({
    operationId: "Stock_recordSale",
    summary: "Record stock sale with pricing",
    description:
      "Captures sold SKU, quantity, selling price and returns remaining stock balance per sold SKU."
  })
  @ApiBody({ type: CreateStockSaleDto })
  @ApiOkResponse({ description: "Stock sale recorded with remaining balances" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public recordSale(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateStockSaleDto
  ) {
    return this.stockService.recordSale(currentUser, body);
  }

  @Get("daily-summary")
  @ApiOperation({
    operationId: "Stock_getDailySummary",
    summary: "Get daily inventory and sales summary",
    description:
      "Returns opening stock, stock received, stock sold, closing balance, daily sales value and case achievement per SKU."
  })
  @ApiQuery({ name: "activationId", required: true })
  @ApiQuery({ name: "date", required: true, description: "YYYY-MM-DD" })
  @ApiOkResponse({ description: "Daily stock and sales summary" })
  public getDailySummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("activationId") activationId: string,
    @Query("date") date: string
  ) {
    if (activationId.trim().length === 0 || date.trim().length === 0) {
      throw new BadRequestException("activationId and date are required");
    }
    return this.stockService.getDailySummary(currentUser, activationId, date);
  }

  @Get("/admin-overview")
  @ApiOperation({
    operationId: "Stock_getAdminOverview",
    summary: "Get ops stock overview",
    description:
      "Cross-user stock rollup by SKU with per-distributor pickup analytics and daily sales value."
  })
  @ApiQuery({ name: "activationId", required: true })
  @ApiQuery({ name: "date", required: true, description: "YYYY-MM-DD" })
  @ApiOkResponse({ description: "Ops stock overview payload" })
  public getAdminOverview(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("activationId") activationId: string,
    @Query("date") date: string
  ) {
    if (activationId.trim().length === 0 || date.trim().length === 0) {
      throw new BadRequestException("activationId and date are required");
    }
    return this.stockService.getAdminOverview(currentUser, activationId, date);
  }
}
