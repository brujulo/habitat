import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Configuración de Supabase (variables EXPO_PUBLIC_* en .env o en el entorno de compilación).
 * Si faltan, la app funciona en modo demo con datos locales y Brisa simulada.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const INMOBILIARIA = process.env.EXPO_PUBLIC_INMOBILIARIA || 'habitat-demo';

export const conectado = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Durante la exportación estática de la web no existe `window`: no persistir sesión ahí.
const enServidor = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null = conectado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: enServidor ? undefined : AsyncStorage,
        persistSession: !enServidor,
        autoRefreshToken: !enServidor,
        detectSessionInUrl: false,
      },
    })
  : null;

export const CANAL: 'App' | 'Web' = Platform.OS === 'web' ? 'Web' : 'App';
