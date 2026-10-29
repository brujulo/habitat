/**
 * Motor simulado de Brisa (sin IA real).
 * Interpreta el mensaje con reglas sencillas: zona, tipo, presupuesto, habitaciones
 * y preguntas frecuentes del mercado dominicano. Responde como una asesora que
 * califica al cliente, recomienda y empuja con suavidad al siguiente paso (visita).
 *
 * Para conectar una IA real más adelante, reemplaza `responderBrisa` por una llamada
 * a tu backend manteniendo la misma forma de `MensajeBrisa`.
 */
import { TASA_USD_DOP } from '@/constants/mercado';
import { PROPIEDADES, getPropiedad, type Operacion, type Propiedad, type TipoPropiedad } from '@/data/properties';
import { cuotaMensual, formatDOP, formatUSD, precioTexto } from '@/utils/format';

export type MensajeBrisa = {
  texto: string;
  propiedades?: string[];
  sugerencias?: string[];
};

export type Criterios = {
  ciudades?: string[];
  sectores?: string[];
  tipo?: TipoPropiedad;
  operacion?: Operacion;
  habitaciones?: number;
  presupuestoMax?: number;
  presupuestoMin?: number;
  playa?: boolean;
};

export type Proposito = 'Vivir' | 'Invertir';
export type Plazo = 'Inmediato' | '1 a 6 meses' | 'Más de 6 meses';

/** Lo que Brisa va aprendiendo del cliente durante la conversación (alimenta el ARM). */
export type PerfilCliente = {
  nombre?: string;
  telefono?: string;
  proposito?: Proposito;
  plazo?: Plazo;
  pideHumano?: boolean;
  interesFinanciamiento?: boolean;
};

export type ContextoBrisa = {
  criterios: Criterios;
  propiedadFoco?: string;
  perfil?: PerfilCliente;
  pidioContacto?: boolean;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** "Apartamento moderno en Torre Ámbar" -> "apartamento moderno en Torre Ámbar" (respeta nombres propios). */
const enFrase = (titulo: string) => titulo.charAt(0).toLowerCase() + titulo.slice(1);

const tiene = (t: string, ...palabras: string[]) => palabras.some((p) => t.includes(p));

const ALIAS_CIUDAD: Record<string, string[]> = {
  'Santo Domingo': [
    'santo domingo',
    'distrito nacional',
    'la capital',
    'en la capital',
    ' sd ',
    'polígono central',
    'poligono central',
  ],
  'Santo Domingo Este': ['santo domingo este', 'sde', 'zona oriental'],
  'Santo Domingo Norte': ['santo domingo norte', 'sdn', 'villa mella'],
  'Punta Cana': ['punta cana', 'bavaro', 'cap cana', 'la altagracia'],
  Santiago: ['santiago', 'cibao'],
  'Las Terrenas': ['las terrenas', 'samana'],
  Sosúa: ['sosua', 'puerto plata', 'costa norte'],
  'Juan Dolio': ['juan dolio', 'san pedro'],
  Jarabacoa: ['jarabacoa', 'montana', 'montaña', 'clima fresco', 'frio'],
  'La Romana': ['la romana', 'casa de campo'],
};

const ALIAS_TIPO: [TipoPropiedad, string[]][] = [
  ['Penthouse', ['penthouse', 'ph ']],
  ['Apartamento', ['apartamento', 'apto', 'apart', 'condominio', 'condo']],
  ['Villa', ['villa']],
  ['Casa', ['casa', 'cabana']],
  ['Solar', ['solar', 'terreno', 'lote']],
  ['Local', ['local', 'oficina', 'comercial']],
];

const COSTERAS = ['Punta Cana', 'Las Terrenas', 'Sosúa', 'Juan Dolio', 'La Romana'];

/** Extrae un presupuesto en USD de frases como "hasta 200 mil", "US$150k", "RD$8 millones". */
function extraerPresupuesto(t: string): { max?: number; min?: number } {
  const re = /(rd\$|us\$|usd|\$)?\s*(\d+(?:[.,]\d+)?)\s*(millones|millon|mm|m\b|mil|k\b)?\s*(dolares|pesos|usd|rd)?/g;
  let mejor: number | undefined;
  let esPesos = /rd\$|pesos|\brd\b/.test(t);
  for (const m of t.matchAll(re)) {
    const [, moneda, numStr, mult, monedaSuf] = m;
    const despues = t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 12);
    if (/^\s*(hab|cuarto|dormit|bano|km|parqueo|nivel|minuto|ano|m2|metro)/.test(despues)) continue;
    let n = parseFloat(numStr.replace(',', '.'));
    if (mult === 'mil' || mult === 'k') n *= 1_000;
    if (mult && /^(millones|millon|mm|m)$/.test(mult)) n *= 1_000_000;
    if (!moneda && !mult && !monedaSuf && n < 1000) continue;
    if (moneda === 'rd$' || monedaSuf === 'pesos' || monedaSuf === 'rd') esPesos = true;
    if (moneda === 'us$' || moneda === 'usd' || monedaSuf === 'dolares' || monedaSuf === 'usd') esPesos = false;
    mejor = n;
  }
  if (mejor == null) return {};
  // Heurística: montos de varios millones sin moneda explícita suelen ser pesos.
  if (esPesos || mejor >= 3_000_000) mejor = mejor / TASA_USD_DOP;
  if (tiene(t, 'desde', 'mas de', 'minimo', 'por encima')) return { min: mejor };
  return { max: mejor };
}

