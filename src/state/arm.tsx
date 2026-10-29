import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { etapaSugerida } from '@/arm/logic';
import type { Cliente, Evento } from '@/arm/types';
import { CLIENTES_DEMO } from '@/data/clientes-demo';
import { getPropiedad } from '@/data/properties';
import { eventoBrisa } from '@/lib/brisa-remoto';
import { idSesion } from '@/lib/sesion';
import { conectado, supabase } from '@/lib/supabase';
import type { ContextoBrisa, MensajeBrisa } from '@/screens/brisa/engine';

import { actualizarClienteRemoto, cargarClientes, cargarMembresia, type Membresia } from './arm-remoto';

const SESION = 'sesion';

type ArmCtx = {
  clientes: Cliente[];
  getCliente: (id: string) => Cliente | undefined;
  /** Brisa registra cada intercambio del chat y actualiza el perfil del cliente en vivo. */
  registrarConversacion: (ctx: ContextoBrisa, mensajeCliente: string, respuesta: MensajeBrisa) => void;
  registrarVista: (propiedadId: string) => void;
  registrarFavorito: (propiedadId: string, guardado: boolean) => void;
  registrarVisita: (propiedadId: string) => void;
  actualizar: (id: string, cambios: Partial<Cliente>, evento?: Omit<Evento, 'id' | 'fecha'>) => void;
  /** 'demo': datos de ejemplo en memoria. 'conectado': clientes reales en Supabase (requiere login). */
  modo: 'demo' | 'conectado';
  usuario: { email: string } | null;
  membresia: Membresia | null;
  cargando: boolean;
  error: string | null;
  iniciarSesion: (email: string, clave: string) => Promise<string | null>;
  cerrarSesion: () => Promise<void>;
  recargar: () => Promise<void>;
};

const Ctx = createContext<ArmCtx | null>(null);

let contador = 0;
const nuevoEvento = (e: Omit<Evento, 'id' | 'fecha'>): Evento => ({
  ...e,
  id: `e${Date.now()}-${contador++}`,
  fecha: Date.now(),
});

const sesionVacia = (): Cliente => ({
  id: SESION,
  nombre: 'Visitante de la app',
  canal: 'App',
  criterios: {},
  propiedadesInteres: [],
  etapa: 'Nuevo',
  controlHumano: false,
  creado: Date.now(),
  ultimaActividad: Date.now(),
  eventos: [],
  enVivo: true,
});

const resumir = (s: string, max = 120) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Estado del ARM en memoria para el prototipo.
 * En producción esto vive en una base de datos y Brisa corre los seguimientos desde el servidor.
 */
