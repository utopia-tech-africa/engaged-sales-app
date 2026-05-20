import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateOutletVisitDto {
  @ApiProperty({ type: String, example: "cmad4p0bo0000iib0i0l9e8wk" })
  @IsString()
  @MinLength(10)
  public outletId!: string;

  @ApiProperty({ type: Number, example: -1.286389 })
  @IsNumber()
  public latitude!: number;

  @ApiProperty({ type: Number, example: 36.817223 })
  @IsNumber()
  public longitude!: number;

  @ApiPropertyOptional({
    type: String,
    example: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    description: "Optional outlet photo in base64 (raw or data URL; JPEG/PNG only)."
  })
  @IsOptional()
  @IsString()
  public outletPhotoBase64?: string;

  @ApiPropertyOptional({ type: String, example: "All SKUs available except 500ml variant." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public stockAvailabilityNotes?: string;

  @ApiPropertyOptional({
    type: String,
    example: "Sold 2 cartons and 6 single units during the visit."
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public salesMadeNotes?: string;

  @ApiPropertyOptional({
    type: String,
    example: "Engaged 9 consumers with product demo and samples."
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public consumerEngagementNotes?: string;
}
