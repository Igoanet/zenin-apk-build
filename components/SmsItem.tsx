import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { SmsMessage } from '@/lib/api';

interface Props {
  sms: SmsMessage;
  showDevice?: string;
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const diffD = Math.floor(diffMs / 86400000);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SmsItem({ sms, showDevice }: Props) {
  const colors = useColors();
  const isOut = sms.type === 'outgoing';

  return (
    <View
      style={[
        styles.container,
        isOut ? styles.containerOut : styles.containerIn,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOut ? 'rgba(0,212,255,0.1)' : colors.card,
            borderColor: isOut ? 'rgba(0,212,255,0.2)' : colors.border,
            alignSelf: isOut ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {/* Sender row */}
        {!isOut && (
          <View style={styles.senderRow}>
            <Feather name="user" size={10} color={colors.primary} />
            <Text style={[styles.sender, { color: colors.primary }]} numberOfLines={1}>
              {sms.sender}
            </Text>
          </View>
        )}
        {showDevice && (
          <View style={styles.senderRow}>
            <Feather name="smartphone" size={9} color={colors.mutedForeground} />
            <Text style={[styles.deviceLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
              {showDevice}
            </Text>
          </View>
        )}
        <Text style={[styles.body, { color: colors.foreground }]}>{sms.message}</Text>
        <View style={styles.timeRow}>
          {isOut && (
            <Feather name="send" size={9} color={colors.mutedForeground} />
          )}
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {fmtTime(sms.ts)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: 12,
  },
  containerIn: {
    alignItems: 'flex-start',
  },
  containerOut: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sender: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'Exo2_600SemiBold',
    letterSpacing: 0.3,
  },
  deviceLabel: {
    fontSize: 9,
    fontFamily: 'Exo2_400Regular',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Exo2_400Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 10,
    fontFamily: 'ShareTechMono_400Regular',
  },
});
