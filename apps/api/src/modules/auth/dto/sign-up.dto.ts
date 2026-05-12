import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { PhoneNumberField } from "../../../common/decorators/phone.decorators";

export class SignUpDto {
  @ApiProperty({ type: String, example: "John Doe", description: "Full name of the user" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName!: string;

  @ApiProperty({
    type: String,
    example: "0244123456",
    description:
      "International (+country code) or local/national number; may start with 0. Spaces and hyphens are stripped."
  })
  @PhoneNumberField()
  public phone!: string;

  @ApiProperty({ type: String, example: "male", enum: ["male", "female", "other"] })
  @IsIn(["male", "female", "other"])
  public gender!: "male" | "female" | "other";

  @ApiPropertyOptional({
    type: String,
    example: "nairobi-west",
    description: "Optional sales region id"
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
