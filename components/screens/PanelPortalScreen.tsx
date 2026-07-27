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
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/auth';
import { apiGetPanelConfigs, apiGetDevices, type PanelConfig } from '@/lib/api';

export function PanelPortalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const configsQ = useQuery({
    queryKey: ['panel-configs', token],
    queryFn: () => apiGetPanelConfigs(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const devicesQ = useQuery({
    queryKey: ['devices', token],
    queryFn: () => apiGetDevices(token!),
    enabled: !!token,
    staleTime: 30_000,
  });

  const configs  = configsQ.data ?? [];
  const devices  = devicesQ.data?.devices ?? [];
  const isLoading = configsQ.isLoading;

  const enriched = configs.map((c: PanelConfig) => {
    const panelDevices = devices.filter((d) => d.panelId === c.id);
    const online = panelDevices.filter((d) => d.status).length;
    return { ...c, total: panelDevices.length, online };
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.subHeader, { backgroundColor: colors.surface1, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.primary }]}>PANEL PORTAL</Text>
        {!isLoading && (
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            {configs.length} panel{configs.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={enriched}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="globe" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cardUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.firebaseUrl.replace('https://', '')}
                  </Text>
                </View>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: item.isActive ? 'rgba(0,212,170,0.12)' : 'rgba(255,107,107,0.1)', borderColor: item.isActive ? 'rgba(0,212,170,0.4)' : 'rgba(255,107,107,0.3)' },
                ]}>
                  <Text style={[styles.statusText, { color: item.isActive ? colors.online : colors.offline }]}>
                    {item.isActive ? 'LIVE' : 'OFF'}
                  </Text>
                </View>
              </View>
              <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{item.total}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>DEVICES</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.online }]}>{item.online}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>ONLINE</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: colors.offline }]}>{item.total - item.online}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>OFFLINE</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="globe" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No panels</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Go to Panel Linked to connect your Firebase database.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  subHeader:  { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle:  { fontSize: 18, fontFamily: 'Orbitron_700Bold', letterSpacing: 4 },
  pageSub:    { fontSize: 11, letterSpacing: 1, marginTop: 3, fontFamily: 'ShareTechMono_400Regular' },
  list:       { padding: 14, gap: 12 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:       { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardIcon:   { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardName:   { fontSize: 15, fontFamily: 'Exo2_600SemiBold', marginBottom: 3 },
  cardUrl:    { fontSize: 10, fontFamily: 'ShareTechMono_400Regular' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 9, fontFamily: 'Orbitron_700Bold', letterSpacing: 1 },
  cardStats:  { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10 },
  stat:       { flex: 1, alignItems: 'center', gap: 2 },
  statNum:    { fontSize: 22, fontFamily: 'Orbitron_700Bold' },
  statLabel:  { fontSize: 8, fontFamily: 'ShareTechMono_400Regular', letterSpacing: 2 },
  statDivider:{ width: 1 },
  empty:      { alignItems: 'center', paddingTop: 70, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 15, fontFamily: 'Exo2_600SemiBold', marginTop: 8 },
  emptyBody:  { fontSize: 13, fontFamily: 'Exo2_400Regular', textAlign: 'center', lineHeight: 20 },
});
