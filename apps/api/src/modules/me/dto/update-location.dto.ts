import { IsLatitude, IsLongitude } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateLocationDto {
  @ApiProperty({ type: Number, example: -1.286389, description: "Latitude in decimal degrees" })
  @IsLatitude()
  public latitude!: number;

  @ApiProperty({ type: Number, example: 36.817223, description: "Longitude in decimal degrees" })
  @IsLongitude()
  public longitude!: number;
}
