/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom Vault Colors
        'vault-navy': '#0B1221',
        'vault-void': '#05080F',
        'vault-surface': '#111623',
        'vault-paper': '#1A202C',
        'vault-gold': '#D4AF37',
        'vault-gold-light': '#F3E5AB',
        'vault-gold-dim': '#8C7350',
        'vault-blue': '#3B82F6',
        'vault-dark': '#020408',
        'vault-muted': '#64748B',
        // Status colors
        'status-live': '#39FF14',
        'status-error': '#FF3333',
      },
      fontFamily: {
        // Display - Luxury serif for headlines
        display: ['Instrument Serif', 'Fraunces', 'serif'],
        heading: ['Instrument Serif', 'Fraunces', 'serif'],
        // Body - Clean modern sans
        body: ['Inter', 'Manrope', 'sans-serif'],
        sans: ['Inter', 'Manrope', 'sans-serif'],
        // Mono - System identity for IDs
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        // Legacy support
        legal: ['Crimson Pro', 'serif'],
      },
      letterSpacing: {
        'display': '-0.02em',
      },
      lineHeight: {
        'display': '1.05',
        'display-relaxed': '1.15',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" },
        },
        "shine-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-gold": "pulse-gold 3s ease-in-out infinite",
        "shine-sweep": "shine-sweep 3s ease-in-out infinite",
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(to right, #D4AF37, #F3E5AB, #D4AF37)',
        'void-fade': 'linear-gradient(to bottom, transparent, #020408)',
        'shine-gradient': 'linear-gradient(90deg, transparent, rgba(212,175,55,0.1), transparent)',
      },
      boxShadow: {
        'emboss': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
        'gold-glow': '0 0 15px rgba(212,175,55,0.15)',
        'gold-glow-lg': '0 0 25px rgba(212,175,55,0.25)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
