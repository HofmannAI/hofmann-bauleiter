import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,svelte,ts,js}'],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: '#E30613',
          deep: '#B70510',
          soft: '#FDECEE'
        },
        ink: {
          DEFAULT: '#0F0F10',
          2: '#2A2925'
        },
        muted: '#6B6660',
        line: 'rgba(15,15,16,0.08)',
        'line-strong': 'rgba(15,15,16,0.16)',
        bg: '#F6F4F1',
        paper: {
          DEFAULT: '#FFFFFF',
          tint: '#FAF8F4'
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
          soft: '#ECE9E4'
        }
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        '1': '0 1px 2px rgba(15,15,16,.04), 0 2px 6px rgba(15,15,16,.04)',
        '2': '0 4px 12px rgba(15,15,16,.08), 0 12px 32px rgba(15,15,16,.06)',
        '3': '0 24px 48px rgba(15,15,16,.18)'
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px'
      }
    }
  },
  plugins: []
} satisfies Config;
