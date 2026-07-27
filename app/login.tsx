// ─────────────────────────────────────────────────────────────────────────────
// ZENIN — Login screen
// Pixel-exact replica of the web dashboard login (artifacts/zenin) at phone
// width: same colors (#00e8d8), same fonts (Orbitron + JetBrains Mono), same
// spacing, same octagonal ACCESS TERMINAL frame, starfield + nebula background.
// All shapes are drawn with react-native-svg polygons (hex fill + fillOpacity —
// rgba strings / url(#grad) fills silently fail on Android).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';
import LoginBackground from '@/components/LoginBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import {
  apiLogin,
  apiVerifyOtp,
  apiEvictAndLogin,
  type LoginCapacitySession,
  type ZeninUser,
} from '@/lib/api';

// ─── Design tokens — exact copy of the web login ───────────────────────────
const CYAN     = '#00e8d8';
const CYAN_100 = 'rgba(0,232,216,1)';
const CYAN_85  = 'rgba(0,232,216,0.85)';
const CYAN_60  = 'rgba(0,232,216,0.6)';
const CYAN_40  = 'rgba(0,232,216,0.4)';
const CYAN_35  = 'rgba(0,232,216,0.35)';
const CYAN_25  = 'rgba(0,232,216,0.25)';
const CYAN_18  = 'rgba(0,232,216,0.18)';
const BG       = '#000508';

const ORBITRON_BLACK = 'Orbitron_900Black';
const ORBITRON_BOLD  = 'Orbitron_700Bold';
const MONO           = 'JetBrainsMono_400Regular';
const MONO_BOLD      = 'JetBrainsMono_700Bold';

// ─── Octagon helpers ────────────────────────────────────────────────────────
/** Octagon points for a w×h box with `cut` corners, offset by `o` (SVG bleed). */
function octPts(w: number, h: number, cut: number, o = 0): string {
  return [
    `${o + cut},${o}`,
    `${o + w - cut},${o}`,
    `${o + w},${o + cut}`,
    `${o + w},${o + h - cut}`,
    `${o + w - cut},${o + h}`,
    `${o + cut},${o + h}`,
    `${o},${o + h - cut}`,
    `${o},${o + cut}`,
  ].join(' ');
}

interface GlowLayer { w: number; o: number }

/**
 * Smooth glow — replica of a CSS `box-shadow: 0 0 Npx` blur: concentric 1px
 * strokes whose cumulative opacity follows exp(-d/sigma). 1px steps mean no
 * visible banding/rings (wide stroke bands showed as circles on device).
 */
function smoothGlow(peak: number, sigma: number, extent: number): GlowLayer[] {
  const P = (d: number) => peak * Math.exp(-d / sigma);
  return Array.from({ length: extent }, (_, i) => ({
    w: (i + 1) * 2,
    o: P(i) - P(i + 1),
  }));
}

/**
 * Generic octagonal shape: measures itself, then draws glow strokes, fill and
 * border as SVG polygons behind its children. Works identically on Android,
 * iOS and web.
 */
function OctShape({
  cut,
  fill,
  fillOpacity = 1,
  stroke,
  strokeOpacity = 1,
  strokeWidth = 2,
  glow,
  glowColor = CYAN,
  style,
  contentStyle,
  children,
}: {
  cut: number;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  glow?: GlowLayer[];
  glowColor?: string;
  style?: object;
  contentStyle?: object;
  children: React.ReactNode;
}) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  // svg bleed so glow strokes aren't clipped
  const B = glow ? Math.ceil(Math.max(...glow.map((g) => g.w)) / 2) + 4 : 4;

  return (
    <View
      style={[{ position: 'relative' }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!width || !height) return;
        const w = Math.round(width);
        const h = Math.round(height);
        setDims((d) => (d && d.w === w && d.h === h ? d : { w, h }));
      }}
    >
      {dims && (
        <Svg
          pointerEvents="none"
          style={{ position: 'absolute', top: -B, left: -B }}
          width={dims.w + B * 2}
          height={dims.h + B * 2}
        >
          {glow?.map((g, i) => (
            <Polygon
              key={`g${i}`}
              points={octPts(dims.w, dims.h, cut, B)}
              fill="none"
              stroke={glowColor}
              strokeOpacity={g.o}
              strokeWidth={g.w}
            />
          ))}
          <Polygon
            points={octPts(dims.w, dims.h, cut, B)}
            fill={fill ?? 'none'}
            fillOpacity={fill ? fillOpacity : 0}
            stroke={stroke}
            strokeOpacity={stroke ? strokeOpacity : 0}
            strokeWidth={stroke ? strokeWidth : 0}
          />
        </Svg>
      )}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

