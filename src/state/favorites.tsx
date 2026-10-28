import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type FavoritosCtx = {
  ids: string[];
  esFavorito: (id: string) => boolean;
  alternar: (id: string) => void;
};

const Ctx = createContext<FavoritosCtx | null>(null);

/**
 * Favoritos en memoria para el prototipo.
 * Para persistirlos entre sesiones, guardar `ids` con expo-sqlite/kv-store o AsyncStorage.
 */
export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const alternar = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

  const value = useMemo(() => ({ ids, alternar, esFavorito: (id: string) => ids.includes(id) }), [ids, alternar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavoritos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFavoritos debe usarse dentro de FavoritosProvider');
  return ctx;
}
