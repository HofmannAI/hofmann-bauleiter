import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./src/**/*.{html,svelte,ts,js}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0.25rem',    /* 4px */
      DEFAULT: '0.5rem', /* 8px */
      md: '0.75rem',     /* 12px */
      lg: '1rem',        /* 16px */
      xl: '1.5rem',      /* 24px */
      full: '9999px'
    },
    extend: {
      colors: {
        /* --- Liquid Construction System palette --- */
        surface: {
          DEFAULT: 'var(--surface)',
          dim: 'var(--surface-dim)',
          bright: 'var(--surface-bright)',
          'container-lowest': 'var(--surface-container-lowest)',
          'container-low': 'var(--surface-container-low)',
          container: 'var(--surface-container)',
          'container-high': 'var(--surface-container-high)',
          'container-highest': 'var(--surface-container-highest)',
          tint: 'var(--surface-tint)',
          variant: 'var(--surface-variant)'
        },
        'on-surface': {
          DEFAULT: 'var(--on-surface)',
          variant: 'var(--on-surface-variant)'
        },
        'inverse-surface': 'var(--inverse-surface)',
        'inverse-on-surface': 'var(--inverse-on-surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          container: 'var(--primary-container)',
          fixed: 'var(--primary-fixed)',
          'fixed-dim': 'var(--primary-fixed-dim)'
        },
        'on-primary': {
          DEFAULT: 'var(--on-primary)',
          container: 'var(--on-primary-container)',
          fixed: 'var(--on-primary-fixed)',
          'fixed-variant': 'var(--on-primary-fixed-variant)'
        },
        'inverse-primary': 'var(--inverse-primary)',
        secondary: {
          DEFAULT: 'var(--secondary)',
          container: 'var(--secondary-container)',
          fixed: 'var(--secondary-fixed)',
          'fixed-dim': 'var(--secondary-fixed-dim)'
        },
        'on-secondary': {
          DEFAULT: 'var(--on-secondary)',
          container: 'var(--on-secondary-container)',
          fixed: 'var(--on-secondary-fixed)',
          'fixed-variant': 'var(--on-secondary-fixed-variant)'
        },
        tertiary: {
          DEFAULT: 'var(--tertiary)',
          container: 'var(--tertiary-container)',
          fixed: 'var(--tertiary-fixed)',
          'fixed-dim': 'var(--tertiary-fixed-dim)'
        },
        'on-tertiary': {
          DEFAULT: 'var(--on-tertiary)',
          container: 'var(--on-tertiary-container)',
          fixed: 'var(--on-tertiary-fixed)',
          'fixed-variant': 'var(--on-tertiary-fixed-variant)'
        },
        error: {
          DEFAULT: 'var(--error)',
          container: 'var(--error-container)'
        },
        'on-error': {
          DEFAULT: 'var(--on-error)',
          container: 'var(--on-error-container)'
        },
        outline: {
          DEFAULT: 'var(--outline)',
          variant: 'var(--outline-variant)'
        },
        background: 'var(--background)',
        'on-background': 'var(--on-background)',

        /* --- Legacy aliases (keep existing code working) --- */
        red: {
          DEFAULT: 'var(--primary-container)', /* Construction Red #E2162A */
          deep: 'var(--primary)',               /* #B7001C */
          soft: 'var(--primary-fixed)'          /* #FFDAD7 */
        },
        ink: {
          DEFAULT: 'var(--on-surface)',
          2: 'var(--on-surface-variant)'
        },
        muted: 'var(--secondary)',
        line: 'var(--outline-variant)',
        'line-strong': 'var(--outline)',
        bg: 'var(--background)',
        paper: {
          DEFAULT: 'var(--surface-container-lowest)',
          tint: 'var(--surface-container-low)'
        },
        green: {
          DEFAULT: '#2E7D32',
          soft: '#E8F4E9'
        },
        amber: {
          DEFAULT: '#C97700',
          soft: '#FDF1DA'
        },
        blue: {
          DEFAULT: '#1F4163',
          soft: '#E5EBF1'
        },
        grey: {
          DEFAULT: '#B5B0AB',
          soft: 'var(--surface-container-highest)'
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      fontSize: {
        'nav-title': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
        'large-title': ['34px', { lineHeight: '41px', letterSpacing: '0.37px', fontWeight: '700' }],
        headline: ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
        body: ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '400' }],
        callout: ['16px', { lineHeight: '21px', letterSpacing: '-0.32px', fontWeight: '400' }],
        subheadline: ['15px', { lineHeight: '20px', letterSpacing: '-0.24px', fontWeight: '400' }],
        footnote: ['13px', { lineHeight: '18px', letterSpacing: '-0.08px', fontWeight: '400' }],
        'caption-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.06px', fontWeight: '500' }]
      },
      spacing: {
        'margin-main': '16px',
        gutter: '12px',
        'stack-sm': '4px',
        'stack-md': '8px',
        'stack-lg': '16px',
        'stack-xl': '24px',
        'safe-area-bottom': '34px'
      },
      boxShadow: {
        '1': '0 1px 2px rgba(15,15,16,.04), 0 2px 6px rgba(15,15,16,.04)',
        '2': '0 4px 12px rgba(15,15,16,.08), 0 12px 32px rgba(15,15,16,.06)',
        '3': '0 24px 48px rgba(15,15,16,.18)',
        'float': '0px 10px 30px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: [
    /* Typography utility plugin for caption-caps uppercase transform */
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.text-caption-caps': {
          fontSize: '12px',
          lineHeight: '16px',
          letterSpacing: '0.06px',
          fontWeight: '500',
          textTransform: 'uppercase'
        }
      });
    })
  ]
} satisfies Config;
