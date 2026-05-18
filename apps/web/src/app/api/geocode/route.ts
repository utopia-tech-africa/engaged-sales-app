import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const nominatimItemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string()
});

const nominatimResponseSchema = z.array(nominatimItemSchema);

const USER_AGENT = "TransmedGhanaOps/1.0 (work-area geocoding; https://nominatim.org/usage-policy)";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
  }

  const upstream = new URL("https://nominatim.openstreetmap.org/search");
  upstream.searchParams.set("q", query);
  upstream.searchParams.set("format", "json");
  upstream.searchParams.set("limit", "6");

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
    return NextResponse.json({ error: "Geocoding failed. Try again later." }, { status: 502 });
  }

  const raw: unknown = await res.json();
  const parsed = nominatimResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unexpected geocoder response." }, { status: 502 });
  }

  const results = parsed.data.map((row) => ({
    lat: Number(row.lat),
    lon: Number(row.lon),
    displayName: row.display_name
  }));

  const valid = results.filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lon));
  return NextResponse.json({ results: valid });
}
