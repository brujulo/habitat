// Herramientas que Claude puede usar. Cada una valida su entrada y opera solo
// sobre la inmobiliaria y el cliente de la conversación actual.
import { precioTexto } from './prompt.ts';
import type { ClienteRow, Db, Inmobiliaria, PropiedadRow } from './tipos.ts';

const TIPOS = ['Apartamento', 'Casa', 'Villa', 'Penthouse', 'Solar', 'Local'];

export const HERRAMIENTAS = [
  {
    name: 'buscar_propiedades',
    description:
      'Busca propiedades disponibles de la inmobiliaria. Úsala SIEMPRE antes de recomendar o mencionar propiedades. Todos los filtros son opcionales; usa solo los que el cliente haya expresado. Devuelve hasta 5 resultados ordenados por cercanía al presupuesto.',
    input_schema: {
      type: 'object',
      properties: {
        ciudades: { type: 'array', items: { type: 'string' }, description: 'Ej.: ["Santo Domingo"], ["Punta Cana"], ["Santiago"]' },
        sectores: { type: 'array', items: { type: 'string' }, description: 'Ej.: ["Piantini", "Naco"]' },
        tipo: { type: 'string', enum: TIPOS },
        operacion: { type: 'string', enum: ['Venta', 'Alquiler'] },
        habitaciones_min: { type: 'integer', minimum: 0 },
        presupuesto_max_usd: { type: 'number', description: 'En US$. Convierte RD$ dividiendo entre 63.' },
        presupuesto_min_usd: { type: 'number' },
        cerca_playa: { type: 'boolean' },
        texto: { type: 'string', description: 'Palabra clave libre, p. ej. "piscina" o "Ágora".' },
      },
    },
  },
  {
    name: 'ver_propiedad',
    description: 'Obtiene todos los detalles de una propiedad (descripción, amenidades, mantenimiento, año, etc.) para responder preguntas concretas.',
    input_schema: {
      type: 'object',
      properties: { propiedad_id: { type: 'string' } },
      required: ['propiedad_id'],
    },
  },
  {
    name: 'actualizar_cliente',
    description:
      'Guarda datos que el cliente compartió. Llámala en cuanto diga su nombre, su WhatsApp, su propósito, su plazo o si necesita financiamiento. Solo incluye lo que el cliente dijo.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        telefono: { type: 'string', description: 'WhatsApp en formato 809-555-1234' },
        proposito: { type: 'string', enum: ['Vivir', 'Invertir'] },
        plazo: { type: 'string', enum: ['Inmediato', '1 a 6 meses', 'Más de 6 meses'] },
        interes_financiamiento: { type: 'boolean' },
        consentimiento_datos: {
          type: 'boolean',
          description: 'true si el cliente aceptó que lo contacten por WhatsApp.',
        },
      },
    },
  },
  {
    name: 'registrar_interes',
    description: 'Anota que el cliente mostró interés claro en una propiedad concreta (pregunta por ella, la quiere ver, la compara, etc.).',
    input_schema: {
      type: 'object',
      properties: { propiedad_id: { type: 'string' } },
      required: ['propiedad_id'],
    },
  },
  {
    name: 'agendar_visita',
    description:
      'Solicita una visita a una propiedad. Requiere que ya tengas el WhatsApp del cliente. Un asesor confirmará el día y la hora; no prometas un horario exacto.',
    input_schema: {
      type: 'object',
      properties: {
        propiedad_id: { type: 'string' },
        preferencia: { type: 'string', description: 'Día u horario que prefiere el cliente, p. ej. "sábado en la mañana".' },
      },
      required: ['propiedad_id'],
    },
  },
  {
    name: 'traspasar_a_asesor',
    description:
      'Pasa el caso a un asesor humano. Úsala si el cliente lo pide, quiere ofertar o negociar, pregunta por contratos o temas legales específicos, o está molesto.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Resumen breve para el asesor.' },
      },
      required: ['motivo'],
    },
  },
  {
    name: 'mostrar_en_pantalla',
    description:
      'Muestra al cliente tarjetas de propiedades y respuestas rápidas. Llámala cada vez que menciones propiedades concretas y al final de tus respuestas con 2 a 4 sugerencias cortas.',
    input_schema: {
      type: 'object',
      properties: {
        propiedades: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Ids de propiedades a mostrar.' },
        sugerencias: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 4,
          description: 'Respuestas rápidas en primera persona del cliente, máximo 6 palabras cada una.',
        },
      },
    },
  },
] as const;

