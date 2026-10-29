// Turno de conversación de Brisa: Claude + herramientas + memoria en la base de datos.
import { ejecutarHerramienta, HERRAMIENTAS, type Pantalla } from './herramientas.ts';
import { construirSistema } from './prompt.ts';
import type {
  BloqueContenido,
  BloqueToolResult,
  BloqueToolUse,
  Db,
  LlamarClaude,
  MensajeClaude,
  RespuestaBrisa,
} from './tipos.ts';

export const MODELO_POR_DEFECTO = 'claude-sonnet-5-5';
const MAX_VUELTAS = 6;
const HISTORIAL = 24;

export class ErrorBrisa extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type EntradaMensaje = {
  inmobiliaria: string; // slug
  canal: 'App' | 'Web' | 'WhatsApp' | 'Instagram' | 'Messenger';
  canalId: string;
  mensaje: string;
  propiedadFoco?: string | null;
};

/** Junta turnos consecutivos del mismo rol (la API exige alternancia user/assistant). */
function normalizarHistorial(h: { rol: 'user' | 'assistant'; texto: string }[]): MensajeClaude[] {
  const out: MensajeClaude[] = [];
  for (const m of h) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === m.rol) ultimo.content = `${ultimo.content as string}\n\n${m.texto}`;
    else out.push({ role: m.rol, content: m.texto });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

const textoDe = (bloques: BloqueContenido[]) =>
  bloques
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && typeof (b as { text?: unknown }).text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();

export async function responderMensaje(
  entrada: EntradaMensaje,
  deps: { db: Db; claude: LlamarClaude; modelo?: string },
): Promise<RespuestaBrisa> {
  const { db, claude } = deps;
  const mensaje = entrada.mensaje.trim().slice(0, 2000);
  if (!mensaje) throw new ErrorBrisa('El mensaje está vacío.');
  if (!entrada.canalId || entrada.canalId.length > 120) throw new ErrorBrisa('canalId inválido.');

  const inmo = await db.inmobiliaria(entrada.inmobiliaria);
  if (!inmo) throw new ErrorBrisa('Inmobiliaria no encontrada.', 404);

  let cliente = await db.cliente(inmo.id, entrada.canal, entrada.canalId);
  const foco = entrada.propiedadFoco ? await db.propiedad(inmo.id, entrada.propiedadFoco) : null;
  if (foco && !cliente.propiedades_interes.includes(foco.id)) {
    cliente = await db.actualizarCliente(cliente.id, { agregar_interes: foco.id });
  }

  const historial = normalizarHistorial(await db.historial(cliente.id, HISTORIAL));
  const mensajes: MensajeClaude[] = [...historial];
  const ultimo = mensajes[mensajes.length - 1];
  if (ultimo?.role === 'user') ultimo.content = `${ultimo.content as string}\n\n${mensaje}`;
  else mensajes.push({ role: 'user', content: mensaje });

  // El mensaje del cliente va primero en el historial del ARM.
  await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cliente.id, tipo: 'mensaje', autor: 'cliente', texto: recortar(mensaje) });

  const ctx = { db, inmo, cliente, pantalla: { propiedades: [], sugerencias: [] } as Pantalla };
  let texto = '';
  let tokens = { entrada: 0, salida: 0, cache: 0 };

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const r = await claude({
      model: deps.modelo || MODELO_POR_DEFECTO,
      max_tokens: 1500,
      system: construirSistema(inmo, ctx.cliente, foco),
      tools: [...HERRAMIENTAS],
      messages: mensajes,
    });
    tokens = {
      entrada: tokens.entrada + (r.usage?.input_tokens ?? 0),
      salida: tokens.salida + (r.usage?.output_tokens ?? 0),
      cache: tokens.cache + (r.usage?.cache_read_input_tokens ?? 0),
    };
    const t = textoDe(r.content);
    if (t) texto = t;

    const usos = r.content.filter((b): b is BloqueToolUse => b.type === 'tool_use');
    if (r.stop_reason !== 'tool_use' || !usos.length) break;

    mensajes.push({ role: 'assistant', content: r.content });
    const resultados: BloqueToolResult[] = [];
    for (const u of usos) {
      try {
        const res = await ejecutarHerramienta(u.name, u.input ?? {}, ctx);
        resultados.push({ type: 'tool_result', tool_use_id: u.id, content: res.contenido, ...(res.error ? { is_error: true } : {}) });
      } catch (e) {
        console.error('Error en herramienta', u.name, e);
        resultados.push({ type: 'tool_result', tool_use_id: u.id, content: 'Error interno al ejecutar la herramienta.', is_error: true });
      }
    }
    mensajes.push({ role: 'user', content: resultados });
  }

  if (!texto) {
    texto = 'Disculpa, no pude completar tu solicitud en este momento. ¿Me lo repites o prefieres que te contacte un asesor?';
  }

  const { propiedades, sugerencias } = ctx.pantalla;
  const notaPropiedades = propiedades.length ? `\n[Propiedades mostradas: ${propiedades.join(', ')}]` : '';

  await db.guardarMensaje({ inmobiliaria_id: inmo.id, cliente_id: ctx.cliente.id, rol: 'user', texto: mensaje });
  await db.guardarMensaje({
    inmobiliaria_id: inmo.id,
    cliente_id: ctx.cliente.id,
    rol: 'assistant',
    texto: texto + notaPropiedades,
    meta: { propiedades, sugerencias, tokens },
  });
  await db.evento({
    inmobiliaria_id: inmo.id,
    cliente_id: ctx.cliente.id,
    tipo: 'mensaje',
    autor: 'brisa',
    texto: propiedades.length
      ? `Respondió y recomendó ${propiedades.length} ${propiedades.length === 1 ? 'propiedad' : 'propiedades'}.`
      : recortar(texto),
  });

  return {
    texto,
    propiedades,
    sugerencias,
    cliente: {
      id: ctx.cliente.id,
      etapa: ctx.cliente.etapa,
      nombre: ctx.cliente.nombre,
      traspaso_solicitado: ctx.cliente.traspaso_solicitado,
      control_humano: ctx.cliente.control_humano,
    },
  };
}

