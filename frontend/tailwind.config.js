
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // Core brand colours
        app: '#0f0f0f',
        overlay: '#262626',
        muted: '#2a2a2a',
        subtle: '#1a1a1a',
        'border-default': '#2e2e2e',
        'border-strong': '#3d3d3d',
        brand: {
          DEFAULT: '#3ecf8e',
          dim: '#2a9d6e',
          950: '#142235',
          dark: '#F8FAFC',
        },

        // Surface colours
        canvas: {
          DEFAULT: '#F5F7FA',
          dark: '#0A0F17',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#111827',
        },
        'surface-muted': {
          DEFAULT: '#F1F5F9',
          dark: '#1E293B',
        },
        'surface-elevated': {
          DEFAULT: '#FFFFFF',
          dark: '#1F2937',
        },

        // Navigation and layout
        navy: {
          950: '#142235',
          800: '#203750',
        },

        // Text colours
        slate: {
          700: '#42556B',
          600: '#5C6D80',
          500: '#5C6D80',
          dark: '#94A3B8',
        },
        'text-primary': '#162638',
        'text-secondary': '#5C6D80',
        'text-primary-dark': '#F8FAFC',
        'text-secondary-dark': '#94A3B8',

        // Borders
        border: {
          DEFAULT: '#DCE3EA',
          dark: '#334155',
        },

        // Semantic colours
        teal: {
          700: '#147A72',
          100: '#DDF3EF',
        },
        green: {
          700: '#15803d',
          100: '#DCFCE7',
          dark: '#34D399',
        },
        amber: {
          700: '#986000',
          100: '#FFF1CC',
          dark: '#F0C674',
        },
        red: {
          700: '#B42318',
          100: '#FEE4E2',
          dark: '#E87A6E',
        },
        purple: {
          300: '#D8B4FE',
          800: '#6B21A8',
        },

        // Accessibility
        focus: '#2563EB',
        'focus-ring': '#2563EB',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        sm: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        base: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        lg: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        xl: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '700' }],
      },

      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        modal: '0 24px 48px rgba(0,0,0,0.7)',
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(4px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },

  plugins: [],
}
