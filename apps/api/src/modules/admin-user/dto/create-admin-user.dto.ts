import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { PhoneNumberField } from "../../../common/decorators/phone.decorators";

export class CreateAdminUserDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public fullName!: string;

  @ApiProperty({
    example: "0244123456",
    description:
      "National mobile (leading 0) or international digits; spaces/hyphens stripped (same rules as sign-up)."
  })
  @PhoneNumberField()
  public phone!: string;

  @ApiProperty({ enum: ["promoter", "client", "supervisor", "admin"] })
  @IsIn(["promoter", "client", "supervisor", "admin"])
  public role!: "promoter" | "client" | "supervisor" | "admin";

  @ApiPropertyOptional({ description: "Region id (cuid) for assignment" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;

  @ApiPropertyOptional({ enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";
}
