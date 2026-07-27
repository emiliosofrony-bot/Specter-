import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'
import typography from '@tailwindcss/typography'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-family-base)'],
      },
      colors: {
        canvas: 'var(--color-canvas)',
        panel: 'var(--color-surface-panel)',
        interactive: 'var(--color-surface-interactive)',
        border: 'var(--color-border)',
        copper: {
          DEFAULT: 'var(--color-copper)',
          glow: 'var(--color-copper-glow)',
          foreground: 'var(--color-on-copper)',
        },
        surface: {
          DEFAULT: 'var(--color-on-surface)',
          variant: 'var(--color-on-surface-variant)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-on-secondary)',
          container: 'var(--color-secondary-container)',
        },
        tertiary: 'var(--color-tertiary)',
        error: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-on-error)',
          container: 'var(--color-error-container)',
          'container-foreground': 'var(--color-on-error-container)',
        },
        outline: {
          DEFAULT: 'var(--color-outline)',
          variant: 'var(--color-outline-variant)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-DEFAULT)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      spacing: {
        unit: 'var(--spacing-unit)',
        gutter: 'var(--spacing-gutter)',
        'margin-mobile': 'var(--spacing-margin-mobile)',
        'margin-desktop': 'var(--spacing-margin-desktop)',
        sidebar: 'var(--spacing-sidebar-width)',
      },
      maxWidth: {
        content: 'var(--spacing-max-content-width)',
      },
      backdropBlur: {
        glass: 'var(--blur-glass)',
      },
      boxShadow: {
        'copper-glow': '0 0 12px 0 var(--color-copper-glow)',
      },
      fontSize: {
        display: [
          'var(--text-display-size)',
          { lineHeight: 'var(--text-display-leading)', letterSpacing: 'var(--text-display-tracking)', fontWeight: 'var(--text-display-weight)' },
        ],
        'headline-lg': [
          'var(--text-headline-lg-size)',
          { lineHeight: 'var(--text-headline-lg-leading)', letterSpacing: 'var(--text-headline-lg-tracking)', fontWeight: 'var(--text-headline-lg-weight)' },
        ],
        'headline-lg-mobile': [
          'var(--text-headline-lg-mobile-size)',
          { lineHeight: 'var(--text-headline-lg-mobile-leading)', letterSpacing: 'var(--text-headline-lg-mobile-tracking)', fontWeight: 'var(--text-headline-lg-mobile-weight)' },
        ],
        'headline-md': [
          'var(--text-headline-md-size)',
          { lineHeight: 'var(--text-headline-md-leading)', letterSpacing: 'var(--text-headline-md-tracking)', fontWeight: 'var(--text-headline-md-weight)' },
        ],
        'body-lg': ['var(--text-body-lg-size)', { lineHeight: 'var(--text-body-lg-leading)', fontWeight: 'var(--text-body-lg-weight)' }],
        'body-md': ['var(--text-body-md-size)', { lineHeight: 'var(--text-body-md-leading)', fontWeight: 'var(--text-body-md-weight)' }],
        'label-md': [
          'var(--text-label-md-size)',
          { lineHeight: 'var(--text-label-md-leading)', letterSpacing: 'var(--text-label-md-tracking)', fontWeight: 'var(--text-label-md-weight)' },
        ],
        'label-sm': [
          'var(--text-label-sm-size)',
          { lineHeight: 'var(--text-label-sm-leading)', letterSpacing: 'var(--text-label-sm-tracking)', fontWeight: 'var(--text-label-sm-weight)' },
        ],
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config