export function extraerCriterios(textoOriginal: string, previos: Criterios = {}): Criterios {
  const t = ` ${norm(textoOriginal)} `;
  const c: Criterios = { ...previos };

  const ciudades = Object.entries(ALIAS_CIUDAD)
    .filter(([, alias]) => alias.some((a) => t.includes(norm(a))))
    .map(([ciudad]) => ciudad);
  const sectores = Array.from(new Set(PROPIEDADES.map((p) => p.sector))).filter((s) => t.includes(norm(s)));
  if (ciudades.length) {
    // "Santo Domingo Este/Norte" contienen "santo domingo": quedarse con la más específica.
    c.ciudades = ciudades.filter(
      (ci) => !(ci === 'Santo Domingo' && ciudades.some((o) => o.startsWith('Santo Domingo '))),
    );
    c.sectores = undefined;
  }
  if (sectores.length) c.sectores = sectores;

  for (const [tipo, alias] of ALIAS_TIPO) {
    if (alias.some((a) => t.includes(a))) {
      c.tipo = tipo;
      break;
    }
  }

  if (tiene(t, 'alquil', 'rentar', 'renta mensual', 'arrendar')) c.operacion = 'Alquiler';
  else if (tiene(t, 'compr', 'venta', 'invertir', 'inversion')) c.operacion = 'Venta';

  const hab = t.match(/(\d+)\s*(hab|cuarto|dormit|recamara)/);
  if (hab) c.habitaciones = parseInt(hab[1], 10);

  const pres = extraerPresupuesto(t);
  if (pres.max) {
    c.presupuestoMax = pres.max;
    c.presupuestoMin = undefined;
  }
  if (pres.min) {
    c.presupuestoMin = pres.min;
    c.presupuestoMax = undefined;
  }
  if (tiene(t, 'barato', 'economic', 'primera vivienda', 'poco dinero') && !pres.min) {
    c.presupuestoMax = Math.min(c.presupuestoMax ?? 120_000, 120_000);
    c.presupuestoMin = undefined;
  }
  if (tiene(t, 'lujo', 'exclusiv', 'alto nivel') && !pres.max) {
    c.presupuestoMin = 400_000;
    c.presupuestoMax = undefined;
  }

  // Un presupuesto de compra implica venta si el cliente no dijo lo contrario.
  if ((c.presupuestoMax || c.presupuestoMin) && !c.operacion) c.operacion = 'Venta';

  if (tiene(t, 'playa', 'mar ', 'frente al mar', 'costa')) {
    c.playa = true;
    if (!ciudades.length) c.ciudades = c.ciudades?.filter((ci) => COSTERAS.includes(ci));
    if (!sectores.length) c.sectores = undefined;
  } else if (ciudades.length || sectores.length) {
    c.playa = undefined;
  }

  return c;
}

