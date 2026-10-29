/**
 * Genera supabase/seed.sql a partir del catálogo de ejemplo (src/data/properties.ts).
 * Uso: npx tsx scripts/generar-seed.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROPIEDADES } from '../src/data/properties';

export const INMOBILIARIA_DEMO_ID = '00000000-0000-4000-8000-000000000001';
const COSTERAS = ['Punta Cana', 'Las Terrenas', 'Sosúa', 'Juan Dolio', 'La Romana'];

const q = (v: unknown): string => {
  if (v === undefined || v === null) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `array[${v.map(q).join(', ')}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const filas = PROPIEDADES.map((p) =>
  `  (${[
    p.id, INMOBILIARIA_DEMO_ID, p.titulo, p.tipo, p.operacion, p.precio, p.ciudad, p.sector, p.provincia,
    p.latitude, p.longitude, p.habitaciones, p.banos, p.parqueos, p.metros, p.resumen, p.descripcion,
    p.amenidades, p.cercaDe, p.anoConstruccion, p.mantenimientoUSD, !!p.confotur, !!p.enPlano, p.entrega,
    p.imagen, COSTERAS.includes(p.ciudad),
  ]
    .map(q)
    .join(', ')
    .replace(`'${INMOBILIARIA_DEMO_ID}'`, `'${INMOBILIARIA_DEMO_ID}'::uuid`)})`,
);

const sql = `-- Datos iniciales de Habitat (generado por scripts/generar-seed.ts; no editar a mano).
insert into public.inmobiliarias (id, slug, nombre, whatsapp, instrucciones_brisa)
values ('${INMOBILIARIA_DEMO_ID}', 'habitat-demo', 'Habitat Demo', null,
        'Inmobiliaria de demostración con propiedades en todo el país.')
on conflict (id) do nothing;

insert into public.propiedades (
  id, inmobiliaria_id, titulo, tipo, operacion, precio, ciudad, sector, provincia,
  latitude, longitude, habitaciones, banos, parqueos, metros, resumen, descripcion,
  amenidades, cerca_de, ano_construccion, mantenimiento_usd, confotur, en_plano, entrega,
  imagen, costera
) values
${filas.join(',\n')}
on conflict (id) do update set
  titulo = excluded.titulo, precio = excluded.precio, resumen = excluded.resumen,
  descripcion = excluded.descripcion, imagen = excluded.imagen, publicada = true;
`;

const destino = join(__dirname, '..', 'supabase', 'seed.sql');
writeFileSync(destino, sql);
console.log(`seed.sql generado con ${PROPIEDADES.length} propiedades → ${destino}`);
