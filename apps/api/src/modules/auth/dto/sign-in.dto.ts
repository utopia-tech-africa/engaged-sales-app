import { IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SignInDto {
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  public uniqueCode!: string;

  @IsIn(["promoter", "merchandizer", "supervisor", "admin"])
  public role!: "promoter" | "merchandizer" | "supervisor" | "admin";
}
