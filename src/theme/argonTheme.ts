/**
 * Argon Dashboard 2 Theme Configuration
 * Inspired by Material-UI + Argon Dashboard design principles
 */

export const argonTheme = {
  colors: {
    // Primary Cyan/Blue Family
    primary: {
      gradient: 'linear-gradient(310deg, #1171EE 0%, #2CD9FF 100%)',
      main: '#1171EE',
      light: '#2CD9FF',
      dark: '#0B5ED7',
      contrastText: '#FFFFFF',
      glow: 'rgba(44, 217, 255, 0.4)',
    },
    // Success / Emerald Family
    success: {
      gradient: 'linear-gradient(310deg, #01B574 0%, #05CD99 100%)',
      main: '#01B574',
      light: '#05CD99',
      dark: '#008C57',
      contrastText: '#FFFFFF',
      glow: 'rgba(5, 205, 153, 0.4)',
    },
    // Warning / Orange Family
    warning: {
      gradient: 'linear-gradient(310deg, #FF9900 0%, #FFB547 100%)',
      main: '#FF9900',
      light: '#FFB547',
      dark: '#E07B00',
      contrastText: '#FFFFFF',
      glow: 'rgba(255, 181, 71, 0.4)',
    },
    // Error / Red Family
    error: {
      gradient: 'linear-gradient(310deg, #E31A1A 0%, #EE5D50 100%)',
      main: '#EE5D50',
      light: '#F87171',
      dark: '#E31A1A',
      contrastText: '#FFFFFF',
      glow: 'rgba(238, 93, 80, 0.4)',
    },
    // Info / Blue Family
    info: {
      gradient: 'linear-gradient(310deg, #1171EE 0%, #2CD9FF 100%)',
      main: '#1171EE',
      light: '#2CD9FF',
      dark: '#0052CC',
      contrastText: '#FFFFFF',
    },
    // Dark Palette
    dark: {
      canvas: '#0a0a0a',
      surface: '#111111',
      elevated: '#1a1a1a',
      border: 'rgba(255, 255, 255, 0.07)',
      borderHover: 'rgba(255, 255, 255, 0.15)',
      textPrimary: '#ededed',
      textSecondary: '#a1a1a1',
      textTertiary: '#6b6b6b',
    },
    // Light Palette
    light: {
      canvas: '#F4F7FE',
      surface: '#FFFFFF',
      elevated: '#F8FAFC',
      border: 'rgba(226, 232, 240, 0.8)',
      borderHover: 'rgba(203, 213, 225, 1)',
      textPrimary: '#2B3674',
      textSecondary: '#707E94',
      textTertiary: '#a1a1a1',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    sizes: {
      h1: '2rem', // 32px
      h2: '1.5rem', // 24px
      h3: '1.25rem', // 20px
      h4: '1.125rem', // 18px
      body: '1rem', // 16px
      body2: '0.875rem', // 14px
      caption: '0.75rem', // 12px
      micro: '0.6875rem', // 11px
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  spacing: {
    base: 8, // 8px grid system
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  shadows: {
    cardLight: '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
    cardDark: '0 20px 27px 0 rgba(0, 0, 0, 0.45)',
    cardHoverLight: '0 20px 35px 0 rgba(0, 0, 0, 0.12)',
    cardHoverDark: '0 20px 35px 0 rgba(0, 0, 0, 0.65)',
    btnPrimary: '0 4px 20px 0 rgba(17, 113, 238, 0.38)',
    btnSuccess: '0 4px 20px 0 rgba(1, 181, 116, 0.38)',
    btnWarning: '0 4px 20px 0 rgba(255, 153, 0, 0.38)',
    btnError: '0 4px 20px 0 rgba(238, 93, 80, 0.38)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    pill: '9999px',
  },
};

export type ThemeMode = 'dark' | 'light';

/** Helper classes for theme-consistent styling */
export const getArgonClasses = (isDark: boolean) => ({
  canvasBg: isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F7FE]',
  cardBg: isDark 
    ? 'bg-[#141414] border-[rgba(255,255,255,0.07)] text-[#ededed] shadow-argon-card-dark' 
    : 'bg-white border-[rgba(226,232,240,0.8)] text-[#2B3674] shadow-argon-card',
  cardHover: isDark 
    ? 'hover:border-[rgba(255,255,255,0.15)] hover:shadow-argon-hover' 
    : 'hover:border-sky-300 hover:shadow-argon-hover',
  elevatedBg: isDark ? 'bg-[#1a1a1a]' : 'bg-[#F8FAFC]',
  textPrimary: isDark ? 'text-[#ededed]' : 'text-[#2B3674]',
  textSecondary: isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]',
  border: isDark ? 'border-[rgba(255,255,255,0.07)]' : 'border-[rgba(226,232,240,0.8)]',
  divider: isDark ? 'border-[rgba(255,255,255,0.07)]' : 'border-[rgba(226,232,240,0.8)]',
  inputBg: isDark
    ? 'bg-[#141414] border-[rgba(255,255,255,0.1)] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF] focus:ring-2 focus:ring-[#2CD9FF]/20'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE] focus:ring-2 focus:ring-[#1171EE]/20',
});
