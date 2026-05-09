import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

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

  @ApiPropertyOptional({
    description:
      "Device latitude (decimal degrees). Required when at least one geofence is active; send together with longitude.",
    type: "number",
    example: -1.286389
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  public latitude?: number;

  @ApiPropertyOptional({
    description:
      "Device longitude (decimal degrees). Required with latitude when geofencing is enforced.",
    type: "number",
    example: 36.817223
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  public longitude?: number;
}