export function filtrar(c: Criterios, holgura = 1.15): Propiedad[] {
  return PROPIEDADES.filter((p) => {
    if (c.ciudades?.length && !c.ciudades.includes(p.ciudad)) return false;
    if (c.sectores?.length && !c.sectores.includes(p.sector)) return false;
    if (c.tipo && p.tipo !== c.tipo) return false;
    if (c.operacion && p.operacion !== c.operacion) return false;
    if (c.habitaciones && p.habitaciones < c.habitaciones) return false;
    if (c.presupuestoMax && p.operacion === 'Venta' && p.precio > c.presupuestoMax * holgura) return false;
    if (c.presupuestoMin && p.operacion === 'Venta' && p.precio < c.presupuestoMin) return false;
    if (c.playa && !COSTERAS.includes(p.ciudad)) return false;
    return true;
  }).sort((a, b) => {
    if (c.presupuestoMax) return Math.abs(c.presupuestoMax - a.precio) - Math.abs(c.presupuestoMax - b.precio);
    if (c.presupuestoMin) return b.precio - a.precio;
    return a.precio - b.precio;
  });
}

export function hayCriterios(c: Criterios) {
  return !!(
    c.ciudades?.length ||
    c.sectores?.length ||
    c.tipo ||
    c.operacion ||
    c.habitaciones ||
    c.presupuestoMax ||
    c.presupuestoMin ||
    c.playa
  );
}

export function describirCriterios(c: Criterios) {
  const partes: string[] = [];
  if (c.tipo) partes.push(c.tipo.toLowerCase() + (c.tipo === 'Local' ? '' : 's'));
  if (c.operacion) partes.push(c.operacion === 'Venta' ? 'en venta' : 'en alquiler');
  if (c.habitaciones) partes.push(`de ${c.habitaciones}+ habitaciones`);
  if (c.sectores?.length) partes.push(`en ${c.sectores.join(' o ')}`);
  else if (c.ciudades?.length) partes.push(`en ${c.ciudades.join(' o ')}`);
  if (c.playa) partes.push('cerca de la playa');
  if (c.presupuestoMax) partes.push(`hasta ${formatUSD(c.presupuestoMax)}`);
  if (c.presupuestoMin) partes.push(`desde ${formatUSD(c.presupuestoMin)}`);
  return partes.join(' ') || 'propiedades';
}

/** Pregunta de calificación: lo que una buena asesora averigua antes de recomendar. */
function siguientePregunta(c: Criterios): string | null {
  if (!c.presupuestoMax && !c.presupuestoMin) return '¿Qué presupuesto tienes en mente, más o menos?';
  if (!c.ciudades?.length && !c.sectores?.length && !c.playa) return '¿Prefieres la capital, la playa o Santiago?';
  if (!c.tipo) return '¿Buscas apartamento, casa o villa?';
  return null;
}

const SUGERENCIAS_INICIO = [
  'Apartamento en Santo Domingo hasta 200 mil',
  'Algo cerca de la playa para invertir',
  '¿Cómo funciona el financiamiento?',
  '¿Qué impuestos pago al comprar?',
];

export const BIENVENIDA: MensajeBrisa = {
  texto:
    '¡Hola! Soy Brisa, tu asesora de Habitat. 🌴\n\nCuéntame qué buscas: zona, presupuesto y si es para vivir o invertir. Yo me encargo de encontrarte las mejores opciones en RD.',
  sugerencias: SUGERENCIAS_INICIO,
};

export function bienvenidaConPropiedad(id: string): MensajeBrisa | null {
  const p = getPropiedad(id);
  if (!p) return null;
  return {
    texto: `¡Buena elección! Veo que te interesa ${enFrase(p.titulo)} en ${p.sector}, ${p.ciudad} por ${precioTexto(p)}.\n\n${p.resumen} ¿Qué te gustaría saber?`,
    propiedades: [p.id],
    sugerencias:
      p.operacion === 'Venta'
        ? [
            '¿Cuánto pagaría de cuota?',
            '¿Cuánto es el mantenimiento?',
            'Muéstrame opciones parecidas',
            'Quiero visitarla',
          ]
        : ['¿Qué incluye?', 'Muéstrame opciones parecidas', 'Quiero visitarla'],
  };
}

