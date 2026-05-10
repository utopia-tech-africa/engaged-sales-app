import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRegionDto {
  @ApiPropertyOptional({
    description:
      "Optional explicit slug. If omitted, a slug is generated from `name` (and made unique if needed)."
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG_RE, {
    message: "slug must be lowercase letters, numbers, and single hyphens (e.g. nairobi-west)"
  })
  public slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public name!: string;

  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
