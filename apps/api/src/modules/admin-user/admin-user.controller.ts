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
import { AdminUserService } from "./admin-user.service";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

@Controller("admin/users")
@ApiTags("Admin users (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class AdminUserController {
  public constructor(
    @Inject(AdminUserService) private readonly adminUserService: AdminUserService
  ) {}

  @Get()
  @ApiOperation({
    operationId: "AdminUser_listUsers",
    summary: "List users (supervisor / admin)",
    description:
      "Supervisors see promoters and clients only; admins see all users. Sends invite email (Resend) on create when `RESEND_API_KEY` is set."
  })
  @ApiOkResponse({ description: "List of users" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listUsers(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.adminUserService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({
    operationId: "AdminUser_createUser",
    summary: "Create user (invite)",
    description:
      "Creates a credentials user and emails sign-in instructions via Resend when configured."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["fullName", "email", "phone", "role"],
      properties: {
        fullName: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string", example: "+254712345678" },
        role: {
          type: "string",
          enum: ["promoter", "client", "supervisor", "admin"]
        },
        regionId: { type: "string", description: "Optional region cuid" },
        gender: { type: "string", enum: ["male", "female", "other"] }
      }
    }
  })
  @ApiCreatedResponse({ description: "User created" })
  @ApiConflictResponse({ description: "Phone or email already in use" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({
    description: "Requires supervisor or admin; only admins may create supervisor/admin"
  })
  public createUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateAdminUserDto
  ) {
    return this.adminUserService.createForAdmin(currentUser, body);
  }

  @Patch(":id")
  @ApiParam({ name: "id", description: "User id (cuid)" })
  @ApiOperation({
    operationId: "AdminUser_updateUser",
    summary: "Update user",
    description:
      "Partial update. Supervisors may edit promoters and clients only. Only admins may assign supervisor or admin roles."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        role: {
          type: "string",
          enum: ["promoter", "client", "supervisor", "admin"]
        },
        regionId: { type: "string" },
        isActive: { type: "boolean" },
        gender: { type: "string", enum: ["male", "female", "other"] }
      }
    }
  })
  @ApiOkResponse({ description: "User updated" })
  @ApiNotFoundResponse({ description: "User id not found" })
  @ApiConflictResponse({ description: "Unique constraint violation" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Not allowed for this role or target user" })
  public updateUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateAdminUserDto
  ) {
    return this.adminUserService.updateForAdmin(currentUser, id, body);
  }
}
