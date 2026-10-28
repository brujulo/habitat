import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconoNombre } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; href: '/' | '/cerca' | '/brisa' | '/favoritos'; label: string; icon: IconoNombre }[] = [
  { name: 'explorar', href: '/', label: 'Explorar', icon: 'casa' },
  { name: 'tab-cerca', href: '/cerca', label: 'Cerca de ti', icon: 'ubicacion' },
  { name: 'tab-brisa', href: '/brisa', label: 'Brisa', icon: 'chispa' },
  { name: 'tab-favoritos', href: '/favoritos', label: 'Favoritos', icon: 'corazonLleno' },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      {/* Los TabTrigger deben ser hijos directos de la lista para que TabList los registre. */}
      <TabList asChild>
        <BarraTabs>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabBoton icono={t.icon}>{t.label}</TabBoton>
            </TabTrigger>
          ))}
        </BarraTabs>
      </TabList>
    </Tabs>
  );
}

function BarraTabs({ children, style, ...props }: TabListProps) {
  const c = useTheme();
  return (
    <View {...props} style={styles.contenedor}>
      <View style={[styles.barra, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

function TabBoton({ children, isFocused, icono, ref: _ref, ...props }: TabTriggerSlotProps & { icono: IconoNombre }) {
  const c = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => [styles.boton, pressed && { opacity: 0.7 }]}>
      <View style={[styles.botonInner, isFocused && { backgroundColor: c.primarySoft }]}>
        <Icon name={icono} size={20} color={isFocused ? c.primary : c.textSecondary} />
        <Text style={[styles.label, { color: isFocused ? c.primary : c.textSecondary }]} numberOfLines={1}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three - 4,
    alignItems: 'center',
  },
  barra: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 6,
    gap: 4,
    boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
  },
  boton: { flex: 1 },
  botonInner: { alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, gap: 2 },
  label: { fontSize: 12, fontWeight: '700' },
});
