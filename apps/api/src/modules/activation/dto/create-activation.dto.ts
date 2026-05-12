import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateActivationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public name!: string;

  @ApiPropertyOptional({
    description: "URL-safe key; if omitted, derived from name (unique suffix on collision)."
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  public slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public description?: string;

  @ApiPropertyOptional({
    description: "Region ids (cuids) this activation spans. Omit or empty for none.",
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public regionIds?: string[];

  @Type(() => Date)
  @IsDate()
  public startsAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public endsAt?: Date;

  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({
    description:
      "Geofence (work area) ids for this activation. Rostered promoters must sign in inside at least one of these zones while the activation is current; if empty or omitted, global geofence rules apply when configured.",
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public geofenceIds?: string[];
}
