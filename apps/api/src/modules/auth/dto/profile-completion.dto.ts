import {
  IsIn,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";

export class ProfileCompletionDto {
  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  public phone?: string;

  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
