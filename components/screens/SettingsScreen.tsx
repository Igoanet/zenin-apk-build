/**
 * SettingsScreen — matches web SettingsView exactly:
 *   2-column grid (Login Methods / Notifications  |  Forward SMS / SMS Forwarding)
 *   + Device Storage full-width card at bottom
 *   + Session management card
 *   + Logout button
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { apiLogout, apiGetSessions, type Session } from '@/lib/api';
import { router } from 'expo-router';

// ── Design tokens (exact match to web) ────────────────────────────────────────
const CYAN     = '#00e8d8';
const CYAN_85  = 'rgba(0,232,216,0.85)';
const CYAN_60  = 'rgba(0,232,216,0.6)';
const CYAN_40  = 'rgba(0,232,216,0.4)';
const CYAN_25  = 'rgba(0,232,216,0.25)';
const CYAN_15  = 'rgba(0,232,216,0.15)';
const CYAN_08  = 'rgba(0,232,216,0.08)';
const BG_CARD  = 'rgba(8,18,32,0.92)';
const BG_ROW   = 'rgba(10,22,38,0.85)';

// ── Helper: format relative time ────────────────────────────────────────────
function shortDevice(ua: string | null) {
  if (!ua) return 'Unknown device';
  let os = 'Unknown';
  if (/Windows/i.test(ua))         os = 'Windows';
  else if (/Android/i.test(ua))    os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS/i.test(ua))     os = 'macOS';
  else if (/Linux/i.test(ua))      os = 'Linux';
  let browser = '';
  if (/Edg\//.test(ua))            browser = 'Edge';
  else if (/Chrome/.test(ua))      browser = 'Chrome';
  else if (/Firefox/.test(ua))     browser = 'Firefox';
  else if (/Safari/.test(ua))      browser = 'Safari';
  return browser ? `${browser} · ${os}` : os;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ── SettingsCard — matches web SettingsCard component ─────────────────────────
function SettingsCard({
  title,
  icon,
  iconBg,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[ss.card, { backgroundColor: BG_CARD, borderColor: CYAN_25 }]}>
      {/* Card header */}
      <View style={[ss.cardHeader, { borderBottomColor: CYAN_15 }]}>
        <View style={[ss.cardIcon, { backgroundColor: iconBg, borderColor: CYAN_15 }]}>
          <Feather name={icon} size={14} color={iconColor} />
        </View>
        <Text style={ss.cardTitle}>{title}</Text>
      </View>
      {/* Card rows */}
      <View style={ss.cardBody}>
        {children}
      </View>
    </View>
  );
}

