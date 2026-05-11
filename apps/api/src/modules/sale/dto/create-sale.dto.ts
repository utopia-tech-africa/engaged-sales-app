import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

export class CreateSaleItemDto {
  @IsString()
  public productId!: string;

  @Min(1)
  @Max(1_000_000)
  public quantity!: number;
}

export class CreateSaleDto {
  @IsString()
  public activationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  public items!: CreateSaleItemDto[];

  @IsOptional()
  @IsLatitude()
  public latitude?: number;

  @IsOptional()
  @IsLongitude()
  public longitude?: number;
}
