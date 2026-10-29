import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconoNombre } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getPropiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { useArm } from '@/state/arm';
import { useFavoritos } from '@/state/favorites';
import { banosTexto, cuotaMensual, formatDOP, formatUSD, precioTexto } from '@/utils/format';
import { urlMapa } from '@/utils/geo';

/** Supuestos del estimado de cuota. Son referenciales; cada banco ofrece condiciones distintas. */
const INICIAL_PCT = 20;
const TASA_ANUAL = 10;
const PLAZO_ANOS = 20;

export function DetallePropiedad({ id }: { id: string }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { esFavorito, alternar } = useFavoritos();
  const { registrarVista, registrarFavorito, registrarVisita } = useArm();
  const [mostrarMas, setMostrarMas] = useState(false);
  const p = getPropiedad(id);

  // Brisa anota en el ARM cada propiedad que el cliente abre.
  useEffect(() => {
    if (id) registrarVista(id);
  }, [id, registrarVista]);

  if (!p) {
    return (
      <View style={[styles.noEncontrada, { backgroundColor: c.background }]}>
        <Text style={[styles.titulo, { color: c.text }]}>Esta propiedad ya no está disponible</Text>
        <Pressable onPress={() => router.replace('/')} style={[styles.botonPrimario, { backgroundColor: c.primary }]}>
          <Text style={[styles.botonPrimarioTexto, { color: c.onPrimary }]}>Volver a explorar</Text>
        </Pressable>
      </View>
    );
  }

  const fav = esFavorito(p.id);
  const esVivienda = p.tipo !== 'Solar' && p.tipo !== 'Local';
  const financiado = p.precio * (1 - INICIAL_PCT / 100);
  const cuota = cuotaMensual(financiado, TASA_ANUAL, PLAZO_ANOS);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const agendar = () => {
    registrarVisita(p.id);
    const msg =
      'Brisa registró tu solicitud y un asesor de Habitat te contactará para coordinar el día y la hora. (Demo: no se envía ningún mensaje real.)';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Visita solicitada', msg);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={styles.contenido}>
          <View>
            <Image
              source={p.imagen}
              style={[styles.hero, { backgroundColor: c.backgroundSelected }]}
              contentFit="cover"
              transition={200}
            />
            <View style={[styles.barraHero, { top: insets.top + Spacing.two }]}>
              <BotonRedondo icono="atras" etiqueta="Volver" onPress={volver} />
              <BotonRedondo
                icono={fav ? 'corazonLleno' : 'corazon'}
                etiqueta={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                color={fav ? c.accent : undefined}
                onPress={() => {
                  alternar(p.id);
                  registrarFavorito(p.id, !fav);
                }}
              />
            </View>
          </View>

          <View style={styles.cuerpo}>
            <View style={styles.etiquetas}>
              <Etiqueta texto={`${p.tipo} en ${p.operacion.toLowerCase()}`} />
              {p.enPlano && <Etiqueta texto={`En plano · entrega ${p.entrega}`} />}
              {p.confotur && <Etiqueta texto="Confotur" />}
            </View>

            <Text style={[styles.precio, { color: c.text }]}>{precioTexto(p)}</Text>
            <Text style={[styles.titulo, { color: c.text }]}>{p.titulo}</Text>
            <Pressable
              onPress={() => Linking.openURL(urlMapa(p, `${p.sector}, ${p.ciudad}`))}
              style={styles.lugar}
              accessibilityRole="link"
            >
              <Icon name="ubicacion" size={15} color={c.primary} />
              <Text style={[styles.lugarTexto, { color: c.primary }]}>
                {p.sector}, {p.ciudad} · Ver en mapa
              </Text>
            </Pressable>

            <View style={[styles.specs, { backgroundColor: c.card, borderColor: c.border }]}>
              {esVivienda && <Spec icono="cama" valor={`${p.habitaciones}`} label="Habitaciones" />}
              {esVivienda && <Spec icono="bano" valor={banosTexto(p.banos)} label="Baños" />}
              {p.parqueos > 0 && <Spec icono="carro" valor={`${p.parqueos}`} label="Parqueos" />}
              <Spec icono="area" valor={`${p.metros}`} label="m²" />
            </View>

            <Text style={[styles.resumen, { color: c.text }]}>{p.resumen}</Text>

            {mostrarMas && (
              <View style={styles.mas}>
                <Seccion titulo="Descripción">
                  <Text style={[styles.parrafo, { color: c.text }]}>{p.descripcion}</Text>
                </Seccion>

                <Seccion titulo="Amenidades">
                  <View style={styles.lista}>
                    {p.amenidades.map((a) => (
                      <View key={a} style={[styles.pastilla, { backgroundColor: c.primarySoft }]}>
                        <Icon name="check" size={13} color={c.primary} />
                        <Text style={[styles.pastillaTexto, { color: c.text }]}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </Seccion>

                <Seccion titulo="Cerca de">
                  <Text style={[styles.parrafo, { color: c.text }]}>{p.cercaDe.join(' · ')}</Text>
                </Seccion>

                <Seccion titulo="Datos clave">
                  <Dato
                    label="Precio en pesos (aprox.)"
                    valor={`${formatDOP(p.precio)}${p.operacion === 'Alquiler' ? '/mes' : ''}`}
                  />
                  {p.mantenimientoUSD != null && (
                    <Dato label="Mantenimiento" valor={`${formatUSD(p.mantenimientoUSD)}/mes`} />
                  )}
                  {p.anoConstruccion != null && <Dato label="Año de construcción" valor={`${p.anoConstruccion}`} />}
                  {p.entrega && <Dato label="Entrega" valor={p.entrega} />}
                  <Dato label="Provincia" valor={p.provincia} />
                </Seccion>

                {p.operacion === 'Venta' && (
                  <Seccion titulo="Cuota estimada">
                    <View style={[styles.cuota, { backgroundColor: c.card, borderColor: c.border }]}>
                      <Text style={[styles.cuotaValor, { color: c.text }]}>{formatUSD(cuota)}/mes</Text>
                      <Text style={[styles.cuotaNota, { color: c.textSecondary }]}>
                        Con {INICIAL_PCT}% de inicial ({formatUSD(p.precio * (INICIAL_PCT / 100))}), tasa de{' '}
                        {TASA_ANUAL}% anual a {PLAZO_ANOS} años. Es un estimado: tu banco te dará la cifra real.
                      </Text>
                    </View>
                  </Seccion>
                )}
              </View>
            )}

            <Pressable
              onPress={() => setMostrarMas((v) => !v)}
              style={[styles.mostrarMas, { borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: mostrarMas }}
            >
              <Text style={[styles.mostrarMasTexto, { color: c.primary }]}>
                {mostrarMas ? 'Mostrar menos' : 'Mostrar más'}
              </Text>
              <Icon name={mostrarMas ? 'arriba' : 'abajo'} size={16} color={c.primary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.acciones,
          { backgroundColor: c.card, borderColor: c.border, paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <View style={styles.accionesInner}>
          <Pressable
            onPress={() => router.push({ pathname: '/brisa', params: { propiedad: p.id } })}
            style={({ pressed }) => [styles.botonSecundario, { borderColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="chispa" size={16} color={c.primary} />
            <Text style={[styles.botonSecundarioTexto, { color: c.primary }]}>Preguntar a Brisa</Text>
          </Pressable>
          <Pressable
            onPress={agendar}
            style={({ pressed }) => [styles.botonPrimario, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Icon name="calendario" size={16} color={c.onPrimary} />
            <Text style={[styles.botonPrimarioTexto, { color: c.onPrimary }]}>Agendar visita</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
  color,
}: {
  icono: IconoNombre;
  etiqueta: string;
  onPress: () => void;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={({ pressed }) => [styles.redondo, { backgroundColor: c.card, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon name={icono} size={20} color={color ?? c.text} />
    </Pressable>
  );
}

function Etiqueta({ texto }: { texto: string }) {
  const c = useTheme();
  return (
    <View style={[styles.etiqueta, { backgroundColor: c.backgroundElement }]}>
      <Text style={[styles.etiquetaTexto, { color: c.textSecondary }]}>{texto}</Text>
    </View>
  );
}

function Spec({ icono, valor, label }: { icono: IconoNombre; valor: string; label: string }) {
  const c = useTheme();
  return (
    <View style={styles.spec}>
      <Icon name={icono} size={20} color={c.primary} />
      <Text style={[styles.specValor, { color: c.text }]}>{valor}</Text>
      <Text style={[styles.specLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={styles.seccion}>
      <Text style={[styles.seccionTitulo, { color: c.text }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  const c = useTheme();
  return (
    <View style={[styles.dato, { borderColor: c.border }]}>
      <Text style={[styles.datoLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.datoValor, { color: c.text }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  contenido: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  hero: { width: '100%', aspectRatio: 4 / 3, maxHeight: 460 },
  barraHero: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  redondo: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: Spacing.three, gap: Spacing.two },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etiqueta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  etiquetaTexto: { fontSize: 12, fontWeight: '700' },
  precio: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: Spacing.one,
    fontVariant: ['tabular-nums'],
  },
  titulo: { fontSize: 20, fontWeight: '700' },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lugarTexto: { fontSize: 15, fontWeight: '600' },
  specs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginTop: Spacing.two,
  },
  spec: { alignItems: 'center', gap: 3, minWidth: 64 },
  specValor: { fontSize: 18, fontWeight: '800' },
  specLabel: { fontSize: 12, fontWeight: '600' },
  resumen: { fontSize: 17, lineHeight: 24, marginTop: Spacing.two },
  mas: { gap: Spacing.four, marginTop: Spacing.three },
  seccion: { gap: Spacing.two },
  seccionTitulo: { fontSize: 17, fontWeight: '800' },
  parrafo: { fontSize: 16, lineHeight: 24 },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  pastillaTexto: { fontSize: 14, fontWeight: '600' },
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datoLabel: { fontSize: 15 },
  datoValor: { fontSize: 15, fontWeight: '700' },
  cuota: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth * 2, gap: 4 },
  cuotaValor: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cuotaNota: { fontSize: 13, lineHeight: 18 },
  mostrarMas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.three,
    paddingVertical: Spacing.three - 4,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  mostrarMasTexto: { fontSize: 15, fontWeight: '700' },
  acciones: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
  },
  accionesInner: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  botonSecundario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  botonSecundarioTexto: { fontSize: 15, fontWeight: '700' },
  botonPrimario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
  botonPrimarioTexto: { fontSize: 15, fontWeight: '700' },
  noEncontrada: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
});
