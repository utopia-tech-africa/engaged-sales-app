import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength
} from "class-validator";

export class UpdateReportSettingsDto {
  @ApiPropertyOptional({ type: String, default: "UTC" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  public timezone?: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public dailyEnabled!: boolean;

  @ApiProperty({ type: String, default: "0 0 19 * * *" })
  @IsString()
  @Matches(/^(\S+\s){5}\S+$/)
  public dailyCron!: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  public weeklyEnabled!: boolean;

  @ApiProperty({ type: String, default: "0 0 19 * * 1" })
  @IsString()
  @Matches(/^(\S+\s){5}\S+$/)
  public weeklyCron!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  public recipients!: string[];
}
