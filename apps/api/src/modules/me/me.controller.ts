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
import { SaleService } from "../sale/sale.service";
import { OutletService } from "../outlet/outlet.service";
import { CreateOutletVisitDto } from "./dto/create-outlet-visit.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
@ApiTags("Me")
@ApiBearerAuth("bearer")
export class MeController {
  public constructor(
    @Inject(MeService) private readonly meService: MeService,
    @Inject(SaleService) private readonly saleService: SaleService,
    @Inject(OutletService) private readonly outletService: OutletService
  ) {}

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
        fullName: "John Doe",
        phone: "0244123456",
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
          fullName: "John Doe",
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
        fullName: "John Doe",
        phone: "0244123456",
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

  @Get("sales")
  @ApiOperation({
    operationId: "Me_listMySales",
    summary: "List my sales",
    description:
      "BACKEND_PRD §7.2 — the authenticated promoter's sales, newest first (promoters only)."
  })
  @ApiQuery({
    name: "activationId",
    required: false,
    description: "Filter to one activation (cuid)"
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Max rows (1–100, default 50)",
    schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
  })
  @ApiOkResponse({ description: "Sales with line items" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listMySales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("activationId") activationId: string | undefined,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    const trimmed =
      activationId !== undefined && activationId.trim().length > 0
        ? activationId.trim()
        : undefined;
    return this.saleService.listMySales(currentUser, trimmed, limit);
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
          attendanceKind: "clock_in",
          geofenceId: "cmad4p0bo0000iib0i0l9e8wk",
          distanceToGeofenceMeters: 42.7,
          dwellSecondsAtGeofence: 480,
          latitude: -1.286389,
          longitude: 36.817223,
          placeLabel: "City Square, Nairobi, Kenya",
          hasSelfieVerification: true,
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
    description:
      "Stores a location ping with a required selfie image for attendance verification (JPEG/PNG)."
  })
  @ApiBody({
    type: UpdateLocationDto,
    examples: {
      nairobiDowntown: {
        summary: "Nairobi CBD check-in with selfie",
        value: {
          latitude: -1.286389,
          longitude: 36.817223,
          attendanceKind: "clock_in",
          selfieImageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Recorded location ping",
    schema: {
      example: {
        userId: "cmad4p0bo0000iib0i0l9e8wk",
        attendanceKind: "clock_in",
        geofenceId: "cmad4p0bo0000iib0i0l9e8wk",
        distanceToGeofenceMeters: 42.7,
        dwellSecondsAtGeofence: 480,
        latitude: -1.286389,
        longitude: 36.817223,
        placeLabel: "City Square, Nairobi, Kenya",
        hasSelfieVerification: true,
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

  @Post("outlet-visits")
  @ApiOperation({
    operationId: "Me_createOutletVisit",
    summary: "Check in and execute outlet visit",
    description:
      "Creates an outlet visit check-in and records outlet photo, stock availability, sales made, consumer engagement and visibility execution."
  })
  @ApiBody({ type: CreateOutletVisitDto })
  @ApiOkResponse({
    description: "Outlet visit recorded",
    schema: {
      example: {
        id: "cmad4p0bo0000iib0i0l9e8wk",
        outletId: "cmad4p0bo0000iib0i0l9e8wk",
        userId: "cmad4p0bo0000iib0i0l9e8wk",
        latitude: -1.286389,
        longitude: 36.817223,
        hasOutletPhoto: true,
        stockAvailabilityNotes: "All SKUs available except 500ml variant",
        salesMadeNotes: "Sold 2 cartons and 6 singles",
        consumerEngagementNotes: "Engaged 9 consumers with product demo",
        visibilityExecutionNotes: "Shelf branding and wobblers placed",
        checkedInAt: "2026-05-08T18:20:00.000Z"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public createOutletVisit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateOutletVisitDto
  ) {
    return this.meService.createOutletVisit(currentUser, body);
  }

  @Get("outlet-visits")
  @ApiOperation({
    operationId: "Me_listOutletVisits",
    summary: "List own outlet visits",
    description: "Returns recent outlet visits for the authenticated field user."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum rows to return (1-100, default 50)",
    schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
  })
  @ApiOkResponse({ description: "Outlet visit rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listOutletVisits(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.outletService.listVisitsForField(currentUser, limit);
  }
}
