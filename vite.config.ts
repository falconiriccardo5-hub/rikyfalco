import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const demo = !!process.env.VITE_DEMO;

export default defineConfig({
  plugins: [react()],
  // build "anteprima": dati di esempio, file singolo, font da Google Fonts
  base: demo ? './' : '/',
  resolve: demo ? { alias: [{ find: /^\.\/fonts\.css$/, replacement: '/src/demo/empty.css' }] } : undefined,
  server: {
    // in sviluppo le API sono servite da `npm run dev:worker` (wrangler, porta 8787)
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
  build: { sourcemap: false, outDir: demo ? 'dist-demo' : 'dist' },
});
