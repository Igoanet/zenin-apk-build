// ─────────────────────────────────────────────────────────────────────────────
// ZENIN Mobile — VPS WebView wrapper
//
// The APK contains ZERO business logic. All screens, auth, and data handling
// live on the VPS. This file is a thin shell: it opens a full-screen WebView
// that loads the configured ZENIN server URL and lets Android handle the rest.
//
// Auth bridge: after the native login screen stores the session token in
// SecureStore, we inject it into the WebView via injectedJavaScriptBeforeContentLoaded
// so the web dashboard auto-logs in without showing its own login page.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth';

// WebView is native-only — import lazily so web bundle doesn't choke
const WebView = Platform.OS !== 'web'
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? (require('react-native-webview').WebView as React.ComponentType<any>)
  : null;

// ── Server URL ────────────────────────────────────────────────────────────────
const RAILWAY_DOMAIN = 'api-server-production-5907.up.railway.app';
const DOMAIN = process.env['EXPO_PUBLIC_DOMAIN'] ?? RAILWAY_DOMAIN;
const VPS_URL = `https://${DOMAIN}/zenin`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG = '#000508';

export default function ZeninApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [token, isLoading]);

  // Android hardware back button → navigate WebView back if possible
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const handler = () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true; // consumed
        }
        return false; // let system handle (exit)
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', handler);
      return () => sub.remove();
    }, [canGoBack]),
  );

  // Build the auth-injection script.
  // Runs before any page JS so the web app sees the token in localStorage
  // and skips its own login page entirely.
  const injectedScript = token
    ? `
(function() {
  try {
    // Inject the native session token so the web dashboard auto-logs in.
    // The ZENIN web app reads 'zenin_token' from localStorage on startup.
    var existing = localStorage.getItem('zenin_token');
    if (!existing) {
      localStorage.setItem('zenin_token', ${JSON.stringify(token)});
    }
  } catch(e) {}
})();
true; // required by react-native-webview
`
    : 'true;';

  if (isLoading || !token) {
    // Show spinner while auth state is being rehydrated
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" backgroundColor={BG} />
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#00e8d8" />
        </View>
      </View>
    );
  }

  // ── Web platform: use a plain iframe (WebView is native-only) ──────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" backgroundColor={BG} />
        {/* @ts-ignore — iframe is valid on web platform */}
        <iframe
          src={VPS_URL}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: BG }}
          allow="storage-access"
        />
      </View>
    );
  }

  // ── Native (Android / iOS): full WebView with auth injection ───────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor={BG} />

      {WebView && (
        <WebView
          ref={webViewRef}
          source={{ uri: VPS_URL }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={injectedScript}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          onNavigationStateChange={(state: { canGoBack: boolean }) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          applicationNameForUserAgent="ZENINApp/1.0"
        />
      )}

      {/* Splash overlay while first page loads */}
      {loading && (
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#00e8d8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  webview: {
    flex: 1,
    backgroundColor: BG,
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
