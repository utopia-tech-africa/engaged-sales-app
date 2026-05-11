import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class UpdateLocationDto {
  @ApiProperty({ type: Number, example: -1.286389, description: "Latitude in decimal degrees" })
  @IsLatitude()
  public latitude!: number;

  @ApiProperty({ type: Number, example: 36.817223, description: "Longitude in decimal degrees" })
  @IsLongitude()
  public longitude!: number;

  @ApiPropertyOptional({
    enum: ["clock_in", "clock_out"],
    description: "Attendance event type. Defaults to clock_in when omitted.",
    default: "clock_in"
  })
  @IsOptional()
  @IsIn(["clock_in", "clock_out"])
  public attendanceKind?: "clock_in" | "clock_out";

  @ApiProperty({
    type: String,
    description:
      "Base64-encoded selfie (JPEG or PNG) for attendance verification. May be a data URL (`data:image/jpeg;base64,...`).",
    example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  })
  @IsString()
  @MinLength(80)
  @MaxLength(12_000_000)
  public selfieImageBase64!: string;
}
