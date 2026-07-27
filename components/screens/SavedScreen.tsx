/**
 * SavedScreen — matches web SavedView phone-size layout exactly.
 * Shows bookmarked devices with ZENIN design tokens.
 */
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Design tokens (exact match to web) ────────────────────────────────────────
const CYAN    = '#00e8d8';
const CYAN_85 = 'rgba(0,232,216,0.85)';
const CYAN_60 = 'rgba(0,232,216,0.6)';
const CYAN_40 = 'rgba(0,232,216,0.4)';
const CYAN_25 = 'rgba(0,232,216,0.25)';
const CYAN_15 = 'rgba(0,232,216,0.15)';
const CYAN_08 = 'rgba(0,232,216,0.08)';
const BG_ROW  = 'rgba(10,22,38,0.85)';

const STORAGE_KEY = 'zenin_saved_devices';

interface SavedEntry { id: string; panelId: string; name: string; savedAt: number }

function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

export function SavedScreen() {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setSaved(JSON.parse(raw) as SavedEntry[]); })
      .catch(() => {});
  }, []);

  const remove = async (id: string) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <View style={[s.root, { backgroundColor: '#030d18' }]}>

      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <View style={[s.subHeader, { backgroundColor: 'rgba(4,12,22,0.97)', borderBottomColor: CYAN_25 }]}>
        <View>
          <Text style={s.pageTitle}>SAVED</Text>
          {saved.length > 0 && (
            <Text style={s.pageSub}>{saved.length} bookmarked</Text>
          )}
        </View>
      </View>

      <FlatList
        data={saved}
        keyExtractor={s => s.id}
        contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[st.row, { backgroundColor: BG_ROW, borderColor: CYAN_25 }]}>
            {/* Left accent */}
            <View style={[st.rowAccent, { backgroundColor: CYAN_40 }]} />

            {/* Icon */}
            <View style={[st.rowIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
              <Feather name="bookmark" size={13} color={CYAN_60} />
            </View>

            {/* Info */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.rowName} numberOfLines={1}>{item.name}</Text>
              <View style={st.rowMetaRow}>
                <Feather name="clock" size={9} color={CYAN_25} />
                <Text style={st.rowMeta}>Saved {relTime(item.savedAt)}</Text>
              </View>
            </View>

            {/* Remove */}
            <TouchableOpacity
              onPress={() => void remove(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[st.removeBtn, { borderColor: CYAN_15 }]}>
              <Feather name="x" size={12} color={CYAN_40} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={[st.emptyIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
              <Feather name="bookmark" size={28} color={CYAN_40} />
            </View>
            <Text style={st.emptyTitle}>Nothing saved yet</Text>
            <Text style={st.emptyBody}>
              Bookmark devices from the device detail screen for quick access here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1 },
  subHeader: { borderBottomWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  pageTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 14, letterSpacing: 4, color: CYAN_85 },
  pageSub:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, marginTop: 2 },
});

const st = StyleSheet.create({
  list:       { padding: 10, gap: 6 },
  row:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, overflow: 'hidden', gap: 10, paddingRight: 12, paddingVertical: 11 },
  rowAccent:  { width: 3, alignSelf: 'stretch' },
  rowIcon:    { width: 32, height: 32, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: CYAN_85, fontWeight: '700' },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowMeta:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_40 },
  removeBtn:  { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  empty:      { alignItems: 'center', paddingTop: 70, gap: 12, paddingHorizontal: 32 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2, color: CYAN_40 },
  emptyBody:  { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, textAlign: 'center', color: CYAN_25, lineHeight: 16 },
});