// ─── 135° gradient approximation (web linear-gradient(135deg, …)) ───────────
// Android react-native-svg can't render gradient strokes (url(#) fails
// silently), so the frame border is drawn as short collinear line segments
// whose opacity follows the web gradient. CSS 135deg projection: t=(x+y)/(w+h).
type GradStop = readonly [number, number]; // [t, alpha]

function gradAt(stops: readonly GradStop[], t: number): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, a0] = stops[i - 1];
      const [t1, a1] = stops[i];
      return a0 + ((t - t0) / (t1 - t0)) * (a1 - a0);
    }
  }
  return stops[stops.length - 1][1];
}

interface OctSeg { x1: number; y1: number; x2: number; y2: number; t: number }

/** Split an octagon outline into ~step-px segments with midpoint t along 135°. */
function octSegments(w: number, h: number, cut: number, o: number, step = 16): OctSeg[] {
  const pts: [number, number][] = [
    [o + cut, o], [o + w - cut, o], [o + w, o + cut], [o + w, o + h - cut],
    [o + w - cut, o + h], [o + cut, o + h], [o, o + h - cut], [o, o + cut],
  ];
  const segs: OctSeg[] = [];
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 8];
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let k = 0; k < n; k++) {
      const sx = x1 + ((x2 - x1) * k) / n;
      const sy = y1 + ((y2 - y1) * k) / n;
      const ex = x1 + ((x2 - x1) * (k + 1)) / n;
      const ey = y1 + ((y2 - y1) * (k + 1)) / n;
      segs.push({
        x1: sx, y1: sy, x2: ex, y2: ey,
        t: ((sx + ex) / 2 - o + ((sy + ey) / 2 - o)) / (w + h),
      });
    }
  }
  return segs;
}

/**
 * Web corner accents: four 24px bars (CYAN→transparent) at the inner panel's
 * corners, clipped by its 19px octagon cut — what survives is a faint 6px
 * tick fading away from each corner cut. Alphas are the exact web gradient
 * values at 2px sub-segment midpoints: 1 - d/24 for d = 19, 21, 23.
 */
function FrameCornerTicks({ w, h, o }: { w: number; h: number; o: number }) {
  const steps: readonly (readonly [number, number, number])[] = [
    [20, 22, 0.208], [22, 24, 0.125], [24, 26, 0.042],
  ];
  const lines: React.ReactElement[] = [];
  steps.forEach(([from, to, a], i) => {
    const common = { stroke: CYAN, strokeOpacity: a, strokeWidth: 2 };
    lines.push(
      // top-left: along top edge →, along left edge ↓
      <Line key={`tlh${i}`} x1={o + from} y1={o + 3} x2={o + to} y2={o + 3} {...common} />,
      <Line key={`tlv${i}`} x1={o + 3} y1={o + from} x2={o + 3} y2={o + to} {...common} />,
      // top-right
      <Line key={`trh${i}`} x1={o + w - from} y1={o + 3} x2={o + w - to} y2={o + 3} {...common} />,
      <Line key={`trv${i}`} x1={o + w - 3} y1={o + from} x2={o + w - 3} y2={o + to} {...common} />,
      // bottom-left
      <Line key={`blh${i}`} x1={o + from} y1={o + h - 3} x2={o + to} y2={o + h - 3} {...common} />,
      <Line key={`blv${i}`} x1={o + 3} y1={o + h - from} x2={o + 3} y2={o + h - to} {...common} />,
      // bottom-right
      <Line key={`brh${i}`} x1={o + w - from} y1={o + h - 3} x2={o + w - to} y2={o + h - 3} {...common} />,
      <Line key={`brv${i}`} x1={o + w - 3} y1={o + h - from} x2={o + w - 3} y2={o + h - to} {...common} />,
    );
  });
  return <>{lines}</>;
}

