import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#60a5fa',
      },
      backgroundImage: {
        'gradient-subtle': 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
      },
    },
  },
  plugins: [],
}
export default config
