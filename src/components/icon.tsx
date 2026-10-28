import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

type Nombre = ComponentProps<typeof SymbolView>['name'];

/** Íconos usados en la app: SF Symbols en iOS y Material Symbols en Android/web. */
export const ICONOS = {
  casa: { ios: 'house', android: 'home', web: 'home' },
  buscar: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  ubicacion: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  mapa: { ios: 'map', android: 'map', web: 'map' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' },
  corazon: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  corazonLleno: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  cama: { ios: 'bed.double', android: 'bed', web: 'bed' },
  bano: { ios: 'shower', android: 'shower', web: 'shower' },
  carro: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  area: { ios: 'square.dashed', android: 'square_foot', web: 'square_foot' },
  atras: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  enviar: { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' },
  chispa: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  calendario: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  abajo: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  arriba: { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' },
  palmera: { ios: 'sun.max', android: 'beach_access', web: 'beach_access' },
  calculadora: { ios: 'function', android: 'calculate', web: 'calculate' },
} as const satisfies Record<string, Nombre>;

export type IconoNombre = keyof typeof ICONOS;

export function Icon({ name, size = 18, color }: { name: IconoNombre; size?: number; color: string }) {
  return <SymbolView name={ICONOS[name] as Nombre} size={size} tintColor={color} />;
}
