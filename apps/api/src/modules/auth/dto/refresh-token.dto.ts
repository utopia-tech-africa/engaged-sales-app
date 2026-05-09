import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    type: String,
    example: "cmadfk8m50000ii9l5g8qxh4d.6Mcpfd1xK8h6c7Iu4eD9TzLQkKkL4aY5",
    description: "Refresh token in <sessionId>.<secret> format"
  })
  @IsString()
  @MinLength(20)
  public refreshToken!: string;
}
