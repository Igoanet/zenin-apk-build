/**
 * LoginBackground — platform-aware starfield + nebula background.
 *
 * • Web  (Platform.OS === 'web'):    HTML Canvas — identical to the web dashboard
 *                                    login-background-effects.tsx (no Tailwind needed).
 * • Native (Android / iOS):          react-native-svg + Animated API; exact same
 *                                    visual parameters as the Canvas version.
 */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

// ─── Shared constants (kept in sync with web login-background-effects.tsx) ──
const BG          = '#000508';
const STAR_COLORS = ['#ffffff', '#d0eeff', '#b8e0ff', '#a0d4f0', '#ffffff', '#ffffff'];

// ─── Web: HTML Canvas version (exact port of login-background-effects.tsx) ──

interface Star {
  x: number; y: number; size: number; baseOpacity: number; color: string;
  vx: number; vy: number; twinkleOffset: number; twinkleSpeed: number; sparkle: boolean;
}
interface Shoot {
  x: number; y: number; vx: number; vy: number; length: number;
  opacity: number; active: boolean; life: number; maxLife: number; nextSpawn: number;
}
interface NebCloud {
  x: number; y: number; rx: number; ry: number; rotation: number;
  layers: { r: number; opacity: number; color: string }[];
  vx: number; vy: number;
}

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function buildClouds(W: number, H: number): NebCloud[] {
  return [
    { x:W*0.12, y:H*0.18, rx:W*0.38, ry:H*0.32, rotation:-0.2, vx:0.008, vy:0.003,
      layers:[{r:1.0,opacity:0.22,color:'0,55,70'},{r:0.65,opacity:0.28,color:'0,65,80'},{r:0.35,opacity:0.2,color:'0,45,60'}] },
    { x:W*0.82, y:H*0.12, rx:W*0.3,  ry:H*0.28, rotation:0.3,  vx:-0.007, vy:0.004,
      layers:[{r:1.0,opacity:0.18,color:'0,50,65'},{r:0.6,opacity:0.22,color:'0,60,75'},{r:0.3,opacity:0.15,color:'0,40,55'}] },
    { x:W*0.3,  y:H*0.48, rx:W*0.45, ry:H*0.22, rotation:0.1,  vx:0.005,  vy:-0.002,
      layers:[{r:1.0,opacity:0.16,color:'0,50,68'},{r:0.55,opacity:0.2,color:'0,62,78'},{r:0.28,opacity:0.14,color:'0,38,52'}] },
    { x:W*0.78, y:H*0.5,  rx:W*0.28, ry:H*0.3,  rotation:-0.15,vx:-0.006, vy:-0.003,
      layers:[{r:1.0,opacity:0.2,color:'0,48,62'},{r:0.6,opacity:0.24,color:'0,58,72'},{r:0.3,opacity:0.16,color:'0,36,50'}] },
    { x:W*0.1,  y:H*0.72, rx:W*0.32, ry:H*0.26, rotation:0.2,  vx:0.009,  vy:0.002,
      layers:[{r:1.0,opacity:0.24,color:'0,30,42'},{r:0.55,opacity:0.28,color:'0,40,55'},{r:0.28,opacity:0.18,color:'0,22,32'}] },
    { x:W*0.72, y:H*0.8,  rx:W*0.35, ry:H*0.22, rotation:-0.1, vx:-0.005, vy:0.003,
      layers:[{r:1.0,opacity:0.2,color:'0,28,40'},{r:0.6,opacity:0.24,color:'0,38,52'},{r:0.3,opacity:0.16,color:'0,20,30'}] },
    { x:W*0.5,  y:H*0.08, rx:W*0.25, ry:H*0.18, rotation:0.0,  vx:0.004,  vy:0.005,
      layers:[{r:1.0,opacity:0.14,color:'0,55,72'},{r:0.5,opacity:0.18,color:'0,65,82'}] },
    { x:W*0.95, y:H*0.35, rx:W*0.18, ry:H*0.4,  rotation:0.4,  vx:-0.004, vy:-0.002,
      layers:[{r:1.0,opacity:0.16,color:'0,45,60'},{r:0.5,opacity:0.2,color:'0,55,70'}] },
  ];
}

