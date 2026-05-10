import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateAdminUserDto {
  @ApiProperty({ example: "Jamal Salim" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public fullName!: string;

  @ApiProperty({ example: "jamal@example.com" })
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @ApiProperty({
    example: "+254712345678",
    description: "E.164-style phone (same rules as sign-up)"
  })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone!: string;

  @ApiProperty({ enum: ["promoter", "merchandizer", "supervisor", "admin"] })
  @IsIn(["promoter", "merchandizer", "supervisor", "admin"])
  public role!: "promoter" | "merchandizer" | "supervisor" | "admin";

  @ApiPropertyOptional({ description: "Region id (cuid) for assignment" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;

  @ApiPropertyOptional({ enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";
}
