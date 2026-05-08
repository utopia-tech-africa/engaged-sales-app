import { IsUrl } from "class-validator";

export class OauthStartDto {
  @IsUrl({ require_tld: false })
  public redirectUri!: string;
}
