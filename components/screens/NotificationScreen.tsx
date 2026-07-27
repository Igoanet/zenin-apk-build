import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function NotificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.subHeader, { backgroundColor: colors.surface1, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.primary }]}>NOTIFICATIONS</Text>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="bell" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No notifications</Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Real-time alerts from your devices will appear here when activity is detected.
        </Text>

        {/* Info tiles */}
        <View style={styles.tiles}>
          {[
            { icon: 'smartphone' as const, label: 'Device alerts', sub: 'Online / offline changes' },
            { icon: 'message-square' as const, label: 'SMS events',    sub: 'Incoming messages'         },
            { icon: 'shield' as const,        label: 'Security',        sub: 'Login & session alerts'    },
          ].map((t) => (
            <View key={t.label} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tileIcon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name={t.icon} size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.tileName, { color: colors.foreground }]}>{t.label}</Text>
              <Text style={[styles.tileSub, { color: colors.mutedForeground }]}>{t.sub}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  subHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle: { fontSize: 18, fontFamily: 'Orbitron_700Bold', letterSpacing: 4 },
  body:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  iconWrap:  { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:{ fontSize: 16, fontFamily: 'Exo2_600SemiBold', marginBottom: 4 },
  emptyBody: { fontSize: 13, fontFamily: 'Exo2_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 16, maxWidth: 280 },
  tiles:     { flexDirection: 'row', gap: 8, width: '100%' },
  tile:      { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  tileIcon:  { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileName:  { fontSize: 10, fontFamily: 'Exo2_600SemiBold', textAlign: 'center' },
  tileSub:   { fontSize: 9, fontFamily: 'Exo2_400Regular', textAlign: 'center', lineHeight: 13 },
});