function LoginBackgroundWeb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const stars: Star[] = Array.from({ length: 150 }, () => {
      const depth = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.015 + depth * 0.07;
      return {
        x: rand(0, W), y: rand(0, H),
        size: 0.4 + depth * 0.75,
        baseOpacity: 0.2 + depth * 0.6,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        twinkleOffset: rand(0, Math.PI * 2),
        twinkleSpeed: 0.0015 + Math.random() * 0.005,
        sparkle: Math.random() < 0.28,
      };
    });

    const shoots: Shoot[] = Array.from({ length: 5 }, (_, i) => ({
      x:0, y:0, vx:0, vy:0, length:0, opacity:0,
      active:false, life:0, maxLife:0,
      nextSpawn: rand(2000, 5000) * (i * 0.6 + 1),
    }));

    function spawnShoot(s: Shoot) {
      const angle = rand(25, 55) * (Math.PI / 180);
      s.x = rand(W * 0.05, W * 0.85); s.y = rand(H * 0.02, H * 0.5);
      const spd = rand(10, 20);
      s.vx = Math.cos(angle) * spd; s.vy = Math.sin(angle) * spd;
      s.length = rand(100, 260); s.maxLife = rand(500, 900);
      s.life = 0; s.opacity = 0; s.active = true;
    }

    const clouds = buildClouds(W, H);

    function drawCloud(cloud: NebCloud) {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.rotate(cloud.rotation);
      for (const layer of cloud.layers) {
        const rw = cloud.rx * layer.r;
        const rh = cloud.ry * layer.r;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rw, rh));
        grad.addColorStop(0, `rgba(${layer.color}, ${layer.opacity})`);
        grad.addColorStop(0.5, `rgba(${layer.color}, ${layer.opacity * 0.5})`);
        grad.addColorStop(1, `rgba(${layer.color}, 0)`);
        ctx.save();
        ctx.scale(rw / Math.max(rw, rh), rh / Math.max(rw, rh));
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(rw, rh), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function draw(ts: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

      const ambient = ctx.createRadialGradient(W*0.45, H*0.4, 0, W*0.45, H*0.4, W*0.75);
      ambient.addColorStop(0, 'rgba(0,40,52,0.35)');
      ambient.addColorStop(1, 'transparent');
      ctx.fillStyle = ambient; ctx.fillRect(0, 0, W, H);

      for (const cloud of clouds) {
        cloud.x += cloud.vx; cloud.y += cloud.vy;
        if (cloud.x >  W + cloud.rx) cloud.x = -cloud.rx;
        if (cloud.x < -cloud.rx)     cloud.x =  W + cloud.rx;
        if (cloud.y >  H + cloud.ry) cloud.y = -cloud.ry;
        if (cloud.y < -cloud.ry)     cloud.y =  H + cloud.ry;
        drawCloud(cloud);
      }

      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -2) s.x = W + 2; if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2; if (s.y > H + 2) s.y = -2;
        const twinkle = 0.78 + Math.sin(ts * s.twinkleSpeed + s.twinkleOffset) * 0.22;
        const alpha = s.baseOpacity * twinkle;
        ctx.save();
        if (s.sparkle) {
          const pulse = 0.5 + Math.sin(ts * s.twinkleSpeed * 2.5 + s.twinkleOffset) * 0.5;
          const haloR = s.size * (3 + pulse * 5);
          const haloGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
          haloGrad.addColorStop(0, `rgba(200,240,255,${0.22 * pulse * alpha})`);
          haloGrad.addColorStop(0.4, `rgba(180,230,255,${0.1 * pulse * alpha})`);
          haloGrad.addColorStop(1, 'rgba(180,230,255,0)');
          ctx.fillStyle = haloGrad;
          ctx.beginPath(); ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color; ctx.fill();
        ctx.restore();
      }

      const DT = 16;
      for (const ss of shoots) {
        ss.nextSpawn -= DT;
        if (!ss.active && ss.nextSpawn <= 0) { spawnShoot(ss); ss.nextSpawn = rand(4000, 11000); }
        if (!ss.active) continue;
        ss.life += DT;
        const p = ss.life / ss.maxLife;
        ss.opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
        if (p >= 1) { ss.active = false; continue; }
        ss.x += ss.vx; ss.y += ss.vy;
        const spd = Math.hypot(ss.vx, ss.vy);
        const tx = ss.x - (ss.vx / spd) * ss.length;
        const ty = ss.y - (ss.vy / spd) * ss.length;
        const grad = ctx.createLinearGradient(tx, ty, ss.x, ss.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, `rgba(190,245,255,${ss.opacity * 0.45})`);
        grad.addColorStop(1, `rgba(255,255,255,${ss.opacity})`);
        ctx.save();
        ctx.lineWidth = 1.5; ctx.strokeStyle = grad;
        ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(180,245,255,0.8)';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ss.x, ss.y); ctx.stroke();
        ctx.globalAlpha = ss.opacity * 0.9; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    // @ts-ignore — canvas is a valid DOM element on web
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed' as any,
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}

