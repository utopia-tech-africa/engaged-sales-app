import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const nominatimReverseSchema = z.object({
  display_name: z.string().optional(),
  error: z.string().optional()
});

const USER_AGENT =
  "TransmedGhanaOps/1.0 (check-in reverse geocoding; https://nominatim.org/usage-policy)";

const parseCoord = (value: string | null, kind: "lat" | "lon"): number | null => {
  if (value === null || value.trim() === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  if (kind === "lat" && (n < -90 || n > 90)) {
    return null;
  }
  if (kind === "lon" && (n < -180 || n > 180)) {
    return null;
  }
  return n;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const lat = parseCoord(request.nextUrl.searchParams.get("lat"), "lat");
  const lon = parseCoord(request.nextUrl.searchParams.get("lon"), "lon");
  if (lat === null || lon === null) {
    return NextResponse.json(
      { error: "Valid lat and lon query parameters are required." },
      { status: 400 }
    );
  }

  const upstream = new URL("https://nominatim.openstreetmap.org/reverse");
  upstream.searchParams.set("lat", String(lat));
  upstream.searchParams.set("lon", String(lon));
  upstream.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(upstream.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      },
      next: { revalidate: 86_400 }
    });
  } catch {
    return NextResponse.json({ error: "Geocoding service unreachable." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Reverse geocoding failed. Try again later." },
      { status: 502 }
    );
  }

  const raw: unknown = await res.json();
  const parsed = nominatimReverseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unexpected geocoder response." }, { status: 502 });
  }

  if (parsed.data.error !== undefined) {
    return NextResponse.json({ error: parsed.data.error }, { status: 404 });
  }

  const displayName = parsed.data.display_name;
  if (displayName === undefined || displayName.trim() === "") {
    return NextResponse.json({ error: "No place name for these coordinates." }, { status: 404 });
  }

  return NextResponse.json({ displayName: displayName.trim() });
}
