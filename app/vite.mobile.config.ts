// Build della web app per iPhone (PWA): servita da FlowCut sul PC e pubblicabile su GitHub Pages.
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'src/mobile'),
  base: './',
  publicDir: resolve(__dirname, 'src/mobile/public'),
  resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  plugins: [react()],
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  worker: { format: 'es' },
  build: { outDir: resolve(__dirname, 'out/mobile'), emptyOutDir: true, target: 'es2020', chunkSizeWarningLimit: 2000 },
  server: { port: 5199 }
})