// ── SettingRow — matches web SettingRow component ─────────────────────────────
function SettingRow({
  title,
  sub,
  icon,
  iconBg,
  iconColor,
  right,
}: {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  right: React.ReactNode;
}) {
  return (
    <View style={[ss.row, { backgroundColor: BG_ROW, borderColor: CYAN_15 }]}>
      <View style={[ss.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={11} color={iconColor} />
      </View>
      <View style={ss.rowText}>
        <Text style={ss.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={ss.rowSub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={ss.rowRight}>{right}</View>
    </View>
  );
}

// ── ActiveBadge (OTP is always active) ────────────────────────────────────────
function ActiveBadge() {
  return (
    <View style={ss.activeBadge}>
      <Text style={ss.activeBadgeText}>ACTIVE</Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, clearSession } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Toggle state (matches web defaults)
  const [twoStep,         setTwoStep]         = useState(false);
  const [fingerprint,     setFingerprint]     = useState(true);
  const [pattern,         setPattern]         = useState(true);
  const [smsForward,      setSmsForward]      = useState(false);
  const [newConnNotif,    setNewConnNotif]     = useState(true);
  const [smsForwardPhone, setSmsForwardPhone] = useState(false);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', token],
    queryFn: () => apiGetSessions(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const handleLogout = () => {
    if (Platform.OS === 'web') { void doLogout(); return; }
    Alert.alert('Sign Out', 'This will end your current session.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void doLogout() },
    ]);
  };

  const doLogout = async () => {
    setLoggingOut(true);
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (token) await apiLogout(token);
    await clearSession();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[ss.scroll, { paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}>

      {/* ── Settings header — matches web (icon + title + subtitle) ──────── */}
      <View style={ss.pageHeader}>
        <View style={[ss.pageIcon, { backgroundColor: CYAN_08, borderColor: CYAN_40 }]}>
          <Feather name="settings" size={18} color={CYAN} />
        </View>
        <View>
          <Text style={ss.pageTitle}>Settings</Text>
          <Text style={ss.pageSub}>Configure your panel</Text>
        </View>
      </View>

      {/* ── "How to create a Telegram Bot?" row ────────────────────────── */}
      <TouchableOpacity
        style={[ss.helpBtn, { backgroundColor: BG_ROW, borderColor: CYAN_15 }]}
        activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="help-circle" size={13} color={CYAN_40} />
          <Text style={ss.helpText}>How to create a Telegram Bot?</Text>
        </View>
        <Feather name="chevron-right" size={13} color={CYAN_40} />
      </TouchableOpacity>

      {/* ── 2-column settings grid (matches web grid-cols-2 gap-4) ──────── */}
      <View style={ss.grid}>

        {/* ── Left column ─────────────────────────────────────────────── */}
        <View style={ss.col}>

          {/* Login Methods card */}
          <SettingsCard
            title="Login Methods"
            icon="shield"
            iconBg="rgba(0,180,140,0.25)"
            iconColor="#00e8b0">
            <SettingRow
              title="Two-step Verification"
              sub="Extra layer of security"
              icon="shield"
              iconBg="rgba(139,92,246,0.25)"
              iconColor="#a78bfa"
              right={
                <Switch
                  value={twoStep}
                  onValueChange={setTwoStep}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={twoStep ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
            <SettingRow
              title="Fingerprint Login"
              sub="Not supported on this device"
              icon="activity"
              iconBg="rgba(0,200,160,0.2)"
              iconColor="#00e8b0"
              right={
                <Switch
                  value={fingerprint}
                  onValueChange={setFingerprint}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={fingerprint ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
            <SettingRow
              title="Pattern Lock"
              sub="Draw to unlock"
              icon="grid"
              iconBg="rgba(251,146,60,0.2)"
              iconColor="#fb923c"
              right={
                <Switch
                  value={pattern}
                  onValueChange={setPattern}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={pattern ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
            <SettingRow
              title="Telegram OTP"
              sub="OTP via Telegram"
              icon="key"
              iconBg="rgba(74,222,128,0.2)"
              iconColor="#4ade80"
              right={<ActiveBadge />}
            />
          </SettingsCard>

          {/* Notifications card */}
          <SettingsCard
            title="Notifications"
            icon="bell"
            iconBg="rgba(251,146,60,0.25)"
            iconColor="#fb923c">
            <SettingRow
              title="New Connections"
              sub="When a device connects"
              icon="bell"
              iconBg="rgba(251,146,60,0.2)"
              iconColor="#fb923c"
              right={
                <Switch
                  value={newConnNotif}
                  onValueChange={setNewConnNotif}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={newConnNotif ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
          </SettingsCard>
        </View>

        {/* ── Right column ────────────────────────────────────────────── */}
        <View style={ss.col}>

          {/* Forward SMS to Telegram card */}
          <SettingsCard
            title="Forward to Telegram"
            icon="send"
            iconBg="rgba(0,150,220,0.25)"
            iconColor="#38bdf8">
            <SettingRow
              title="Enable SMS Forwarding"
              sub="All SMS to a TG bot"
              icon="send"
              iconBg="rgba(56,189,248,0.2)"
              iconColor="#38bdf8"
              right={
                <Switch
                  value={smsForward}
                  onValueChange={setSmsForward}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={smsForward ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
          </SettingsCard>

          {/* SMS Forwarding card */}
          <SettingsCard
            title="SMS Forwarding"
            icon="smartphone"
            iconBg="rgba(0,220,150,0.25)"
            iconColor="#34d399">
            <SettingRow
              title="Enable Forwarding"
              sub="Forward to another number"
              icon="phone"
              iconBg="rgba(52,211,153,0.2)"
              iconColor="#34d399"
              right={
                <Switch
                  value={smsForwardPhone}
                  onValueChange={setSmsForwardPhone}
                  trackColor={{ false: CYAN_15, true: 'rgba(0,232,216,0.35)' }}
                  thumbColor={smsForwardPhone ? CYAN : CYAN_40}
                  style={ss.toggle}
                />
              }
            />
          </SettingsCard>

          {/* Account info card (mobile-specific) */}
          <View style={[ss.card, { backgroundColor: BG_CARD, borderColor: CYAN_25 }]}>
            <View style={[ss.cardHeader, { borderBottomColor: CYAN_15 }]}>
              <View style={[ss.cardIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
                <Feather name="user" size={14} color={CYAN} />
              </View>
              <Text style={ss.cardTitle}>Account</Text>
            </View>
            <View style={[ss.cardBody, { paddingVertical: 10 }]}>
              <Text style={ss.accountName} numberOfLines={1}>{user?.name ?? '—'}</Text>
              <Text style={ss.accountId} numberOfLines={1}>ID · {user?.userId ?? '—'}</Text>
              <View style={[ss.roleBadge, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}>
                <Text style={ss.roleText}>{(user?.role ?? 'USER').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Device Storage — full-width card (matches web) ───────────────── */}
      <View style={[ss.card, { backgroundColor: BG_CARD, borderColor: CYAN_25, marginTop: 8 }]}>
        <View style={[ss.cardHeader, { borderBottomColor: CYAN_15 }]}>
          <View style={[ss.cardIcon, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: CYAN_15 }]}>
            <Feather name="trash-2" size={14} color="#ef4444" />
          </View>
          <Text style={ss.cardTitle}>Device Storage</Text>
        </View>
        <View style={[ss.cardBody, { gap: 10, paddingVertical: 12 }]}>
          <Text style={ss.storageDesc}>
            Wipes all saved device records, SMS cache, and analysis from the server and this device.
            The scan will restart from scratch on reload.
          </Text>
          <TouchableOpacity
            style={[ss.clearBtn, { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.12)' }]}
            activeOpacity={0.8}>
            <Feather name="trash-2" size={12} color="#ef4444" />
            <Text style={[ss.clearBtnText, { color: '#ef4444' }]}>Clear All Storage &amp; Restart</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active Sessions — mobile-specific section ─────────────────────── */}
      <View style={[ss.card, { backgroundColor: BG_CARD, borderColor: CYAN_25, marginTop: 8 }]}>
        <View style={[ss.cardHeader, { borderBottomColor: CYAN_15 }]}>
          <View style={[ss.cardIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
            <Feather name="monitor" size={14} color={CYAN_60} />
          </View>
          <Text style={ss.cardTitle}>Active Sessions</Text>
        </View>
        <View style={ss.cardBody}>
          {sessionsLoading ? (
            <ActivityIndicator color={CYAN} size="small" style={{ paddingVertical: 12 }} />
          ) : !sessions?.length ? (
            <Text style={[ss.rowSub, { paddingVertical: 10, paddingHorizontal: 12, color: CYAN_40 }]}>
              No active sessions
            </Text>
          ) : (
            sessions.map((s: Session, i: number) => (
              <View
                key={s.id}
                style={[ss.sessionRow, { borderColor: CYAN_15 },
                  i < sessions.length - 1 && { borderBottomWidth: 1 }]}>
                <View style={[ss.sessionIcon, { backgroundColor: CYAN_08 }]}>
                  <Feather name="monitor" size={12} color={CYAN_40} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.sessionDevice} numberOfLines={1}>
                    {shortDevice(s.userAgent)}
                  </Text>
                  <Text style={ss.sessionMeta} numberOfLines={1}>
                    {[s.city, s.country].filter(Boolean).join(', ')}{s.city ? ' · ' : ''}{relTime(s.occurredAt)}
                  </Text>
                </View>
                <View style={ss.sessionDot} />
              </View>
            ))
          )}
        </View>
      </View>

      {/* ── Version info ─────────────────────────────────────────────────── */}
      <View style={[ss.card, { backgroundColor: BG_CARD, borderColor: CYAN_25, marginTop: 8 }]}>
        <View style={[ss.cardHeader, { borderBottomColor: CYAN_15 }]}>
          <View style={[ss.cardIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
            <Feather name="info" size={14} color={CYAN_60} />
          </View>
          <Text style={ss.cardTitle}>About</Text>
        </View>
        <View style={ss.cardBody}>
          <View style={[ss.sessionRow, { borderColor: CYAN_15 }]}>
            <Text style={ss.rowSub}>Version</Text>
            <Text style={[ss.rowSub, { color: CYAN_60 }]}>1.0.0</Text>
          </View>
          <View style={[ss.sessionRow, { borderColor: CYAN_15, borderTopWidth: 1 }]}>
            <Text style={ss.rowSub}>Support</Text>
            <Text style={[ss.rowSub, { color: CYAN }]}>@ZeninPortalBot</Text>
          </View>
        </View>
      </View>

      {/* ── Logout button ────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
        style={[ss.logoutBtn,
          { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.10)' }]}>
        {loggingOut ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <>
            <Feather name="log-out" size={14} color="#ef4444" />
            <Text style={ss.logoutText}>SIGN OUT</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  scroll: { padding: 12, gap: 0 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pageIcon:   { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: 15, color: CYAN_85 },
  pageSub:    { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_40, marginTop: 1 },

  helpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1,
    borderRadius: 6, marginBottom: 12,
  },
  helpText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_60 },

  grid: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  col:  { flex: 1, gap: 8 },

  // Card shell
  card:       { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1,
  },
  cardIcon:   { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle:  { fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 0.5, color: CYAN_85, flex: 1 },
  cardBody:   { paddingVertical: 4 },

  // Setting row
  row:      { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, paddingVertical: 7, borderWidth: 0 },
  rowIcon:  { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText:  { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 8, color: CYAN_85 },
  rowSub:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 7, color: CYAN_40, marginTop: 1 },
  rowRight: { flexShrink: 0 },
  toggle:   { transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] },

  activeBadge: {
    paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: 'rgba(0,232,150,0.15)',
    borderWidth: 1, borderColor: 'rgba(0,232,150,0.3)',
    borderRadius: 3,
  },
  activeBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 6,
    color: '#00e896', fontWeight: '700', letterSpacing: 1,
  },

  // Account card
  accountName: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: CYAN_85, paddingHorizontal: 10 },
  accountId:   { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9,  color: CYAN_40, paddingHorizontal: 10, marginTop: 2 },
  roleBadge:   { marginHorizontal: 10, marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  roleText:    { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1, color: CYAN },

  // Device storage
  storageDesc: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: CYAN_40, paddingHorizontal: 12, lineHeight: 14 },
  clearBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 10, paddingVertical: 9, borderRadius: 7, borderWidth: 1 },
  clearBtnText:{ fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 1 },

  // Sessions
  sessionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  sessionIcon:  { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sessionDevice:{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: CYAN_85 },
  sessionMeta:  { fontFamily: 'JetBrainsMono_400Regular', fontSize: 8,  color: CYAN_40, marginTop: 1 },
  sessionDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16, paddingVertical: 13, borderRadius: 8, borderWidth: 1,
  },
  logoutText: { fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 3, color: '#ef4444' },
});
