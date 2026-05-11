import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public fullName?: string;

  @ApiPropertyOptional({ enum: ["promoter", "client", "supervisor", "admin"] })
  @IsOptional()
  @IsIn(["promoter", "client", "supervisor", "admin"])
  public role?: "promoter" | "client" | "supervisor" | "admin";

  @ApiPropertyOptional({ description: "Region id (cuid)" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({ enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";
}
