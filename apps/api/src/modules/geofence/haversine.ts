/** Earth radius in meters (WGS84 mean) */
const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two WGS84 points in meters.
 */
export const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
};
