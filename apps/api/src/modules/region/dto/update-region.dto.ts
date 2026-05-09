import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG_RE, {
    message: "slug must be lowercase letters, numbers, and single hyphens (e.g. nairobi-west)"
  })
  public slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public name?: string;

  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
