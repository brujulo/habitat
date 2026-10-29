import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useColorScheme } from 'react-native';

import { ArmProvider } from '@/state/arm';
import { FavoritosProvider } from '@/state/favorites';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <FavoritosProvider>
        <ArmProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="propiedad/[id]" />
            <Stack.Screen name="arm/index" />
            <Stack.Screen name="arm/[id]" />
          </Stack>
        </ArmProvider>
      </FavoritosProvider>
    </ThemeProvider>
  );
}