// LoginBackground is imported from @/components/LoginBackground (platform-aware).

// ─── ACCESS TERMINAL frame — exact port of the web LinkBoxFrame ─────────────
// Web layers: (1) halo behind the box: 135° gradient CYAN.4 → transparent
// 30-70% → CYAN.4 at 50% opacity, blur 15px — visible only near the TL and BR
// corners; (2) 2px border band: linear-gradient(135deg, CYAN.6, CYAN.35 20%,
// CYAN.18 50%, CYAN.35 80%, CYAN.6) clipped to a 20px-cut octagon; (3) navy
// panel (180° 0.95→0.98 — solid mid blend here) with 19px cuts; (4) corner
// accent bars reduced to faint ticks by the clip (FrameCornerTicks).
const FRAME_CUT = 20;
const FRAME_BORDER_STOPS: readonly GradStop[] = [
  [0, 0.6], [0.2, 0.35], [0.5, 0.18], [0.8, 0.35], [1, 0.6],
];
// (The web's blurred corner halo is omitted: Android SVG can't blur, and any
// ring/circle approximation reads as visible circles on the clean background.)
const FRAME_BLEED = 8; // svg bleed so the 2px border stroke isn't clipped

function TerminalFrame({ children }: { children: React.ReactNode }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const B = FRAME_BLEED;

  // The 2px border band sits just inside the outer octagon (web p-[2px]):
  // segments run along a 1px-inset path so the stroke covers [0..2px].
  const borderSegs = useMemo(
    () => (dims ? octSegments(dims.w - 2, dims.h - 2, FRAME_CUT - 0.5, B + 1) : []),
    [dims],
  );

  return (
    <View
      style={{ position: 'relative', width: '100%' }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!width || !height) return;
        const w = Math.round(width);
        const h = Math.round(height);
        setDims((d) => (d && d.w === w && d.h === h ? d : { w, h }));
      }}
    >
      {dims && (
        <Svg
          pointerEvents="none"
          style={{ position: 'absolute', top: -B, left: -B }}
          width={dims.w + B * 2}
          height={dims.h + B * 2}
        >
          {/* (3) panel fill — web: linear-gradient(180deg, rgba(3,15,35,0.95) 0%, rgba(2,10,25,0.98) 100%).
              SVG Polygon can't do gradients on Android so we use the top-of-gradient colour at 0.95 opacity. */}
          <Polygon
            points={octPts(dims.w, dims.h, FRAME_CUT, B)}
            fill="#030f23"
            fillOpacity={0.95}
          />
          {/* (2) 2px gradient border — bright at TL/BR, 0.18 mid-edge */}
          {borderSegs.map((s, i) => (
            <Line
              key={`b${i}`}
              x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={CYAN}
              strokeOpacity={gradAt(FRAME_BORDER_STOPS, s.t)}
              strokeWidth={2}
            />
          ))}
          {/* (4) clipped corner accent ticks */}
          <FrameCornerTicks w={dims.w} h={dims.h} o={B} />
        </Svg>
      )}
      <View style={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 12, minHeight: 360 }}>
        {children}
      </View>
    </View>
  );
}

// ─── Octagonal buttons (8px cuts, like web clip-path buttons) ───────────────
// SIGN IN web glow: box-shadow 0 0 20px CYAN_60, 0 0 40px CYAN_35
const SIGNIN_GLOW = smoothGlow(0.38, 11, 30);
// Contact Support web halo: blur(8px) 135° gradient at 0.4 opacity — subtle
const SUPPORT_GLOW = smoothGlow(0.14, 5, 12);

