/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        argon: {
          bg: {
            dark: '#0a0a0a',
            light: '#F4F7FE',
          },
          card: {
            dark: '#111111',
            light: '#FFFFFF',
          },
          elevated: {
            dark: '#1a1a1a',
            light: '#F8FAFC',
          },
          border: {
            dark: 'rgba(255, 255, 255, 0.07)',
            light: 'rgba(226, 232, 240, 0.8)',
          },
          primary: {
            DEFAULT: '#1171EE',
            light: '#2CD9FF',
            dark: '#0B5ED7',
          },
          success: {
            DEFAULT: '#01B574',
            light: '#05CD99',
            dark: '#008C57',
          },
          warning: {
            DEFAULT: '#FF9900',
            light: '#FFB547',
            dark: '#E07B00',
          },
          error: {
            DEFAULT: '#EE5D50',
            light: '#F87171',
            dark: '#E31A1A',
          },
          info: {
            DEFAULT: '#1171EE',
            light: '#2CD9FF',
            dark: '#0052CC',
          },
        },
        canvas: '#0a0a0a',
        surface: {
          DEFAULT: '#111111',
          card: '#141414',
          border: '#262626',
          hover: '#1a1a1a',
        },
        gh: {
          bg: '#0a0a0a',
          border: '#262626',
          lvl0: '#1f1f1f',
          lvl1: '#004B7A',
          lvl2: '#0075FF',
          lvl3: '#00C6FF',
          lvl4: '#00F2FE',
        }
      },
      boxShadow: {
        'argon-card': '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
        'argon-card-dark': '0 20px 27px 0 rgba(0, 0, 0, 0.45)',
        'argon-hover': '0 20px 35px 0 rgba(0, 0, 0, 0.12)',
        'argon-primary': '0 4px 20px 0 rgba(17, 113, 238, 0.38)',
        'argon-success': '0 4px 20px 0 rgba(1, 181, 116, 0.38)',
        'argon-warning': '0 4px 20px 0 rgba(255, 153, 0, 0.38)',
        'argon-error': '0 4px 20px 0 rgba(238, 93, 80, 0.38)',
      },
      backgroundImage: {
        'gradient-argon-primary': 'linear-gradient(310deg, #1171EE 0%, #2CD9FF 100%)',
        'gradient-argon-success': 'linear-gradient(310deg, #01B574 0%, #05CD99 100%)',
        'gradient-argon-warning': 'linear-gradient(310deg, #FF9900 0%, #FFB547 100%)',
        'gradient-argon-error': 'linear-gradient(310deg, #E31A1A 0%, #EE5D50 100%)',
        'gradient-argon-dark': 'linear-gradient(310deg, #141414 0%, #1a1a1a 100%)',
        'gradient-argon-card-dark': 'linear-gradient(127.09deg, rgba(26, 26, 26, 0.97) 19.41%, rgba(17, 17, 17, 0.95) 76.65%)',
        'gradient-argon-card-light': 'linear-gradient(127.09deg, rgba(255, 255, 255, 0.96) 19.41%, rgba(248, 250, 252, 0.9) 76.65%)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0.6' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
