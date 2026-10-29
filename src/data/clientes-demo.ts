/**
 * Clientes de ejemplo (ficticios) para mostrar el panel ARM.
 * Las fechas son relativas al momento en que abre la app.
 */
import type { Cliente, Evento } from '@/arm/types';

const H = 3_600_000;
const D = 24 * H;
const ahora = Date.now();

let n = 0;
const ev = (haceMs: number, tipo: Evento['tipo'], autor: Evento['autor'], texto: string): Evento => ({
  id: `demo-${n++}`,
  fecha: ahora - haceMs,
  tipo,
  autor,
  texto,
});

export const CLIENTES_DEMO: Cliente[] = [
  {
    id: 'c-maria',
    nombre: 'María Rodríguez',
    telefono: '809-555-0142',
    canal: 'WhatsApp',
    criterios: {
      tipo: 'Apartamento',
      operacion: 'Venta',
      ciudades: ['Santo Domingo'],
      presupuestoMax: 220_000,
      habitaciones: 3,
    },
    proposito: 'Vivir',
    plazo: 'Inmediato',
    interesFinanciamiento: true,
    propiedadesInteres: ['naco-familiar', 'piantini-torre-ambar'],
    etapa: 'Visita agendada',
    controlHumano: false,
    creado: ahora - 6 * D,
    ultimaActividad: ahora - 3 * H,
    eventos: [
      ev(6 * D, 'mensaje', 'cliente', 'Busco apartamento de 3 habitaciones en la capital, hasta 220 mil.'),
      ev(6 * D - 5 * 60_000, 'mensaje', 'brisa', 'Le envié 3 opciones en Naco, Piantini y Evaristo Morales.'),
      ev(4 * D, 'mensaje', 'cliente', 'Preguntó por financiamiento y requisitos para precalificar.'),
      ev(2 * D, 'favorito', 'cliente', 'Guardó Apartamento familiar en Naco.'),
      ev(3 * H, 'visita', 'cliente', 'Agendó visita a Apartamento familiar en Naco para el sábado 10:00 a. m.'),
    ],
  },
  {
    id: 'c-carlos',
    nombre: 'Carlos Méndez',
    telefono: '829-555-0187',
    canal: 'Instagram',
    criterios: { operacion: 'Venta', playa: true, presupuestoMax: 200_000 },
    proposito: 'Invertir',
    plazo: '1 a 6 meses',
    interesFinanciamiento: false,
    propiedadesInteres: ['bavaro-playa', 'juan-dolio'],
    etapa: 'Negociación',
    controlHumano: false,
    traspasoSolicitado: false,
    creado: ahora - 12 * D,
    ultimaActividad: ahora - 20 * H,
    eventos: [
      ev(12 * D, 'mensaje', 'cliente', 'Quiero algo cerca de la playa para renta vacacional.'),
      ev(11 * D, 'mensaje', 'brisa', 'Le expliqué Confotur y le envié 3 opciones en Bávaro y Juan Dolio.'),
      ev(5 * D, 'visita', 'cliente', 'Visitó Apartamento cerca de la playa en Bávaro.'),
      ev(20 * H, 'mensaje', 'cliente', 'Quiere ofertar US$165,000 por el de Bávaro.'),
      ev(20 * H - 60_000, 'etapa', 'brisa', 'Brisa movió el caso a Negociación.'),
    ],
  },
  {
    id: 'c-ana',
    nombre: 'Ana Lucía Peña',
    canal: 'App',
    criterios: { tipo: 'Casa', ciudades: ['Santiago'] },
    propiedadesInteres: [],
    etapa: 'Calificando',
    controlHumano: false,
    creado: ahora - 1 * D,
    ultimaActividad: ahora - 1 * D,
    eventos: [
      ev(1 * D, 'mensaje', 'cliente', 'Busco casa en Santiago.'),
      ev(1 * D - 60_000, 'mensaje', 'brisa', 'Le pregunté presupuesto y número de habitaciones.'),
    ],
  },
  {
    id: 'c-james',
    nombre: 'James Miller',
    telefono: '849-555-0110',
    canal: 'Web',
    criterios: { tipo: 'Villa', operacion: 'Venta', presupuestoMin: 400_000, ciudades: ['Punta Cana'] },
    proposito: 'Invertir',
    plazo: 'Más de 6 meses',
    propiedadesInteres: ['cap-cana-villa'],
    etapa: 'Interesado',
    controlHumano: false,
    traspasoSolicitado: true,
    creado: ahora - 3 * D,
    ultimaActividad: ahora - 40 * 60_000,
    eventos: [
      ev(3 * D, 'mensaje', 'cliente', 'Inversionista extranjero, busca villa de lujo en Punta Cana.'),
      ev(
        3 * D - 60_000,
        'mensaje',
        'brisa',
        'Le expliqué cómo compran los extranjeros en RD y le envié la villa de Cap Cana.',
      ),
      ev(40 * 60_000, 'traspaso', 'cliente', 'Pidió hablar con un asesor por videollamada.'),
    ],
  },
  {
    id: 'c-yokasta',
    nombre: 'Yokasta Batista',
    telefono: '809-555-0163',
    canal: 'WhatsApp',
    criterios: { operacion: 'Venta', ciudades: ['Santo Domingo Norte'], presupuestoMax: 80_000 },
    proposito: 'Vivir',
    plazo: '1 a 6 meses',
    interesFinanciamiento: true,
    propiedadesInteres: ['villa-mella-sdn'],
    etapa: 'Interesado',
    controlHumano: false,
    creado: ahora - 9 * D,
    ultimaActividad: ahora - 7 * D,
    eventos: [
      ev(9 * D, 'mensaje', 'cliente', 'Primera vivienda en Santo Domingo Norte, hasta 80 mil.'),
      ev(9 * D - 60_000, 'mensaje', 'brisa', 'Le envié Casa en Villa Mella con patio.'),
      ev(7 * D, 'favorito', 'cliente', 'Guardó Casa en Villa Mella con patio.'),
    ],
  },
  {
    id: 'c-ramon',
    nombre: 'Ramón Guzmán',
    telefono: '829-555-0155',
    canal: 'App',
    criterios: { tipo: 'Apartamento', operacion: 'Alquiler', sectores: ['Gazcue'] },
    plazo: 'Inmediato',
    propiedadesInteres: ['gazcue-alquiler'],
    etapa: 'Cerrado',
    controlHumano: true,
    creado: ahora - 20 * D,
    ultimaActividad: ahora - 2 * D,
    eventos: [
      ev(20 * D, 'mensaje', 'cliente', 'Busca alquiler amueblado en Gazcue.'),
      ev(15 * D, 'traspaso', 'asesor', 'Asesor tomó el caso.'),
      ev(2 * D, 'etapa', 'asesor', 'Firmó contrato de alquiler por un año.'),
    ],
  },
];
