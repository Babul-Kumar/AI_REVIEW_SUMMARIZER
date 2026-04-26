import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiApiKeys = Array.from(
    new Set(
      [
        env.GEMINI_API_KEY,
        ...Object.entries(env)
          .filter(([key]) => /^GEMINI_API_KEY_\d+$/.test(key))
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, value]) => value),
        ...(env.GEMINI_API_KEYS ?? '')
          .split(/[\r\n,]+/)
          .map((value) => value.trim()),
      ].filter(Boolean)
    )
  );

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKeys[0] ?? ''),
      'process.env.GEMINI_API_KEYS': JSON.stringify(geminiApiKeys.join(',')),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
