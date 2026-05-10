import { IsString, MinLength } from "class-validator";

export class AddActivationRosterDto {
  @IsString()
  @MinLength(1)
  public userId!: string;
}
