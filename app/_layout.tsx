// ─────────────────────────────────────────────────────────────────────────────
// Root layout — shell for the ZENIN WebView wrapper APK.
// Handles push notification registration and bridges the token to the server.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Exo2_900Black } from '@expo-google-fonts/exo-2';
import { Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { BlackOpsOne_400Regular } from '@expo-google-fonts/black-ops-one';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { AuthProvider, useAuth } from '@/contexts/auth';

SplashScreen.preventAutoHideAsync();

// Inject Google Fonts CSS for Expo web (no static index.html)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Russo+One&display=swap';
  document.head.appendChild(link);
}

// expo-notifications was removed from Expo Go in SDK 53 and throws on import.
// Lazy-require it so web preview and Expo Go both work without crashing.
type NotificationsModule = typeof import('expo-notifications');
const Notifications: NotificationsModule | null = (() => {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
})();

// Set up the handler only if the module loaded successfully
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const RAILWAY_DOMAIN = 'api-server-production-5907.up.railway.app';

async function registerPushToken(token: string, authToken: string): Promise<void> {
  try {
    const domain = process.env['EXPO_PUBLIC_DOMAIN'] ?? RAILWAY_DOMAIN;
    const proto  = domain.includes('localhost') ? 'http' : 'https';
    await fetch(`${proto}://${domain}/api/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (e) {
    // Non-fatal — push notifications won't work but the app still functions
    console.warn('[push] Failed to register token:', e);
  }
}

// Inner component so it can use useAuth (inside AuthProvider)
function PushRegistrar() {
  const { token: authToken } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    // Skip entirely if Notifications module unavailable (web / Expo Go)
    if (!Notifications || !authToken || registered.current) return;
    registered.current = true;

    (async () => {
      const { status: existingStatus } = await Notifications!.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications!.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[push] Permission not granted');
        return;
      }

      const pushToken = await Notifications!.getExpoPushTokenAsync({
        projectId: process.env['EXPO_PUBLIC_REPL_ID'] ?? 'zenin-mobile',
      }).catch(() => null);

      if (pushToken?.data) {
        await registerPushToken(pushToken.data, authToken);
        console.log('[push] Registered:', pushToken.data);
      }
    })();
  }, [authToken]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Exo2_900Black,
    Orbitron_700Bold,
    Orbitron_900Black,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    RussoOne_400Regular,
    BlackOpsOne_400Regular,
    BebasNeue_400Regular,
    ChakraPetch_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <PushRegistrar />
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
