import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { AuthProvider, Gender, UserRole } from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const userAdminSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  uniqueCode: true,
  role: true,
  isActive: true,
  gender: true,
  regionId: true,
  authProvider: true,
  createdAt: true,
  updatedAt: true,
  region: { select: { id: true, name: true, slug: true } }
};

export type AdminUserListRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  uniqueCode: string;
  role: UserRole;
  isActive: boolean;
  gender: Gender | null;
  regionId: string | null;
  authProvider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
  region: { id: string; name: string; slug: string } | null;
};

@Injectable()
export class AdminUserRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public listUsers(roleFilter: UserRole[] | undefined): Promise<AdminUserListRow[]> {
    const where = roleFilter !== undefined ? { role: { in: roleFilter } } : {};
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: userAdminSelect
    });
  }

  public findById(id: string): Promise<AdminUserListRow | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userAdminSelect
    });
  }

  public findByPhone(phone: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      select: { id: true }
    });
  }

  public findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
  }

  public deleteById(id: string): Promise<{ id: string }> {
    return this.prisma.user.delete({
      where: { id },
      select: { id: true }
    });
  }

  public createUser(data: {
    fullName: string;
    email?: string | null;
    phone: string;
    role: UserRole;
    uniqueCode: string;
    regionId?: string;
    gender?: Gender;
  }): Promise<AdminUserListRow> {
    return this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email ?? null,
        phone: data.phone,
        role: data.role,
        uniqueCode: data.uniqueCode,
        authProvider: "credentials",
        isActive: true,
        ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {})
      },
      select: userAdminSelect
    });
  }

  public updateUser(
    id: string,
    patch: Partial<{
      fullName: string;
      role: UserRole;
      regionId: string | null;
      isActive: boolean;
      gender: Gender | null;
    }>
  ): Promise<AdminUserListRow> {
    return this.prisma.user.update({
      where: { id },
      data: patch,
      select: userAdminSelect
    });
  }

  public static makeUniqueCodeForRole(role: UserRole): string {
    const prefix =
      role === "promoter" ? "P" : role === "client" ? "C" : role === "supervisor" ? "S" : "A";
    return `${prefix}-${randomUUID().slice(0, 8)}`;
  }
}