export function ArmProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<Cliente[]>(CLIENTES_DEMO);
  const [sesion, setSesion] = useState<Cliente | null>(null);

  // ---- Modo conectado (Supabase) ----
  const [usuario, setUsuario] = useState<{ email: string } | null>(null);
  const [membresia, setMembresia] = useState<Membresia | null>(null);
  const [remotos, setRemotos] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabase) return;
    setCargando(true);
    setError(null);
    try {
      const m = await cargarMembresia();
      setMembresia(m);
      if (!m) {
        setRemotos([]);
        setError('Tu usuario no está asignado a ninguna inmobiliaria. Pide al administrador que te agregue.');
        return;
      }
      setRemotos(await cargarClientes(await idSesion()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user?.email ? { email: data.session.user.email } : null);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setUsuario(s?.user?.email ? { email: s.user.email } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (usuario) recargar();
    else {
      setRemotos([]);
      setMembresia(null);
    }
  }, [usuario, recargar]);

  // Mientras el panel está abierto con sesión, refresca cada 30 s para ver lo que hace Brisa.
  useEffect(() => {
    if (!usuario) return;
    const t = setInterval(() => recargar(), 30_000);
    return () => clearInterval(t);
  }, [usuario, recargar]);

  const iniciarSesion = useCallback(async (email: string, clave: string) => {
    if (!supabase) return 'La app no está conectada a Supabase.';
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    return e ? (e.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : e.message) : null;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const editarSesion = useCallback((fn: (c: Cliente) => Cliente) => {
    setSesion((prev) => {
      const base = prev ?? sesionVacia();
      const next = fn(base);
      return { ...next, etapa: etapaSugerida(next), ultimaActividad: Date.now() };
    });
  }, []);

  const registrarConversacion = useCallback<ArmCtx['registrarConversacion']>(
    (ctx, mensajeCliente, respuesta) => {
      editarSesion((c) => {
        const p = ctx.perfil ?? {};
        const nuevos: Evento[] = [nuevoEvento({ tipo: 'mensaje', autor: 'cliente', texto: resumir(mensajeCliente) })];
        const mostradas = respuesta.propiedades?.length ?? 0;
        nuevos.push(
          nuevoEvento({
            tipo: 'mensaje',
            autor: 'brisa',
            texto: mostradas
              ? `Respondió y recomendó ${mostradas} ${mostradas === 1 ? 'propiedad' : 'propiedades'}.`
              : resumir(respuesta.texto.split('\n')[0]),
          }),
        );
        if (p.telefono && p.telefono !== c.telefono) {
          nuevos.push(nuevoEvento({ tipo: 'nota', autor: 'brisa', texto: `Captó su WhatsApp: ${p.telefono}.` }));
        }
        const pideAhora = p.pideHumano && !c.traspasoSolicitado;
        if (pideAhora) {
          nuevos.push(nuevoEvento({ tipo: 'traspaso', autor: 'cliente', texto: 'Pidió hablar con un asesor humano.' }));
        }
        const foco = ctx.propiedadFoco;
        return {
          ...c,
          nombre: p.nombre ?? c.nombre,
          telefono: p.telefono ?? c.telefono,
          proposito: p.proposito ?? c.proposito,
          plazo: p.plazo ?? c.plazo,
          interesFinanciamiento: p.interesFinanciamiento || c.interesFinanciamiento,
          traspasoSolicitado: c.traspasoSolicitado || p.pideHumano,
          criterios: ctx.criterios,
          propiedadesInteres:
            foco && !c.propiedadesInteres.includes(foco) ? [foco, ...c.propiedadesInteres] : c.propiedadesInteres,
          eventos: [...c.eventos, ...nuevos],
        };
      });
    },
    [editarSesion],
  );

  const registrarVista = useCallback(
    (id: string) => {
      const p = getPropiedad(id);
      if (!p) return;
      eventoBrisa('vista', id);
      editarSesion((c) => ({
        ...c,
        propiedadesInteres: c.propiedadesInteres.includes(id) ? c.propiedadesInteres : [...c.propiedadesInteres, id],
        eventos: [...c.eventos, nuevoEvento({ tipo: 'vista', autor: 'cliente', texto: `Vio ${p.titulo}.` })],
      }));
    },
    [editarSesion],
  );

  const registrarFavorito = useCallback(
    (id: string, guardado: boolean) => {
      const p = getPropiedad(id);
      if (!p) return;
      eventoBrisa('favorito', id, guardado);
      editarSesion((c) => ({
        ...c,
        propiedadesInteres: guardado ? [id, ...c.propiedadesInteres.filter((x) => x !== id)] : c.propiedadesInteres,
        eventos: [
          ...c.eventos,
          nuevoEvento({
            tipo: 'favorito',
            autor: 'cliente',
            texto: `${guardado ? 'Guardó' : 'Quitó de favoritos'} ${p.titulo}.`,
          }),
        ],
      }));
    },
    [editarSesion],
  );

  const registrarVisita = useCallback(
    (id: string) => {
      const p = getPropiedad(id);
      if (!p) return;
      eventoBrisa('visita', id);
      editarSesion((c) => ({
        ...c,
        etapa: c.etapa === 'Negociación' || c.etapa === 'Cerrado' ? c.etapa : 'Visita agendada',
        propiedadesInteres: [id, ...c.propiedadesInteres.filter((x) => x !== id)],
        eventos: [
          ...c.eventos,
          nuevoEvento({ tipo: 'visita', autor: 'cliente', texto: `Solicitó visita a ${p.titulo}.` }),
          nuevoEvento({ tipo: 'etapa', autor: 'brisa', texto: 'Brisa movió el caso a Visita agendada.' }),
        ],
      }));
    },
    [editarSesion],
  );

  const actualizar = useCallback<ArmCtx['actualizar']>(
    (id, cambios, evento) => {
      if (conectado) {
        if (!membresia) return;
        actualizarClienteRemoto({ id }, membresia.inmobiliariaId, cambios, evento)
          .then(recargar)
          .catch((e: Error) => setError(e.message));
        // Reflejo inmediato en pantalla mientras se guarda.
        setRemotos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios, ultimaActividad: Date.now() } : c)));
        return;
      }
      const aplicar = (c: Cliente): Cliente => ({
        ...c,
        ...cambios,
        ultimaActividad: Date.now(),
        eventos: evento ? [...c.eventos, nuevoEvento(evento)] : c.eventos,
      });
      if (id === SESION) setSesion((prev) => (prev ? aplicar(prev) : prev));
      else setDemo((prev) => prev.map((c) => (c.id === id ? aplicar(c) : c)));
    },
    [membresia, recargar],
  );

  const clientes = useMemo(() => (conectado ? remotos : sesion ? [sesion, ...demo] : demo), [remotos, sesion, demo]);

  const value = useMemo<ArmCtx>(
    () => ({
      clientes,
      getCliente: (id) => clientes.find((c) => c.id === id),
      registrarConversacion,
      registrarVista,
      registrarFavorito,
      registrarVisita,
      actualizar,
      modo: conectado ? 'conectado' : 'demo',
      usuario,
      membresia,
      cargando,
      error,
      iniciarSesion,
      cerrarSesion,
      recargar,
    }),
    [
      clientes,
      registrarConversacion,
      registrarVista,
      registrarFavorito,
      registrarVisita,
      actualizar,
      usuario,
      membresia,
      cargando,
      error,
      iniciarSesion,
      cerrarSesion,
      recargar,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useArm debe usarse dentro de ArmProvider');
  return ctx;
}
