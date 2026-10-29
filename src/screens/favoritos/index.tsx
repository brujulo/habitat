import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PropertyCard } from '@/components/property-card';
import { Encabezado, Screen } from '@/components/screen';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { getPropiedad, type Propiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { useCatalogo } from '@/state/catalogo';
import { useFavoritos } from '@/state/favorites';

export function Favoritos() {
  const c = useTheme();
  useCatalogo(); // re-render cuando llega el catálogo en línea
  const { ids } = useFavoritos();
  const lista = ids.map(getPropiedad).filter((p): p is Propiedad => !!p);

  return (
    <Screen>
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five, flexGrow: 1 }}
        ListHeaderComponent={<Encabezado subtitulo="Tus guardadas" titulo="Favoritos" />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PropertyCard propiedad={item} compacta />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <View style={[styles.icono, { backgroundColor: c.accentSoft }]}>
              <Icon name="corazonLleno" size={28} color={c.accent} />
            </View>
            <Text style={[styles.titulo, { color: c.text }]}>Aún no guardas propiedades</Text>
            <Text style={[styles.texto, { color: c.textSecondary }]}>
              Toca el corazón en cualquier propiedad para tenerla aquí y compararla después.
            </Text>
            <Pressable onPress={() => router.navigate('/')} style={[styles.boton, { backgroundColor: c.primary }]}>
              <Text style={[styles.botonTexto, { color: c.onPrimary }]}>Explorar propiedades</Text>
            </Pressable>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingTop: Spacing.one },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three - 4 },
  icono: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  texto: { fontSize: 15, textAlign: 'center', maxWidth: 320, lineHeight: 21 },
  boton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three - 4,
    borderRadius: Radius.pill,
  },
  botonTexto: { fontSize: 15, fontWeight: '700' },
});
