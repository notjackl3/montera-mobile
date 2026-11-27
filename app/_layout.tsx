import { NotoSans_400Regular, NotoSans_700Bold, useFonts } from '@expo-google-fonts/noto-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported on this platform — not worth failing over.
});

export default function RootLayout() {
  // DESIGN.md specifies Noto Sans in 400 and 700 only.
  const [loaded, error] = useFonts({ NotoSans_400Regular, NotoSans_700Bold });

  useEffect(() => {
    // Render on error too: a missing webfont should degrade to the system face,
    // not leave the user staring at a splash screen.
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scanner/[mode]" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="build/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          {/* The web guide swipes between steps itself, so no swipe-back here. */}
          <Stack.Screen name="guide/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
