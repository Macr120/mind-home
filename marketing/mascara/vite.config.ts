import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tercer build del repo: la MÁSCARA AR de marketing (grabarse con la cabeza del
// avatar sobre la cara, vía MediaPipe). Se usa desde el iPhone a través de un
// túnel HTTPS (npm run mascara:tunel), de ahí el allowedHosts.
const carpeta = path.dirname(fileURLToPath(import.meta.url)) // marketing/mascara/
const raiz = path.resolve(carpeta, '../..')

export default defineConfig({
  root: carpeta,
  envDir: raiz,
  plugins: [react(), tailwindcss()],
  server: { port: 5175, allowedHosts: ['.trycloudflare.com'] },
  build: {
    outDir: path.resolve(raiz, 'dist-mascara'),
    emptyOutDir: true,
  },
})
