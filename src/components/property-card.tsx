import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import type { Propiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { useFavoritos } from '@/state/favorites';
import { banosTexto, precioTexto } from '@/utils/format';

export function PropertyCard({
  propiedad: p,
  distancia,
  compacta = false,
}: {
  propiedad: Propiedad;
  /** Texto opcional, p. ej. "2.3 km". */
  distancia?: string;
  compacta?: boolean;
}) {
  const c = useTheme();
  const { esFavorito, alternar } = useFavoritos();
  const fav = esFavorito(p.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/propiedad/[id]', params: { id: p.id } })}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.9 : 1 },
      ]}
      accessibilityLabel={`${p.titulo}, ${precioTexto(p)}, ${p.sector}, ${p.ciudad}`}
    >
      <View>
        <Image
          source={p.imagen}
          style={[styles.imagen, compacta && styles.imagenCompacta, { backgroundColor: c.backgroundSelected }]}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.badges}>
          <Badge texto={p.operacion} fondo={p.operacion === 'Venta' ? c.primary : c.accent} color="#fff" />
          {p.enPlano && <Badge texto="En plano" fondo="rgba(0,0,0,0.55)" color="#fff" />}
          {p.confotur && <Badge texto="Confotur" fondo="rgba(0,0,0,0.55)" color="#fff" />}
        </View>
        <Pressable
          onPress={(e) => {
            e.preventDefault?.();
            e.stopPropagation?.();
            alternar(p.id);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          style={[styles.favBtn, { backgroundColor: c.card }]}
        >
          <Icon name={fav ? 'corazonLleno' : 'corazon'} size={18} color={fav ? c.accent : c.text} />
        </Pressable>
      </View>

      <View style={styles.cuerpo}>
        <View style={styles.filaPrecio}>
          <Text style={[styles.precio, { color: c.text }]}>{precioTexto(p)}</Text>
          {distancia && (
            <View style={styles.distancia}>
              <Icon name="ubicacion" size={12} color={c.primary} />
              <Text style={[styles.distanciaTexto, { color: c.primary }]}>{distancia}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.titulo, { color: c.text }]} numberOfLines={1}>
          {p.titulo}
        </Text>
        <Text style={[styles.lugar, { color: c.textSecondary }]} numberOfLines={1}>
          {p.sector}, {p.ciudad}
        </Text>
        {p.tipo !== 'Solar' && p.tipo !== 'Local' ? (
          <View style={styles.specs}>
            <Spec icono="cama" texto={`${p.habitaciones} hab.`} />
            <Spec icono="bano" texto={`${banosTexto(p.banos)} baños`} />
            <Spec icono="area" texto={`${p.metros} m²`} />
          </View>
        ) : (
          <View style={styles.specs}>
            <Spec icono="area" texto={`${p.metros} m²`} />
            {p.parqueos > 0 && <Spec icono="carro" texto={`${p.parqueos} parqueos`} />}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Spec({ icono, texto }: { icono: 'cama' | 'bano' | 'area' | 'carro'; texto: string }) {
  const c = useTheme();
  return (
    <View style={styles.spec}>
      <Icon name={icono} size={14} color={c.textSecondary} />
      <Text style={[styles.specTexto, { color: c.textSecondary }]}>{texto}</Text>
    </View>
  );
}

function Badge({ texto, fondo, color }: { texto: string; fondo: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: fondo }]}>
      <Text style={[styles.badgeTexto, { color }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  imagen: { width: '100%', aspectRatio: 16 / 10 },
  imagenCompacta: { aspectRatio: 16 / 8 },
  badges: { position: 'absolute', top: Spacing.three - 4, left: Spacing.three - 4, flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  badgeTexto: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  favBtn: {
    position: 'absolute',
    top: Spacing.three - 6,
    right: Spacing.three - 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: { padding: Spacing.three, gap: 3 },
  filaPrecio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  precio: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  distancia: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanciaTexto: { fontSize: 13, fontWeight: '700' },
  titulo: { fontSize: 16, fontWeight: '600' },
  lugar: { fontSize: 14 },
  specs: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  specTexto: { fontSize: 13, fontWeight: '500' },
});
