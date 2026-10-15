import type { Config } from 'tailwindcss'

// Design system MUTLOG — source : direction_UI_UX_cible_de_MUTLOG.pdf §9
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0B2A4A', 2: '#123E68', soft: '#E8EEF5' },
        // Orange de la maquette. Texte blanc dessus : contraste 2,8:1 (WCAG AA exige 4,5:1). Alternative conforme AA : '#CC4A00' (voir docs/architecture/decisions.md).
        accent: { DEFAULT: '#FF7A00', hover: '#E56D00', soft: '#FFF1E3', text: '#C2410C' },
        success: { DEFAULT: '#16A34A', soft: '#E7F6EC' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3DC' },
        danger: { DEFAULT: '#DC2626', soft: '#FCE8E8' },
        info: { DEFAULT: '#2563EB', soft: '#E6EEFD' },
        background: '#F7F9FC',
        surface: '#FFFFFF',
        ink: '#102033',
        muted: '#566478',
        line: '#E2E8F0',
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '14px', control: '10px' },
      boxShadow: {
        card: '0 1px 2px rgba(16,32,51,0.04), 0 4px 14px rgba(16,32,51,0.05)',
        pop: '0 8px 30px rgba(16,32,51,0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
