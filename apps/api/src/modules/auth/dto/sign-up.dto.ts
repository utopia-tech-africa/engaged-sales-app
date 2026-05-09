import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SignUpDto {
  @ApiProperty({ type: String, example: "Jamal Salim", description: "Full name of the user" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName!: string;

  @ApiProperty({ type: String, example: "+254712345678", description: "E.164 phone number" })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone!: string;

  @ApiProperty({ type: String, example: "male", enum: ["male", "female", "other"] })
  @IsIn(["male", "female", "other"])
  public gender!: "male" | "female" | "other";

  @ApiPropertyOptional({ type: String, example: "nairobi-west", description: "Optional sales region id" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