/** Respuestas a preguntas frecuentes. Información general; siempre recomendar validar con profesionales. */
function faq(t: string, foco?: Propiedad): MensajeBrisa | null {
  if (tiene(t, 'cuota', 'financ', 'prestamo', 'hipotec', 'banco', 'credito')) {
    const base = foco && foco.operacion === 'Venta' ? foco.precio : 200_000;
    const cuota = cuotaMensual(base * 0.8, 10, 20);
    const sobre =
      foco && foco.operacion === 'Venta'
        ? `Para esta propiedad (${formatUSD(base)})`
        : `Por ejemplo, para una propiedad de ${formatUSD(base)}`;
    return {
      texto: `Los bancos en RD suelen financiar entre el 70% y el 80% del valor, a plazos de hasta 20 o 25 años.\n\n${sobre}, con 20% de inicial y una tasa de referencia de 10% anual a 20 años, la cuota rondaría ${formatUSD(cuota)} al mes (${formatDOP(cuota)}).\n\nEs un estimado: la tasa real depende del banco y de tu perfil. Te recomiendo precalificar antes de separar, así negocias con más fuerza.`,
      sugerencias: ['¿Qué necesito para precalificar?', '¿Qué impuestos pago al comprar?', 'Muéstrame opciones'],
    };
  }
  if (tiene(t, 'precalific', 'requisito', 'document', 'que necesito', 'papeles')) {
    return {
      texto:
        'Para precalificar normalmente te piden:\n• Cédula (o pasaporte si eres extranjero)\n• Carta de trabajo con salario y antigüedad, o estados financieros si eres independiente\n• Estados de cuenta recientes\n• Autorización para consultar tu historial de crédito\n\nCada banco tiene su lista exacta, pero con esto ya avanzas bastante.',
      sugerencias: ['¿Cómo funciona el financiamiento?', '¿Cuáles son los pasos para comprar?'],
    };
  }
  if (tiene(t, 'impuesto', 'transferencia', 'ipi', 'gastos de cierre', 'cuanto cuesta comprar')) {
    return {
      texto:
        'Al comprar una propiedad en RD ten en cuenta:\n• Impuesto de transferencia: 3% del valor del inmueble.\n• IPI (impuesto anual a la propiedad): 1% sobre el excedente de un monto exento que se actualiza cada año.\n• Gastos legales y de registro: honorarios del abogado/notario y tasas del Registro de Títulos.\n\nSi el proyecto tiene Confotur, puede estar exento de transferencia e IPI por varios años. Valida siempre las cifras con tu abogado o notario.',
      sugerencias: ['¿Qué es Confotur?', '¿Cuáles son los pasos para comprar?', 'Muéstrame proyectos con Confotur'],
    };
  }
  if (tiene(t, 'confotur')) {
    if (tiene(t, 'muestr', 'proyecto', 'opcion', 'ver')) {
      const ids = PROPIEDADES.filter((p) => p.confotur).map((p) => p.id);
      return {
        texto: 'Estas propiedades están en proyectos con clasificación Confotur:',
        propiedades: ids,
        sugerencias: ['¿Qué es Confotur?', 'Quiero visitar una'],
      };
    }
    return {
      texto:
        'Confotur es el régimen de incentivo al turismo (Ley 158-01). Los proyectos turísticos aprobados pueden ofrecer al comprador exención del impuesto de transferencia y del IPI por un período de años.\n\nEs muy atractivo si compras para renta vacacional en zonas como Punta Cana o Juan Dolio. Siempre pide al desarrollador la resolución de Confotur del proyecto.',
      sugerencias: ['Muéstrame proyectos con Confotur', '¿Qué impuestos pago al comprar?'],
    };
  }
  if (tiene(t, 'extranjer', 'no soy dominican', 'diaspora', 'vivo afuera', 'desde estados unidos', 'desde usa')) {
    return {
      texto:
        'Los extranjeros pueden comprar propiedades en RD con los mismos derechos que un dominicano. Solo necesitas tu pasaporte.\n\nSi vives afuera, puedes firmar mediante un poder notarial legalizado y apostillado, y muchos bancos financian a dominicanos en el exterior. Te recomiendo trabajar con un abogado local que verifique el título.',
      sugerencias: ['¿Cuáles son los pasos para comprar?', '¿Cómo funciona el financiamiento?'],
    };
  }
  if (tiene(t, 'pasos', 'proceso', 'como compro', 'como se compra', 'como comprar')) {
    return {
      texto:
        'Así funciona una compra típica en RD:\n1. Defines presupuesto y precalificas con el banco.\n2. Eliges la propiedad y la visitas.\n3. Firmas un contrato de promesa y separas.\n4. Tu abogado verifica el título y que no haya cargas.\n5. Firmas el contrato definitivo y pagas (o el banco desembolsa).\n6. Se paga el impuesto de transferencia y se registra el título a tu nombre.\n\n¿Quieres que te muestre opciones para empezar?',
      sugerencias: ['Muéstrame opciones', '¿Qué impuestos pago al comprar?'],
    };
  }
  if (tiene(t, 'en plano', 'planos', 'preventa', 'pre-venta')) {
    const ids = PROPIEDADES.filter((p) => p.enPlano).map((p) => p.id);
    return {
      texto:
        'Comprar en plano suele salir más barato y te permite pagar por partes: separas, pagas un porcentaje durante la construcción y el resto contra entrega (normalmente con préstamo).\n\nLo clave: verificar la trayectoria del desarrollador, que el proyecto tenga permisos y que el contrato diga fecha de entrega y penalidades por retraso.',
      propiedades: ids,
      sugerencias: ['¿Cómo funciona el financiamiento?', 'Quiero visitar una'],
    };
  }
  if (tiene(t, 'invertir', 'inversion', 'rentab', 'airbnb', 'renta corta', 'renta vacacional')) {
    const ids = PROPIEDADES.filter((p) => p.operacion === 'Venta' && (p.confotur || p.sector === 'Piantini'))
      .slice(0, 3)
      .map((p) => p.id);
    return {
      texto:
        'Para invertir, las zonas con más demanda de renta son Punta Cana/Bávaro y Juan Dolio (renta vacacional) y el polígono central de Santo Domingo (ejecutivos y renta corta).\n\nFíjate en tres cosas: precio por m², costo de mantenimiento y si el edificio permite renta corta. Estas son buenas candidatas:',
      propiedades: ids,
      sugerencias: ['¿Qué es Confotur?', '¿Cómo funciona el financiamiento?'],
    };
  }
  return null;
}

