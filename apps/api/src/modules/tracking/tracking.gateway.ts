import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";

import type { EnvironmentVariables } from "../../config/environment";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { TrackingRepository } from "./tracking.repository";
import { TrackingStreamService } from "./tracking-stream.service";

const OPS_ROOM = "ops-tracking";

@WebSocketGateway({
  namespace: "/tracking",
  cors: {
    origin: true,
    credentials: true
  }
})
export class TrackingGateway {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  private server!: Server;

  public constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(TrackingRepository) private readonly repository: TrackingRepository,
    @Inject(TrackingStreamService) private readonly trackingStream: TrackingStreamService
  ) {}

  public afterInit(): void {
    this.trackingStream.subscribe((row) => {
      this.server.to(OPS_ROOM).emit("tracking:update", row);
    });
  }

  public async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (token === null) {
        client.disconnect(true);
        return;
      }
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true })
      });
      const user = await this.repository.findOpsUserById(payload.id);
      if (
        user === null ||
        !user.isActive ||
        (user.role !== "admin" && user.role !== "supervisor")
      ) {
        client.disconnect(true);
        return;
      }

      void client.join(OPS_ROOM);
      let snapshot = this.trackingStream.getSnapshot();
      if (snapshot.length === 0) {
        snapshot = await this.repository.listLatestFieldRows();
        this.trackingStream.seedSnapshot(snapshot);
      }
      client.emit("tracking:snapshot", {
        rows: snapshot,
        serverTime: new Date().toISOString()
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Socket rejected: ${error instanceof Error ? error.message : String(error)}`
      );
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown>;
    const query = client.handshake.query as Record<string, unknown>;
    const authToken = auth["token"];
    const queryToken = query["token"];
    const headerValue = client.handshake.headers.authorization;
    const header = typeof headerValue === "string" ? headerValue : null;

    const raw =
      (typeof authToken === "string" ? authToken : null) ??
      (typeof queryToken === "string" ? queryToken : null) ??
      header;
    if (raw === null) {
      return null;
    }

    return raw.replace(/^Bearer\s+/i, "").trim();
  }
}
