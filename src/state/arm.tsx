import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { etapaSugerida } from '@/arm/logic';
import type { Cliente, Evento } from '@/arm/types';
import { CLIENTES_DEMO } from '@/data/clientes-demo';
import { getPropiedad } from '@/data/properties';
import type { ContextoBrisa, MensajeBrisa } from '@/screens/brisa/engine';

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

  const actualizar = useCallback<ArmCtx['actualizar']>((id, cambios, evento) => {
    const aplicar = (c: Cliente): Cliente => ({
      ...c,
      ...cambios,
      ultimaActividad: Date.now(),
      eventos: evento ? [...c.eventos, nuevoEvento(evento)] : c.eventos,
    });
    if (id === SESION) setSesion((prev) => (prev ? aplicar(prev) : prev));
    else setDemo((prev) => prev.map((c) => (c.id === id ? aplicar(c) : c)));
  }, []);

  const clientes = useMemo(() => (sesion ? [sesion, ...demo] : demo), [sesion, demo]);

  const value = useMemo<ArmCtx>(
    () => ({
      clientes,
      getCliente: (id) => clientes.find((c) => c.id === id),
      registrarConversacion,
      registrarVista,
      registrarFavorito,
      registrarVisita,
      actualizar,
    }),
    [clientes, registrarConversacion, registrarVista, registrarFavorito, registrarVisita, actualizar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useArm debe usarse dentro de ArmProvider');
  return ctx;
}