/** Respuestas sobre la propiedad que el cliente está viendo. */
function sobreFoco(t: string, p: Propiedad): MensajeBrisa | null {
  if (tiene(t, 'mantenimiento')) {
    return {
      texto: p.mantenimientoUSD
        ? `El mantenimiento de esta propiedad es de ${formatUSD(p.mantenimientoUSD)} al mes, aproximadamente.`
        : 'Esta propiedad no tiene cuota de mantenimiento de condominio registrada. Solo tendrías tus servicios.',
      sugerencias: ['¿Cuánto pagaría de cuota?', 'Quiero visitarla'],
    };
  }
  if (tiene(t, 'parecid', 'similar', 'otras opciones', 'alternativa')) {
    const similares = PROPIEDADES.filter(
      (o) =>
        o.id !== p.id &&
        o.operacion === p.operacion &&
        (o.ciudad === p.ciudad || o.tipo === p.tipo) &&
        Math.abs(o.precio - p.precio) / p.precio < 0.6,
    ).slice(0, 3);
    return similares.length
      ? { texto: 'Aquí tienes opciones parecidas que vale la pena comparar:', propiedades: similares.map((s) => s.id) }
      : {
          texto: 'Ahora mismo no tengo opciones muy parecidas. ¿Ajustamos zona o presupuesto?',
          sugerencias: SUGERENCIAS_INICIO,
        };
  }
  if (tiene(t, 'incluye', 'amenidad', 'que tiene')) {
    return {
      texto: `Cuenta con: ${p.amenidades.join(', ')}. Además está cerca de ${p.cercaDe.join(', ')}.`,
      sugerencias: ['Quiero visitarla'],
    };
  }
  if (tiene(t, 'negoci', 'descuento', 'rebaj', 'mejor precio')) {
    return {
      texto: `Siempre hay espacio para conversar. Lo que más ayuda a negociar es llegar precalificado y con una oferta concreta. Si quieres, agendamos la visita y le presentamos tu propuesta al propietario.`,
      sugerencias: ['Quiero visitarla', '¿Cómo funciona el financiamiento?'],
    };
  }
  return null;
}

