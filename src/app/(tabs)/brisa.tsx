import { useLocalSearchParams } from 'expo-router';

import { Brisa } from '@/screens/brisa';

export default function BrisaRoute() {
  // Permite abrir a Brisa con contexto: /brisa?propiedad=<id>
  const { propiedad } = useLocalSearchParams<{ propiedad?: string }>();
  return <Brisa propiedadId={propiedad} />;
}
