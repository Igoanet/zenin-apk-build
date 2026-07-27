/**
 * DevicesScreen — matches web AllDevicesView phone-size layout exactly.
 * Design tokens, typography, and card style are identical to the web.
 * Share button on each row generates a web link (no native share sheet).
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
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
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/auth';
import { apiGetDevices, apiGenerateShareLink, type Device } from '@/lib/api';

// ── Design tokens (match web exactly) ─────────────────────────────────────────
const CYAN     = '#00e8d8';
const CYAN_85  = 'rgba(0,232,216,0.85)';
const CYAN_60  = 'rgba(0,232,216,0.6)';
const CYAN_40  = 'rgba(0,232,216,0.4)';
const CYAN_25  = 'rgba(0,232,216,0.25)';
const CYAN_15  = 'rgba(0,232,216,0.15)';
const CYAN_08  = 'rgba(0,232,216,0.08)';
const GREEN    = '#22c55e';
const RED      = '#f87171';

function fmtLastSeen(ts: number) {
  if (!ts) return null;
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ── Share Link Sheet ──────────────────────────────────────────────────────────
function ShareLinkSheet({ link, onClose }: { link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    /* Outer Pressable: tap outside the card to dismiss */
    <Pressable style={s.overlay} onPress={onClose}>
      {/* Inner Pressable: absorbs touches so the overlay handler doesn't fire */}
      <Pressable style={s.sheet}>
        {/* Header */}
        <View style={s.sheetHeader}>
          <Feather name="link-2" size={14} color={CYAN} />
          <Text style={s.sheetTitle}>SHARE LINK</Text>
        </View>

        <Text style={s.sheetSub}>
          Opens in any browser — no login required.
        </Text>

        {/* Link box (selectable for manual copy) */}
        <View style={[s.linkBox, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}>
          <Text style={s.linkText} selectable>{link}</Text>
        </View>

        {/* Copy button */}
        <TouchableOpacity
          style={[s.copyBtn, { borderColor: copied ? 'rgba(34,197,94,0.5)' : CYAN, backgroundColor: copied ? 'rgba(34,197,94,0.12)' : CYAN_08 }]}
          onPress={() => void handleCopy()}
          activeOpacity={0.7}
        >
          <Feather name={copied ? 'check' : 'copy'} size={13} color={copied ? GREEN : CYAN} />
          <Text style={[s.copyBtnText, { color: copied ? GREEN : CYAN }]}>
            {copied ? 'COPIED!' : 'COPY LINK'}
          </Text>
        </TouchableOpacity>

        {/* Close */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.closeBtnText}>CLOSE</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  );
}

