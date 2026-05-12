import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";

export class UpdateActivationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public name?: string;

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
    description:
      "Replace linked regions. Omit to leave unchanged; send [] to clear. Values are region cuids.",
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public regionIds?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public startsAt?: Date;

  @IsOptional()
  @ValidateIf((_, v: unknown) => v !== null && v !== undefined)
  @Type(() => Date)
  @IsDate()
  public endsAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({
    description:
      "Replace linked work areas (geofences). Omit to leave unchanged; send [] to clear. Rostered promoters must sign in inside one of these while the activation is current.",
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public geofenceIds?: string[];
}
