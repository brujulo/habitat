// Tipos compartidos por la Edge Function de Brisa.

export type Inmobiliaria = {
  id: string;
  slug: string;
  nombre: string;
  instrucciones_brisa: string | null;
};

export type PropiedadRow = {
  id: string;
  titulo: string;
  tipo: string;
  operacion: 'Venta' | 'Alquiler';
  precio: number;
  ciudad: string;
  sector: string;
  provincia: string;
  habitaciones: number;
  banos: number;
  parqueos: number;
  metros: number;
  resumen: string;
  descripcion: string;
  amenidades: string[];
  cerca_de: string[];
  ano_construccion: number | null;
  mantenimiento_usd: number | null;
  confotur: boolean;
  en_plano: boolean;
  entrega: string | null;
  latitude: number;
  longitude: number;
};

export type ClienteRow = {
  id: string;
  inmobiliaria_id: string;
  canal: string;
  canal_id: string;
  nombre: string | null;
  telefono: string | null;
  criterios: Record<string, unknown>;
  proposito: string | null;
  plazo: string | null;
  interes_financiamiento: boolean;
  propiedades_interes: string[];
  etapa: string;
  control_humano: boolean;
  traspaso_solicitado: boolean;
  consentimiento_datos: boolean;
};

export type TipoEvento = 'mensaje' | 'vista' | 'favorito' | 'visita' | 'seguimiento' | 'traspaso' | 'etapa' | 'nota';

/** Acceso a datos que necesita Brisa. En producción lo implementa db-rest.ts (Supabase). */
export interface Db {
  inmobiliaria(slug: string): Promise<Inmobiliaria | null>;
  cliente(inmobiliariaId: string, canal: string, canalId: string): Promise<ClienteRow>;
  actualizarCliente(clienteId: string, cambios: Record<string, unknown>): Promise<ClienteRow>;
  buscarPropiedades(inmobiliariaId: string, criterios: Record<string, unknown>, limite: number): Promise<PropiedadRow[]>;
  propiedad(inmobiliariaId: string, id: string): Promise<PropiedadRow | null>;
  evento(e: {
    inmobiliaria_id: string;
    cliente_id: string;
    tipo: TipoEvento;
    autor: 'cliente' | 'brisa' | 'asesor';
    texto: string;
    propiedad_id?: string | null;
  }): Promise<void>;
  historial(clienteId: string, limite: number): Promise<{ rol: 'user' | 'assistant'; texto: string }[]>;
  guardarMensaje(m: {
    inmobiliaria_id: string;
    cliente_id: string;
    rol: 'user' | 'assistant';
    texto: string;
    meta?: Record<string, unknown>;
  }): Promise<void>;
}

// ---- Claude Messages API (subconjunto que usamos) ----

export type BloqueTexto = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };
export type BloqueToolUse = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
export type BloqueToolResult = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
// Otros bloques (p. ej. de razonamiento) se devuelven tal cual a la API.
export type BloqueContenido = BloqueTexto | BloqueToolUse | BloqueToolResult | { type: string; [k: string]: unknown };

export type MensajeClaude = { role: 'user' | 'assistant'; content: string | BloqueContenido[] };

export type PeticionClaude = {
  model: string;
  max_tokens: number;
  system: BloqueTexto[];
  tools: unknown[];
  messages: MensajeClaude[];
};

export type RespuestaClaude = {
  id: string;
  content: BloqueContenido[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'pause_turn' | 'refusal' | string;
  usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
};

export type LlamarClaude = (peticion: PeticionClaude) => Promise<RespuestaClaude>;

export type RespuestaBrisa = {
  texto: string;
  propiedades: string[];
  sugerencias: string[];
  cliente: {
    id: string;
    etapa: string;
    nombre: string | null;
    traspaso_solicitado: boolean;
    control_humano: boolean;
  };
};
