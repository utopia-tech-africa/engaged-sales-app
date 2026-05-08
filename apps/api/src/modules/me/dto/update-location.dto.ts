import { IsLatitude, IsLongitude } from "class-validator";

export class UpdateLocationDto {
  @IsLatitude()
  public latitude!: number;

  @IsLongitude()
  public longitude!: number;
}
