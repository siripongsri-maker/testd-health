/**
 * Geofence helpers for branch-based auto check-in.
 *
 * Privacy: we never persist the user's coordinates — they live only in
 * memory long enough to compute a distance and are then discarded.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Geofence radius in meters used for branch auto check-in. */
export const GEOFENCE_RADIUS_M = 500;

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'inside'
  | 'outside'
  | 'denied'
  | 'unavailable'
  | 'error';
