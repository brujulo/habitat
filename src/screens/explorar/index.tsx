import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PropertyCard } from '@/components/property-card';
import { Encabezado, Screen } from '@/components/screen';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { TIPOS, type Operacion, type TipoPropiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { useCatalogo } from '@/state/catalogo';

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function Explorar() {
  const c = useTheme();
  const { propiedades, ciudades: CIUDADES } = useCatalogo();
  const [busqueda, setBusqueda] = useState('');
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [tipo, setTipo] = useState<TipoPropiedad | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return propiedades.filter((p) => {
      if (operacion && p.operacion !== operacion) return false;
      if (tipo && p.tipo !== tipo) return false;
      if (ciudad && p.ciudad !== ciudad) return false;
      if (!q) return true;
      return normalizar(`${p.titulo} ${p.sector} ${p.ciudad} ${p.provincia} ${p.tipo}`).includes(q);
    });
  }, [propiedades, busqueda, operacion, tipo, ciudad]);

  const hayFiltros = !!(operacion || tipo || ciudad || busqueda);

  return (
    <Screen>
      <FlatList
        data={resultados}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Encabezado
              subtitulo="Bienes raíces en RD"
              titulo="Habitat"
              derecha={
                <Pressable
                  onPress={() => router.push('/arm')}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir panel ARM del asesor"
                  style={({ pressed }) => [
                    styles.armBtn,
                    { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Icon name="chispa" size={14} color={c.primary} />
                  <Text style={[styles.armBtnTexto, { color: c.primary }]}>Panel ARM</Text>
                </Pressable>
              }
            />

            <View style={[styles.buscador, { backgroundColor: c.card, borderColor: c.border }]}>
              <Icon name="buscar" size={18} color={c.textSecondary} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Sector, ciudad o tipo de inmueble"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text }]}
                returnKeyType="search"
                accessibilityLabel="Buscar propiedades"
              />
            </View>

            <Pressable
              onPress={() => router.push('/brisa')}
              accessibilityRole="link"
              style={({ pressed }) => [styles.brisa, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }]}
            >
              <View style={[styles.brisaAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Icon name="chispa" size={22} color={c.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brisaTitulo, { color: c.onPrimary }]}>Pregúntale a Brisa</Text>
                <Text style={[styles.brisaTexto, { color: c.onPrimary }]}>
                  Dime tu presupuesto y la zona, y te busco opciones.
                </Text>
              </View>
            </Pressable>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(['Venta', 'Alquiler'] as Operacion[]).map((o) => (
                <Chip
                  key={o}
                  label={o}
                  activo={operacion === o}
                  onPress={() => setOperacion(operacion === o ? null : o)}
                />
              ))}
              <View style={[styles.separador, { backgroundColor: c.border }]} />
              {TIPOS.map((t) => (
                <Chip key={t} label={t} activo={tipo === t} onPress={() => setTipo(tipo === t ? null : t)} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {CIUDADES.map((ci) => (
                <Chip key={ci} label={ci} activo={ciudad === ci} onPress={() => setCiudad(ciudad === ci ? null : ci)} />
              ))}
            </ScrollView>

            <View style={styles.conteo}>
              <Text style={[styles.conteoTexto, { color: c.textSecondary }]}>
                {resultados.length} {resultados.length === 1 ? 'propiedad' : 'propiedades'}
              </Text>
              {hayFiltros && (
                <Pressable
                  onPress={() => {
                    setBusqueda('');
                    setOperacion(null);
                    setTipo(null);
                    setCiudad(null);
                  }}
                  hitSlop={8}
                >
                  <Text style={[styles.limpiar, { color: c.primary }]}>Limpiar filtros</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <PropertyCard propiedad={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={[styles.vacioTitulo, { color: c.text }]}>No encontramos coincidencias</Text>
            <Text style={[styles.vacioTexto, { color: c.textSecondary }]}>
              Prueba con menos filtros o pregúntale a Brisa qué hay disponible.
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  armBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: 4,
  },
  armBtnTexto: { fontSize: 13, fontWeight: '700' },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: 48,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  brisa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  brisaAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  brisaTitulo: { fontSize: 17, fontWeight: '800' },
  brisaTexto: { fontSize: 14, opacity: 0.9, marginTop: 2 },
  chips: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.three - 4, alignItems: 'center' },
  separador: { width: 1, height: 22, marginHorizontal: 2 },
  conteo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  conteoTexto: { fontSize: 14, fontWeight: '600' },
  limpiar: { fontSize: 14, fontWeight: '700' },
  item: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  vacio: { padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  vacioTitulo: { fontSize: 18, fontWeight: '700' },
  vacioTexto: { fontSize: 15, textAlign: 'center' },
});
