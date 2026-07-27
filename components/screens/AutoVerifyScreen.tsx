import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function AutoVerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const features = [
    { icon: 'smartphone' as const,  title: 'Device Trigger',    desc: 'Automatically run actions when a device connects or goes offline.' },
    { icon: 'message-square' as const, title: 'SMS Trigger',   desc: 'Trigger workflows from keywords in incoming messages.' },
    { icon: 'check-circle' as const, title: 'OTP Intercept',   desc: 'Route and forward OTP messages to designated endpoints.' },
    { icon: 'zap' as const,          title: 'Auto Forward',     desc: 'Forward SMS to Telegram or webhook URLs automatically.' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.subHeader, { backgroundColor: colors.surface1, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.primary }]}>AUTO VERIFY</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Automated workflows</Text>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: 'rgba(245,166,35,0.1)', borderColor: 'rgba(245,166,35,0.35)' }]}>
          <Feather name="clock" size={12} color="#f5a623" />
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Automate your{'\n'}ZENIN workflows
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Auto Verify lets you create triggers and automated actions based on device events and SMS patterns.
        </Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f.title} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  subHeader:   { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle:   { fontSize: 18, fontFamily: 'Orbitron_700Bold', letterSpacing: 4 },
  pageSub:     { fontSize: 11, letterSpacing: 1, marginTop: 3, fontFamily: 'ShareTechMono_400Regular' },
  body:        { flex: 1, padding: 20, gap: 16 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText:   { fontSize: 9, fontFamily: 'Orbitron_700Bold', letterSpacing: 2, color: '#f5a623' },
  headline:    { fontSize: 26, fontFamily: 'Orbitron_700Bold', lineHeight: 36 },
  sub:         { fontSize: 13, fontFamily: 'Exo2_400Regular', lineHeight: 20, marginBottom: 4 },
  featureList: { gap: 10 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  featureIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle:{ fontSize: 14, fontFamily: 'Exo2_600SemiBold', marginBottom: 3 },
  featureDesc: { fontSize: 12, fontFamily: 'Exo2_400Regular', lineHeight: 17 },
});
