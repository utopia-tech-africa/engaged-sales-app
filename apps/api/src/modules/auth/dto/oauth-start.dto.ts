import { IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OauthStartDto {
  @ApiProperty({
    type: String,
    example: "http://localhost:3000/auth/google/callback",
    description: "Frontend redirect URI registered with Google OAuth"
  })
  @IsUrl({ require_tld: false })
  public redirectUri!: string;
}
