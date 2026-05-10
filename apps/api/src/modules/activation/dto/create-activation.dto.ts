import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;

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
}
