import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, type } from '@/ui/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 86,
          paddingTop: 8,
        },
        tabBarLabelStyle: { ...type.micro, textTransform: 'none', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Build',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
