import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@Controller("health")
@ApiTags("Health")
export class HealthController {
  @Get()
  @ApiOperation({
    operationId: "Health_getHealth",
    summary: "Health check endpoint",
    description: "Returns a simple health signal for uptime probes."
  })
  @ApiOkResponse({
    description: "Service is healthy",
    schema: {
      example: {
        ok: true
      }
    }
  })
  public getHealth(): { ok: true } {
    return { ok: true };
  }
}
