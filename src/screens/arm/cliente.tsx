import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  enlaceWhatsApp,
  hace,
  mensajeSeguimiento,
  presupuestoTexto,
  primerNombre,
  puntuar,
  resumenBrisa,
  siguienteAccion,
  temperatura,
} from '@/arm/logic';
import { ETAPAS, type Etapa } from '@/arm/types';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { getPropiedad, type Propiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { describirCriterios, hayCriterios } from '@/screens/brisa/engine';
import { useArm } from '@/state/arm';
import { precioTexto } from '@/utils/format';

import { armStyles, Avatar, BadgeTemperatura, BarraArm, BarraPuntaje, Boton, Etiqueta, Seccion, Tarjeta } from './ui';

export function DetalleCliente({ id }: { id: string }) {
  const c = useTheme();
  const { getCliente, actualizar } = useArm();
  const cl = getCliente(id);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!cl) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BarraArm titulo="Cliente no encontrado" />
      </View>
    );
  }

  const puntos = puntuar(cl);
  const t = temperatura(puntos);
  const accion = siguienteAccion(cl);
  const borrador = mensajeSeguimiento(cl);
  const intereses = cl.propiedadesInteres.map(getPropiedad).filter((p): p is Propiedad => !!p);
  const nombre = primerNombre(cl);

  const avisar = (msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 3500);
  };

  const ejecutarBrisa = () => {
    actualizar(
      cl.id,
      {},
      {
        tipo: 'seguimiento',
        autor: 'brisa',
        texto: `${accion.titulo}: mensaje enviado por ${cl.telefono ? 'WhatsApp' : 'la app'}.`,
      },
    );
    avisar(`Brisa ejecutó: ${accion.titulo.toLowerCase()}.`);
  };

  const tomarControl = () => {
    actualizar(
      cl.id,
      { controlHumano: true },
      { tipo: 'traspaso', autor: 'asesor', texto: 'Un asesor tomó el caso. Brisa pausó los seguimientos automáticos.' },
    );
    avisar(`Tomaste el caso de ${nombre}. Brisa te dejó el resumen arriba.`);
  };

  const devolver = () => {
    actualizar(
      cl.id,
      { controlHumano: false, traspasoSolicitado: false },
      { tipo: 'traspaso', autor: 'asesor', texto: 'El asesor devolvió el caso a Brisa.' },
    );
    avisar(`Brisa retoma el seguimiento de ${nombre}.`);
  };

  const cambiarEtapa = (e: Etapa) => {
    if (e === cl.etapa) return;
    actualizar(cl.id, { etapa: e }, { tipo: 'etapa', autor: 'asesor', texto: `Etapa cambiada a ${e}.` });
  };

  const enviarWhatsApp = () => {
    if (!cl.telefono) return;
    Linking.openURL(enlaceWhatsApp(cl.telefono, borrador));
    actualizar(
      cl.id,
      {},
      {
        tipo: 'seguimiento',
        autor: cl.controlHumano ? 'asesor' : 'brisa',
        texto: 'Mensaje de seguimiento enviado por WhatsApp.',
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BarraArm subtitulo="Cliente" titulo={cl.nombre} />
      <ScrollView contentContainerStyle={armStyles.contenido}>
        {/* Cabecera */}
        <View style={styles.cabecera}>
          <Avatar nombre={cl.nombre} enVivo={cl.enVivo} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.fila}>
              {cl.enVivo && <Etiqueta texto="En vivo" fuerte />}
              <BadgeTemperatura t={t} puntos={puntos} />
              <Etiqueta texto={cl.canal} />
            </View>
            <Text style={[styles.meta, { color: c.textSecondary }]}>
              {cl.telefono ? `WhatsApp ${cl.telefono}` : 'Sin WhatsApp todavía'} · Primer contacto {hace(cl.creado)}
            </Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.filaEntre}>
            <Text style={[styles.metaFuerte, { color: c.text }]}>Probabilidad de cierre</Text>
            <Text style={[styles.metaFuerte, { color: c.text }]}>{puntos}/100</Text>
          </View>
          <BarraPuntaje puntos={puntos} t={t} />
        </View>

        {aviso && (
          <View style={[styles.aviso, { backgroundColor: c.primary }]}>
            <Icon name="check" size={16} color={c.onPrimary} />
            <Text style={[styles.avisoTexto, { color: c.onPrimary }]}>{aviso}</Text>
          </View>
        )}

        {/* Próxima acción */}
        <Seccion
          titulo={
            cl.controlHumano ? 'Asesor a cargo' : accion.automatica ? 'Próxima acción de Brisa' : 'Necesita a un asesor'
          }
        >
          <Tarjeta destacada>
            <View style={styles.filaEntre}>
              <Text style={[styles.accionTitulo, { color: c.text }]}>{accion.titulo}</Text>
              <Etiqueta texto={accion.cuando} />
            </View>
            <Text style={[styles.parrafo, { color: c.text }]}>{accion.detalle}</Text>
            <View style={styles.botones}>
              {accion.automatica && !cl.controlHumano && (
                <Boton texto="Ejecutar ahora" icono="chispa" onPress={ejecutarBrisa} />
              )}
              {cl.controlHumano ? (
                <Boton texto="Devolver a Brisa" tipo="secundario" onPress={devolver} />
              ) : (
                <Boton
                  texto="Tomar el caso"
                  tipo={accion.automatica ? 'secundario' : 'primario'}
                  onPress={tomarControl}
                />
              )}
            </View>
          </Tarjeta>
        </Seccion>

        {/* Resumen */}
        <Seccion titulo="Resumen de Brisa">
          <Tarjeta>
            <Text style={[styles.parrafo, { color: c.text }]}>{resumenBrisa(cl)}</Text>
            <View style={styles.datos}>
              <Dato label="Presupuesto" valor={presupuestoTexto(cl)} />
              <Dato label="Propósito" valor={cl.proposito ?? 'Sin definir'} />
              <Dato label="Plazo" valor={cl.plazo ?? 'Sin definir'} />
              <Dato label="Financiamiento" valor={cl.interesFinanciamiento ? 'Sí, preguntó' : 'No mencionado'} />
            </View>
            {hayCriterios(cl.criterios) && (
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                Criterios: {describirCriterios(cl.criterios)}
              </Text>
            )}
          </Tarjeta>
        </Seccion>

        {/* Seguimiento */}
        <Seccion titulo="Mensaje de seguimiento">
          <Tarjeta>
            <Text style={[styles.meta, { color: c.textSecondary }]}>
              Brisa lo redactó según la etapa y lo que busca {nombre}:
            </Text>
            <View style={[styles.burbuja, { backgroundColor: c.brisaBubble }]}>
              <Text selectable style={[styles.parrafo, { color: c.text }]}>
                {borrador}
              </Text>
            </View>
            {cl.telefono ? (
              <Boton texto="Enviar por WhatsApp" icono="chat" onPress={enviarWhatsApp} />
            ) : (
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                Brisa le pedirá el WhatsApp en la próxima conversación.
              </Text>
            )}
          </Tarjeta>
        </Seccion>

        {/* Etapa */}
        <Seccion titulo="Etapa">
          <View style={styles.chips}>
            {ETAPAS.map((e) => (
              <Chip key={e} label={e} activo={cl.etapa === e} onPress={() => cambiarEtapa(e)} />
            ))}
          </View>
        </Seccion>

        {/* Propiedades */}
        {intereses.length > 0 && (
          <Seccion titulo="Propiedades de interés">
            <View style={{ gap: Spacing.two }}>
              {intereses.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push({ pathname: '/propiedad/[id]', params: { id: p.id } })}
                  style={({ pressed }) => [
                    styles.prop,
                    { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Image
                    source={p.imagen}
                    style={[styles.propImg, { backgroundColor: c.backgroundSelected }]}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.propPrecio, { color: c.text }]}>{precioTexto(p)}</Text>
                    <Text style={[styles.meta, { color: c.text }]} numberOfLines={1}>
                      {p.titulo}
                    </Text>
                    <Text style={[styles.meta, { color: c.textSecondary }]}>
                      {p.sector}, {p.ciudad}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Seccion>
        )}

        {/* Historial */}
        <Seccion titulo="Historial">
          <View style={{ gap: 0 }}>
            {[...cl.eventos].reverse().map((e, i, arr) => (
              <View key={e.id} style={styles.evento}>
                <View style={styles.linea}>
                  <View
                    style={[
                      styles.punto,
                      {
                        backgroundColor:
                          e.autor === 'brisa' ? c.primary : e.autor === 'asesor' ? c.accent : c.textSecondary,
                      },
                    ]}
                  />
                  {i < arr.length - 1 && <View style={[styles.trazo, { backgroundColor: c.border }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: Spacing.three }}>
                  <Text style={[styles.eventoAutor, { color: c.textSecondary }]}>
                    {e.autor === 'brisa' ? 'Brisa' : e.autor === 'asesor' ? 'Asesor' : nombre} · {hace(e.fecha)}
                  </Text>
                  <Text style={[styles.parrafo, { color: c.text }]}>{e.texto}</Text>
                </View>
              </View>
            ))}
            {cl.eventos.length === 0 && (
              <Text style={[styles.meta, { color: c.textSecondary }]}>Sin actividad todavía.</Text>
            )}
          </View>
        </Seccion>
      </ScrollView>
    </View>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  const c = useTheme();
  return (
    <View style={styles.dato}>
      <Text style={[styles.datoLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.datoValor, { color: c.text }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', gap: Spacing.three - 4, alignItems: 'center' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  meta: { fontSize: 14, lineHeight: 19 },
  metaFuerte: { fontSize: 14, fontWeight: '700' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three - 4,
    borderRadius: Radius.md,
  },
  avisoTexto: { flex: 1, fontSize: 14, fontWeight: '700' },
  accionTitulo: { fontSize: 18, fontWeight: '800', flex: 1 },
  parrafo: { fontSize: 15, lineHeight: 22 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.one },
  dato: { minWidth: '42%', flexGrow: 1, gap: 2 },
  datoLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  datoValor: { fontSize: 15, fontWeight: '600' },
  burbuja: { padding: Spacing.three - 2, borderRadius: Radius.md, borderBottomLeftRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  prop: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
  },
  propImg: { width: 64, height: 52, borderRadius: Radius.sm },
  propPrecio: { fontSize: 15, fontWeight: '800' },
  evento: { flexDirection: 'row', gap: Spacing.three - 4 },
  linea: { alignItems: 'center', width: 12 },
  punto: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  trazo: { width: 2, flex: 1, marginTop: 2 },
  eventoAutor: { fontSize: 12, fontWeight: '700' },
});
