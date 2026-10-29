import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Temperatura } from '@/arm/logic';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function colorTemperatura(t: Temperatura, c: ReturnType<typeof useTheme>) {
  if (t === 'Caliente') return { fondo: c.accentSoft, texto: c.accent };
  if (t === 'Tibio') return { fondo: c.warnSoft, texto: c.warn };
  return { fondo: c.primarySoft, texto: c.primary };
}

export function BadgeTemperatura({ t, puntos }: { t: Temperatura; puntos?: number }) {
  const c = useTheme();
  const col = colorTemperatura(t, c);
  return (
    <View style={[styles.badge, { backgroundColor: col.fondo }]}>
      <Text style={[styles.badgeTexto, { color: col.texto }]}>
        {t}
        {puntos != null ? ` · ${puntos}` : ''}
      </Text>
    </View>
  );
}

export function Etiqueta({ texto, fuerte }: { texto: string; fuerte?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: fuerte ? c.primary : c.backgroundElement }]}>
      <Text style={[styles.badgeTexto, { color: fuerte ? c.onPrimary : c.textSecondary }]}>{texto}</Text>
    </View>
  );
}

export function Avatar({ nombre, enVivo }: { nombre: string; enVivo?: boolean }) {
  const c = useTheme();
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, { backgroundColor: enVivo ? c.accent : c.primarySoft }]}>
      <Text style={[styles.avatarTexto, { color: enVivo ? '#fff' : c.primary }]}>{iniciales || '?'}</Text>
    </View>
  );
}

/** Encabezado con botón de volver para las pantallas del ARM. */
export function BarraArm({ titulo, subtitulo, derecha }: { titulo: string; subtitulo?: string; derecha?: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.barra,
        { paddingTop: insets.top + Spacing.two, borderColor: c.border, backgroundColor: c.background },
      ]}
    >
      <View style={styles.barraInner}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          style={[styles.volver, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Icon name="atras" size={18} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {subtitulo && <Text style={[styles.sub, { color: c.textSecondary }]}>{subtitulo}</Text>}
          <Text style={[styles.titulo, { color: c.text }]} numberOfLines={1}>
            {titulo}
          </Text>
        </View>
        {derecha}
      </View>
    </View>
  );
}

export function Seccion({ titulo, children, derecha }: { titulo: string; children: ReactNode; derecha?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionHeader}>
        <Text style={[styles.seccionTitulo, { color: c.text }]}>{titulo}</Text>
        {derecha}
      </View>
      {children}
    </View>
  );
}

export function Tarjeta({ children, destacada }: { children: ReactNode; destacada?: boolean }) {
  const c = useTheme();
  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: destacada ? c.primarySoft : c.card, borderColor: destacada ? c.primarySoft : c.border },
      ]}
    >
      {children}
    </View>
  );
}

export function BarraPuntaje({ puntos, t }: { puntos: number; t: Temperatura }) {
  const c = useTheme();
  const col = colorTemperatura(t, c);
  return (
    <View style={[styles.pista, { backgroundColor: c.backgroundElement }]}>
      <View style={[styles.relleno, { width: `${Math.max(4, puntos)}%`, backgroundColor: col.texto }]} />
    </View>
  );
}

export function Boton({
  texto,
  onPress,
  tipo = 'primario',
  icono,
}: {
  texto: string;
  onPress: () => void;
  tipo?: 'primario' | 'secundario' | 'suave';
  icono?: Parameters<typeof Icon>[0]['name'];
}) {
  const c = useTheme();
  const fondo = tipo === 'primario' ? c.primary : tipo === 'suave' ? c.backgroundElement : 'transparent';
  const color = tipo === 'primario' ? c.onPrimary : tipo === 'suave' ? c.text : c.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: fondo, borderColor: tipo === 'secundario' ? c.primary : fondo, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icono && <Icon name={icono} size={16} color={color} />}
      <Text style={[styles.botonTexto, { color }]}>{texto}</Text>
    </Pressable>
  );
}

export const armStyles = StyleSheet.create({
  contenido: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
});

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 16, fontWeight: '800' },
  barra: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: Spacing.three - 4 },
  barraInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  volver: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  sub: { fontSize: 13, fontWeight: '600' },
  titulo: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  seccion: { gap: Spacing.two },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: { fontSize: 17, fontWeight: '800' },
  tarjeta: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.two,
  },
  pista: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexGrow: 1,
  },
  botonTexto: { fontSize: 15, fontWeight: '700' },
});
