import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Segundo build del repo: la WEB PÚBLICA (landing + /cuenta + legales), ligera
// y sin three/dexie. Se despliega aparte de la app (dist-web → dominio raíz).
const raiz = path.dirname(fileURLToPath(import.meta.url))

/**
 * Cloudflare Pages sirve /cuenta → cuenta.html solo (clean URLs); el dev
 * server de Vite no. Este middleware emula lo mismo en `npm run dev:web`,
 * para que los enlaces y el redirect de recuperación de contraseña funcionen
 * igual en local que en producción.
 */
function urlsLimpias(): Plugin {
  const paginas = new Set(['cuenta', 'privacidad', 'terminos', 'soporte'])
  return {
    name: 'mph-urls-limpias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const ruta = (req.url ?? '').split('?')[0].replace(/^\//, '').replace(/\/$/, '')
        if (paginas.has(ruta)) req.url = `/${ruta}.html`
        next()
      })
    },
  }
}

export default defineConfig({
  root: path.resolve(raiz, 'web'),
  envDir: raiz, // comparte .env.local con la app (VITE_SUPABASE_*, VITE_REVENUECAT_WEB_KEY…)
  plugins: [react(), tailwindcss(), urlsLimpias()],
  server: { port: 5174 },
  build: {
    outDir: path.resolve(raiz, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(raiz, 'web/index.html'),
        cuenta: path.resolve(raiz, 'web/cuenta.html'),
        privacidad: path.resolve(raiz, 'web/privacidad.html'),
        terminos: path.resolve(raiz, 'web/terminos.html'),
        soporte: path.resolve(raiz, 'web/soporte.html'),
      },
    },
  },
})
