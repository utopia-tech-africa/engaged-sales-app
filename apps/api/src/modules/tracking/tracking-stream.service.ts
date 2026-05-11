import { Injectable } from "@nestjs/common";

import type { LiveTrackingRow } from "./tracking.types";

@Injectable()
export class TrackingStreamService {
  private readonly latestByUser = new Map<string, LiveTrackingRow>();
  private readonly listeners = new Set<(row: LiveTrackingRow) => void>();

  public subscribe(listener: (row: LiveTrackingRow) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public seedSnapshot(rows: readonly LiveTrackingRow[]): void {
    for (const row of rows) {
      this.latestByUser.set(row.userId, row);
    }
  }

  public getSnapshot(): LiveTrackingRow[] {
    return [...this.latestByUser.values()].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }

  public publish(row: LiveTrackingRow): void {
    this.latestByUser.set(row.userId, row);
    for (const listener of this.listeners) {
      listener(row);
    }
  }
}