function OctButton({
  label,
  onPress,
  disabled,
  fill,
  fillOpacity = 1,
  textColor,
  glow,
  fullWidth,
  letterSpacing = 4,
  mt,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fill: string;
  fillOpacity?: number;
  textColor: string;
  glow?: GlowLayer[];
  fullWidth?: boolean;
  letterSpacing?: number;
  mt?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{ marginTop: mt, alignSelf: fullWidth ? 'stretch' : 'center' }}
    >
      <OctShape
        cut={8}
        fill={fill}
        fillOpacity={fillOpacity}
        glow={disabled ? undefined : glow}
        contentStyle={{
          paddingVertical: 12,
          paddingHorizontal: fullWidth ? 0 : 56,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: ORBITRON_BLACK,
            fontSize: 14,
            lineHeight: 20, // web text-sm = 14px/20px → button height 44
            letterSpacing,
            color: textColor,
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
      </OctShape>
    </TouchableOpacity>
  );
}

// ─── Input field — exact web InputField ─────────────────────────────────────
function InputField({
  icon,
  label,
  value,
  onChange,
  secure,
  placeholder,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  mt,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder: string;
  autoComplete?: TextInput['props']['autoComplete'];
  returnKeyType?: TextInput['props']['returnKeyType'];
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  mt?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12, marginTop: mt }}>
      {/* label row — gap-2 mb-1.5 ml-1 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5, marginLeft: 4 }}>
        <Feather name={icon} size={16} color={CYAN} />
        <Text
          style={[
            {
              fontFamily: MONO_BOLD,
              fontSize: 12,
              letterSpacing: 4,
              color: CYAN_100,
              includeFontPadding: false,
            },
            Platform.select({
              web: { textShadow: `0 0 6px ${CYAN_60}` } as object,
              default: {
                textShadowColor: CYAN_60,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 6,
              },
            }),
          ]}
        >
          {label}
        </Text>
      </View>
      <TextInput
        ref={inputRef}
        style={[
          {
            fontFamily: MONO,
            fontSize: 14,
            color: CYAN_100,
            paddingHorizontal: 16,
            paddingVertical: 12,
            letterSpacing: 0.5,
            borderWidth: 1,
            borderColor: focused ? CYAN_60 : 'rgba(0,180,200,0.25)',
            backgroundColor: focused ? 'rgba(0,40,80,0.6)' : 'rgba(0,30,60,0.5)',
          },
          Platform.OS === 'web' ? ({ outline: 'none' } as object) : null,
        ]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType ?? 'next'}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="rgba(148,163,184,0.65)"
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={CYAN}
      />
    </View>
  );
}

// ─── OTP input — 6 boxes 42×52, gap 8 ───────────────────────────────────────
function OtpInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  const focusAt = (i: number) => refs.current[i]?.focus();
  useEffect(() => {
    const t = setTimeout(() => focusAt(0), 350);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (i: number, v: string) => {
    const c = v.replace(/\D/g, '');
    if (!c) return;
    if (c.length > 1) {
      const d = c.slice(0, 6);
      onChange(d);
      focusAt(Math.min(d.length, 5));
      if (d.length === 6) onComplete(d);
      return;
    }
    const nv = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, 6);
    onChange(nv);
    if (i < 5) focusAt(i + 1);
    else if (nv.length === 6) onComplete(nv);
  };

  const handleKey = (i: number, key: string) => {
    if (key !== 'Backspace') return;
    if (chars[i] !== '') onChange(value.slice(0, i) + value.slice(i + 1));
    else if (i > 0) {
      onChange(value.slice(0, i - 1) + value.slice(i));
      focusAt(i - 1);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {chars.map((char, i) => (
        <TextInput
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          style={{
            width: 42,
            height: 52,
            fontFamily: MONO_BOLD,
            fontSize: 20,
            color: CYAN_100,
            textAlign: 'center',
            textAlignVertical: 'center',
            padding: 0,
            includeFontPadding: false,
            borderWidth: 1,
            borderColor: char ? CYAN_60 : 'rgba(0,180,200,0.25)',
            backgroundColor: char ? 'rgba(0,50,90,0.7)' : 'rgba(0,30,60,0.5)',
            ...(Platform.OS === 'web' ? ({ outline: 'none', caretColor: CYAN } as object) : null),
          }}
          value={char}
          onChangeText={(v) => handleChange(i, v)}
          onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={6}
          selectTextOnFocus
          selectionColor={CYAN}
          autoComplete={i === 0 ? 'sms-otp' : undefined}
          textContentType={i === 0 ? 'oneTimeCode' : undefined}
        />
      ))}
    </View>
  );
}

// ─── Session eviction card ──────────────────────────────────────────────────
function shortDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  let os = 'Unknown';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let browser = '';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  return browser ? `${browser} · ${os}` : os;
}

function formatLocation(s: LoginCapacitySession): string {
  const parts = [s.city, s.region, s.country].filter(Boolean) as string[];
  if (parts.length === 0) return s.ip ?? 'Unknown location';
  return parts.join(', ');
}

function relTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function SessionCard({
  s,
  selected,
  onSelect,
}: {
  s: LoginCapacitySession;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        gap: 6,
        padding: 12,
        backgroundColor: selected ? 'rgba(248,113,113,0.1)' : 'rgba(0,30,60,0.5)',
        borderWidth: 1,
        borderColor: selected ? 'rgba(248,113,113,0.5)' : CYAN_25,
        borderRadius: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <Feather name="monitor" size={11} color={selected ? '#f87171' : CYAN_60} />
          <Text style={{ fontFamily: MONO_BOLD, fontSize: 11, color: selected ? '#f87171' : CYAN_85 }}>
            {shortDevice(s.userAgent)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            backgroundColor: selected ? 'rgba(248,113,113,0.15)' : 'rgba(0,232,216,0.08)',
            borderWidth: 1,
            borderColor: selected ? 'rgba(248,113,113,0.4)' : CYAN_25,
          }}
        >
          <Text style={{ fontFamily: MONO_BOLD, fontSize: 8, letterSpacing: 0.8, color: selected ? '#f87171' : CYAN_60 }}>
            {selected ? 'WILL LOGOUT' : 'SELECT'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="clock" size={9} color={CYAN_40} />
        <Text style={{ fontFamily: MONO, fontSize: 9, color: CYAN_40 }}>{relTime(s.occurredAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="globe" size={9} color={CYAN_40} />
        <Text numberOfLines={1} style={{ fontFamily: MONO, fontSize: 9, color: CYAN_40, flexShrink: 1 }}>
          {formatLocation(s)}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Error box ──────────────────────────────────────────────────────────────
function ErrorBox({ message, mt = 0, mb = 16 }: { message: string; mt?: number; mb?: number }) {
  return (
    <View
      style={{
        marginTop: mt,
        marginBottom: mb,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,107,107,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.3)',
      }}
    >
      <Text style={{ fontFamily: MONO, fontSize: 12, color: '#ff6b6b', textAlign: 'center', letterSpacing: 0.5 }}>
        {message}
      </Text>
    </View>
  );
}

// ─── Contact Support — octagon 10px cuts, chat icon, Orbitron text ──────────
function ContactSupportButton() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? 'localhost:8080';
    const proto = domain.includes('localhost') ? 'http' : 'https';
    fetch(`${proto}://${domain}/api/support-info`)
      .then((r) => r.json())
      .then((d: { url?: string }) => { if (d.url) setUrl(d.url); })
      .catch(() => {});
  }, []);

  return (
    <TouchableOpacity
      onPress={() => { if (url) Linking.openURL(url).catch(() => {}); }}
      activeOpacity={0.85}
      style={{ width: '100%' }}
    >
      <OctShape
        cut={10}
        fill="#030f23"
        fillOpacity={0.9}
        stroke={CYAN}
        strokeOpacity={0.35}
        strokeWidth={1}
        glow={SUPPORT_GLOW}
        style={{ width: '100%' }}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 18,
        }}
      >
        <Svg width={24} height={24} viewBox="0 0 32 32">
          <Rect x={2} y={3} width={28} height={20} rx={4} fill={CYAN} fillOpacity={0.85} />
          <Polygon points="4,23 4,29 10,23" fill={CYAN} fillOpacity={0.85} />
        </Svg>
        <Text
          numberOfLines={1}
          style={[
            {
              fontFamily: ORBITRON_BOLD,
              fontSize: 14,
              letterSpacing: 1.5,
              color: CYAN_85,
              includeFontPadding: false,
            },
            Platform.select({
              web: { textShadow: `0 0 8px ${CYAN_40}` } as object,
              default: {
                textShadowColor: CYAN_40,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              },
            }),
          ]}
        >
          CONTACT SUPPORT
        </Text>
      </OctShape>
    </TouchableOpacity>
  );
}

// ─── Module-level constant — must live outside the component so useRef
//     captures a stable reference and the animation useEffect never sees
//     a stale/undefined Animated.Value. ────────────────────────────────────
const TITLE_CHARS = ['Z', 'E', 'N', 'I', 'N'] as const;

// ─── Main screen ────────────────────────────────────────────────────────────
type Phase = 'form' | 'otp' | 'evict' | 'loading';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setSession } = useAuth();

  const [phase, setPhase] = useState<Phase>('form');
  const [loadingLabel, setLoadingLabel] = useState('AUTHENTICATING...');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpId, setOtpId] = useState('');
  const [otp, setOtp] = useState('');
  const [preAuthId, setPreAuthId] = useState('');
  const [sessions, setSessions] = useState<LoginCapacitySession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // Loading spinner
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ZENIN letters — web: opacity 0→1, x ±30→0, 500ms, delay 100+i*80
  const letterOps = useRef(TITLE_CHARS.map(() => new Animated.Value(0))).current;
  const letterXs = useRef(TITLE_CHARS.map((_, i) => new Animated.Value(i < 2 ? -30 : i > 2 ? 30 : 0))).current;
  // Terminal frame — web: opacity 0→1 x 40→0 (delay 400) + scale 0.9→1
  const boxOp = useRef(new Animated.Value(0)).current;
  const boxX = useRef(new Animated.Value(40)).current;
  const boxScale = useRef(new Animated.Value(0.9)).current;
  // Contact support — web: opacity 0→1 y 20→0 (delay 600)
  const supOp = useRef(new Animated.Value(0)).current;
  const supY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    TITLE_CHARS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(letterOps[i], { toValue: 1, duration: 500, delay: 100 + i * 80, useNativeDriver: true }),
        Animated.timing(letterXs[i], { toValue: 0, duration: 500, delay: 100 + i * 80, useNativeDriver: true }),
      ]).start();
    });
    Animated.parallel([
      Animated.timing(boxOp, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
      Animated.timing(boxX, { toValue: 0, duration: 500, delay: 400, useNativeDriver: true }),
      Animated.timing(boxScale, { toValue: 1, duration: 600, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(supOp, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true }),
      Animated.timing(supY, { toValue: 0, duration: 400, delay: 600, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth handlers (unchanged logic) ──
  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Enter your user ID and password.');
      return;
    }
    setError(null);
    setLoadingLabel('AUTHENTICATING...');
    setPhase('loading');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const r = await apiLogin(username.trim(), password);
    if (!r.ok) {
      if (r.error === 'login_capacity_full') {
        setSessions((r as any).activeSessions ?? []);
        setPreAuthId((r as any).preAuthId ?? '');
        setSelectedId(null);
        setPhase('evict');
      } else {
        setError(r.error);
        setPhase('form');
      }
      return;
    }
    if ('token' in r && r.token) {
      await setSession(r.token, r.user!);
      router.replace('/');
      return;
    }
    setOtpId((r as any).otpId);
    setOtp('');
    setPhase('otp');
  };

  const handleVerifyOtp = async (code?: string) => {
    const digits = (code ?? otp).replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Enter the 6-digit code sent to your Telegram.');
      return;
    }
    setError(null);
    setLoadingLabel('AUTHENTICATING...');
    setPhase('loading');
    const r = await apiVerifyOtp(otpId, digits);
    if (!r.ok) {
      if (r.error === 'login_capacity_full') {
        setSessions((r as any).activeSessions ?? []);
        setPreAuthId((r as any).preAuthId ?? '');
        setSelectedId(null);
        setPhase('evict');
      } else {
        setError(r.error);
        if (r.error.includes('sign in again') || r.error.includes('expired')) setPhase('form');
        else setPhase('otp');
      }
      return;
    }
    await setSession((r as any).token, (r as any).user);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/');
  };

  const handleEvict = async () => {
    if (selectedId === null) return;
    setError(null);
    setLoadingLabel('SIGNING IN...');
    setPhase('loading');
    const r = await apiEvictAndLogin(preAuthId, selectedId);
    if (!r.ok) {
      setError(r.error);
      setPhase('form');
      return;
    }
    if ('otpPending' in r) {
      setOtpId((r as { otpId: string }).otpId);
      setOtp('');
      setPhase('otp');
      return;
    }
    await setSession((r as { token: string; user: ZeninUser }).token, (r as { token: string; user: ZeninUser }).user);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/');
  };

  const resetToForm = () => {
    setPhase('form');
    setError(null);
    setOtp('');
    setOtpId('');
    setPreAuthId('');
  };

  const otpReady = otp.replace(/\D/g, '').length === 6;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LoginBackground />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── ZENIN — text-4xl (36px), tracking 8px, Orbitron black ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          {TITLE_CHARS.map((char, i) => (
            <Animated.Text
              key={i}
              style={[
                {
                  fontFamily: Platform.OS === 'web' ? "'Russo One', sans-serif" : 'RussoOne_400Regular',
                  fontSize: 58,
                  lineHeight: 62,
                  letterSpacing: 6,
                  color: CYAN,
                  includeFontPadding: false,
                  opacity: letterOps[i],
                  transform: [{ translateX: letterXs[i] }],
                },
                Platform.select({
                  web: {
                    textShadow: `0 0 20px ${CYAN_40}, 0 0 40px ${CYAN_18}`,
                    WebkitTextStroke: `1px ${CYAN}`,
                  } as object,
                  default: {
                    textShadowColor: CYAN_60,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 4,
                  },
                }),
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>

        {/* ── main content: flex:1 + space-between fills the page ── */}
        <View style={{ flex: 1, width: '100%', marginTop: 62, paddingHorizontal: 16, justifyContent: 'space-between' }}>
          {/* ACCESS TERMINAL frame */}
          <Animated.View
            style={{
              width: '100%',
              opacity: boxOp,
              transform: [{ translateX: boxX }, { scale: boxScale }],
            }}
          >
            <TerminalFrame>
              {/* ── loading (inside the frame, like web) ── */}
              {phase === 'loading' && (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Animated.View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: CYAN,
                      borderTopColor: 'transparent',
                      marginBottom: 16,
                      transform: [{ rotate: spinRotate }],
                    }}
                  />
                  <Text style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 4, color: CYAN_40 }}>
                    {loadingLabel}
                  </Text>
                </View>
              )}

              {/* ── credentials form ── */}
              {phase === 'form' && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Text
                      style={[
                        {
                          fontFamily: ORBITRON_BLACK,
                          fontSize: 20,
                          letterSpacing: 2,
                          color: CYAN_85,
                          includeFontPadding: false,
                          textAlign: 'center',
                          lineHeight: 28,
                        },
                        Platform.select({
                          web: {
                            textShadow: `0.4px 0 0 ${CYAN}, -0.4px 0 0 ${CYAN}, 0 0.4px 0 ${CYAN}, 0 -0.4px 0 ${CYAN}, 0 0 12px ${CYAN_40}, 0 0 24px ${CYAN_25}`,
                            WebkitTextStroke: '0.5px rgba(0,232,216,0.6)',
                          } as object,
                          default: {
                            textShadowColor: 'rgba(0,232,216,0.7)',
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 4,
                          },
                        }),
                      ]}
                    >
                      ACCESS TERMINAL
                    </Text>
                  </View>

                  <InputField
                    icon="user"
                    label="USER ID"
                    placeholder="Enter your user ID"
                    value={username}
                    onChange={(v) => { setUsername(v); setError(null); }}
                    autoComplete="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    mt={19}
                  />
                  <InputField
                    icon="lock"
                    label="PASSWORD"
                    placeholder="Enter password"
                    value={password}
                    onChange={(v) => { setPassword(v); setError(null); }}
                    secure
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleLogin()}
                    inputRef={passwordRef}
                    mt={18}
                  />

                  {error && <ErrorBox message={error} />}

                  {/* SIGN IN — full-width, glow like web boxShadow */}
                  <OctButton
                    label="SIGN IN"
                    onPress={() => void handleLogin()}
                    fill={CYAN}
                    textColor="#001520"
                    letterSpacing={6}
                    mt={32}
                    glow={SIGNIN_GLOW}
                    fullWidth
                  />

                  <Text
                    style={{
                      marginTop: 18,
                      textAlign: 'center',
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: 2,
                      color: CYAN_40,
                    }}
                  >
                    {'Get your credentials from '}
                    <Text
                      style={{ color: CYAN }}
                      onPress={() => Linking.openURL('https://t.me/ZeninPortalBot').catch(() => {})}
                    >
                      @ZeninPortalBot
                    </Text>
                  </Text>
                </>
              )}

              {/* ── OTP ── */}
              {phase === 'otp' && (
                <>
                  <Pressable
                    onPress={resetToForm}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, alignSelf: 'flex-start' }}
                  >
                    <Feather name="chevron-left" size={12} color={CYAN_40} />
                    <Text style={{ fontFamily: MONO, fontSize: 10, color: CYAN_40 }}>Back</Text>
                  </Pressable>

                  <View style={{ alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: 'rgba(0,232,216,0.1)',
                        borderWidth: 1,
                        borderColor: CYAN_35,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="send" size={20} color={CYAN} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontFamily: ORBITRON_BOLD, fontSize: 12, letterSpacing: 3, color: CYAN_85, marginBottom: 4 }}>
                        CHECK TELEGRAM
                      </Text>
                      {!otpReady && (
                        <Text style={{ fontFamily: MONO, fontSize: 10, color: CYAN_40, textAlign: 'center' }}>
                          A 6-digit code was sent to your Telegram account.
                        </Text>
                      )}
                    </View>
                  </View>

                  <OtpInput value={otp} onChange={setOtp} onComplete={(v) => void handleVerifyOtp(v)} />

                  {error && <ErrorBox message={error} mt={16} mb={0} />}

                  <OctButton
                    label="VERIFY"
                    onPress={() => void handleVerifyOtp()}
                    disabled={!otpReady}
                    fill={otpReady ? CYAN : '#94a3b8'}
                    fillOpacity={otpReady ? 1 : 0.15}
                    textColor={otpReady ? '#001520' : 'rgba(148,163,184,0.4)'}
                    fullWidth
                    mt={38}
                  />
                </>
              )}

              {/* ── evict ── */}
              {phase === 'evict' && (
                <>
                  <Pressable
                    onPress={resetToForm}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, alignSelf: 'flex-start' }}
                  >
                    <Feather name="chevron-left" size={12} color={CYAN_40} />
                    <Text style={{ fontFamily: MONO, fontSize: 10, color: CYAN_40 }}>Back</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Feather name="alert-triangle" size={14} color="#fbbf24" />
                    <Text style={{ fontFamily: ORBITRON_BOLD, fontSize: 11, letterSpacing: 2, color: '#fbbf24' }}>
                      LOGIN LIMIT REACHED
                    </Text>
                  </View>
                  <Text style={{ fontFamily: MONO, fontSize: 10, color: CYAN_60, marginBottom: 16, lineHeight: 16 }}>
                    Your account has 2 active sessions. Select one device to log out so you can sign in here.
                  </Text>

                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {sessions.slice(0, 2).map((s) => (
                      <SessionCard
                        key={s.id}
                        s={s}
                        selected={selectedId === s.id}
                        onSelect={() => setSelectedId(s.id === selectedId ? null : s.id)}
                      />
                    ))}
                  </View>

                  {error && <ErrorBox message={error} mb={12} />}

                  <OctButton
                    label="CONTINUE →"
                    onPress={() => void handleEvict()}
                    disabled={selectedId === null}
                    fill={selectedId !== null ? '#f87171' : '#94a3b8'}
                    fillOpacity={selectedId !== null ? 1 : 0.15}
                    textColor={selectedId !== null ? '#1a0000' : 'rgba(148,163,184,0.4)'}
                    fullWidth
                  />
                </>
              )}
            </TerminalFrame>
          </Animated.View>

          {/* Contact Support — full-width, anchored at bottom via space-between */}
          <Animated.View style={{ width: '100%', opacity: supOp, transform: [{ translateY: supY }], marginBottom: 48, marginTop: 58 }}>
            <ContactSupportButton />
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
