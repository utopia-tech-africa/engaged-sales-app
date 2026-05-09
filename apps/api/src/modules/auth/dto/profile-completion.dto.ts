import {
  IsIn,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ProfileCompletionDto {
  @ApiPropertyOptional({ type: String, example: "jamal@example.com" })
  @IsOptional()
  @IsEmail()
  public email?: string;

  @ApiPropertyOptional({ type: String, example: "+254712345678" })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone?: string;

  @ApiPropertyOptional({ type: String, example: "male", enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";

  @ApiPropertyOptional({ type: String, example: "Jamal Salim" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName?: string;

  @ApiPropertyOptional({ type: String, example: "nairobi-west" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
