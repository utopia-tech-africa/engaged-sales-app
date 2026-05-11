import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SubwholesaleRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findMany(args: { regionId?: string }) {
    return this.prisma.subwholesale.findMany({
      where: args.regionId !== undefined ? { regionId: args.regionId } : {},
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      include: {
        region: { select: { id: true, name: true, slug: true } }
      }
    });
  }

  public findById(id: string) {
    return this.prisma.subwholesale.findUnique({
      where: { id },
      include: {
        region: { select: { id: true, name: true, slug: true } }
      }
    });
  }

  public findByRegionAndSlug(regionId: string, slug: string) {
    return this.prisma.subwholesale.findUnique({
      where: { regionId_slug: { regionId, slug } }
    });
  }

  public create(data: {
    regionId: string;
    slug: string;
    name: string;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    notes: string | null;
    isActive: boolean;
  }) {
    return this.prisma.subwholesale.create({
      data,
      include: {
        region: { select: { id: true, name: true, slug: true } }
      }
    });
  }

  public update(
    id: string,
    data: Partial<{
      regionId: string;
      slug: string;
      name: string;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      notes: string | null;
      isActive: boolean;
    }>
  ) {
    return this.prisma.subwholesale.update({
      where: { id },
      data,
      include: {
        region: { select: { id: true, name: true, slug: true } }
      }
    });
  }
}
