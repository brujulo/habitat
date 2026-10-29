import { useLocalSearchParams } from 'expo-router';

import { DetalleCliente } from '@/screens/arm/cliente';

export default function ClienteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetalleCliente id={id} />;
}
