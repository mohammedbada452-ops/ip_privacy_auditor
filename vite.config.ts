import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const publicOrigin = process.env.VITE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
  if (publicOrigin && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(publicOrigin)) {
    throw new Error('VITE_PUBLIC_ORIGIN must be a valid HTTPS URL when provided.');
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'privasec-production-seo',
        transformIndexHtml(html) {
          if (!publicOrigin) return html;
          return html.replaceAll('%VITE_PUBLIC_ORIGIN%', publicOrigin);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@packages/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
        '@packages/api-contract': path.resolve(__dirname, './packages/api-contract/src/index.ts'),
        '@packages/api-client': path.resolve(__dirname, './packages/api-client/src/index.ts'),
        '@packages/database': path.resolve(__dirname, './packages/database/src/index.ts'),
      },
    },
    server: {
      // HMR can be disabled in constrained deployment/dev environments.
      // DISABLE_HMR=true also disables file watching to reduce CPU usage.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
