/**
 * MessagesScreen — matches web AllMessagesView phone-size layout exactly.
 * Design tokens, typography, and row style are identical to the web.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { apiGetDevices, apiGetDeviceSms, type Device, type SmsMessage } from '@/lib/api';

// ── Design tokens (exact match to web) ────────────────────────────────────────
const CYAN     = '#00e8d8';
const CYAN_85  = 'rgba(0,232,216,0.85)';
const CYAN_60  = 'rgba(0,232,216,0.6)';
const CYAN_40  = 'rgba(0,232,216,0.4)';
const CYAN_25  = 'rgba(0,232,216,0.25)';
const CYAN_15  = 'rgba(0,232,216,0.15)';
const CYAN_08  = 'rgba(0,232,216,0.08)';
const BG_ROW   = 'rgba(10,22,38,0.85)';
const GREEN    = '#22c55e';
const RED      = '#f87171';
const ORANGE   = '#fb923c';

interface MessagePreview { sms: SmsMessage; device: Device }

function fmtTime(ts: number) {
  const d = new Date(ts);
  const diffH = (Date.now() - ts) / 3_600_000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Detect bank / OTP / transaction SMS (matches web logic)
function smsType(body: string): 'bank' | 'otp' | 'alert' | 'generic' {
  const lower = body.toLowerCase();
  if (/debited|credited|rs\.|inr|₹|balance|account|bank/.test(lower)) return 'bank';
  if (/otp|one.time|verify|verification|code/i.test(lower)) return 'otp';
  if (/alert|warning|notice/i.test(lower)) return 'alert';
  return 'generic';
}

function typeColor(t: ReturnType<typeof smsType>): string {
  if (t === 'bank')  return GREEN;
  if (t === 'otp')   return '#a78bfa';
  if (t === 'alert') return ORANGE;
  return CYAN_60;
}

function typeDot(t: ReturnType<typeof smsType>): string {
  if (t === 'bank')  return 'dollar-sign';
  if (t === 'otp')   return 'key';
  if (t === 'alert') return 'alert-triangle';
  return 'message-circle';
}

// ── Single message row ────────────────────────────────────────────────────────
function MessageRow({ item }: { item: MessagePreview }) {
  const { sms, device } = item;
  const isOut = sms.type === 'outgoing';
  const type  = smsType(sms.message ?? '');
  const tc    = typeColor(type);
  const td    = typeDot(type) as React.ComponentProps<typeof Feather>['name'];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push({
        pathname: '/device/[id]',
        params: { id: device.id, panelId: device.panelId, name: device.name },
      })}
      style={[s.row, { backgroundColor: BG_ROW, borderColor: CYAN_25 }]}>

      {/* Left type icon */}
      <View style={[s.avatar, { backgroundColor: `${tc}15`, borderColor: `${tc}40` }]}>
        <Feather name={isOut ? 'send' : td} size={14} color={tc} />
      </View>

      {/* Body */}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.sender, { color: isOut ? CYAN : CYAN_85 }]} numberOfLines={1}>
            {isOut ? `→ ${sms.sender}` : sms.sender}
          </Text>
          <Text style={s.time}>{fmtTime(sms.ts)}</Text>
        </View>
        <Text style={s.preview} numberOfLines={1}>{sms.message}</Text>
        <View style={s.deviceRow}>
          <Feather name="smartphone" size={9} color={CYAN_25} />
          <Text style={s.deviceName} numberOfLines={1}>{device.name}</Text>
        </View>
      </View>

      <Feather name="chevron-right" size={13} color={CYAN_40} />
    </TouchableOpacity>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState('');

  const devicesQuery = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const devices = devicesQuery.data?.devices ?? [];
  const first5  = useMemo(() => devices.slice(0, 5), [devices]);

  const smsQuery = useQuery({
    queryKey: ['messages-all', token, first5.map(d => d.id).join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        first5.map(d => apiGetDeviceSms(d.id, d.panelId, token!, 20)),
      );
      const combined: MessagePreview[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled')
          r.value.forEach(sms => combined.push({ sms, device: first5[i] }));
      });
      return combined.sort((a, b) => b.sms.ts - a.sms.ts);
    },
    enabled: !!token && first5.length > 0,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const messages = smsQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m =>
      m.sms.sender.toLowerCase().includes(q) ||
      (m.sms.message?.toLowerCase() ?? '').includes(q) ||
      m.device.name.toLowerCase().includes(q),
    );
  }, [messages, search]);
  const isLoading  = devicesQuery.isLoading || (smsQuery.isLoading && first5.length > 0);
  const isFetching = devicesQuery.isFetching || smsQuery.isFetching;

  return (
    <View style={[s.root, { backgroundColor: '#030d18' }]}>

      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <View style={[s.subHeader, { backgroundColor: 'rgba(4,12,22,0.97)', borderBottomColor: CYAN_25 }]}>
        <View style={s.subHeaderRow}>
          <View>
            <Text style={s.pageTitle}>MESSAGES</Text>
            {!isLoading && (
              <Text style={s.pageSub}>{messages.length} recent</Text>
            )}
          </View>
          <View style={s.subHeaderRight}>
            {isFetching && !isLoading && <ActivityIndicator size="small" color={CYAN} />}
            <TouchableOpacity
              onPress={() => { devicesQuery.refetch(); smsQuery.refetch(); }}
              style={[s.refreshBtn, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}
              activeOpacity={0.7}>
              <Feather name="refresh-cw" size={13} color={CYAN_60} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={[s.searchRow, { backgroundColor: BG_ROW, borderColor: CYAN_25 }]}>
          <Feather name="search" size={13} color={CYAN_40} />
          <TextInput
            style={s.searchInput}
            placeholder="Search messages…"
            placeholderTextColor={CYAN_25}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={12} color={CYAN_40} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={s.loadingText}>LOADING MESSAGES…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => `${item.device.id}:${item.sms.key}`}
          renderItem={({ item }) => <MessageRow item={item} />}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => { devicesQuery.refetch(); smsQuery.refetch(); }}
              tintColor={CYAN}
              colors={[CYAN]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
                <Feather name="message-square" size={28} color={CYAN_40} />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'No matching messages' : 'No messages yet'}
              </Text>
              <Text style={s.emptyBody}>
                {search
                  ? 'Try a different search term'
                  : 'Messages from connected devices appear here'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1 },
  subHeader:    { borderBottomWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 8 },
  subHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subHeaderRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle:    { fontFamily: 'Orbitron_700Bold', fontSize: 14, letterSpacing: 4, color: CYAN_85 },
  pageSub:      { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, marginTop: 2 },
  refreshBtn:   { width: 30, height: 30, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 6 },
  searchInput:  { flex: 1, fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: CYAN_85, padding: 0 },

  list:         { padding: 10, gap: 6 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 4, color: CYAN_40, marginTop: 8 },

  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 8, borderWidth: 1 },
  avatar:       { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody:      { flex: 1, gap: 2 },
  rowTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sender:       { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '700', flex: 1 },
  time:         { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_40 },
  preview:      { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_60 },
  deviceRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deviceName:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_25 },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon:    { width: 64, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2, color: CYAN_40 },
  emptyBody:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, textAlign: 'center', color: CYAN_25, lineHeight: 16 },
});
