import { IsString, MinLength } from "class-validator";

export class RevokeUserSessionsDto {
  @IsString()
  @MinLength(1)
  public userId!: string;
}
