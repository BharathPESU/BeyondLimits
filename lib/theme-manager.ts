/**
 * BeyondLimits Dynamic Visual Theme System
 * 
 * Defines the 3 official color theme combinations:
 * - Theme 1: High-Octane Performer (Complementary)
 * - Theme 2: Clean Endurance Runner (Analogous) — DEFAULT
 * - Theme 3: Balanced Wellness Guide (Split-Complementary)
 */

export type AppThemeId = 'theme_1' | 'theme_2' | 'theme_3';

export interface ThemeColors {
  primary: string;         // Primary brand accent (#FF6B35 / #CCFF00 / #FF5A5F)
  primaryHover: string;    // Hover state
  primaryText: string;     // Text on primary button (Dark on Neon Lime, White on Orange/Coral)
  secondary: string;       // Secondary tone (#1A2639 / #00E5FF / #E0ECDE)
  secondaryHover: string;  // Hover state
  secondaryText: string;   // Text on secondary
  accent: string;          // Vibrant accent (#00A896 / #00E5FF / #2D5A27)
  background: string;      // Deep canvas background
  surface: string;         // Modal and card surface
  surfaceCard: string;     // Nested subcard / input background
  surfaceHover: string;    // Hover surface
  border: string;          // Container / modal border
  text: string;            // Primary readable text
  textMuted: string;       // Secondary text
  textDim: string;         // Muted placeholder text
  glow: string;            // Shadow glow RGBA
  badgeBg: string;         // Badge background
  badgeText: string;       // Badge text
  badgeBorder: string;     // Badge border
}

export interface AppTheme {
  id: AppThemeId;
  name: string;
  tagline: string;
  harmonyType: string;
  colors: ThemeColors;
  swatches: {
    label: string;
    hex: string;
    role: string;
  }[];
}

export const DEFAULT_THEME_ID: AppThemeId = 'theme_2';

export const APP_THEMES: AppTheme[] = [
  {
    id: 'theme_2', // DEFAULT: Clean Endurance Runner
    name: 'Theme 2: Clean Endurance Runner',
    tagline: 'Neon Lime & Electric Cyan on Ultra-Dark Blue',
    harmonyType: 'Analogous (Default)',
    colors: {
      primary: '#CCFF00',
      primaryHover: '#b8e600',
      primaryText: '#0A0F1D',
      secondary: '#00E5FF',
      secondaryHover: '#00cbe3',
      secondaryText: '#0A0F1D',
      accent: '#00E5FF',
      background: '#0A0F1D',
      surface: '#111A2E',
      surfaceCard: '#16233B',
      surfaceHover: '#1B2C4A',
      border: 'rgba(0, 229, 255, 0.28)',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      textDim: '#64748B',
      glow: 'rgba(204, 255, 0, 0.35)',
      badgeBg: 'rgba(204, 255, 0, 0.12)',
      badgeText: '#CCFF00',
      badgeBorder: 'rgba(204, 255, 0, 0.35)',
    },
    swatches: [
      { label: 'Neon Lime', hex: '#CCFF00', role: 'Primary' },
      { label: 'Electric Cyan', hex: '#00E5FF', role: 'Secondary / Accent' },
      { label: 'Ultra-Dark Blue', hex: '#0A0F1D', role: 'Background' },
      { label: 'Deep Surface', hex: '#111A2E', role: 'Surface' },
    ],
  },
  {
    id: 'theme_1', // High-Octane Performer
    name: 'Theme 1: High-Octane Performer',
    tagline: 'Vibrant Orange & Teal on Deep Midnight Blue',
    harmonyType: 'Complementary',
    colors: {
      primary: '#FF6B35',
      primaryHover: '#e85a25',
      primaryText: '#FFFFFF',
      secondary: '#1A2639',
      secondaryHover: '#23334c',
      secondaryText: '#FFFFFF',
      accent: '#00A896',
      background: '#0B1321',
      surface: '#142033',
      surfaceCard: '#1C2A42',
      surfaceHover: '#243654',
      border: 'rgba(255, 107, 53, 0.32)',
      text: '#FFFFFF',
      textMuted: '#94A3B8',
      textDim: '#64748B',
      glow: 'rgba(255, 107, 53, 0.35)',
      badgeBg: 'rgba(255, 107, 53, 0.15)',
      badgeText: '#FF6B35',
      badgeBorder: 'rgba(255, 107, 53, 0.35)',
    },
    swatches: [
      { label: 'Vibrant Orange', hex: '#FF6B35', role: 'Primary' },
      { label: 'Midnight Blue', hex: '#1A2639', role: 'Secondary' },
      { label: 'Teal Accent', hex: '#00A896', role: 'Accent' },
      { label: 'Midnight Canvas', hex: '#0B1321', role: 'Background' },
    ],
  },
  {
    id: 'theme_3', // Balanced Wellness Guide
    name: 'Theme 3: Balanced Wellness Guide',
    tagline: 'Bright Coral & Soft Sage on Deep Forest Green',
    harmonyType: 'Split-Complementary',
    colors: {
      primary: '#FF5A5F',
      primaryHover: '#e74c51',
      primaryText: '#FFFFFF',
      secondary: '#E0ECDE',
      secondaryHover: '#d0dfce',
      secondaryText: '#12241A',
      accent: '#2D5A27',
      background: '#0B1610',
      surface: '#12241A',
      surfaceCard: '#193123',
      surfaceHover: '#213E2D',
      border: 'rgba(255, 90, 95, 0.32)',
      text: '#FFFFFF',
      textMuted: '#CBD5E1',
      textDim: '#94A3B8',
      glow: 'rgba(255, 90, 95, 0.35)',
      badgeBg: 'rgba(255, 90, 95, 0.15)',
      badgeText: '#FF5A5F',
      badgeBorder: 'rgba(255, 90, 95, 0.35)',
    },
    swatches: [
      { label: 'Bright Coral', hex: '#FF5A5F', role: 'Primary' },
      { label: 'Soft Sage', hex: '#E0ECDE', role: 'Secondary' },
      { label: 'Deep Forest', hex: '#2D5A27', role: 'Accent' },
      { label: 'Forest Canvas', hex: '#0B1610', role: 'Background' },
    ],
  },
];

