// Tailwind preset for MiniApp: light, minimal + vibrant accents
// Uses CSS variables (HSL) for easy theming overrides.

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        background: 'hsl(var(--color-bg))',
        foreground: 'hsl(var(--color-fg))',

        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-fg))'
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))'
        },
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',

        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent))',
          foreground: 'hsl(var(--color-accent-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--color-success))',
          foreground: 'hsl(var(--color-success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning))',
          foreground: 'hsl(var(--color-warning-foreground))'
        },
        danger: {
          DEFAULT: 'hsl(var(--color-danger))',
          foreground: 'hsl(var(--color-danger-foreground))'
        }
      },
      borderRadius: {
        lg: '12px',
        md: '10px',
        sm: '8px'
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.04)'
      }
    }
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ':root': {
          // Minimal light neutrals
          '--color-bg': '0 0% 100%',
          '--color-fg': '222.2 47.4% 11.2%',
          '--color-muted': '210 40% 96.1%',
          '--color-muted-foreground': '215.4 16.3% 46.9%',
          '--color-border': '214.3 31.8% 91.4%',
          '--color-input': '214.3 31.8% 91.4%',
          '--color-card': '0 0% 100%',
          '--color-ring': '221.2 83.2% 53.3%',
          // Force system UI elements (form controls, scrollbars) to light
          'color-scheme': 'light',

          // Vibrant accents
          '--color-primary': '221.2 83.2% 53.3%', /* Blue 600 */
          '--color-primary-foreground': '210 40% 98%',
          '--color-accent': '292 84% 61%', /* Fuchsia 500 */
          '--color-accent-foreground': '0 0% 100%',
          '--color-success': '142 70% 45%', /* Green 500 */
          '--color-success-foreground': '0 0% 100%',
          '--color-warning': '38 92% 50%', /* Amber 500 */
          '--color-warning-foreground': '0 0% 0%',
          '--color-danger': '0 72% 51%', /* Red 500 */
          '--color-danger-foreground': '0 0% 100%'
        },
        'html, body': {
          backgroundColor: 'hsl(var(--color-bg))',
          color: 'hsl(var(--color-fg))',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        },
        '*': {
          borderColor: 'hsl(var(--color-border))'
        }
      })
    }
  ]
}

export default preset