function responderBase(texto: string, ctx: ContextoBrisa): { mensaje: MensajeBrisa; ctx: ContextoBrisa } {
  const t = ` ${norm(texto)} `;
  const foco = ctx.propiedadFoco ? getPropiedad(ctx.propiedadFoco) : undefined;

  if (
    /^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches|saludos|hey)\b/.test(t.trim()) &&
    t.trim().length < 25
  ) {
    return { mensaje: BIENVENIDA, ctx };
  }
  if (tiene(t, 'otra busqueda', 'empezar de nuevo', 'reinici')) {
    return {
      mensaje: {
        texto: '¡Perfecto, empecemos de cero! ¿Qué zona y presupuesto tienes en mente?',
        sugerencias: SUGERENCIAS_INICIO,
      },
      ctx: { ...ctx, criterios: {}, propiedadFoco: undefined },
    };
  }
  if (tiene(t, 'gracias')) {
    return {
      mensaje: {
        texto:
          '¡Con mucho gusto! Aquí estoy cuando quieras seguir buscando. Tu próximo hogar está más cerca de lo que crees. 😊',
        sugerencias: ['Muéstrame opciones', 'Quiero agendar una visita'],
      },
      ctx,
    };
  }
  if (tiene(t, 'visita', 'visitar', 'ver en persona', 'agendar', 'cita')) {
    return {
      mensaje: {
        texto: foco
          ? `¡Excelente! Para visitar ${enFrase(foco.titulo)}, toca “Agendar visita” en la ficha de la propiedad y un asesor te contactará para coordinar el día y la hora.`
          : 'Con gusto. Abre la propiedad que te guste y toca “Agendar visita”. Si aún no decides, dime qué buscas y te ayudo a escoger.',
        propiedades: foco ? [foco.id] : undefined,
      },
      ctx,
    };
  }
  if (tiene(t, 'cerca de mi', 'cerca de aqui', 'donde estoy', 'mi ubicacion')) {
    return {
      mensaje: {
        texto:
          'Para ver lo más cercano a ti, entra a la pestaña “Cerca de ti”: ordeno las propiedades por distancia usando tu ubicación.',
      },
      ctx,
    };
  }

  if (foco) {
    const r = sobreFoco(t, foco);
    if (r) return { mensaje: r, ctx };
  }

  const f = faq(t, foco);
  if (f) return { mensaje: f, ctx };

  const criterios = extraerCriterios(texto, ctx.criterios);
  const nuevoCtx: ContextoBrisa = { ...ctx, criterios };

  if (!hayCriterios(criterios)) {
    if (tiene(t, 'opcion', 'muestr', 'que tienes', 'que hay', 'disponible')) {
      const destacadas = ['piantini-torre-ambar', 'bavaro-playa', 'santiago-villa-olga'];
      return {
        mensaje: {
          texto:
            'Estas son algunas de mis favoritas ahora mismo. Para afinar, dime tu presupuesto y la zona que prefieres.',
          propiedades: destacadas,
          sugerencias: SUGERENCIAS_INICIO,
        },
        ctx: nuevoCtx,
      };
    }
    return {
      mensaje: {
        texto:
          'Te ayudo con gusto. Para recomendarte bien, cuéntame: ¿en qué zona te gustaría vivir o invertir y cuál es tu presupuesto aproximado?',
        sugerencias: SUGERENCIAS_INICIO,
      },
      ctx: nuevoCtx,
    };
  }

  let resultados = filtrar(criterios);
  let nota = '';
  if (!resultados.length && criterios.presupuestoMax) {
    resultados = filtrar({ ...criterios, presupuestoMax: undefined }).filter(
      (p) => p.precio <= criterios.presupuestoMax! * 1.5,
    );
    if (resultados.length)
      nota =
        'No encontré algo exacto dentro de ese presupuesto, pero estas opciones están cerca y pueden valer la pena:';
  }
  if (!resultados.length) {
    resultados = filtrar({ ...criterios, sectores: undefined, habitaciones: undefined, tipo: undefined });
    if (resultados.length)
      nota = `No tengo ${describirCriterios(criterios)} exactamente, pero mira estas alternativas en la misma línea:`;
  }
  if (!resultados.length && (criterios.presupuestoMax || criterios.presupuestoMin)) {
    resultados = filtrar({
      ...criterios,
      presupuestoMax: undefined,
      presupuestoMin: undefined,
      sectores: undefined,
      habitaciones: undefined,
      tipo: undefined,
    });
    if (resultados.length)
      nota =
        'En esa zona no tengo nada en ese rango de precio. Te muestro lo que hay allí, por si te sirve como referencia:';
  }
  if (!resultados.length) {
    return {
      mensaje: {
        texto: `Por ahora no tengo ${describirCriterios(criterios)} en mi catálogo. ¿Probamos con otra zona o ajustamos el presupuesto?`,
        sugerencias: ['Algo cerca de la playa', 'Apartamento en Santo Domingo', 'Casa en Santiago'],
      },
      ctx: { ...nuevoCtx, criterios: {} },
    };
  }

  const top = resultados.slice(0, 3);
  const mejor = top[0];
  const encabezado =
    nota ||
    `Encontré ${resultados.length === 1 ? 'una opción que encaja' : `${resultados.length} opciones que encajan`} con lo que buscas (${describirCriterios(criterios)}). Te muestro ${top.length === 1 ? 'la mejor' : `las ${top.length} mejores`}:`;
  const gancho = `Mi recomendación: ${enFrase(mejor.titulo)}${mejor.titulo.includes(mejor.sector) ? '' : ` en ${mejor.sector}`}. ${mejor.resumen}`;
  const pregunta = siguientePregunta(criterios);

  return {
    mensaje: {
      texto: [encabezado, gancho, pregunta].filter(Boolean).join('\n\n'),
      propiedades: top.map((p) => p.id),
      sugerencias: pregunta
        ? ['Hasta 150 mil', 'Hasta 300 mil', 'Cerca de la playa', 'En Santo Domingo']
        : ['¿Cómo funciona el financiamiento?', 'Quiero agendar una visita', 'Empezar otra búsqueda'],
    },
    ctx: nuevoCtx,
  };
}

