// Implementación de Db sobre la API REST de Supabase (PostgREST) con la service_role key.
// Sin dependencias externas: solo fetch.
import type { ClienteRow, Db, Inmobiliaria, PropiedadRow } from './tipos.ts';

export function crearDbRest(url: string, serviceKey: string, f: typeof fetch = fetch): Db {
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    const r = await f(`${base}${ruta}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    if (!r.ok) throw new Error(`Supabase ${r.status} en ${ruta}: ${await r.text()}`);
    const txt = await r.text();
    return (txt ? JSON.parse(txt) : null) as T;
  }
  const rpc = <T>(fn: string, body: unknown) => pedir<T>(`/rpc/${fn}`, { method: 'POST', body: JSON.stringify(body) });
  const enc = encodeURIComponent;

  return {
    async inmobiliaria(slug) {
      const r = await pedir<Inmobiliaria[]>(`/inmobiliarias?slug=eq.${enc(slug)}&activa=is.true&select=id,slug,nombre,instrucciones_brisa`);
      return r[0] ?? null;
    },
    cliente: (inmobiliariaId, canal, canalId) =>
      rpc<ClienteRow>('brisa_cliente', { p_inmobiliaria: inmobiliariaId, p_canal: canal, p_canal_id: canalId }),
    actualizarCliente: (clienteId, cambios) => rpc<ClienteRow>('brisa_actualizar_cliente', { p_cliente: clienteId, p_cambios: cambios }),
    buscarPropiedades: (inmobiliariaId, criterios, limite) =>
      rpc<PropiedadRow[]>('buscar_propiedades', { p_inmobiliaria: inmobiliariaId, p_criterios: criterios, p_limite: limite }),
    async propiedad(inmobiliariaId, id) {
      const r = await pedir<PropiedadRow[]>(
        `/propiedades?id=eq.${enc(id)}&inmobiliaria_id=eq.${enc(inmobiliariaId)}&publicada=is.true&select=*`,
      );
      return r[0] ?? null;
    },
    async evento(e) {
      await pedir('/eventos', { method: 'POST', body: JSON.stringify(e), headers: { Prefer: 'return=minimal' } });
    },
    async historial(clienteId, limite) {
      const r = await pedir<{ rol: 'user' | 'assistant'; texto: string }[]>(
        `/mensajes?cliente_id=eq.${enc(clienteId)}&select=rol,texto&order=id.desc&limit=${limite}`,
      );
      return r.reverse();
    },
    async guardarMensaje(m) {
      await pedir('/mensajes', { method: 'POST', body: JSON.stringify({ meta: {}, ...m }), headers: { Prefer: 'return=minimal' } });
    },
  };
}
