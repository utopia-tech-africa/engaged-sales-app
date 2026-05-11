import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

export class CreateStockPickupItemDto {
  @IsString()
  public productId!: string;

  @Min(1)
  @Max(1_000_000)
  public quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  public costPrice!: number;
}

export class CreateStockPickupDto {
  @IsString()
  public activationId!: string;

  @IsString()
  public distributorName!: string;

  @IsOptional()
  @IsDateString()
  public pickedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockPickupItemDto)
  public items!: CreateStockPickupItemDto[];
}
