import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateMeDto {
  @ApiPropertyOptional({ type: String, example: "Jamal Salim" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public fullName?: string;

  @ApiPropertyOptional({ type: String, example: "male", enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";

  @ApiPropertyOptional({ type: String, example: "nairobi-west" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string;
}
