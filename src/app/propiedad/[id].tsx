import { useLocalSearchParams } from 'expo-router';

import { DetallePropiedad } from '@/screens/propiedad';

export default function PropiedadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetallePropiedad id={id} />;
}
