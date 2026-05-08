import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SignUpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName!: string;

  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone!: string;

  @IsIn(["male", "female", "other"])
  public gender!: "male" | "female" | "other";

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
