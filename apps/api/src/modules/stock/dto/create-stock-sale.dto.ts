import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

export class CreateStockSaleItemDto {
  @IsString()
  public productId!: string;

  @Min(1)
  @Max(1_000_000)
  public quantity!: number;

  @Min(0)
  public sellingPrice!: number;
}

export class CreateStockSaleDto {
  @IsString()
  public activationId!: string;

  @IsOptional()
  @IsDateString()
  public soldAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockSaleItemDto)
  public items!: CreateStockSaleItemDto[];
}