export const STORAGE_KEY_THEME = 'beyondlimits_app_theme';

/**
 * Returns saved theme or defaults to 'theme_2' (Clean Endurance Runner)
 */
export function getSavedThemeId(): AppThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'theme_1' || saved === 'theme_2' || saved === 'theme_3') {
      return saved;
    }
    return DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/**
 * Persists theme and updates document data-theme attribute
 */
export function saveThemeId(themeId: AppThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, themeId);
    applyThemeToDocument(themeId);
    window.dispatchEvent(new CustomEvent('beyondlimits_theme_changed', { detail: { themeId } }));
  } catch {}
}

/**
 * Applies the theme data attribute and root CSS variables to <html> and <body>
 */
export function applyThemeToDocument(themeId: AppThemeId): void {
  if (typeof document === 'undefined') return;
  const targetTheme = APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];

  document.documentElement.setAttribute('data-theme', themeId);
  if (document.body) {
    document.body.setAttribute('data-theme', themeId);
  }

  const root = document.documentElement;
  const { colors } = targetTheme;

  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-primary-hover', colors.primaryHover);
  root.style.setProperty('--theme-primary-text', colors.primaryText);
  root.style.setProperty('--theme-secondary', colors.secondary);
  root.style.setProperty('--theme-secondary-hover', colors.secondaryHover);
  root.style.setProperty('--theme-secondary-text', colors.secondaryText);
  root.style.setProperty('--theme-accent', colors.accent);
  root.style.setProperty('--theme-bg', colors.background);
  root.style.setProperty('--theme-surface', colors.surface);
  root.style.setProperty('--theme-surface-card', colors.surfaceCard);
  root.style.setProperty('--theme-surface-hover', colors.surfaceHover);
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-text', colors.text);
  root.style.setProperty('--theme-text-muted', colors.textMuted);
  root.style.setProperty('--theme-text-dim', colors.textDim);
  root.style.setProperty('--theme-glow', colors.glow);
  root.style.setProperty('--theme-badge-bg', colors.badgeBg);
  root.style.setProperty('--theme-badge-text', colors.badgeText);
  root.style.setProperty('--theme-badge-border', colors.badgeBorder);
}
