/**
 * useDeviceStream — real-time SSE hook for ZENIN mobile.
 *
 * Connects to GET /api/events?token=... and patches React Query caches
 * in-place without triggering a network refetch.
 *
 * Handles:
 *   device_update  → updates the devices query cache entry immediately
 *   new_sms        → prepends new messages to messages-all cache
 *
 * Uses fetch() + ReadableStream reader (no EventSource; not available in RN).
 * Auto-reconnects with exponential back-off on any error.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';

// ── Types matching the server's NormalizedDevice / NormalizedSms ──────────────
interface StreamDevice {
  id: string;
  panelId: string;
  name: string;
  status: boolean;
  battery: number | null;
  batteryRaw: string;
  mobNo: string;
  lastSeen: number;
  [key: string]: unknown;
}

interface StreamSms {
  key: string;
  message: string;
  sender: string;
  dateTime: string;
  type: 'incoming' | 'outgoing';
  ts: number;
}

type SseEvent =
  | { type: 'device_update'; panelId: string; device: StreamDevice }
  | { type: 'new_sms'; panelId: string; deviceId: string; messages: StreamSms[] }
  | { type: string; [key: string]: unknown };

// ── Base URL (same as api.ts) ─────────────────────────────────────────────────
const RAILWAY_DOMAIN = 'api-server-production-5907.up.railway.app';
function getBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? RAILWAY_DOMAIN;
  const proto  = domain.includes('localhost') ? 'http' : 'https';
  return `${proto}://${domain}/api`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDeviceStream() {
  const { token } = useAuth();
  const queryClient  = useQueryClient();
  const abortRef     = useRef<AbortController | null>(null);
  const tokenRef     = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    tokenRef.current = token;

    const controller = new AbortController();
    abortRef.current = controller;

    let backoff = 2_000;

    async function connect() {
      const url = `${getBase()}/events?token=${encodeURIComponent(token!)}`;

      while (!controller.signal.aborted) {
        try {
          const res = await fetch(url, {
            headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            await sleep(backoff);
            backoff = Math.min(backoff * 2, 30_000);
            continue;
          }

          backoff = 2_000; // reset on successful connect

          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          let buf     = '';
          let dataStr = '';

          try {
            while (!controller.signal.aborted) {
              const { done, value } = await reader.read();
              if (done) break;

              buf += decoder.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop() ?? '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  dataStr = line.slice(6);
                } else if (line === '' && dataStr) {
                  try {
                    const event = JSON.parse(dataStr) as SseEvent;
                    handleEvent(event, queryClient, token!);
                  } catch {
                    // ignore malformed JSON
                  }
                  dataStr = '';
                } else if (line.startsWith(':')) {
                  dataStr = ''; // comment / heartbeat — reset
                }
              }
            }
          } finally {
            reader.cancel().catch(() => {});
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          await sleep(backoff);
          backoff = Math.min(backoff * 2, 30_000);
        }
      }
    }

    connect().catch(() => {});

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [token, queryClient]);
}

// ── Event handler ─────────────────────────────────────────────────────────────
function handleEvent(
  event: SseEvent,
  queryClient: ReturnType<typeof useQueryClient>,
  token: string,
): void {
  switch (event.type) {
    case 'device_update': {
      const { device, panelId } = event as Extract<SseEvent, { type: 'device_update' }>;

      // Patch the 'devices' snapshot cache in-place
      queryClient.setQueryData(
        ['devices', token],
        (old: { devices: StreamDevice[]; summary?: unknown } | undefined) => {
          if (!old) return old;
          const devices = old.devices ?? [];
          const idx = devices.findIndex(
            (d) => d.id === device.id && d.panelId === device.panelId,
          );
          if (idx === -1) {
            // New device appeared — prepend
            return { ...old, devices: [device, ...devices] };
          }
          const updated = [...devices];
          updated[idx] = { ...devices[idx], ...device };
          return { ...old, devices: updated };
        },
      );
      break;
    }

    case 'new_sms': {
      const { deviceId, panelId, messages: newMsgs } =
        event as Extract<SseEvent, { type: 'new_sms' }>;
      if (!newMsgs?.length) return;

      // ── messages-all: prepend to every matching query cache ────────────
      // setQueriesData matches by prefix — covers any deviceId combination
      queryClient.setQueriesData<
        Array<{ sms: StreamSms; device: StreamDevice }>
      >(
        { queryKey: ['messages-all'] },
        (old) => {
          if (!old || !Array.isArray(old)) return old;

          // Find device object from the devices cache
          const devData = queryClient.getQueryData<{
            devices: StreamDevice[];
          }>(['devices', token]);
          const device = devData?.devices?.find(
            (d) => d.id === deviceId && d.panelId === panelId,
          );
          if (!device) return old; // device not in this user's list

          // Only scan recent items for duplicates — incoming SMS are always
          // the newest so a 100-item window is sufficient and avoids O(n)
          // iteration over the full (potentially large) history on every event.
          const scanWindow = old.length > 100 ? old.slice(0, 100) : old;
          const existingKeys = new Set(scanWindow.map((item) => item.sms.key));
          const fresh = newMsgs
            .filter((m) => !existingKeys.has(m.key))
            .map((m) => ({ sms: m, device }));
          if (!fresh.length) return old;

          // No re-sort needed: fresh items carry the highest ts values and
          // old is already sorted newest-first, so prepending preserves order.
          return [...fresh, ...old];
        },
      );

      // ── per-device SMS caches (device detail screen) ───────────────────
      queryClient.setQueryData(
        ['sms', token, deviceId, panelId],
        (old: StreamSms[] | undefined) => {
          if (!old) return old;
          const existingKeys = new Set(old.map((m) => m.key));
          const fresh = newMsgs.filter((m) => !existingKeys.has(m.key));
          if (!fresh.length) return old;
          return [...fresh, ...old];
        },
      );
      break;
    }

    default:
      break;
  }
}
