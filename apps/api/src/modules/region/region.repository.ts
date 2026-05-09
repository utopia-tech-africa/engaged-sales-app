import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RegionRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findAll() {
    return this.prisma.region.findMany({
      orderBy: { name: "asc" }
    });
  }

  public findById(id: string) {
    return this.prisma.region.findUnique({ where: { id } });
  }

  public findBySlug(slug: string) {
    return this.prisma.region.findUnique({ where: { slug } });
  }

  public create(data: { slug: string; name: string; isActive: boolean }) {
    return this.prisma.region.create({ data });
  }

  public update(
    id: string,
    data: Partial<{
      slug: string;
      name: string;
      isActive: boolean;
    }>
  ) {
    return this.prisma.region.update({
      where: { id },
      data
    });
  }
}
