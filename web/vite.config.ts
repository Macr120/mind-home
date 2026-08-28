import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Segundo build del repo: la WEB PÚBLICA (landing + /cuenta + legales), ligera
// y sin three/dexie. Se despliega aparte de la app (dist-web → dominio raíz).
const carpeta = path.dirname(fileURLToPath(import.meta.url)) // web/
const raiz = path.resolve(carpeta, '..')

/**
 * Cloudflare Pages sirve /cuenta → cuenta.html solo (clean URLs); el dev
 * server de Vite no. Este middleware emula lo mismo en `npm run dev:web`,
 * para que los enlaces y el redirect de recuperación de contraseña funcionen
 * igual en local que en producción.
 */
function urlsLimpias(): Plugin {
  const paginas = new Set(['cuenta', 'privacidad', 'terminos', 'soporte', 'mascara'])
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
  root: carpeta,
  envDir: raiz, // comparte .env.local con la app (VITE_SUPABASE_*, VITE_REVENUECAT_WEB_KEY…)
  plugins: [react(), tailwindcss(), urlsLimpias()],
  server: { port: 5174 },
  build: {
    outDir: path.resolve(raiz, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(carpeta, 'index.html'),
        cuenta: path.resolve(carpeta, 'cuenta.html'),
        privacidad: path.resolve(carpeta, 'privacidad.html'),
        terminos: path.resolve(carpeta, 'terminos.html'),
        soporte: path.resolve(carpeta, 'soporte.html'),
        mascara: path.resolve(carpeta, 'mascara.html'),
      },
    },
  },
})
