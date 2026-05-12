import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { UserRole as PrismaUserRole } from "../../generated/prisma/client";
import { ResendEmailService } from "../email/resend-email.service";
import { RegionRepository } from "../region/region.repository";
import { AdminUserRepository, type AdminUserListRow } from "./admin-user.repository";
import type { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import type { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const ELEVATED_ROLES = new Set<PrismaUserRole>(["supervisor", "admin"]);

@Injectable()
export class AdminUserService {
  public constructor(
    @Inject(AdminUserRepository) private readonly repository: AdminUserRepository,
    @Inject(RegionRepository) private readonly regionRepository: RegionRepository,
    @Inject(ResendEmailService) private readonly resendEmailService: ResendEmailService
  ) {}

  private requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage users");
    }
  }

  private assertCanAssignRoleOnCreate(currentUser: AuthenticatedUser, role: PrismaUserRole): void {
    if (ELEVATED_ROLES.has(role) && currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can create supervisor or admin users");
    }
  }

  private assertCanAssignRoleOnUpdate(
    currentUser: AuthenticatedUser,
    nextRole: PrismaUserRole
  ): void {
    if (ELEVATED_ROLES.has(nextRole) && currentUser.role !== "admin") {
      throw new ForbiddenException("Only admins can assign supervisor or admin roles");
    }
  }

  private supervisorMayEditTarget(currentUser: AuthenticatedUser, target: AdminUserListRow): void {
    if (currentUser.role !== "supervisor") {
      return;
    }
    if (ELEVATED_ROLES.has(target.role)) {
      throw new ForbiddenException("Supervisors cannot edit supervisor or admin accounts");
    }
  }

  public async listForAdmin(currentUser: AuthenticatedUser): Promise<AdminUserListRow[]> {
    this.requireSupervisorOrAdmin(currentUser);
    const filter =
      currentUser.role === "supervisor" ? (["promoter", "client"] as PrismaUserRole[]) : undefined;
    return this.repository.listUsers(filter);
  }

  public async createForAdmin(
    currentUser: AuthenticatedUser,
    dto: CreateAdminUserDto
  ): Promise<AdminUserListRow> {
    this.requireSupervisorOrAdmin(currentUser);
    const role = dto.role;
    this.assertCanAssignRoleOnCreate(currentUser, role);

    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    if (dto.regionId !== undefined) {
      const region = await this.regionRepository.findById(dto.regionId);
      if (!region) {
        throw new BadRequestException("Region not found");
      }
    }

    const [phoneTaken, emailTaken] = await Promise.all([
      this.repository.findByPhone(phone),
      this.repository.findByEmail(email)
    ]);
    if (phoneTaken) {
      throw new ConflictException("A user with this phone already exists");
    }
    if (emailTaken) {
      throw new ConflictException("A user with this email already exists");
    }

    const uniqueCode = AdminUserRepository.makeUniqueCodeForRole(role);
    const created = await this.repository.createUser({
      fullName,
      email,
      phone,
      role,
      uniqueCode,
      ...(dto.regionId !== undefined ? { regionId: dto.regionId } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {})
    });

    await this.resendEmailService.sendUserInviteEmail({
      to: email,
      fullName,
      phone,
      uniqueCode,
      role
    });

    return created;
  }

  public async updateForAdmin(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateAdminUserDto
  ): Promise<AdminUserListRow> {
    this.requireSupervisorOrAdmin(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    this.supervisorMayEditTarget(currentUser, existing);

    if (dto.role !== undefined) {
      this.assertCanAssignRoleOnUpdate(currentUser, dto.role);
    }

    if (currentUser.id === id && dto.isActive === false) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    const patch: Parameters<AdminUserRepository["updateUser"]>[1] = {};
    if (dto.fullName !== undefined) {
      patch.fullName = dto.fullName.trim();
    }
    if (dto.role !== undefined) {
      patch.role = dto.role;
    }
    if (dto.regionId !== undefined) {
      if (dto.regionId === null) {
        patch.regionId = null;
      } else {
        const region = await this.regionRepository.findById(dto.regionId);
        if (!region) {
          throw new BadRequestException("Region not found");
        }
        patch.regionId = dto.regionId;
      }
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }
    if (dto.gender !== undefined) {
      patch.gender = dto.gender;
    }

    try {
      return await this.repository.updateUser(id, patch);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new ConflictException("Update conflicts with an existing user (email or phone)");
      }
      throw error;
    }
  }
}
