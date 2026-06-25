import type { Config } from "tailwindcss";

function oklchAlpha(variable: string, defaultAlphaVar?: string): string {
  return (({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `oklch(var(${variable}) / ${opacityValue})`;
    }
    if (defaultAlphaVar) {
      return `oklch(var(${variable}) / var(${defaultAlphaVar}))`;
    }
    return `oklch(var(${variable}))`;
  }) as unknown as string;
}

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
        border: oklchAlpha("--border", "--border-alpha"),
        input: oklchAlpha("--input", "--input-alpha"),
        ring: oklchAlpha("--ring"),
        background: oklchAlpha("--background"),
        foreground: oklchAlpha("--foreground"),
        primary: {
          DEFAULT: oklchAlpha("--primary"),
          foreground: oklchAlpha("--primary-foreground"),
        },
        secondary: {
          DEFAULT: oklchAlpha("--secondary"),
          foreground: oklchAlpha("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: oklchAlpha("--destructive"),
          foreground: oklchAlpha("--destructive-foreground"),
        },
        muted: {
          DEFAULT: oklchAlpha("--muted"),
          foreground: oklchAlpha("--muted-foreground"),
        },
        accent: {
          DEFAULT: oklchAlpha("--accent"),
          foreground: oklchAlpha("--accent-foreground"),
        },
        popover: {
          DEFAULT: oklchAlpha("--popover"),
          foreground: oklchAlpha("--popover-foreground"),
        },
        card: {
          DEFAULT: oklchAlpha("--card"),
          foreground: oklchAlpha("--card-foreground"),
        },
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
