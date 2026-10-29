// Cliente mínimo de la Messages API de Claude (sin SDK, solo fetch).
import type { LlamarClaude, PeticionClaude, RespuestaClaude } from './tipos.ts';

export function crearClaude(apiKey: string, f: typeof fetch = fetch): LlamarClaude {
  return async (peticion: PeticionClaude): Promise<RespuestaClaude> => {
    let ultimoError = '';
    // Reintenta errores temporales (sobrecarga / límite de tasa).
    for (let intento = 0; intento < 3; intento++) {
      const r = await f('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(peticion),
      });
      if (r.ok) return (await r.json()) as RespuestaClaude;
      ultimoError = `Claude API ${r.status}: ${await r.text()}`;
      if (![429, 500, 502, 503, 529].includes(r.status)) break;
      await new Promise((ok) => setTimeout(ok, 800 * (intento + 1)));
    }
    throw new Error(ultimoError);
  };
}
