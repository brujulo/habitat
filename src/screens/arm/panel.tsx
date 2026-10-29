import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { hace, puntuar, siguienteAccion, temperatura } from '@/arm/logic';
import type { Cliente } from '@/arm/types';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useArm } from '@/state/arm';

import { LoginAsesor } from './login';
import { Avatar, BadgeTemperatura, BarraArm, Etiqueta } from './ui';

type Filtro = 'Todos' | 'Para asesor' | 'Calientes' | 'Brisa a cargo' | 'Cerrados';
const FILTROS: Filtro[] = ['Todos', 'Para asesor', 'Calientes', 'Brisa a cargo', 'Cerrados'];

const activo = (c: Cliente) => c.etapa !== 'Cerrado' && c.etapa !== 'Perdido';
const necesitaAsesor = (c: Cliente) => activo(c) && !siguienteAccion(c).automatica && !c.controlHumano;

export function PanelArm() {
  const c = useTheme();
  const { clientes, modo, usuario, membresia, cargando, error, cerrarSesion, recargar } = useArm();
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const filas = useMemo(() => {
    const conPuntos = clientes.map((cl) => ({ cl, puntos: puntuar(cl) }));
    const lista = conPuntos.filter(({ cl, puntos }) => {
      if (filtro === 'Para asesor') return necesitaAsesor(cl);
      if (filtro === 'Calientes') return activo(cl) && temperatura(puntos) === 'Caliente';
      if (filtro === 'Brisa a cargo') return activo(cl) && !cl.controlHumano;
      if (filtro === 'Cerrados') return !activo(cl);
      return true;
    });
    // Prioridad: en vivo, luego los que necesitan asesor, luego por puntaje.
    return lista.sort(
      (a, b) =>
        Number(!!b.cl.enVivo) - Number(!!a.cl.enVivo) ||
        Number(necesitaAsesor(b.cl)) - Number(necesitaAsesor(a.cl)) ||
        Number(activo(b.cl)) - Number(activo(a.cl)) ||
        b.puntos - a.puntos,
    );
  }, [clientes, filtro]);

  const kpis = useMemo(() => {
    const activos = clientes.filter(activo);
    const brisa = activos.filter((x) => !x.controlHumano).length;
    return [
      { valor: activos.length, label: 'Clientes activos' },
      { valor: activos.filter((x) => temperatura(puntuar(x)) === 'Caliente').length, label: 'Calientes' },
      { valor: clientes.filter(necesitaAsesor).length, label: 'Esperan asesor' },
      {
        valor: activos.length ? `${Math.round((brisa / activos.length) * 100)}%` : '—',
        label: 'Gestionados por Brisa',
      },
    ];
  }, [clientes]);

  if (modo === 'conectado' && !usuario) return <LoginAsesor />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BarraArm
        subtitulo={membresia ? `ARM · ${membresia.inmobiliaria}` : 'ARM · Brisa gestiona tus clientes'}
        titulo="Panel del asesor"
        derecha={
          modo === 'conectado' ? (
            <Pressable
              onPress={cerrarSesion}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.salir, { borderColor: c.border, backgroundColor: c.card }]}
            >
              <Text style={[styles.salirTexto, { color: c.textSecondary }]}>Salir</Text>
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={filas}
        keyExtractor={({ cl }) => cl.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          modo === 'conectado' ? (
            <RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={c.primary} />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={{ gap: Spacing.three }}>
            {modo === 'demo' && (
              <View style={[styles.aviso, { backgroundColor: c.warnSoft }]}>
                <Text style={[styles.avisoTexto, { color: c.text }]}>
                  Modo demo: clientes de ejemplo. Conecta Supabase para ver los clientes reales que atiende Brisa.
                </Text>
              </View>
            )}
            {error && (
              <View style={[styles.aviso, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.avisoTexto, { color: c.text }]}>{error}</Text>
              </View>
            )}
            <View style={styles.kpis}>
              {kpis.map((k) => (
                <View key={k.label} style={[styles.kpi, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.kpiValor, { color: c.text }]}>{k.valor}</Text>
                  <Text style={[styles.kpiLabel, { color: c.textSecondary }]}>{k.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.explica, { backgroundColor: c.primarySoft }]}>
              <Icon name="chispa" size={18} color={c.primary} />
              <Text style={[styles.explicaTexto, { color: c.text }]}>
                Brisa atiende, califica y da seguimiento sola. Aquí solo aparecen marcados los clientes que necesitan a
                una persona.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
              {FILTROS.map((f) => (
                <Chip key={f} label={f} activo={filtro === f} onPress={() => setFiltro(f)} />
              ))}
            </ScrollView>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        renderItem={({ item: { cl, puntos } }) => <FilaCliente cliente={cl} puntos={puntos} />}
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color={c.primary} style={{ padding: Spacing.five }} />
          ) : (
            <Text style={[styles.vacio, { color: c.textSecondary }]}>No hay clientes en esta vista por ahora.</Text>
          )
        }
      />
    </View>
  );
}

function FilaCliente({ cliente: cl, puntos }: { cliente: Cliente; puntos: number }) {
  const c = useTheme();
  const accion = siguienteAccion(cl);
  const t = temperatura(puntos);
  const urgente = !accion.automatica && !cl.controlHumano && activo(cl);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/arm/[id]', params: { id: cl.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${cl.nombre}, ${t}, etapa ${cl.etapa}`}
      style={({ pressed }) => [
        styles.fila,
        {
          backgroundColor: c.card,
          borderColor: urgente ? c.accent : c.border,
          borderWidth: urgente ? 1.5 : StyleSheet.hairlineWidth * 2,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Avatar nombre={cl.nombre} enVivo={cl.enVivo} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.filaTop}>
          <Text style={[styles.nombre, { color: c.text }]} numberOfLines={1}>
            {cl.nombre}
          </Text>
          <Text style={[styles.cuando, { color: c.textSecondary }]}>{hace(cl.ultimaActividad)}</Text>
        </View>
        <View style={styles.etiquetas}>
          {cl.enVivo && <Etiqueta texto="En vivo" fuerte />}
          <BadgeTemperatura t={t} puntos={puntos} />
          <Etiqueta texto={cl.etapa} />
          <Etiqueta texto={cl.canal} />
        </View>
        <View style={styles.accion}>
          <Icon name={accion.automatica ? 'chispa' : 'check'} size={13} color={urgente ? c.accent : c.primary} />
          <Text style={[styles.accionTexto, { color: urgente ? c.accent : c.textSecondary }]} numberOfLines={1}>
            {accion.automatica ? 'Brisa: ' : ''}
            {accion.titulo} · {accion.cuando.toLowerCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  salir: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  salirTexto: { fontSize: 13, fontWeight: '700' },
  aviso: { padding: Spacing.three - 4, borderRadius: Radius.md },
  avisoTexto: { fontSize: 14, lineHeight: 20 },
  lista: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three - 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 2,
  },
  kpiValor: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: 13, fontWeight: '600' },
  explica: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three - 2,
    borderRadius: Radius.md,
    alignItems: 'flex-start',
  },
  explicaTexto: { flex: 1, fontSize: 14, lineHeight: 20 },
  fila: { flexDirection: 'row', gap: Spacing.three - 4, padding: Spacing.three - 2, borderRadius: Radius.lg },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nombre: { flex: 1, fontSize: 16, fontWeight: '700' },
  cuando: { fontSize: 12, fontWeight: '600' },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  accionTexto: { flex: 1, fontSize: 13, fontWeight: '600' },
  vacio: { textAlign: 'center', padding: Spacing.five, fontSize: 15 },
});
