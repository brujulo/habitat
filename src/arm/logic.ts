/**
 * Cerebro del ARM: cómo Brisa califica, prioriza y da seguimiento a cada cliente.
 * Todo es determinístico (sin IA real) para que el prototipo funcione sin servidor.
 */
import { getPropiedad, type Propiedad } from '@/data/properties';
import { describirCriterios, filtrar, hayCriterios } from '@/screens/brisa/engine';
import { formatUSD, precioTexto } from '@/utils/format';

import type { Cliente, Etapa } from './types';

export type Temperatura = 'Caliente' | 'Tibio' | 'Frío';

const HORA = 3_600_000;
const DIA = 24 * HORA;

/** Puntuación 0–100: qué tan listo está el cliente para comprar/alquilar. */
export function puntuar(c: Cliente): number {
  if (c.etapa === 'Cerrado') return 100;
  if (c.etapa === 'Perdido') return 0;
  let s = 0;
  const k = c.criterios;
  if (k.presupuestoMax || k.presupuestoMin) s += 20;
  if (k.ciudades?.length || k.sectores?.length || k.playa) s += 12;
  if (k.tipo) s += 8;
  if (c.telefono) s += 15;
  if (c.proposito) s += 5;
  if (c.plazo === 'Inmediato') s += 15;
  else if (c.plazo === '1 a 6 meses') s += 8;
  if (c.interesFinanciamiento) s += 5;
  s += Math.min(c.propiedadesInteres.length, 3) * 4;
  if (c.etapa === 'Visita agendada') s += 15;
  if (c.etapa === 'Negociación') s += 25;
  // La inactividad enfría al cliente.
  const dias = (Date.now() - c.ultimaActividad) / DIA;
  if (dias > 14) s -= 20;
  else if (dias > 5) s -= 10;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function temperatura(puntos: number): Temperatura {
  if (puntos >= 65) return 'Caliente';
  if (puntos >= 35) return 'Tibio';
  return 'Frío';
}

/** Etapa sugerida a partir de lo que se sabe del cliente (no retrocede etapas avanzadas). */
export function etapaSugerida(c: Pick<Cliente, 'etapa' | 'criterios' | 'propiedadesInteres'>): Etapa {
  const orden: Etapa[] = ['Nuevo', 'Calificando', 'Interesado'];
  if (!orden.includes(c.etapa)) return c.etapa;
  let e: Etapa = 'Nuevo';
  if (hayCriterios(c.criterios)) e = 'Calificando';
  if (c.propiedadesInteres.length) e = 'Interesado';
  return orden.indexOf(e) > orden.indexOf(c.etapa) ? e : c.etapa;
}

export type Accion = {
  titulo: string;
  detalle: string;
  /** Brisa la ejecuta sola (true) o necesita al asesor humano (false). */
  automatica: boolean;
  cuando: string;
};

/** La próxima jugada de Brisa con este cliente. */
export function siguienteAccion(c: Cliente): Accion {
  const p = puntuar(c);
  const dias = (Date.now() - c.ultimaActividad) / DIA;
  const nombre = primerNombre(c);

  if (c.etapa === 'Cerrado') {
    return {
      titulo: 'Pedir referidos',
      detalle: `Felicitar a ${nombre} y pedirle que recomiende Habitat.`,
      automatica: true,
      cuando: 'En 7 días',
    };
  }
  if (c.etapa === 'Perdido') {
    return {
      titulo: 'Reactivar más adelante',
      detalle: 'Escribirle si baja de precio algo de su interés.',
      automatica: true,
      cuando: 'En 30 días',
    };
  }
  if (c.controlHumano) {
    return {
      titulo: 'Asesor a cargo',
      detalle: 'Brisa pausó los seguimientos automáticos de este cliente.',
      automatica: false,
      cuando: 'Ahora',
    };
  }
  if (c.traspasoSolicitado) {
    return {
      titulo: 'Asignar a un asesor',
      detalle: `${nombre} pidió hablar con una persona. Tómalo cuanto antes.`,
      automatica: false,
      cuando: 'Ahora',
    };
  }
  if (c.etapa === 'Visita agendada') {
    return {
      titulo: 'Confirmar la visita',
      detalle: 'Enviar ubicación, hora y documentos a llevar por WhatsApp.',
      automatica: true,
      cuando: '24 h antes',
    };
  }
  if (c.etapa === 'Negociación' || p >= 75) {
    return {
      titulo: 'Pasar a asesor para cerrar',
      detalle: `${nombre} está listo. Brisa recomienda que un asesor tome el caso.`,
      automatica: false,
      cuando: 'Hoy',
    };
  }
  if (!c.telefono) {
    return {
      titulo: 'Conseguir su WhatsApp',
      detalle: 'Pedirle el contacto en la próxima conversación.',
      automatica: true,
      cuando: 'Próximo mensaje',
    };
  }
  if (!c.criterios.presupuestoMax && !c.criterios.presupuestoMin) {
    return {
      titulo: 'Calificar presupuesto',
      detalle: 'Preguntar presupuesto y si necesita financiamiento.',
      automatica: true,
      cuando: 'En 2 h',
    };
  }
  if (dias > 5) {
    return {
      titulo: 'Reactivar',
      detalle: 'Enviar 2 opciones nuevas que encajan con lo que busca.',
      automatica: true,
      cuando: 'Hoy',
    };
  }
  if (c.etapa === 'Interesado') {
    return {
      titulo: 'Invitar a visita',
      detalle: 'Proponer dos horarios para visitar su propiedad favorita.',
      automatica: true,
      cuando: 'En 24 h',
    };
  }
  return {
    titulo: 'Enviar opciones',
    detalle: 'Compartir las 3 propiedades que mejor encajan.',
    automatica: true,
    cuando: 'En 48 h',
  };
}

export function coincidencias(c: Cliente, max = 3): Propiedad[] {
  if (!hayCriterios(c.criterios)) return [];
  return filtrar(c.criterios).slice(0, max);
}

export function propiedadPrincipal(c: Cliente): Propiedad | undefined {
  return c.propiedadesInteres.map(getPropiedad).find(Boolean) ?? coincidencias(c, 1)[0];
}

/** Resumen en lenguaje natural que Brisa le entrega al asesor. */
export function resumenBrisa(c: Cliente): string {
  const partes: string[] = [];
  partes.push(hayCriterios(c.criterios) ? `Busca ${describirCriterios(c.criterios)}.` : 'Aún no define qué busca.');
  if (c.proposito) partes.push(c.proposito === 'Invertir' ? 'Compra para invertir.' : 'Compra para vivir.');
  if (c.plazo) partes.push(`Plazo: ${c.plazo.toLowerCase()}.`);
  if (c.interesFinanciamiento) partes.push('Preguntó por financiamiento.');
  const principal = propiedadPrincipal(c);
  if (c.propiedadesInteres.length && principal) {
    partes.push(
      `Le interesa sobre todo ${principal.titulo.charAt(0).toLowerCase()}${principal.titulo.slice(1)} (${precioTexto(principal)}).`,
    );
  }
  if (!c.telefono) partes.push('Falta su WhatsApp.');
  return partes.join(' ');
}

/** Borrador del mensaje de seguimiento que Brisa enviaría por WhatsApp. */
export function mensajeSeguimiento(c: Cliente): string {
  const n = primerNombre(c);
  const saludo = n === 'Cliente' ? '¡Hola!' : `¡Hola, ${n}!`;
  const principal = propiedadPrincipal(c);
  const otras = coincidencias(c, 3)
    .filter((p) => p.id !== principal?.id)
    .slice(0, 2);
  const linea = (p: Propiedad) => `• ${p.titulo} (${p.sector}) – ${precioTexto(p)}`;

  if (c.etapa === 'Cerrado') {
    return `${saludo} Soy Brisa, de Habitat. ¡Felicidades por tu nueva propiedad! 🎉 Si conoces a alguien que esté buscando, con gusto le ayudo.`;
  }
  if (c.etapa === 'Visita agendada' && principal) {
    return `${saludo} Soy Brisa, de Habitat. Te recuerdo tu visita a ${principal.titulo} en ${principal.sector}, ${principal.ciudad}. Lleva tu cédula y, si vas a financiar, tu carta de trabajo. ¿Confirmas la hora?`;
  }
  if (c.etapa === 'Negociación' && principal) {
    return `${saludo} Soy Brisa, de Habitat. Un asesor te contactará hoy para avanzar con la oferta por ${principal.titulo}. Si tienes tu precalificación del banco, tenla a mano.`;
  }
  const dias = (Date.now() - c.ultimaActividad) / DIA;
  if (principal && c.etapa === 'Interesado') {
    return [
      `${saludo} Soy Brisa, de Habitat. ¿Te sigue interesando ${principal.titulo} (${precioTexto(principal)})?`,
      'Puedo agendarte una visita esta semana. ¿Te queda mejor entre semana o el sábado?',
      otras.length ? `\nTambién te pueden gustar:\n${otras.map(linea).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  const lista = coincidencias(c, 3);
  if (lista.length) {
    const intro =
      dias > 5
        ? 'Entraron opciones que encajan con lo que buscabas:'
        : 'Te comparto opciones que encajan con lo que buscas:';
    return `${saludo} Soy Brisa, de Habitat. ${intro}\n${lista.map(linea).join('\n')}\n\n¿Quieres que te agende una visita a alguna?`;
  }
  return `${saludo} Soy Brisa, de Habitat. Para enviarte opciones a tu medida, ¿qué zona prefieres y cuál es tu presupuesto aproximado?`;
}

export function primerNombre(c: Pick<Cliente, 'nombre'>) {
  return c.nombre.split(' ')[0] || 'Cliente';
}

export function hace(fecha: number) {
  const ms = Date.now() - fecha;
  if (ms < 60_000) return 'ahora';
  if (ms < HORA) return `hace ${Math.round(ms / 60_000)} min`;
  if (ms < DIA) return `hace ${Math.round(ms / HORA)} h`;
  const d = Math.round(ms / DIA);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function presupuestoTexto(c: Cliente) {
  const k = c.criterios;
  if (k.presupuestoMax) return `Hasta ${formatUSD(k.presupuestoMax)}`;
  if (k.presupuestoMin) return `Desde ${formatUSD(k.presupuestoMin)}`;
  return 'Sin definir';
}

/** Enlace de WhatsApp con el mensaje listo (números de RD: 809/829/849). */
export function enlaceWhatsApp(telefono: string, mensaje: string) {
  const digitos = telefono.replace(/\D/g, '');
  const numero = digitos.length === 10 ? `1${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
