export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta entre dois pontos, em km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ordena os itens pela distância até `origin`, do mais perto para o mais longe. */
export function sortByDistance<T extends LatLng>(origin: LatLng, items: T[]): (T & { distanceKm: number })[] {
  return items.map((it) => ({ ...it, distanceKm: haversineKm(origin, it) })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/** "1,4 km", "12 km", "350 m" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}