// ── Single device row ─────────────────────────────────────────────────────────
function DeviceRow({
  device,
  onPress,
  onShare,
  sharing,
}: {
  device: Device;
  onPress: () => void;
  onShare: () => void;
  sharing: boolean;
}) {
  const isOnline = device.status;
  const lastSeen = fmtLastSeen(device.lastSeen);
  const battery  = device.battery;

  return (
    <TouchableOpacity
      style={[s.row, { backgroundColor: 'rgba(10,22,38,0.85)', borderColor: CYAN_25 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Status bar on left edge */}
      <View style={[s.statusBar, { backgroundColor: isOnline ? GREEN : RED }]} />

      {/* Phone icon */}
      <View style={[s.rowIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
        <Feather name="smartphone" size={14} color={CYAN_60} />
      </View>

      {/* Main info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowName} numberOfLines={1}>{device.name || device.id}</Text>
        {device.mobNo ? (
          <Text style={s.rowPhone} numberOfLines={1}>{device.mobNo}</Text>
        ) : null}
        {lastSeen && !isOnline ? (
          <Text style={s.rowMeta}>{lastSeen}</Text>
        ) : null}
        {/* Bank balance from SMS analysis */}
        {(() => {
          const banks = (device.smsAnalysis?.bankBalances ?? []) as Array<Record<string, unknown>>;
          const total = banks.reduce((sum, b) => {
            const amt = typeof b['availableBalance'] === 'number' ? b['availableBalance'] : 0;
            return sum + (amt > 0 ? amt : 0);
          }, 0);
          if (total <= 0) return null;
          const fmt = total >= 100000
            ? `₹${(total / 100000).toFixed(1)}L`
            : total >= 1000
              ? `₹${(total / 1000).toFixed(1)}K`
              : `₹${total.toLocaleString()}`;
          return (
            <Text style={s.rowBalance} numberOfLines={1}>
              💰 {fmt} · {banks.length} {banks.length === 1 ? 'bank' : 'banks'}
            </Text>
          );
        })()}
      </View>

      {/* Right side: battery + status badge */}
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
          borderColor:     isOnline ? 'rgba(34,197,94,0.4)'  : 'rgba(248,113,113,0.3)',
        }]}>
          <Text style={[s.statusText, { color: isOnline ? GREEN : RED }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Share icon button — separate touchable so it doesn't trigger row navigation */}
      <TouchableOpacity
        onPress={onShare}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={s.shareBtn}
        activeOpacity={0.6}
      >
        {sharing
          ? <ActivityIndicator size={12} color={CYAN_40} />
          : <Feather name="share-2" size={13} color={CYAN_40} />
        }
      </TouchableOpacity>

      <Feather name="chevron-right" size={13} color={CYAN_40} style={{ marginLeft: 2 }} />
    </TouchableOpacity>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const devices     = data?.devices ?? [];
  const filtered    = search.trim()
    ? devices.filter(d =>
        (d.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (d.mobNo ?? '').includes(search))
    : devices;
  const onlineCount = devices.filter(d => d.status).length;

  const onPress = useCallback((device: Device) => {
    router.push({
      pathname: '/device/[id]',
      params: { id: device.id, panelId: device.panelId, name: device.name },
    });
  }, []);

  // ── Share state ──────────────────────────────────────────────────────────
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const handleShare = useCallback(async (device: Device) => {
    if (sharingId) return; // already sharing another
    setSharingId(device.id);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN ?? 'localhost:8080';
      const proto  = domain.includes('localhost') ? 'http' : 'https';
      const { token: shareToken } = await apiGenerateShareLink(
        device.panelId,
        device.id,
        device.name,
        token!,
      );
      setShareLink(`${proto}://${domain}/zenin/share/${shareToken}`);
    } catch {
      /* silent — user will see nothing change */
    } finally {
      setSharingId(null);
    }
  }, [sharingId, token]);

  return (
    <View style={[s.root, { backgroundColor: '#030d18' }]}>

      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <View style={[s.subHeader, { backgroundColor: 'rgba(4,12,22,0.97)', borderBottomColor: CYAN_25 }]}>
        <View style={s.subHeaderRow}>
          <View>
            <Text style={s.pageTitle}>DEVICES</Text>
            {!isLoading && (
              <Text style={s.pageSub}>{onlineCount}/{devices.length} online</Text>
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

        {/* Search bar */}
        <View style={[s.searchRow, { backgroundColor: 'rgba(10,22,38,0.85)', borderColor: CYAN_25 }]}>
          <Feather name="search" size={13} color={CYAN_40} />
          <TextInput
            style={s.searchInput}
            placeholder="Search devices…"
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
          <Text style={s.loadingText}>FETCHING DEVICES…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color={RED} />
          <Text style={s.errorTitle}>CONNECTION FAILED</Text>
          <Text style={s.errorBody}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => `${item.panelId}:${item.id}`}
          renderItem={({ item }) => (
            <DeviceRow
              device={item}
              onPress={() => onPress(item)}
              onShare={() => void handleShare(item)}
              sharing={sharingId === item.id}
            />
          )}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={CYAN}
              colors={[CYAN]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
                <Feather name="server" size={28} color={CYAN_40} />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'No matching devices' : 'No devices found'}
              </Text>
              <Text style={s.emptyBody}>
                {search
                  ? 'Try a different search term'
                  : 'Add Firebase connections via the ZENIN Desktop app'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Share link modal ──────────────────────────────────────────── */}
      <Modal
        visible={!!shareLink}
        transparent
        animationType="fade"
        onRequestClose={() => setShareLink(null)}
      >
        {shareLink ? (
          <ShareLinkSheet link={shareLink} onClose={() => setShareLink(null)} />
        ) : null}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1 },
  subHeader:  { borderBottomWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 8 },
  subHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subHeaderRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: 14, letterSpacing: 4, color: CYAN_85 },
  pageSub:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, marginTop: 2 },
  refreshBtn: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 6 },
  searchInput:{ flex: 1, fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: CYAN_85, padding: 0 },

  list:       { padding: 10, gap: 6 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText:{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 4, color: CYAN_40, marginTop: 8 },
  errorTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 13, letterSpacing: 3, color: RED },
  errorBody:  { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, textAlign: 'center', color: CYAN_40 },

  // Device row
  row:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, overflow: 'hidden', gap: 10, paddingRight: 12, paddingVertical: 10 },
  statusBar:  { width: 3, alignSelf: 'stretch' },
  rowIcon:    { width: 32, height: 32, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowName:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: CYAN_85, fontWeight: '700' },
  rowPhone:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_60, marginTop: 1 },
  rowMeta:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9,  color: CYAN_40, marginTop: 1 },
  rowBalance: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9,  color: '#22c55e', marginTop: 2 },
  rowRight:   { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  batteryText:{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9 },
  statusBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1 },
  shareBtn:   { padding: 6, marginLeft: 4 },

  // Empty state
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 12, letterSpacing: 2, color: CYAN_40 },
  emptyBody:  { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, textAlign: 'center', color: CYAN_25, lineHeight: 16 },

  // Share link sheet
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center' },
  sheet:      { width: 320, maxWidth: '90%', backgroundColor: 'rgba(4,14,26,0.99)', borderWidth: 1, borderColor: CYAN_25, borderRadius: 18, padding: 22, gap: 12 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontFamily: 'Orbitron_700Bold', fontSize: 13, color: CYAN, letterSpacing: 1 },
  sheetSub:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, lineHeight: 15 },
  linkBox:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  linkText:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_60, lineHeight: 14 },
  copyBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderWidth: 1, borderRadius: 8 },
  copyBtnText:{ fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 2 },
  closeBtn:   { paddingVertical: 8, alignItems: 'center' },
  closeBtnText:{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: CYAN_40 },
});
