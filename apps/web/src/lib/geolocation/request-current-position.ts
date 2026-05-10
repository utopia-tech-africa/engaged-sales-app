/**
 * Browser Geolocation wrapper tuned for desktop (e.g. Chrome on macOS), where
 * `enableHighAccuracy: true` often triggers GPS/CoreLocation and fails with
 * POSITION_UNAVAILABLE / kCLErrorLocationUnknown while Wi‑Fi/network fixes work.
 */

export type RequestCurrentPositionResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; message: string; code: number };

const SOFT_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 300_000
};

export const formatGeolocationError = (err: GeolocationPositionError): string => {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Allow location for this site (address bar), and for Google Chrome under System Settings → Privacy & Security → Location Services.";
    case err.POSITION_UNAVAILABLE:
      return "Could not determine location (common on Mac desktops). Turn on Wi‑Fi, allow Chrome in Location Services, or use map search instead of “My location”.";
    case err.TIMEOUT:
      return "Location request timed out. Try again or use map search.";
    default:
      return err.message;
  }
};

export const requestCurrentPosition = (): Promise<RequestCurrentPositionResult> => {
  if (typeof navigator === "undefined") {
    return Promise.resolve({
      ok: false,
      message: "Location is not available in this browser.",
      code: 0
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        resolve({
          ok: false,
          message: formatGeolocationError(err),
          code: err.code
        });
      },
      SOFT_OPTIONS
    );
  });
};
