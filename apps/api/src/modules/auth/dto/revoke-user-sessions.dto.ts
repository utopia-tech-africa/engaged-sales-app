import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RevokeUserSessionsDto {
  @ApiProperty({
    type: String,
    example: "cmad4p0bo0000iib0i0l9e8wk",
    description: "Target user id whose sessions should be revoked"
  })
  @IsString()
  @MinLength(1)
  public userId!: string;
}