// ─── Native: SVG + Animated version ─────────────────────────────────────────

const TWINKLE_GROUPS = 6;

// Seeded PRNG so star positions are deterministic across renders.
function mkPrng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface StarDef { x: number; y: number; r: number; op: number; color: string; sparkle: boolean }

function buildStars(W: number, H: number): StarDef[][] {
  const rng = mkPrng(1337);
  const groups: StarDef[][] = Array.from({ length: TWINKLE_GROUPS }, () => []);
  for (let i = 0; i < 150; i++) {
    const depth = rng();
    groups[i % TWINKLE_GROUPS].push({
      x: rng() * W, y: rng() * H,
      r: 0.4 + depth * 0.75,
      op: 0.2 + depth * 0.6,
      color: STAR_COLORS[Math.floor(rng() * STAR_COLORS.length)],
      sparkle: rng() < 0.28,
    });
  }
  return groups;
}

// Each star group slowly drifts in a unique direction — matches the Canvas vx/vy per-star.
// We approximate by translating the whole group; effect is subtle (≈2px/s) and convincing.
const GROUP_DRIFT: { dx: number; dy: number }[] = [
  { dx: 0.9,  dy: 0.4  },
  { dx: -0.7, dy: 0.5  },
  { dx: 0.3,  dy: -0.6 },
  { dx: -0.5, dy: -0.3 },
  { dx: 0.6,  dy: 0.7  },
  { dx: -0.4, dy: 0.2  },
];
// Full drift cycle (px) per direction — stars wrap when group travels this far.
const DRIFT_RANGE = 80;
// Duration for one full drift cycle (ms) — keeps movement imperceptible but present.
const DRIFT_DURATION = 40000;

