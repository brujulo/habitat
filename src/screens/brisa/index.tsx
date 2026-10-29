import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { getPropiedad, type Propiedad } from '@/data/properties';
import { useTheme } from '@/hooks/use-theme';
import { mensajeBrisa } from '@/lib/brisa-remoto';
import { conectado } from '@/lib/supabase';
import { useArm } from '@/state/arm';
import { precioTexto } from '@/utils/format';

import { BIENVENIDA, bienvenidaConPropiedad, responderBrisa, type ContextoBrisa, type MensajeBrisa } from './engine';

type Mensaje = MensajeBrisa & { id: string; autor: 'brisa' | 'usuario' };

let contador = 0;
const nuevoId = () => `m${Date.now()}-${contador++}`;

export function Brisa({ propiedadId }: { propiedadId?: string }) {
  const c = useTheme();
  const lista = useRef<FlatList<Mensaje>>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ ...BIENVENIDA, id: 'bienvenida', autor: 'brisa' }]);
  const [ctx, setCtx] = useState<ContextoBrisa>({ criterios: {} });
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const { registrarConversacion } = useArm();
  // 'ia' = Claude vía Supabase; 'demo' = motor local de reglas.
  const [modo, setModo] = useState<'ia' | 'demo'>(conectado ? 'ia' : 'demo');

  // Si se abre desde una propiedad, Brisa arranca hablando de ella.
  useEffect(() => {
    if (!propiedadId) return;
    const m = bienvenidaConPropiedad(propiedadId);
    if (!m) return;
    setCtx((prev) => ({ ...prev, propiedadFoco: propiedadId }));
    setMensajes((prev) => [...prev, { ...m, id: nuevoId(), autor: 'brisa' }]);
  }, [propiedadId]);

  useEffect(() => {
    const t = setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [mensajes.length, escribiendo]);

  const responderLocal = (limpio: string, aviso?: string) => {
    const { mensaje, ctx: nuevoCtx } = responderBrisa(limpio, ctx);
    // Pausa breve para que se sienta como una conversación.
    const demora = Math.min(1400, 450 + mensaje.texto.length * 4);
    setTimeout(() => {
      setCtx(nuevoCtx);
      registrarConversacion(nuevoCtx, limpio, mensaje);
      const texto = aviso ? `${mensaje.texto}\n\n(${aviso})` : mensaje.texto;
      setMensajes((prev) => [...prev, { ...mensaje, texto, id: nuevoId(), autor: 'brisa' }]);
      setEscribiendo(false);
    }, demora);
  };

  const enviar = (contenido: string) => {
    const limpio = contenido.trim();
    if (!limpio || escribiendo) return;
    setTexto('');
    setMensajes((prev) => [...prev, { id: nuevoId(), autor: 'usuario', texto: limpio }]);
    setEscribiendo(true);

    if (!conectado) {
      responderLocal(limpio);
      return;
    }
    mensajeBrisa(limpio, ctx.propiedadFoco)
      .then((r) => {
        setModo('ia');
        setMensajes((prev) => [
          ...prev,
          { id: nuevoId(), autor: 'brisa', texto: r.texto, propiedades: r.propiedades, sugerencias: r.sugerencias },
        ]);
        setEscribiendo(false);
      })
      .catch((e: Error) => {
        console.warn('Brisa IA no disponible, usando modo demo:', e.message);
        setModo('demo');
        responderLocal(limpio, 'Respuesta en modo sin conexión');
      });
  };

  const ultimoBrisa = [...mensajes].reverse().find((m) => m.autor === 'brisa');

  return (
    <Screen>
      <View style={[styles.header, { borderColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Icon name="chispa" size={20} color={c.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nombre, { color: c.text }]}>Brisa</Text>
          <Text style={[styles.estado, { color: escribiendo ? c.primary : c.textSecondary }]}>
            {escribiendo ? 'Escribiendo…' : 'Tu asesora inmobiliaria'}
          </Text>
        </View>
        <View style={[styles.demo, { backgroundColor: c.backgroundElement }]}>
          <Text style={[styles.demoTexto, { color: c.textSecondary }]}>{modo === 'ia' ? 'IA' : 'Demo'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? BottomTabInset : 0}
      >
        <FlatList
          ref={lista}
          data={mensajes}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.mensajes}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Burbuja
              mensaje={item}
              mostrarSugerencias={item.id === ultimoBrisa?.id && !escribiendo}
              onSugerencia={enviar}
            />
          )}
          ListFooterComponent={escribiendo ? <Escribiendo /> : undefined}
        />

        <View
          style={[
            styles.entrada,
            { borderColor: c.border, backgroundColor: c.background, marginBottom: BottomTabInset },
          ]}
        >
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escríbele a Brisa…"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]}
            onSubmitEditing={() => enviar(texto)}
            returnKeyType="send"
            multiline
            {...(Platform.OS === 'web' ? { rows: 1 } : null)}
            submitBehavior="submit"
            onKeyPress={(e) => {
              // En web, Enter envía y Shift+Enter hace salto de línea.
              const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                enviar(texto);
              }
            }}
            accessibilityLabel="Mensaje para Brisa"
          />
          <Pressable
            onPress={() => enviar(texto)}
            disabled={!texto.trim() || escribiendo}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            style={[styles.enviar, { backgroundColor: c.primary, opacity: !texto.trim() || escribiendo ? 0.4 : 1 }]}
          >
            <Icon name="enviar" size={18} color={c.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Burbuja({
  mensaje,
  mostrarSugerencias,
  onSugerencia,
}: {
  mensaje: Mensaje;
  mostrarSugerencias: boolean;
  onSugerencia: (s: string) => void;
}) {
  const c = useTheme();
  const esBrisa = mensaje.autor === 'brisa';
  const props = (mensaje.propiedades ?? []).map(getPropiedad).filter((p): p is Propiedad => !!p);

  return (
    <View style={[styles.fila, { alignItems: esBrisa ? 'flex-start' : 'flex-end' }]}>
      <View
        style={[
          styles.burbuja,
          esBrisa
            ? { backgroundColor: c.brisaBubble, borderBottomLeftRadius: 6 }
            : { backgroundColor: c.userBubble, borderBottomRightRadius: 6 },
        ]}
      >
        <Text selectable style={[styles.burbujaTexto, { color: esBrisa ? c.text : '#fff' }]}>
          {mensaje.texto}
        </Text>
      </View>

      {props.length > 0 && (
        <View style={styles.tarjetas}>
          {props.map((p) => (
            <MiniTarjeta key={p.id} p={p} />
          ))}
        </View>
      )}

      {mostrarSugerencias && mensaje.sugerencias && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sugerencias}>
          {mensaje.sugerencias.map((s) => (
            <Chip key={s} label={s} onPress={() => onSugerencia(s)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MiniTarjeta({ p }: { p: Propiedad }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/propiedad/[id]', params: { id: p.id } })}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.mini,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Image source={p.imagen} style={[styles.miniImg, { backgroundColor: c.backgroundSelected }]} contentFit="cover" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.miniPrecio, { color: c.text }]}>{precioTexto(p)}</Text>
        <Text style={[styles.miniTitulo, { color: c.text }]} numberOfLines={1}>
          {p.titulo}
        </Text>
        <Text style={[styles.miniLugar, { color: c.textSecondary }]} numberOfLines={1}>
          {p.sector}, {p.ciudad}
        </Text>
      </View>
    </Pressable>
  );
}

function Escribiendo() {
  const c = useTheme();
  return (
    <View style={[styles.fila, { alignItems: 'flex-start' }]}>
      <View style={[styles.burbuja, styles.puntos, { backgroundColor: c.brisaBubble, borderBottomLeftRadius: 6 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.punto, { backgroundColor: c.primary, opacity: 0.35 + i * 0.25 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 18, fontWeight: '800' },
  estado: { fontSize: 13, fontWeight: '600' },
  demo: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  demoTexto: { fontSize: 12, fontWeight: '700' },
  mensajes: { padding: Spacing.three, gap: Spacing.three - 4 },
  fila: { gap: Spacing.two },
  burbuja: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  burbujaTexto: { fontSize: 16, lineHeight: 22 },
  tarjetas: { gap: Spacing.two, width: '86%', maxWidth: 420 },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  miniImg: { width: 68, height: 56, borderRadius: Radius.sm },
  miniPrecio: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  miniTitulo: { fontSize: 14, fontWeight: '600' },
  miniLugar: { fontSize: 13 },
  sugerencias: { gap: Spacing.two, paddingRight: Spacing.three },
  puntos: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  entrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
  },
  enviar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
