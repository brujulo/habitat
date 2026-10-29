// Acceso del panel ARM a Supabase. Las reglas RLS limitan todo a la inmobiliaria del asesor.
import type { Canal, Cliente, Etapa, Evento } from '@/arm/types';
import { supabase } from '@/lib/supabase';
import type { Criterios } from '@/screens/brisa/engine';

type FilaCliente = {
  id: string;
  inmobiliaria_id: string;
  canal: string;
  canal_id: string;
  nombre: string | null;
  telefono: string | null;
  criterios: Record<string, unknown> | null;
  proposito: Cliente['proposito'] | null;
  plazo: Cliente['plazo'] | null;
  interes_financiamiento: boolean;
  propiedades_interes: string[] | null;
  etapa: Etapa;
  control_humano: boolean;
  traspaso_solicitado: boolean;
  creado: string;
  ultima_actividad: string;
};

type FilaEvento = {
  id: string;
  cliente_id: string;
  tipo: Evento['tipo'];
  autor: Evento['autor'];
  texto: string;
  fecha: string;
};

/** Criterios guardados por Brisa (snake_case) → criterios de la app. */
export function criteriosDesdeDb(c: Record<string, unknown> | null): Criterios {
  if (!c) return {};
  const arr = (v: unknown) => (Array.isArray(v) && v.length ? v.map(String) : undefined);
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v ? Number(v) : undefined);
  return {
    ciudades: arr(c.ciudades),
    sectores: arr(c.sectores),
    tipo: (c.tipo as Criterios['tipo']) ?? undefined,
    operacion: (c.operacion as Criterios['operacion']) ?? undefined,
    habitaciones: num(c.habitaciones_min),
    presupuestoMax: num(c.presupuesto_max_usd),
    presupuestoMin: num(c.presupuesto_min_usd),
    playa: c.cerca_playa === true ? true : undefined,
  };
}

const CANALES: Canal[] = ['App', 'WhatsApp', 'Instagram', 'Web', 'Messenger'];

function aCliente(f: FilaCliente, eventos: Evento[], miSesion: string | null): Cliente {
  const nombre =
    f.nombre ?? (f.telefono ? `Cliente ${f.telefono}` : `Visitante ${f.canal === 'Web' ? 'web' : 'de la app'}`);
  return {
    id: f.id,
    nombre,
    telefono: f.telefono ?? undefined,
    canal: CANALES.includes(f.canal as Canal) ? (f.canal as Canal) : 'App',
    criterios: criteriosDesdeDb(f.criterios),
    proposito: f.proposito ?? undefined,
    plazo: f.plazo ?? undefined,
    interesFinanciamiento: f.interes_financiamiento,
    propiedadesInteres: f.propiedades_interes ?? [],
    etapa: f.etapa,
    controlHumano: f.control_humano,
    traspasoSolicitado: f.traspaso_solicitado,
    creado: Date.parse(f.creado),
    ultimaActividad: Date.parse(f.ultima_actividad),
    eventos,
    enVivo: !!miSesion && f.canal_id === miSesion,
  };
}

export type Membresia = { inmobiliariaId: string; inmobiliaria: string; nombre: string; rol: string };

export async function cargarMembresia(): Promise<Membresia | null> {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from('miembros')
    .select('inmobiliaria_id, nombre, rol, inmobiliarias(nombre)')
    .eq('user_id', u.user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const inmo = (data as unknown as { inmobiliarias: { nombre: string } | null }).inmobiliarias;
  return { inmobiliariaId: data.inmobiliaria_id, inmobiliaria: inmo?.nombre ?? '', nombre: data.nombre, rol: data.rol };
}

export async function cargarClientes(miSesion: string | null): Promise<Cliente[]> {
  if (!supabase) return [];
  const { data: filas, error } = await supabase
    .from('clientes')
    .select('*')
    .order('ultima_actividad', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const clientes = (filas ?? []) as FilaCliente[];
  if (!clientes.length) return [];

  const { data: evs, error: e2 } = await supabase
    .from('eventos')
    .select('id, cliente_id, tipo, autor, texto, fecha')
    .in(
      'cliente_id',
      clientes.map((c) => c.id),
    )
    .order('fecha', { ascending: true })
    .limit(3000);
  if (e2) throw new Error(e2.message);

  const porCliente = new Map<string, Evento[]>();
  for (const e of (evs ?? []) as FilaEvento[]) {
    const lista = porCliente.get(e.cliente_id) ?? [];
    lista.push({ id: e.id, tipo: e.tipo, autor: e.autor, texto: e.texto, fecha: Date.parse(e.fecha) });
    porCliente.set(e.cliente_id, lista);
  }
  return clientes.map((f) => aCliente(f, porCliente.get(f.id) ?? [], miSesion));
}

/** Cambios que el asesor puede hacer desde el panel. */
export async function actualizarClienteRemoto(
  cliente: Pick<Cliente, 'id'>,
  inmobiliariaId: string,
  cambios: Partial<Pick<Cliente, 'etapa' | 'controlHumano' | 'traspasoSolicitado'>>,
  evento?: Pick<Evento, 'tipo' | 'texto'>,
) {
  if (!supabase) return;
  const fila: Record<string, unknown> = {};
  if (cambios.etapa) fila.etapa = cambios.etapa;
  if (cambios.controlHumano !== undefined) fila.control_humano = cambios.controlHumano;
  if (cambios.traspasoSolicitado !== undefined) fila.traspaso_solicitado = cambios.traspasoSolicitado;
  if (Object.keys(fila).length) {
    const { error } = await supabase.from('clientes').update(fila).eq('id', cliente.id);
    if (error) throw new Error(error.message);
  }
  if (evento) {
    const { error } = await supabase.from('eventos').insert({
      inmobiliaria_id: inmobiliariaId,
      cliente_id: cliente.id,
      tipo: evento.tipo,
      autor: 'asesor', // RLS: desde el panel solo se registran eventos del asesor
      texto: evento.texto,
    });
    if (error) throw new Error(error.message);
  }
}
