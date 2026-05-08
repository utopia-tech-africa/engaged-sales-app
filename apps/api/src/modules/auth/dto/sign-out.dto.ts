import { IsString, MinLength } from "class-validator";

export class SignOutDto {
  @IsString()
  @MinLength(20)
  public refreshToken!: string;
}
