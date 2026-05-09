import { IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignInDto {
  @ApiProperty({ type: String, example: "+254712345678", description: "Registered phone number" })
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone!: string;

  @ApiProperty({ type: String, example: "P-12ab34cd", description: "Unique promoter code" })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  public uniqueCode!: string;

  @ApiProperty({
    type: String,
    example: "promoter",
    enum: ["promoter", "merchandizer", "supervisor", "admin"]
  })
  @IsIn(["promoter", "merchandizer", "supervisor", "admin"])
  public role!: "promoter" | "merchandizer" | "supervisor" | "admin";
}
