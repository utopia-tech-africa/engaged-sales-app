import { IsIn, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OauthCallbackDto {
  @ApiProperty({ type: String, example: "google", enum: ["google"] })
  @IsIn(["google"])
  public provider!: "google";

  @ApiProperty({ type: String, example: "4/0AQSTgQF...", description: "Authorization code from Google callback" })
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
}
