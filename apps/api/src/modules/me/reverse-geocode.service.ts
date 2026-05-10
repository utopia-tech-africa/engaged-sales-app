import { Injectable, Logger } from "@nestjs/common";

const USER_AGENT =
  "EngagedSalesAPI/1.0 (location ping reverse geocoding; https://nominatim.org/usage-policy)";
const MAX_LABEL_LENGTH = 512;

@Injectable()
export class ReverseGeocodeService {
  private readonly logger = new Logger(ReverseGeocodeService.name);

  /**
   * Returns a display name from Nominatim, or null if lookup fails (ping is still stored).
   */
  public async resolvePlaceLabel(latitude: number, longitude: number): Promise<string | null> {
    const upstream = new URL("https://nominatim.openstreetmap.org/reverse");
    upstream.searchParams.set("lat", String(latitude));
    upstream.searchParams.set("lon", String(longitude));
    upstream.searchParams.set("format", "json");

    let res: Response;
    try {
      res = await fetch(upstream.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json"
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Reverse geocode fetch failed: ${message}`);
      return null;
    }

    if (!res.ok) {
      this.logger.warn(`Reverse geocode HTTP ${String(res.status)}`);
      return null;
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return null;
    }

    if (body === null || typeof body !== "object") {
      return null;
    }

    const record = body as Record<string, unknown>;
    if (typeof record["error"] === "string") {
      return null;
    }

    const displayName = record["display_name"];
    if (typeof displayName !== "string") {
      return null;
    }

    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      return null;
    }

    return trimmed.length > MAX_LABEL_LENGTH ? trimmed.slice(0, MAX_LABEL_LENGTH) : trimmed;
  }
}
