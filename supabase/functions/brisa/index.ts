// Edge Function "brisa": punto de entrada HTTP de la asesora.
//
// POST /functions/v1/brisa
//   { "accion": "mensaje", "inmobiliaria": "habitat-demo", "canal": "App", "canalId": "<id de sesión>",
//     "mensaje": "Busco apartamento...", "propiedadFoco": "naco-familiar" }
//   { "accion": "evento", "inmobiliaria": "...", "canal": "App", "canalId": "...",
//     "tipo": "vista" | "favorito" | "visita", "propiedadId": "...", "guardado": true }
//
// Secretos necesarios (supabase secrets set ...): ANTHROPIC_API_KEY. Opcional: BRISA_MODEL.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { ErrorBrisa, registrarEventoApp, responderMensaje } from '../_shared/brisa/agente.ts';
import { crearClaude } from '../_shared/brisa/claude-http.ts';
import { crearDbRest } from '../_shared/brisa/db-rest.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const CANALES = ['App', 'Web', 'WhatsApp', 'Instagram', 'Messenger'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !url || !service) return json({ error: 'Falta configurar ANTHROPIC_API_KEY en los secretos.' }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const canal = CANALES.includes(body.canal as (typeof CANALES)[number]) ? (body.canal as (typeof CANALES)[number]) : 'App';
  const comun = {
    inmobiliaria: String(body.inmobiliaria ?? ''),
    canal,
    canalId: String(body.canalId ?? ''),
  };
  const db = crearDbRest(url, service);

  try {
    if (body.accion === 'evento') {
      return json(
        await registrarEventoApp(
          { ...comun, tipo: String(body.tipo ?? ''), propiedadId: String(body.propiedadId ?? ''), guardado: body.guardado !== false },
          db,
        ),
      );
    }
    const r = await responderMensaje(
      { ...comun, mensaje: String(body.mensaje ?? ''), propiedadFoco: body.propiedadFoco ? String(body.propiedadFoco) : null },
      { db, claude: crearClaude(apiKey), modelo: Deno.env.get('BRISA_MODEL') ?? undefined },
    );
    return json(r);
  } catch (e) {
    if (e instanceof ErrorBrisa) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Brisa no está disponible en este momento.' }, 502);
  }
});
