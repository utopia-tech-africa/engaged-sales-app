import { IsIn, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class OauthCallbackDto {
  @IsIn(["google"])
  public provider!: "google";

  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  public code!: string;

  @IsUrl({ require_tld: false })
  public redirectUri!: string;

  @IsString()
  @MinLength(10)
  public state!: string;
}
