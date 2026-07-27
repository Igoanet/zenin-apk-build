/**
 * ActiveScreen — matches web ActiveView phone-size layout exactly.
 * Shows online/offline device list with battery, last-seen, phone number.
 */
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { apiGetDevices, type Device } from '@/lib/api';

// ── Design tokens (exact match to web) ────────────────────────────────────────
const CYAN    = '#00e8d8';
const CYAN_85 = 'rgba(0,232,216,0.85)';
const CYAN_60 = 'rgba(0,232,216,0.6)';
const CYAN_40 = 'rgba(0,232,216,0.4)';
const CYAN_25 = 'rgba(0,232,216,0.25)';
const CYAN_15 = 'rgba(0,232,216,0.15)';
const CYAN_08 = 'rgba(0,232,216,0.08)';
const BG_ROW  = 'rgba(10,22,38,0.85)';
const GREEN   = '#22c55e';
const RED     = '#f87171';

function fmtLastSeen(ts: number): string | null {
  if (!ts) return null;
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ── Single device row — matches web ActiveView card ────────────────────────────
function ActiveDeviceRow({ device }: { device: Device }) {
  const isOnline = device.status;
  const lastSeen = fmtLastSeen(device.lastSeen);
  const battery  = device.battery;

  return (
    <View style={[s.row, { backgroundColor: BG_ROW, borderColor: CYAN_25 }]}>

      {/* Left status bar */}
      <View style={[s.statusBar, { backgroundColor: isOnline ? GREEN : RED }]} />

      {/* Device icon */}
      <View style={[s.rowIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
        <Feather name="smartphone" size={13} color={isOnline ? CYAN_60 : CYAN_25} />
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowName} numberOfLines={1}>{device.name || device.id}</Text>
        <View style={s.metaRow}>
          {device.mobNo ? (
            <Text style={s.metaText}>{device.mobNo}</Text>
          ) : null}
          {lastSeen ? (
            <Text style={s.metaText}>
              {device.mobNo ? ' · ' : ''}{lastSeen}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right side */}
      <View style={s.rowRight}>
        {battery != null && (
          <View style={s.batteryRow}>
            <Feather
              name="battery"
              size={10}
              color={battery > 20 ? GREEN : RED}
            />
            <Text style={[s.batteryText, { color: battery > 20 ? GREEN : RED }]}>
              {battery}%
            </Text>
          </View>
        )}
        <View style={[s.statusBadge, {
          backgroundColor: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.10)',
          borderColor:     isOnline ? 'rgba(34,197,94,0.40)' : 'rgba(248,113,113,0.30)',
        }]}>
          <View style={[s.statusDot, { backgroundColor: isOnline ? GREEN : RED }]} />
          <Text style={[s.statusText, { color: isOnline ? GREEN : RED }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ActiveScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const devices = data?.devices ?? [];
  const online  = devices.filter(d => d.status);
  const offline = devices.filter(d => !d.status);
  const ordered = [...online, ...offline];

  return (
    <View style={[s.root, { backgroundColor: '#030d18' }]}>

      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <View style={[s.subHeader, { backgroundColor: 'rgba(4,12,22,0.97)', borderBottomColor: CYAN_25 }]}>
        <View style={s.subHeaderRow}>
          <View>
            <Text style={s.pageTitle}>ACTIVE</Text>
            {!isLoading && (
              <Text style={s.pageSub}>{online.length} online · {offline.length} offline</Text>
            )}
          </View>
          <View style={s.subHeaderRight}>
            {isFetching && !isLoading && (
              <ActivityIndicator size="small" color={CYAN} />
            )}
            <TouchableOpacity
              onPress={() => void refetch()}
              style={[s.refreshBtn, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}
              activeOpacity={0.7}>
              <Feather name="refresh-cw" size={13} color={CYAN_60} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip (matches web ActiveView 3-col quick stats) */}
        {!isLoading && (
          <View style={s.statsStrip}>
            <View style={[s.statChip, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' }]}>
              <View style={[s.statDot, { backgroundColor: GREEN }]} />
              <Text style={[s.statChipText, { color: GREEN }]}>{online.length} ONLINE</Text>
            </View>
            <View style={[s.statChip, { borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.08)' }]}>
              <View style={[s.statDot, { backgroundColor: RED }]} />
              <Text style={[s.statChipText, { color: RED }]}>{offline.length} OFFLINE</Text>
            </View>
            <View style={[s.statChip, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}>
              <Feather name="monitor" size={9} color={CYAN_60} />
              <Text style={[s.statChipText, { color: CYAN_60 }]}>{devices.length} TOTAL</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={s.loadingText}>SCANNING…</Text>
        </View>
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={d => `${d.panelId}:${d.id}`}
          renderItem={({ item }) => <ActiveDeviceRow device={item} />}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
                <Feather name="activity" size={28} color={CYAN_40} />
              </View>
              <Text style={s.emptyTitle}>No active devices</Text>
              <Text style={s.emptyBody}>
                Connect a Firebase panel to see live device activity here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1 },
  subHeader:     { borderBottomWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 8 },
  subHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subHeaderRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle:     { fontFamily: 'Orbitron_700Bold', fontSize: 14, letterSpacing: 4, color: CYAN_85 },
  pageSub:       { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, marginTop: 2 },
  refreshBtn:    { width: 30, height: 30, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  statsStrip: { flexDirection: 'row', gap: 6 },
  statChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, borderWidth: 1 },
  statDot:    { width: 5, height: 5, borderRadius: 3 },
  statChipText:{ fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1 },

  list:          { padding: 10, gap: 6 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 4, color: CYAN_40, marginTop: 8 },

  row:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, overflow: 'hidden', gap: 10, paddingRight: 12, paddingVertical: 10 },
  statusBar:     { width: 3, alignSelf: 'stretch' },
  rowIcon:       { width: 32, height: 32, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName:       { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: CYAN_85, fontWeight: '700' },
  metaRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText:      { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_40 },
  rowRight:      { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  batteryRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  batteryText:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  statusDot:     { width: 5, height: 5, borderRadius: 3 },
  statusText:    { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1 },

  empty:         { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon:     { width: 64, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:    { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2, color: CYAN_40 },
  emptyBody:     { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, textAlign: 'center', color: CYAN_25, lineHeight: 16 },
});
