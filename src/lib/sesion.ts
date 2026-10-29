import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = 'habitat.sesion.v1';
let cache: string | null = null;

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

/** Identificador anónimo y persistente de este dispositivo: así Brisa recuerda la conversación. */
export async function idSesion(): Promise<string> {
  if (cache) return cache;
  try {
    const guardado = await AsyncStorage.getItem(CLAVE);
    if (guardado) return (cache = guardado);
  } catch {
    // Sin almacenamiento disponible: id solo para esta sesión.
  }
  cache = nuevoId();
  try {
    await AsyncStorage.setItem(CLAVE, cache);
  } catch {}
  return cache;
}
