import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateOutletDto {
  @ApiProperty({ type: String, example: "Quickmart - Ngong Road" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public name!: string;

  @ApiProperty({ type: String, example: "Supermarket" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public category!: string;

  @ApiProperty({ type: String, example: "ABC Distributors Ltd" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public distributorName!: string;

  @ApiProperty({ type: String, example: "Nairobi West" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public locationArea!: string;

  @ApiPropertyOptional({ type: String, example: "Jane Doe" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public contactName?: string;

  @ApiPropertyOptional({ type: String, example: "0244123456" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  public contactPhone?: string;

  @ApiPropertyOptional({ type: String, example: "manager@quickmart.example" })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  public contactEmail?: string;

  @ApiPropertyOptional({ type: Boolean, example: true, default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
