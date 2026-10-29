import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { PROPIEDADES, setCatalogoActual, type Propiedad } from '@/data/properties';
import { conectado, INMOBILIARIA, supabase } from '@/lib/supabase';

type CatalogoCtx = {
  propiedades: Propiedad[];
  ciudades: string[];
  cargando: boolean;
  error: string | null;
  /** true cuando las propiedades vienen de la base de datos. */
  enLinea: boolean;
};

const Ctx = createContext<CatalogoCtx | null>(null);

type Fila = {
  id: string;
  titulo: string;
  tipo: Propiedad['tipo'];
  operacion: Propiedad['operacion'];
  precio: number | string;
  ciudad: string;
  sector: string;
  provincia: string;
  latitude: number;
  longitude: number;
  habitaciones: number;
  banos: number | string;
  parqueos: number;
  metros: number | string;
  resumen: string;
  descripcion: string;
  amenidades: string[];
  cerca_de: string[];
  ano_construccion: number | null;
  mantenimiento_usd: number | string | null;
  confotur: boolean;
  en_plano: boolean;
  entrega: string | null;
  imagen: string;
};

const aPropiedad = (f: Fila): Propiedad => ({
  id: f.id,
  titulo: f.titulo,
  tipo: f.tipo,
  operacion: f.operacion,
  precio: Number(f.precio),
  ciudad: f.ciudad,
  sector: f.sector,
  provincia: f.provincia,
  latitude: f.latitude,
  longitude: f.longitude,
  habitaciones: f.habitaciones,
  banos: Number(f.banos),
  parqueos: f.parqueos,
  metros: Number(f.metros),
  resumen: f.resumen,
  descripcion: f.descripcion,
  amenidades: f.amenidades ?? [],
  cercaDe: f.cerca_de ?? [],
  anoConstruccion: f.ano_construccion ?? undefined,
  mantenimientoUSD: f.mantenimiento_usd != null ? Number(f.mantenimiento_usd) : undefined,
  confotur: f.confotur,
  enPlano: f.en_plano,
  entrega: f.entrega ?? undefined,
  imagen: f.imagen,
});

/** Carga las propiedades de la inmobiliaria desde Supabase (o usa las de ejemplo en modo demo). */
export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [propiedades, setPropiedades] = useState<Propiedad[]>(PROPIEDADES);
  const [cargando, setCargando] = useState(conectado);
  const [error, setError] = useState<string | null>(null);
  const [enLinea, setEnLinea] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    (async () => {
      const { data: inmo, error: e1 } = await supabase
        .from('inmobiliarias')
        .select('id')
        .eq('slug', INMOBILIARIA)
        .maybeSingle();
      if (e1 || !inmo) throw new Error(e1?.message ?? `No existe la inmobiliaria "${INMOBILIARIA}"`);
      const { data, error: e2 } = await supabase
        .from('propiedades')
        .select('*')
        .eq('inmobiliaria_id', inmo.id)
        .eq('publicada', true)
        .order('creado', { ascending: false });
      if (e2) throw new Error(e2.message);
      return (data as Fila[]).map(aPropiedad);
    })()
      .then((lista) => {
        if (!vivo) return;
        setCatalogoActual(lista);
        setPropiedades(lista);
        setEnLinea(true);
      })
      .catch((e: Error) => {
        // Si falla la conexión, la app sigue con el catálogo de ejemplo.
        console.warn('Catálogo en línea no disponible:', e.message);
        if (vivo) setError(e.message);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      propiedades,
      ciudades: Array.from(new Set(propiedades.map((p) => p.ciudad))),
      cargando,
      error,
      enLinea,
    }),
    [propiedades, cargando, error, enLinea],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalogo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider');
  return ctx;
}