function ShootingStarNative({
  initialDelay, W, H,
}: {
  initialDelay: number; W: number; H: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [cfg, setCfg] = useState(() => makeCfg(initialDelay));

  function makeCfg(delay?: number) {
    const angle = 25 + Math.random() * 30;
    return {
      x:   W * (0.05 + Math.random() * 0.8),
      y:   H * (0.02 + Math.random() * 0.48),
      angle,
      len:  100 + Math.random() * 160,
      dist: 350 + Math.random() * 550,
      duration: 500 + Math.random() * 400,
      delay: delay ?? 4000 + Math.random() * 7000,
    };
  }

  useEffect(() => {
    let alive = true;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1, duration: cfg.duration, delay: cfg.delay,
      easing: Easing.linear, useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished && alive) setCfg(makeCfg()); });
    return () => { alive = false; anim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  const rad = (cfg.angle * Math.PI) / 180;
  const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * cfg.dist] });
  const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * cfg.dist] });
  const op = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: cfg.x, top: cfg.y, opacity: op,
        transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${cfg.angle}deg` }],
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(190,245,255,0.45)', 'rgba(255,255,255,1)']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ width: cfg.len, height: 1.5 }}
      />
      <View style={{
        position: 'absolute', right: -1.5, top: -0.75,
        width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ffffff',
      }} />
    </Animated.View>
  );
}

function LoginBackgroundNative() {
  const { width: W, height: H } = useWindowDimensions();
  const starGroups = useMemo(() => buildStars(W, H), [W, H]);

  // ── Twinkle: 6 staggered opacity loops (web: alpha × sin wave 0.56–1.0) ──
  const twinkles = useRef(
    Array.from({ length: TWINKLE_GROUPS }, () => new Animated.Value(0)),
  ).current;

  // ── Star-group drift: each group slowly translates in its assigned direction ──
  const drifts = useRef(
    Array.from({ length: TWINKLE_GROUPS }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    // Twinkle loops
    const tLoops = twinkles.map((v, g) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(g * 230),
          Animated.timing(v, { toValue: 1, duration: 1100 + g * 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 1100 + g * 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    tLoops.forEach((l) => l.start());

    // Drift loops — each group cycles between 0 and DRIFT_RANGE in its direction
    const dLoops = drifts.map((d, g) => {
      const { dx, dy } = GROUP_DRIFT[g];
      const dur = DRIFT_DURATION * (0.8 + g * 0.07); // slightly different speed per group
      return Animated.loop(
        Animated.sequence([
          Animated.timing(d.x, { toValue:  dx * DRIFT_RANGE, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(d.x, { toValue:  0,                duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    });
    const dYLoops = drifts.map((d, g) => {
      const { dy } = GROUP_DRIFT[g];
      const dur = DRIFT_DURATION * (0.8 + g * 0.07);
      return Animated.loop(
        Animated.sequence([
          Animated.timing(d.y, { toValue:  dy * DRIFT_RANGE, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(d.y, { toValue:  0,                duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    });
    dLoops.forEach((l) => l.start());
    dYLoops.forEach((l) => l.start());

    return () => {
      tLoops.forEach((l) => l.stop());
      dLoops.forEach((l) => l.stop());
      dYLoops.forEach((l) => l.stop());
    };
  }, [twinkles, drifts]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BG }}>
      {/* ── Stars — 6 twinkle+drift groups ── */}
      {starGroups.map((stars, g) => (
        <Animated.View
          key={`sg${g}`}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            opacity: twinkles[g].interpolate({ inputRange: [0, 1], outputRange: [0.56, 1] }),
            transform: [{ translateX: drifts[g].x }, { translateY: drifts[g].y }],
          }}
        >
          <Svg width={W} height={H}>
            {stars.map((s, i) => (
              <React.Fragment key={i}>
                {s.sparkle && (
                  <Circle cx={s.x} cy={s.y} r={s.r * 4} fill="#c8f0ff" fillOpacity={0.06 * s.op} />
                )}
                <Circle cx={s.x} cy={s.y} r={s.r} fill={s.color} fillOpacity={s.op} />
              </React.Fragment>
            ))}
          </Svg>
        </Animated.View>
      ))}

      {/* ── Nebula / ambient — 8 clouds matching web buildClouds() positions ──
          Android SVG can't render radialGradient fills; we approximate with
          stacked LinearGradient views positioned & sized to match the web clouds. */}

      {/* Ambient center glow (web: radialGradient at 45%W, 40%H, r=75%W) */}
      <LinearGradient colors={['transparent','rgba(0,40,52,0.20)','transparent']}
        start={{ x:0,y:0.5 }} end={{ x:1,y:0.5 }}
        style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }} />
      <LinearGradient colors={['transparent','rgba(0,40,52,0.20)','transparent']}
        start={{ x:0.5,y:0 }} end={{ x:0.5,y:1 }}
        style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }} />

      {/* Cloud 1 — top-left  (web: x=12%W, y=18%H, rx=38%W, ry=32%H) */}
      <LinearGradient colors={['rgba(0,55,70,0.18)','rgba(0,50,65,0.10)','transparent']}
        start={{ x:0,y:0 }} end={{ x:1,y:1 }}
        style={{ position:'absolute', top:0, left:0, width:'72%', height:'55%' }} />

      {/* Cloud 2 — top-right (web: x=82%W, y=12%H, rx=30%W) */}
      <LinearGradient colors={['transparent','rgba(0,50,65,0.15)','rgba(0,42,58,0.10)']}
        start={{ x:0,y:0 }} end={{ x:1,y:0 }}
        style={{ position:'absolute', top:0, right:0, width:'55%', height:'40%' }} />

      {/* Cloud 3 — center strip (web: x=30%W, y=48%H, rx=45%W, ry=22%H) */}
      <LinearGradient colors={['transparent','rgba(0,50,68,0.13)','transparent']}
        start={{ x:0,y:0.5 }} end={{ x:1,y:0.5 }}
        style={{ position:'absolute', top:'30%', left:0, right:0, height:'30%' }} />

      {/* Cloud 4 — center-right (web: x=78%W, y=50%H, rx=28%W, ry=30%H) */}
      <LinearGradient colors={['transparent','rgba(0,48,62,0.14)','rgba(0,38,52,0.08)']}
        start={{ x:0,y:0.5 }} end={{ x:1,y:0.5 }}
        style={{ position:'absolute', top:'25%', right:0, width:'52%', height:'45%' }} />

      {/* Cloud 5 — bottom-left (web: x=10%W, y=72%H, rx=32%W, ry=26%H) */}
      <LinearGradient colors={['rgba(0,40,55,0.16)','rgba(0,30,42,0.09)','transparent']}
        start={{ x:0,y:1 }} end={{ x:1,y:0 }}
        style={{ position:'absolute', bottom:0, left:0, width:'65%', height:'38%' }} />

      {/* Cloud 6 — bottom-right (web: x=72%W, y=80%H, rx=35%W, ry=22%H) */}
      <LinearGradient colors={['transparent','rgba(0,35,48,0.13)','rgba(0,28,40,0.08)']}
        start={{ x:0,y:0 }} end={{ x:1,y:1 }}
        style={{ position:'absolute', bottom:0, right:0, width:'60%', height:'35%' }} />

      {/* Cloud 7 — top-center (web: x=50%W, y=8%H, rx=25%W, ry=18%H) */}
      <LinearGradient colors={['rgba(0,55,72,0.10)','rgba(0,65,82,0.06)','transparent']}
        start={{ x:0,y:0 }} end={{ x:0,y:1 }}
        style={{ position:'absolute', top:0, left:'25%', width:'50%', height:'28%' }} />

      {/* Cloud 8 — right-edge (web: x=95%W, y=35%H, rx=18%W, ry=40%H) */}
      <LinearGradient colors={['transparent','rgba(0,45,60,0.10)','rgba(0,55,70,0.06)']}
        start={{ x:0,y:0.5 }} end={{ x:1,y:0.5 }}
        style={{ position:'absolute', top:'15%', right:0, width:'30%', height:'55%' }} />

      {/* ── 5 Shooting stars (web: shoots.length = 5) ── */}
      <ShootingStarNative initialDelay={2500}  W={W} H={H} />
      <ShootingStarNative initialDelay={6500}  W={W} H={H} />
      <ShootingStarNative initialDelay={10500} W={W} H={H} />
      <ShootingStarNative initialDelay={3200}  W={W} H={H} />
      <ShootingStarNative initialDelay={8100}  W={W} H={H} />
    </View>
  );
}

// ─── Export: pick the right version per platform ─────────────────────────────
export default function LoginBackground() {
  if (Platform.OS === 'web') {
    return <LoginBackgroundWeb />;
  }
  return <LoginBackgroundNative />;
}
