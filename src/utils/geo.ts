import { Platform } from 'react-native';

export type Coordenadas = { latitude: number; longitude: number };

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanciaKm(a: Coordenadas, b: Coordenadas) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanciaTexto(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Enlace para abrir la ubicación en la app de mapas del dispositivo. */
export function urlMapa({ latitude, longitude }: Coordenadas, etiqueta: string) {
  const q = encodeURIComponent(etiqueta);
  if (Platform.OS === 'ios') return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