const PALABRAS_NO_NOMBRE = new Set([
  'extranjero',
  'extranjera',
  'dominicano',
  'dominicana',
  'de',
  'el',
  'la',
  'un',
  'una',
  'nuevo',
  'nueva',
  'inversionista',
  'comprador',
  'compradora',
  'agente',
  'asesor',
  'asesora',
  'soltero',
  'casado',
  'casada',
]);

/** Extrae datos del cliente (nombre, WhatsApp, propósito, plazo) para el ARM. */
export function extraerPerfil(textoOriginal: string, previo: PerfilCliente = {}): PerfilCliente {
  const t = ` ${norm(textoOriginal)} `;
  const p: PerfilCliente = { ...previo };

  const tel = textoOriginal.match(/(?:\+?1[\s.-]?)?\(?(809|829|849)\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);
  if (tel) p.telefono = `${tel[1]}-${tel[2]}-${tel[3]}`;

  const nom =
    textoOriginal.match(/(?:me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i) ??
    textoOriginal.match(/(?:^|[\s,.¡!])soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/);
  if (nom && !PALABRAS_NO_NOMBRE.has(norm(nom[1].split(' ')[0]))) {
    p.nombre = nom[1]
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  if (tiene(t, 'invertir', 'inversion', 'rentar', 'airbnb', 'renta vacacional', 'rentabil')) p.proposito = 'Invertir';
  else if (tiene(t, 'para vivir', 'mi familia', 'mudarme', 'mudarnos', 'vivir alli', 'vivir ahi', 'mis hijos'))
    p.proposito = 'Vivir';

  if (tiene(t, 'urgente', 'ya mismo', 'lo antes posible', 'este mes', 'inmediat', 'cuanto antes'))
    p.plazo = 'Inmediato';
  else if (/\b([1-6]|un|dos|tres|cuatro|cinco|seis)\s+mes/.test(t) || tiene(t, 'proximos meses', 'pronto'))
    p.plazo = '1 a 6 meses';
  else if (tiene(t, 'proximo ano', 'el ano que viene', 'sin prisa', 'mas adelante', 'no tengo prisa'))
    p.plazo = 'Más de 6 meses';

  if (
    tiene(
      t,
      'hablar con un asesor',
      'hablar con alguien',
      'una persona',
      'asesor humano',
      'agente real',
      'me llamen',
      'llamenme',
      'llamarme',
    )
  )
    p.pideHumano = true;
  if (tiene(t, 'financ', 'prestamo', 'hipotec', 'cuota', 'precalific')) p.interesFinanciamiento = true;

  return p;
}

/**
 * Punto de entrada del chat. Además de responder, Brisa actúa como ARM:
 * capta el perfil del cliente, pide su contacto en el momento oportuno
 * y lo traspasa a un asesor humano cuando lo solicita.
 */
export function responderBrisa(texto: string, ctx: ContextoBrisa): { mensaje: MensajeBrisa; ctx: ContextoBrisa } {
  const previo = ctx.perfil ?? {};
  const perfil = extraerPerfil(texto, previo);
  const ctxConPerfil: ContextoBrisa = { ...ctx, perfil };
  const nuevoTelefono = perfil.telefono && perfil.telefono !== previo.telefono;
  const nuevoNombre = perfil.nombre && perfil.nombre !== previo.nombre;

  if (perfil.pideHumano && !previo.pideHumano) {
    const saludo = perfil.nombre ? `${perfil.nombre.split(' ')[0]}, c` : 'C';
    return {
      mensaje: {
        texto: perfil.telefono
          ? `${saludo}laro que sí. Ya le pasé tu caso a un asesor de Habitat con todo lo que hemos hablado, así no tienes que repetir nada. Te escribirá al ${perfil.telefono} en breve. Mientras tanto, sigo aquí para lo que necesites.`
          : `${saludo}laro que sí. Para que un asesor te contacte, déjame tu nombre y tu número de WhatsApp y le paso tu caso con todo lo que hemos hablado.`,
        sugerencias: perfil.telefono ? ['Muéstrame más opciones', '¿Cómo funciona el financiamiento?'] : undefined,
      },
      ctx: { ...ctxConPerfil, pidioContacto: true },
    };
  }

  // El mensaje trae datos de contacto: Brisa los confirma y explica el seguimiento.
  if (nuevoTelefono || (nuevoNombre && norm(texto).split(/\s+/).length <= 6)) {
    const nombre = perfil.nombre ? `, ${perfil.nombre.split(' ')[0]}` : '';
    let texto2: string;
    if (perfil.telefono && perfil.pideHumano) {
      texto2 = `¡Gracias${nombre}! Ya le pasé tu caso a un asesor de Habitat. Te escribirá al ${perfil.telefono} con todo el contexto de nuestra conversación.`;
    } else if (perfil.telefono) {
      texto2 = `¡Perfecto${nombre}! Guardé tu WhatsApp (${perfil.telefono}). Te escribiré cuando entre una propiedad que encaje contigo y te recordaré cualquier visita que agendes.`;
    } else {
      texto2 = `¡Mucho gusto${nombre}! ¿Me compartes tu WhatsApp para enviarte opciones nuevas apenas salgan?`;
    }
    const sigue = siguientePregunta(ctx.criterios);
    return {
      mensaje: {
        texto: [
          texto2,
          perfil.telefono && sigue
            ? `Para afinar la búsqueda: ${sigue.charAt(0).toLowerCase()}${sigue.slice(1)}`
            : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
        sugerencias: perfil.telefono
          ? sigue
            ? ['Hasta 150 mil', 'Hasta 300 mil', 'Cerca de la playa', 'En Santo Domingo']
            : ['Muéstrame opciones', 'Quiero agendar una visita']
          : undefined,
      },
      ctx: { ...ctxConPerfil, pidioContacto: true },
    };
  }

  const r = responderBase(texto, ctxConPerfil);
  const out: ContextoBrisa = { ...r.ctx, perfil };

  // Tras recomendar, pide el contacto una sola vez (como haría una buena vendedora).
  if (r.mensaje.propiedades?.length && !perfil.telefono && !out.pidioContacto) {
    return {
      mensaje: {
        ...r.mensaje,
        texto: `${r.mensaje.texto}\n\nSi me dejas tu nombre y WhatsApp, te aviso apenas entre algo que encaje contigo. 📲`,
      },
      ctx: { ...out, pidioContacto: true },
    };
  }
  return { mensaje: r.mensaje, ctx: out };
}
