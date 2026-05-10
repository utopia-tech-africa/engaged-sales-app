import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class CreateGeofenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public label!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  public centerLatitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  public centerLongitude!: number;

  @IsNumber()
  @Min(10)
  @Max(10_000_000)
  public radiusMeters!: number;

  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
