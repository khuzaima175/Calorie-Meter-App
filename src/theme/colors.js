// src/theme/colors.js
// Warm Minimalism Design System: Apple Health meets Notion
// Sage Green + Warm Charcoal + Earth-Tone Macros

export const colors = {
  // Backgrounds
  background: '#121214',      // Deep warm charcoal base (iOS System Dark)
  cardBackground: '#1C1C1E',  // Primary card surface
  cardElevated: '#2C2C2E',    // Elevated card / input surface
  cardHover: '#3A3A3C',       // Interactive hover / pressed border
  cardBorder: '#28282B',      // Subtle card divider / border
  borderLight: '#3A3A3C',     // Distinct line / separator

  // Brand / Accents
  sagePrimary: '#6B9B7D',     // Passive sage (rings, badges, icons)
  sageBright: '#7DAF8E',      // Actionable sage CTA (buttons, toggles, highlight)
  sageDark: '#4D735C',        // Sage shade for track / background
  sageSubtle: 'rgba(107, 155, 125, 0.15)', // Light sage tint for pills

  // Macros (Earth-Tone Palette)
  protein: '#C9956B',         // Warm Clay
  proteinBg: 'rgba(201, 149, 107, 0.15)',
  carbs: '#7BA7BC',           // Dusty Blue
  carbsBg: 'rgba(123, 167, 188, 0.15)',
  fat: '#C48B9F',             // Dusty Rose
  fatBg: 'rgba(196, 139, 159, 0.15)',
  fiber: '#A8B878',           // Olive/Muted Lime
  water: '#5B92E5',           // Soft Aqua Blue
  waterBg: 'rgba(91, 146, 229, 0.15)',
  caloriesBurned: '#E07A5F',  // Terracotta Orange
  caloriesBurnedBg: 'rgba(224, 122, 95, 0.15)',

  // Typography
  textPrimary: '#F2F2F7',     // Pure legible warm white
  textSecondary: '#A1A1A6',   // Muted slate gray
  textTertiary: '#636366',    // Subtle timestamp / placeholder gray
  textInverse: '#121214',     // Dark text for bright buttons

  // Status & Feedback
  success: '#81B29A',
  warning: '#F4A261',
  error: '#E76F51',
  info: '#64B5F6',

  // Glassmorphism overlays
  glassBg: 'rgba(28, 28, 30, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

export const typography = {
  display: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  title3: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  },
  callout: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};
