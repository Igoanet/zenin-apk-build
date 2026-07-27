import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/auth';
import { apiGetDeviceSms, apiSendSms, type SmsMessage } from '@/lib/api';
import { SmsItem } from '@/components/SmsItem';

type SimSlot = 1 | 2;

export default function DeviceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id, panelId, name } = useLocalSearchParams<{ id: string; panelId: string; name: string }>();

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sim, setSim] = useState<SimSlot>(1);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const recipientRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['sms', id, panelId, token],
    queryFn: () => apiGetDeviceSms(id!, panelId!, token!, 150),
    enabled: !!token && !!id && !!panelId,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const messages = data ?? [];
  // Reverse for inverted FlatList (newest at bottom visually)
  const reversed = [...messages].reverse();

  const handleSend = useCallback(async () => {
    const to = recipient.trim();
    const body = message.trim();
    if (!to || !body) {
      setSendError('Enter recipient and message.');
      return;
    }
    setSendError(null);
    setSending(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const r = await apiSendSms(id!, panelId!, to, body, sim, token!);
    setSending(false);
    if (r.ok) {
      setRecipient('');
      setMessage('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    } else {
      setSendError(r.error ?? 'Failed to send');
    }
  }, [id, panelId, token, recipient, message, sim, refetch]);

  const renderItem = useCallback(
    ({ item }: { item: SmsMessage }) => <SmsItem sms={item} />,
    [],
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.surface1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.headerBody}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {name ?? id}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {messages.length} messages
          </Text>
        </View>
        {isFetching && !isLoading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* SMS list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            LOADING SMS...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.offline} />
          <Text style={[styles.errorText, { color: colors.offline }]}>Failed to load SMS</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
            <Text style={[styles.retryText, { color: colors.primary }]}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reversed}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-square" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No messages yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Send form */}
      <View
        style={[
          styles.sendPanel,
          {
            backgroundColor: colors.surface1,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
          },
        ]}
      >
        {sendError && (
          <Text style={[styles.sendError, { color: colors.offline }]}>{sendError}</Text>
        )}
        {/* SIM selector */}
        <View style={styles.simRow}>
          <Text style={[styles.simLabel, { color: colors.mutedForeground }]}>SIM</Text>
          {([1, 2] as SimSlot[]).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSim(s)}
              style={[
                styles.simBtn,
                {
                  backgroundColor: sim === s ? 'rgba(0,212,255,0.15)' : colors.muted,
                  borderColor: sim === s ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.simBtnText, { color: sim === s ? colors.primary : colors.mutedForeground }]}>
                SIM {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          ref={recipientRef}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Phone number"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => messageRef.current?.focus()}
        />
        <View style={styles.messageRow}>
          <TextInput
            ref={messageRef}
            style={[
              styles.input,
              styles.messageInput,
              { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground, flex: 1 },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="send" size={18} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerBody: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: 'Inter_500Medium',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
  },
  list: {
    paddingVertical: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sendPanel: {
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  sendError: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'Inter_500Medium',
  },
  simBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
