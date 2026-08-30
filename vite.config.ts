import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // Les jetons de tokens.css sont lus par ui/tokenValues.ts et incorporés
    // dans le SVG exporté : les tests doivent voir la vraie feuille.
    css: true,
  },
});
