import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { apiGetDevices } from '@/lib/api';
import type { Page } from '@/types/navigation';

// ── Design tokens ──────────────────────────────────────────────────────────
const CYAN     = '#00e8d8';
const CYAN_85  = 'rgba(0,232,216,0.85)';
const CYAN_60  = 'rgba(0,232,216,0.6)';
const CYAN_40  = 'rgba(0,232,216,0.4)';
const CYAN_25  = 'rgba(0,232,216,0.25)';
const CYAN_10  = 'rgba(0,232,216,0.10)';
const CYAN_08  = 'rgba(0,232,216,0.08)';
const BG_CARD  = 'rgba(5,14,26,0.95)';
const GREEN    = '#22c55e';

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtRupee(n: number): string {
  if (!n) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${n}`;
}

// ── Main component ───────────────────────────────────────────────────────────
export function DashboardScreen({
  onNavigate,
}: {
  onNavigate: (page: Page | string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const devices = data?.devices ?? [];
  const summary = data?.summary  ?? { totalBalance: 0, fundCount: 0, unknownCount: 0 };
  const total   = devices.length;
  const online  = devices.filter((d) => d.status).length;
  const offline = total - online;

  const D = isLoading ? '—' : undefined;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── MONEY POOL ────────────────────────────────────────────────────── */}
      <View style={[styles.poolCard, { borderColor: CYAN_25 }]}>
        <Text style={styles.poolLabel}>MONEY POOL</Text>
        <View style={styles.poolBody}>
          <Text style={styles.poolAmount}>
            {isLoading ? '—' : fmtRupee(summary.totalBalance)}
          </Text>
          <View style={styles.poolRight}>
            <Text style={styles.poolFunds}>
              {isLoading ? '—' : `${summary.fundCount} FUNDS`}
            </Text>
            <Text style={styles.poolUnknown}>
              {isLoading ? '' : `${summary.unknownCount} UNKNOWN`}
            </Text>
          </View>
        </View>
      </View>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <View style={[styles.statsRow, { borderColor: CYAN_25 }]}>
        <StatCell
          label="TOTAL DEVICES"
          icon="monitor"
          value={D ?? String(total)}
          accent
        />
        <View style={[styles.statDivider, { backgroundColor: CYAN_25 }]} />
        <StatCell
          label="ONLINE"
          icon="wifi"
          value={D ?? String(online)}
          color={GREEN}
        />
        <View style={[styles.statDivider, { backgroundColor: CYAN_25 }]} />
        <StatCell
          label="OFFLINE"
          icon="shield"
          value={D ?? String(offline)}
        />
      </View>

      {/* ── VIEW ALL DEVICES ──────────────────────────────────────────────── */}
      <NavBanner
        icon="smartphone"
        title="View All Devices"
        sub={
          isLoading
            ? 'Loading…'
            : `${online} online, ${offline} offline — Click to manage`
        }
        onPress={() => onNavigate('Devices')}
      />

      {/* ── VIEW ALL MESSAGES ─────────────────────────────────────────────── */}
      <NavBanner
        icon="message-square"
        title="View All Messages"
        sub="Browse SMS logs — Click to view"
        onPress={() => onNavigate('Messages')}
      />

      {/* ── NOTIFICATION ──────────────────────────────────────────────────── */}
      <NavBanner
        icon="bell"
        title="Notification"
        sub="Check your notifications"
        onPress={() => onNavigate('Notification')}
      />

      {/* ── PANEL ─────────────────────────────────────────────────────────── */}
      <SectionLabel label="PANEL" />
      <View style={styles.grid2}>
        <PanelTile icon="link-2"   label="Panel Linked" sub="Connections"
          onPress={() => onNavigate('Panel Linked')} />
        <PanelTile icon="globe"    label="Panel Portal" sub="Folders"
          onPress={() => onNavigate('Panel Portal')} />
      </View>

      {/* ── SAVED ─────────────────────────────────────────────────────────── */}
      <SectionLabel label="SAVED" />
      <NavBanner
        icon="bookmark"
        title="Saved"
        sub="Saved devices"
        onPress={() => onNavigate('Saved')}
      />

      {/* ── ACTIVE ────────────────────────────────────────────────────────── */}
      <SectionLabel label="ACTIVE" />
      <View style={styles.activeCols}>
        <ActiveTile icon="link"  label="Links"        onPress={() => onNavigate('Active')} />
        <ActiveTile icon="bell"  label="Notification" onPress={() => onNavigate('Notification')} />
        <ActiveTile icon="share" label="Forward"      onPress={() => onNavigate('Devices')} />
      </View>

      {/* ── DSINT ─────────────────────────────────────────────────────────── */}
      <SectionLabel label="DSINT" />
      <NavBanner
        icon="search"
        title="DSINT"
        sub="Phone &amp; Identity Lookup"
        onPress={() => onNavigate('Dsint')}
      />

      {/* ── ADVANCED ──────────────────────────────────────────────────────── */}
      <SectionLabel label="ADVANCED" />
      <NavBanner
        icon="zap"
        title="Auto Verify"
        sub="Automated verification"
        onPress={() => onNavigate('Auto Verify')}
      />
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={styles.sectionLabel}>{label}</Text>
  );
}

function StatCell({
  label, icon, value, accent, color,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  accent?: boolean;
  color?: string;
}) {
  const c = color ?? (accent ? CYAN : CYAN_85);
  return (
    <View style={[
      styles.statCell,
      { borderTopColor: color ?? (accent ? CYAN : CYAN_40) },
    ]}>
      <View style={styles.statTop}>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        <Feather name={icon} size={11} color={c} />
      </View>
      <Text style={[
        styles.statValue,
        {
          color: c,
          textShadowColor: color ?? (accent ? CYAN_25 : 'transparent'),
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        },
      ]}>
        {value}
      </Text>
    </View>
  );
}

function NavBanner({
  icon, title, sub, onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: BG_CARD, borderColor: CYAN_25 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bannerIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
        <Feather name={icon} size={15} color={CYAN_60} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={CYAN_40} />
    </TouchableOpacity>
  );
}

function PanelTile({
  icon, label, sub, onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string; sub: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.panelTile, { backgroundColor: BG_CARD, borderColor: CYAN_25 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.panelIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
        <Feather name={icon} size={14} color={CYAN_60} />
      </View>
      <Text style={styles.panelLabel}>{label}</Text>
      <Text style={styles.panelSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function ActiveTile({
  icon, label, onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.activeTile, { backgroundColor: BG_CARD, borderColor: CYAN_25 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.activeTileIcon, { backgroundColor: CYAN_10, borderColor: CYAN_25 }]}>
        <Feather name={icon} size={16} color={CYAN_60} />
      </View>
      <Text style={styles.activeTileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { padding: 10, gap: 8 },

  // ── Money Pool ──────────────────────────────────────────────────────────
  poolCard: {
    backgroundColor: BG_CARD, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  poolLabel: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 10,
    letterSpacing: 5, color: CYAN_40, textAlign: 'center', marginBottom: 10,
  },
  poolBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  poolAmount: {
    fontFamily: 'Orbitron_700Bold', fontSize: 34, color: CYAN_60,
    textShadowColor: CYAN_25, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 22,
  },
  poolRight: { alignItems: 'flex-end', gap: 4 },
  poolFunds: {
    fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 3, color: CYAN_60,
  },
  poolUnknown: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 10, letterSpacing: 1,
    color: 'rgba(0,232,216,0.35)',
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden',
    backgroundColor: BG_CARD,
  },
  statCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderTopWidth: 2, gap: 8 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 7, color: CYAN_40,
    letterSpacing: 0.3, flex: 1, marginRight: 2,
  },
  statValue: { fontFamily: 'Orbitron_700Bold', fontSize: 26 },
  statDivider: { width: 1 },

  // ── Banners ──────────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    borderWidth: 1, borderRadius: 8,
  },
  bannerIcon: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 7,
  },
  bannerTitle: {
    fontFamily: 'Orbitron_700Bold', fontSize: 12, color: CYAN_85,
    marginBottom: 2,
  },
  bannerSub: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 10, color: CYAN_40,
  },

  // ── Section label ────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 10,
    letterSpacing: 4, color: CYAN_40, marginTop: 4, marginBottom: -2,
    paddingHorizontal: 2,
  },

  // ── Panel grid ───────────────────────────────────────────────────────────
  grid2: { flexDirection: 'row', gap: 8 },
  panelTile: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    borderWidth: 1, borderRadius: 8, gap: 8,
  },
  panelIcon: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 7,
  },
  panelLabel: {
    fontFamily: 'Orbitron_700Bold', fontSize: 9, letterSpacing: 1,
    color: CYAN_85, textAlign: 'center',
  },
  panelSub: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 9,
    color: CYAN_40, textAlign: 'center',
  },

  // ── Active tiles ─────────────────────────────────────────────────────────
  activeCols: { flexDirection: 'row', gap: 8 },
  activeTile: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderWidth: 1, borderRadius: 8, gap: 8,
  },
  activeTileIcon: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 8,
  },
  activeTileLabel: {
    fontFamily: 'ShareTechMono_400Regular', fontSize: 9, letterSpacing: 1,
    color: CYAN_60, textAlign: 'center',
  },
});
