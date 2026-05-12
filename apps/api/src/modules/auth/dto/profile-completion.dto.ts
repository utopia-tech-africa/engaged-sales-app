import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import {
  normalizePhoneString,
  PHONE_VALIDATION_PATTERN
} from "../../../common/decorators/phone.decorators";

export class ProfileCompletionDto {
  @ApiPropertyOptional({ type: String, example: "john.doe@example.com" })
  @IsOptional()
  @IsEmail()
  public email?: string;

  @ApiPropertyOptional({
    type: String,
    example: "0244123456",
    description: "International +… or local; may start with 0; spaces/hyphens stripped."
  })
  @IsOptional()
  @Transform(({ value }) => normalizePhoneString(value))
  @Matches(PHONE_VALIDATION_PATTERN, {
    message:
      "phone must be 8–17 digits, optionally starting with +; leading 0 is allowed (spaces and hyphens are removed)"
  })
  public phone?: string;

  @ApiPropertyOptional({ type: String, example: "male", enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";

  @ApiPropertyOptional({ type: String, example: "John Doe" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName?: string;

  @ApiPropertyOptional({ type: String, example: "nairobi-west" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
