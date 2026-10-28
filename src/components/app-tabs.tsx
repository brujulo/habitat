import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const c = useTheme();

  return (
    <NativeTabs
      backgroundColor={c.background}
      indicatorColor={c.primarySoft}
      tintColor={c.primary}
      labelStyle={{ selected: { color: c.primary } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cerca">
        <NativeTabs.Trigger.Label>Cerca de ti</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'location', selected: 'location.fill' }} md="location_on" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="brisa">
        <NativeTabs.Trigger.Label>Brisa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favoritos">
        <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
