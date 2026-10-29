import type { Criterios, Plazo, Proposito } from '@/screens/brisa/engine';

export type Etapa = 'Nuevo' | 'Calificando' | 'Interesado' | 'Visita agendada' | 'Negociación' | 'Cerrado' | 'Perdido';

export const ETAPAS: Etapa[] = [
  'Nuevo',
  'Calificando',
  'Interesado',
  'Visita agendada',
  'Negociación',
  'Cerrado',
  'Perdido',
];

export type Canal = 'App' | 'WhatsApp' | 'Instagram' | 'Web' | 'Messenger';

export type TipoEvento = 'mensaje' | 'vista' | 'favorito' | 'visita' | 'seguimiento' | 'traspaso' | 'etapa' | 'nota';

export type Evento = {
  id: string;
  fecha: number;
  tipo: TipoEvento;
  autor: 'cliente' | 'brisa' | 'asesor';
  texto: string;
};

/** Un cliente gestionado por Brisa (el "ARM": AI Relationship Manager). */
export type Cliente = {
  id: string;
  nombre: string;
  telefono?: string;
  canal: Canal;
  criterios: Criterios;
  proposito?: Proposito;
  plazo?: Plazo;
  interesFinanciamiento?: boolean;
  /** Propiedades que vio, guardó o por las que preguntó. */
  propiedadesInteres: string[];
  etapa: Etapa;
  /** true cuando un asesor humano tomó el caso; Brisa deja de hacer seguimientos automáticos. */
  controlHumano: boolean;
  /** true cuando Brisa decidió (o el cliente pidió) pasar el caso a un asesor. */
  traspasoSolicitado?: boolean;
  creado: number;
  ultimaActividad: number;
  eventos: Evento[];
  /** El cliente es quien está usando la app ahora mismo. */
  enVivo?: boolean;
};
