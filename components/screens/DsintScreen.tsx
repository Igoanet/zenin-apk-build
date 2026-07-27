import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/auth';
import { apiGetDevices } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function DsintScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const devicesQ = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    staleTime: 60_000,
  });

  const devices = devicesQ.data?.devices ?? [];
  const q = query.trim().toLowerCase();
  const results = q.length >= 3
    ? devices.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.mobNo.toLowerCase().includes(q) ||
        d.ipAddress.toLowerCase().includes(q) ||
        d.sims.some((s) => s.phoneNumber.toLowerCase().includes(q)),
      )
    : [];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.subHeader, { backgroundColor: colors.surface1, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.primary }]}>DSINT</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Device & identity lookup</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={[styles.searchWrap, { borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.card }]}>
          <Feather name="search" size={16} color={focused ? colors.primary : colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Phone, IP, or device name..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {q.length > 0 && q.length < 3 && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Type at least 3 characters to search</Text>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>
            {results.map((d) => (
              <View key={`${d.panelId}:${d.id}`} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.resultHeader}>
                  <View style={[styles.statusDot, { backgroundColor: d.status ? colors.online : colors.offline }]} />
                  <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>{d.name}</Text>
                </View>
                {[
                  { label: 'PHONE',      value: d.mobNo,      icon: 'phone' as const },
                  { label: 'IP',         value: d.ipAddress,  icon: 'wifi' as const },
                  { label: 'ANDROID',    value: d.androidV,   icon: 'smartphone' as const },
                  { label: 'PROVIDER',   value: d.serviceProvider, icon: 'radio' as const },
                ].filter((r) => r.value && r.value !== '—').map((r) => (
                  <View key={r.label} style={styles.resultRow}>
                    <Feather name={r.icon} size={10} color={colors.mutedForeground} />
                    <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                    <Text style={[styles.resultValue, { color: colors.primary }]}>{r.value}</Text>
                  </View>
                ))}
                {d.sims.map((s, i) => (
                  <View key={i} style={styles.resultRow}>
                    <Feather name="credit-card" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>SIM {i + 1}</Text>
                    <Text style={[styles.resultValue, { color: colors.primary }]}>{s.phoneNumber} · {s.carrierName}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {q.length >= 3 && results.length === 0 && (
          <View style={styles.noResults}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>No matches found</Text>
          </View>
        )}

        {q.length === 0 && (
          <View style={styles.infoGrid}>
            {[
              { icon: 'phone' as const,      label: 'Phone Lookup',   sub: 'Search by mobile number'  },
              { icon: 'wifi' as const,        label: 'IP Lookup',      sub: 'Find device by IP address' },
              { icon: 'smartphone' as const,  label: 'Device Search',  sub: 'Search by model name'     },
              { icon: 'radio' as const,       label: 'Carrier Search', sub: 'Find by network provider'  },
            ].map((t) => (
              <View key={t.label} style={[styles.infoTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.infoTileIcon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name={t.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.infoTileLabel, { color: colors.foreground }]}>{t.label}</Text>
                <Text style={[styles.infoTileSub, { color: colors.mutedForeground }]}>{t.sub}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  subHeader:  { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle:  { fontSize: 18, fontFamily: 'Orbitron_700Bold', letterSpacing: 4 },
  pageSub:    { fontSize: 11, letterSpacing: 1, marginTop: 3, fontFamily: 'ShareTechMono_400Regular' },
  body:       { padding: 14, gap: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  searchInput:{ flex: 1, fontSize: 14, fontFamily: 'Exo2_400Regular', padding: 0 },
  hint:       { fontSize: 11, fontFamily: 'ShareTechMono_400Regular', textAlign: 'center', marginTop: 4 },
  resultCount:{ fontSize: 10, fontFamily: 'ShareTechMono_400Regular', letterSpacing: 2, marginBottom: 4 },
  resultCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  resultHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  resultName: { fontSize: 15, fontFamily: 'Exo2_600SemiBold', flex: 1 },
  resultRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultLabel:{ fontSize: 10, fontFamily: 'ShareTechMono_400Regular', letterSpacing: 2, width: 70 },
  resultValue:{ fontSize: 12, fontFamily: 'ShareTechMono_400Regular', flex: 1 },
  noResults:  { alignItems: 'center', paddingTop: 40, gap: 10 },
  noResultsText: { fontSize: 14, fontFamily: 'Exo2_400Regular' },
  infoGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoTile:   { width: '48%', padding: 14, borderRadius: 10, borderWidth: 1, gap: 6, alignItems: 'flex-start' },
  infoTileIcon:{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoTileLabel:{ fontSize: 12, fontFamily: 'Exo2_600SemiBold' },
  infoTileSub: { fontSize: 10, fontFamily: 'Exo2_400Regular', lineHeight: 14 },
});
