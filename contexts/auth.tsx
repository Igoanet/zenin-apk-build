import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ─── Platform-safe storage ─────────────────────────────────────────────────
// expo-secure-store only works on native (iOS/Android). On web we fall back
// to localStorage so the app doesn't crash in the Expo web preview.
const storage = {
  getItemAsync: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ZeninUser {
  userId: string;
  name: string;
  role: string;
  tgUid: number;
}

interface AuthState {
  token: string | null;
  user: ZeninUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setSession: (token: string, user: ZeninUser) => Promise<void>;
  clearSession: () => Promise<void>;
  /** Alias for clearSession — clears token + user and returns to login. */
  signOut: () => Promise<void>;
}

// ─── Storage Keys ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'zenin_token';
const USER_KEY = 'zenin_user';

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Rehydrate from SecureStore on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          storage.getItemAsync(TOKEN_KEY),
          storage.getItemAsync(USER_KEY),
        ]);
        if (token && userJson) {
          setState({ token, user: JSON.parse(userJson), isLoading: false });
        } else {
          setState({ token: null, user: null, isLoading: false });
        }
      } catch {
        setState({ token: null, user: null, isLoading: false });
      }
    })();
  }, []);

  const setSession = useCallback(async (token: string, user: ZeninUser) => {
    await Promise.all([
      storage.setItemAsync(TOKEN_KEY, token),
      storage.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setState({ token, user, isLoading: false });
  }, []);

  const clearSession = useCallback(async () => {
    await Promise.all([
      storage.deleteItemAsync(TOKEN_KEY),
      storage.deleteItemAsync(USER_KEY),
    ]);
    setState({ token: null, user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setSession, clearSession, signOut: clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
