import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateActivationProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  public name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  public sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  public quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  public sortOrder?: number;

  /** Monthly case target for SKU performance dashboard (optional). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  public monthlyTargetCases?: number;
}
