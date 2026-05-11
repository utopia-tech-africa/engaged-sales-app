import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MinLength } from "class-validator";

export class AddActivationRosterBatchDto {
  @ApiProperty({
    type: [String],
    description:
      "User ids (cuid) to add. Each must be an active promoter or client, and not already on this roster."
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  public userIds!: string[];
}