/** Eventos que la app registra sin pasar por Claude (vistas, favoritos, visitas). */
export async function registrarEventoApp(
  entrada: { inmobiliaria: string; canal: EntradaMensaje['canal']; canalId: string; tipo: string; propiedadId: string; guardado?: boolean },
  db: Db,
) {
  if (!['vista', 'favorito', 'visita'].includes(entrada.tipo)) throw new ErrorBrisa('Tipo de evento no permitido.');
  const inmo = await db.inmobiliaria(entrada.inmobiliaria);
  if (!inmo) throw new ErrorBrisa('Inmobiliaria no encontrada.', 404);
  const p = await db.propiedad(inmo.id, entrada.propiedadId);
  if (!p) throw new ErrorBrisa('Propiedad no encontrada.', 404);
  const cliente = await db.cliente(inmo.id, entrada.canal, entrada.canalId);

  let texto = `Vio ${p.titulo}.`;
  const cambios: Record<string, unknown> = { agregar_interes: p.id };
  if (entrada.tipo === 'favorito') texto = `${entrada.guardado === false ? 'Quitó de favoritos' : 'Guardó'} ${p.titulo}.`;
  if (entrada.tipo === 'visita') {
    texto = `Solicitó visita a ${p.titulo} desde la ficha.`;
    cambios.etapa = 'Visita agendada';
  }
  if (entrada.tipo === 'favorito' && entrada.guardado === false) delete cambios.agregar_interes;
  const c = Object.keys(cambios).length ? await db.actualizarCliente(cliente.id, cambios) : cliente;
  await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cliente.id, tipo: entrada.tipo as 'vista', autor: 'cliente', texto, propiedad_id: p.id });
  return { ok: true, etapa: c.etapa };
}

const recortar = (s: string, max = 140) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
