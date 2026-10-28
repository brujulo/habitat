import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PropertyCard } from '@/components/property-card';
import { Encabezado, Screen } from '@/components/screen';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { PROPIEDADES } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { useUbicacion } from '@/hooks/use-ubicacion';
import { distanciaKm, distanciaTexto } from '@/utils/geo';

const RADIOS = [5, 25, 100, null] as const;

export function Cerca() {
  const c = useTheme();
  const { coords, estado, reintentar } = useUbicacion();
  const [radio, setRadio] = useState<(typeof RADIOS)[number]>(25);

  const lista = useMemo(
    () =>
      PROPIEDADES.map((p) => ({ p, km: distanciaKm(coords, p) }))
        .filter(({ km }) => radio === null || km <= radio)
        .sort((a, b) => a.km - b.km),
    [coords, radio],
  );

  const aviso =
    estado === 'sin-permiso' || estado === 'error'
      ? 'Sin acceso a tu ubicación: mostramos distancias desde el centro de Santo Domingo.'
      : null;

  return (
    <Screen>
      <FlatList
        data={lista}
        keyExtractor={({ p }) => p.id}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five }}
        ListHeaderComponent={
          <View>
            <Encabezado subtitulo="Según tu ubicación" titulo="Cerca de ti" />

            {estado === 'cargando' && (
              <View style={[styles.estado, { backgroundColor: c.backgroundElement }]}>
                <ActivityIndicator color={c.primary} />
                <Text style={[styles.estadoTexto, { color: c.textSecondary }]}>Buscando tu ubicación…</Text>
              </View>
            )}
            {aviso && (
              <View style={[styles.estado, { backgroundColor: c.accentSoft }]}>
                <Icon name="ubicacion" size={16} color={c.accent} />
                <Text style={[styles.estadoTexto, { color: c.text, flex: 1 }]}>{aviso}</Text>
                <Pressable onPress={reintentar} hitSlop={8}>
                  <Text style={[styles.reintentar, { color: c.primary }]}>Permitir</Text>
                </Pressable>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {RADIOS.map((r) => (
                <Chip
                  key={String(r)}
                  label={r === null ? 'Todo el país' : `Hasta ${r} km`}
                  activo={radio === r}
                  onPress={() => setRadio(r)}
                />
              ))}
            </ScrollView>
            <Text style={[styles.conteo, { color: c.textSecondary }]}>
              {lista.length} {lista.length === 1 ? 'propiedad' : 'propiedades'}, de la más cercana a la más lejana
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PropertyCard propiedad={item.p} distancia={distanciaTexto(item.km)} compacta />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={[styles.vacioTitulo, { color: c.text }]}>Nada en este radio todavía</Text>
            <Text style={[styles.vacioTexto, { color: c.textSecondary }]}>
              Amplía la distancia para ver más opciones.
            </Text>
            <Chip label="Ver todo el país" onPress={() => setRadio(null)} activo />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    padding: Spacing.three - 4,
    borderRadius: Radius.md,
  },
  estadoTexto: { fontSize: 14 },
  reintentar: { fontSize: 14, fontWeight: '700' },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.three },
  conteo: { fontSize: 14, fontWeight: '600', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 4 },
  item: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  vacio: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three - 4 },
  vacioTitulo: { fontSize: 18, fontWeight: '700' },
  vacioTexto: { fontSize: 15, textAlign: 'center' },
});
