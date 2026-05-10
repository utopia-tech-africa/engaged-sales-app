import { Type } from "class-transformer";
import {
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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public regionId?: string;

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
}
