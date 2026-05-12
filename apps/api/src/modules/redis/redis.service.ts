import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { EnvironmentVariables } from "../../config/environment";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private readonly client: Redis;

  private hasLoggedConnectionError = false;

  public constructor(
    @Inject(ConfigService) configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.client = new Redis(configService.get("REDIS_URL", { infer: true }), {
      lazyConnect: true,
      // Avoid hanging auth and other routes for minutes when Redis is down or misconfigured.
      connectTimeout: 5_000,
      commandTimeout: 5_000,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 6) {
          return null;
        }
        return Math.min(times * 150, 2_000);
      }
    });
    this.client.on("error", () => {
      if (!this.hasLoggedConnectionError) {
        this.hasLoggedConnectionError = true;
        this.logger.warn(
          "Redis connection failed. Auth rate-limiting will fail until Redis is reachable."
        );
      }
    });
  }

  public async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  public async incrementWithWindow(key: string, windowSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return value;
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async setWithWindow(key: string, value: string, windowSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", windowSeconds);
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
