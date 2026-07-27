/**
 * ZENIN Cyberpunk dark theme — matched to the web medline-panel design system.
 * bg #05090e · cyan #00d4ff · online #00d4aa · offline #ff6b6b
 */
const palette = {
  // Core
  background: '#05090e',
  foreground: '#c8e6f5',
  // Cards / elevated surfaces
  card: '#0c1420',
  cardForeground: '#c8e6f5',
  // Primary action — cyan
  primary: '#00d4ff',
  primaryForeground: '#000d12',
  // Secondary
  secondary: '#0d1b2a',
  secondaryForeground: '#5a8fa5',
  // Muted
  muted: '#0a1520',
  mutedForeground: '#3d6a7a',
  // Accent
  accent: '#00d4ff',
  accentForeground: '#000d12',
  // Destructive
  destructive: '#ff6b6b',
  destructiveForeground: '#ffffff',
  // Borders / inputs
  border: 'rgba(0,212,255,0.12)',
  input: '#0c1420',
  // Legacy aliases
  text: '#c8e6f5',
  tint: '#00d4ff',
  // Device status
  online: '#00d4aa',
  offline: '#ff6b6b',
  // Surface layers
  surface1: '#080d14',
  surface2: '#0c1420',
  surface3: '#111c2c',
  // Glow helpers
  glow: 'rgba(0,212,255,0.12)',
  glowStrong: 'rgba(0,212,255,0.28)',
  glowOnline: 'rgba(0,212,170,0.25)',
  glowOffline: 'rgba(255,107,107,0.25)',
};

const colors = {
  light: palette,  // ZENIN is always dark regardless of system preference
  dark: palette,
  radius: 6,
};

export default colors;
