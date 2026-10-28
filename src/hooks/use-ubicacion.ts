import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { UBICACION_POR_DEFECTO } from '@/constants/mercado';
import type { Coordenadas } from '@/utils/geo';

type Estado = 'cargando' | 'ok' | 'sin-permiso' | 'error';

/**
 * Pide permiso de ubicación y devuelve la posición actual.
 * Si no hay permiso, usa el centro de Santo Domingo para que la app siga funcionando.
 */
export function useUbicacion() {
  const [coords, setCoords] = useState<Coordenadas>(UBICACION_POR_DEFECTO);
  const [estado, setEstado] = useState<Estado>('cargando');

  const pedir = useCallback(async () => {
    setEstado('cargando');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setEstado('sin-permiso');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    pedir();
  }, [pedir]);

  return { coords, estado, reintentar: pedir };
}
