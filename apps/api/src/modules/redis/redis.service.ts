import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { EnvironmentVariables } from "../../config/environment";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  public constructor(
    @Inject(ConfigService) configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.client = new Redis(configService.get("REDIS_URL", { infer: true }));
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.quit();
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
