const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function boundingBox(lat: number, lon: number, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.max(Math.cos(rad(lat)), 0.01));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
