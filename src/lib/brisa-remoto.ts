import { CANAL, conectado, INMOBILIARIA, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { idSesion } from '@/lib/sesion';

export type RespuestaRemota = {
  texto: string;
  propiedades: string[];
  sugerencias: string[];
  cliente: { id: string; etapa: string; nombre: string | null; traspaso_solicitado: boolean; control_humano: boolean };
};

async function llamar(body: Record<string, unknown>) {
  const canalId = await idSesion();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/brisa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ inmobiliaria: INMOBILIARIA, canal: CANAL, canalId, ...body }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `Error ${r.status}`);
  return data;
}

/** Envía un mensaje a Brisa (Claude) a través de la Edge Function. */
export async function mensajeBrisa(mensaje: string, propiedadFoco?: string): Promise<RespuestaRemota> {
  return (await llamar({ accion: 'mensaje', mensaje, propiedadFoco })) as RespuestaRemota;
}

/** Registra en el ARM una vista, favorito o visita (no bloquea la interfaz si falla). */
export function eventoBrisa(tipo: 'vista' | 'favorito' | 'visita', propiedadId: string, guardado?: boolean) {
  if (!conectado) return;
  llamar({ accion: 'evento', tipo, propiedadId, guardado }).catch((e) =>
    console.warn('No se pudo registrar el evento', e),
  );
}
