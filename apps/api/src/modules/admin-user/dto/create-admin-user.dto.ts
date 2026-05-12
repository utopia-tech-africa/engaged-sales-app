import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { PhoneNumberField } from "../../../common/decorators/phone.decorators";

export class CreateAdminUserDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public fullName!: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @ApiProperty({
    example: "0244123456",
    description:
      "Same rules as sign-up: + prefix optional, may start with 0; spaces/hyphens stripped."
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