export type Pantalla = { propiedades: string[]; sugerencias: string[] };

type Contexto = {
  db: Db;
  inmo: Inmobiliaria;
  cliente: ClienteRow;
  pantalla: Pantalla;
};

const resumenPropiedad = (p: PropiedadRow) => ({
  id: p.id,
  titulo: p.titulo,
  tipo: p.tipo,
  operacion: p.operacion,
  precio: precioTexto(p),
  ubicacion: `${p.sector}, ${p.ciudad}`,
  habitaciones: p.habitaciones,
  banos: Number(p.banos),
  metros: Number(p.metros),
  resumen: p.resumen,
  confotur: p.confotur || undefined,
  en_plano: p.en_plano ? `Sí, entrega ${p.entrega ?? 'por confirmar'}` : undefined,
});

const limpiarTelefono = (t: string) => {
  const d = t.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : t.trim();
};

/** Ejecuta una herramienta y devuelve el texto para el tool_result. */
export async function ejecutarHerramienta(
  nombre: string,
  input: Record<string, unknown>,
  ctx: Contexto,
): Promise<{ contenido: string; error?: boolean }> {
  const { db, inmo } = ctx;
  const cid = ctx.cliente.id;

  switch (nombre) {
    case 'buscar_propiedades': {
      const criterios: Record<string, unknown> = {};
      for (const k of ['ciudades', 'sectores', 'tipo', 'operacion', 'habitaciones_min', 'presupuesto_max_usd', 'presupuesto_min_usd', 'cerca_playa', 'texto']) {
        if (input[k] !== undefined && input[k] !== null && input[k] !== '') criterios[k] = input[k];
      }
      const resultados = await db.buscarPropiedades(inmo.id, criterios, 5);
      // Lo que el cliente busca queda guardado en su ficha del ARM.
      const { texto: _texto, ...paraPerfil } = criterios;
      if (Object.keys(paraPerfil).length) {
        ctx.cliente = await db.actualizarCliente(cid, { criterios: paraPerfil });
      }
      if (!resultados.length) {
        return { contenido: JSON.stringify({ resultados: [], nota: 'Sin coincidencias. Sugiere ampliar zona o presupuesto.' }) };
      }
      return { contenido: JSON.stringify({ resultados: resultados.map(resumenPropiedad) }) };
    }

    case 'ver_propiedad': {
      const p = await db.propiedad(inmo.id, String(input.propiedad_id ?? ''));
      if (!p) return { contenido: 'No existe una propiedad con ese id en esta inmobiliaria.', error: true };
      return {
        contenido: JSON.stringify({
          ...resumenPropiedad(p),
          descripcion: p.descripcion,
          provincia: p.provincia,
          parqueos: p.parqueos,
          amenidades: p.amenidades,
          cerca_de: p.cerca_de,
          ano_construccion: p.ano_construccion,
          mantenimiento: p.mantenimiento_usd != null ? `US$${p.mantenimiento_usd}/mes` : 'No registrado',
        }),
      };
    }

    case 'actualizar_cliente': {
      const cambios: Record<string, unknown> = {};
      if (typeof input.nombre === 'string' && input.nombre.trim()) cambios.nombre = input.nombre.trim().slice(0, 80);
      if (typeof input.telefono === 'string' && input.telefono.trim()) cambios.telefono = limpiarTelefono(input.telefono);
      for (const k of ['proposito', 'plazo', 'interes_financiamiento', 'consentimiento_datos']) {
        if (input[k] !== undefined) cambios[k] = input[k];
      }
      if (!Object.keys(cambios).length) return { contenido: 'No había datos nuevos que guardar.' };
      const antes = ctx.cliente;
      ctx.cliente = await db.actualizarCliente(cid, cambios);
      if (cambios.telefono && cambios.telefono !== antes.telefono) {
        await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cid, tipo: 'nota', autor: 'brisa', texto: `Captó su WhatsApp: ${cambios.telefono}.` });
      }
      return { contenido: `Guardado: ${Object.keys(cambios).join(', ')}.` };
    }

    case 'registrar_interes': {
      const p = await db.propiedad(inmo.id, String(input.propiedad_id ?? ''));
      if (!p) return { contenido: 'Propiedad no encontrada.', error: true };
      if (!ctx.cliente.propiedades_interes.includes(p.id)) {
        ctx.cliente = await db.actualizarCliente(cid, { agregar_interes: p.id });
        await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cid, tipo: 'nota', autor: 'brisa', texto: `Mostró interés en ${p.titulo}.`, propiedad_id: p.id });
      }
      return { contenido: 'Interés registrado.' };
    }

    case 'agendar_visita': {
      const p = await db.propiedad(inmo.id, String(input.propiedad_id ?? ''));
      if (!p) return { contenido: 'Propiedad no encontrada.', error: true };
      if (!ctx.cliente.telefono) {
        return { contenido: 'Falta el WhatsApp del cliente. Pídeselo antes de agendar.', error: true };
      }
      const pref = typeof input.preferencia === 'string' && input.preferencia.trim() ? ` (prefiere: ${input.preferencia.trim()})` : '';
      ctx.cliente = await db.actualizarCliente(cid, { agregar_interes: p.id, etapa: 'Visita agendada' });
      await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cid, tipo: 'visita', autor: 'cliente', texto: `Solicitó visita a ${p.titulo}${pref}.`, propiedad_id: p.id });
      return { contenido: `Visita solicitada para ${p.titulo}. Un asesor confirmará día y hora por WhatsApp al ${ctx.cliente.telefono}.` };
    }

    case 'traspasar_a_asesor': {
      const motivo = String(input.motivo ?? 'El cliente pidió un asesor.').slice(0, 300);
      if (!ctx.cliente.traspaso_solicitado) {
        ctx.cliente = await db.actualizarCliente(cid, { traspaso_solicitado: true });
        await db.evento({ inmobiliaria_id: inmo.id, cliente_id: cid, tipo: 'traspaso', autor: 'brisa', texto: `Brisa pidió un asesor: ${motivo}` });
      }
      return {
        contenido: ctx.cliente.telefono
          ? `Caso traspasado. Un asesor contactará al cliente al ${ctx.cliente.telefono}.`
          : 'Caso marcado para un asesor, pero falta el WhatsApp del cliente: pídeselo para que puedan contactarlo.',
      };
    }

    case 'mostrar_en_pantalla': {
      const ids = Array.isArray(input.propiedades) ? input.propiedades.map(String).slice(0, 3) : [];
      const validos: string[] = [];
      for (const id of ids) if (await db.propiedad(inmo.id, id)) validos.push(id);
      if (validos.length) ctx.pantalla.propiedades = validos;
      if (Array.isArray(input.sugerencias)) {
        ctx.pantalla.sugerencias = input.sugerencias.map((s) => String(s).slice(0, 60)).filter(Boolean).slice(0, 4);
      }
      const invalidos = ids.filter((i) => !validos.includes(i));
      return invalidos.length
        ? { contenido: `Mostrado. Ids inexistentes ignorados: ${invalidos.join(', ')}.`, error: validos.length === 0 }
        : { contenido: 'Mostrado.' };
    }

    default:
      return { contenido: `Herramienta desconocida: ${nombre}`, error: true };
  }
}
