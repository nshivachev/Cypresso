import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cypresso: {
          primary: '#10b981',
          dark: '#0f172a',
          panel: '#1e293b',
          border: '#334155',
        },
      },
    },
  },
  plugins: [],
};

export default config;
