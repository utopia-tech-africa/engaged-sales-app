import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class OauthCallbackDto {
  @ApiProperty({ type: String, example: "google", enum: ["google"] })
  @IsIn(["google"])
  public provider!: "google";

  @ApiProperty({
    type: String,
    example: "4/0AQSTgQF...",
    description: "Authorization code from Google callback"
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  public code!: string;

  @ApiProperty({ type: String, example: "http://localhost:3000/auth/google/callback" })
  @IsUrl({ require_tld: false })
  public redirectUri!: string;

  @ApiProperty({
    type: String,
    example: "eyJub25jZSI6Ii4uLiJ9.R5m...",
    description: "Signed OAuth state from start endpoint"
  })
  @IsString()
  @MinLength(10)
  public state!: string;

  @ApiPropertyOptional({
    description: "Device latitude when geofencing is active (must be sent with longitude).",
    type: "number",
    example: -1.286389
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  public latitude?: number;

  @ApiPropertyOptional({
    description: "Device longitude when geofencing is active.",
    type: "number",
    example: 36.817223
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  public longitude?: number;
}
