import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Contenedor de pantalla con fondo, márgenes seguros y ancho máximo en web/tablet. */
export function Screen({ children }: { children: ReactNode }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  derecha,
}: {
  titulo: string;
  subtitulo?: string;
  derecha?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={styles.encabezado}>
      <View style={{ flex: 1 }}>
        {subtitulo && <Text style={[styles.subtitulo, { color: c.textSecondary }]}>{subtitulo}</Text>}
        <Text style={[styles.titulo, { color: c.text }]} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {derecha}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  subtitulo: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
});
