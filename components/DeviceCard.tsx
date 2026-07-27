import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Device } from '@/lib/api';

interface Props {
  device: Device;
  onPress: () => void;
}

export function DeviceCard({ device, onPress }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!device.status) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [device.status, pulse]);

  const batteryColor =
    device.battery == null ? colors.mutedForeground
      : device.battery > 50 ? colors.online
      : device.battery > 20 ? '#f5a623'
      : colors.offline;

  const batteryIcon: React.ComponentProps<typeof Feather>['name'] =
    device.battery == null ? 'battery'
      : device.battery > 80 ? 'battery-charging'
      : device.battery > 50 ? 'battery'
      : device.battery > 20 ? 'battery'
      : 'battery';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Status dot */}
      <View style={styles.statusDotWrap}>
        {device.status && (
          <Animated.View
            style={[
              styles.statusPulse,
              {
                backgroundColor: colors.online,
                transform: [{ scale: pulse }],
                opacity: Animated.subtract(1.2, pulse).interpolate({
                  inputRange: [0, 0.6],
                  outputRange: [0.4, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        )}
        <View
          style={[
            styles.statusDot,
            { backgroundColor: device.status ? colors.online : colors.offline },
          ]}
        />
      </View>

      <View style={styles.body}>
        {/* Name + battery */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {device.name}
          </Text>
          {device.battery != null && (
            <View style={styles.batteryRow}>
              <Feather name={batteryIcon} size={11} color={batteryColor} />
              <Text style={[styles.batteryText, { color: batteryColor }]}>
                {device.battery}%
              </Text>
            </View>
          )}
        </View>

        {/* Phone number */}
        {device.mobNo ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {device.mobNo}
          </Text>
        ) : device.sims?.[0]?.phoneNumber ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {device.sims[0].phoneNumber}
          </Text>
        ) : null}

        {/* Tags */}
        <View style={styles.tags}>
          {device.androidV ? (
            <View style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="smartphone" size={9} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                Android {device.androidV}
              </Text>
            </View>
          ) : null}
          {device.storage ? (
            <View style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="database" size={9} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                {device.storage}
              </Text>
            </View>
          ) : null}
          {device.isRoot && (
            <View style={[styles.tag, { backgroundColor: 'rgba(245,166,35,0.1)', borderColor: 'rgba(245,166,35,0.3)' }]}>
              <Text style={[styles.tagText, { color: '#f5a623' }]}>ROOTED</Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusPulse: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    fontFamily: 'Exo2_600SemiBold',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  batteryText: {
    fontSize: 11,
    fontFamily: 'ShareTechMono_400Regular',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'ShareTechMono_400Regular',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: 'Exo2_500Medium',
  },
});
