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
  const paginas = new Set(['cuenta', 'privacidad', 'terminos', 'soporte', 'mascara', 'descarga', 'guias'])
  return {
    name: 'mph-urls-limpias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const ruta = (req.url ?? '').split('?')[0].replace(/^\//, '').replace(/\/$/, '')
        if (paginas.has(ruta)) req.url = `/${ruta}.html`
        // Un archivo compartido (/d/<token>): en producción lo reescribe `_redirects`.
        else if (/^d\/[\w-]+$/.test(ruta)) req.url = '/descarga.html'
        // Las guías: /guias/<tema> y /<id>/guias/<tema> → la misma isla (el idioma lo lee la página).
        else if (/^(?:[a-z]{2}\/)?guias\/[\w-]+$/.test(ruta)) {
          const consulta = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          req.url = `/guias/${ruta.split('/').pop()}.html${consulta}`
        }
        next()
      })
    },
  }
}

/**
 * La máscara y las guías traen piezas del avatar de la app (`src/core/house/`),
 * que leen estos stores. Importar los reales abriría la base de datos de la app,
 * cargaría la casa y sembraría la biblioteca en el dominio de la web: aquí se
 * cambian por sus versiones en reposo (`web/src/sustitutos/`, ver su LEEME).
 */
const SUSTITUTOS = new Set([
  'disenoStore', 'ajustesStore', 'houseStore', 'monturaStore', 'parqueStore',
  'flotadorStore', 'accionCuartoStore', 'herramientaStore', 'juegoCanchaStore',
])
function sustitutosApp(): Plugin {
  const estado = path.resolve(raiz, 'src/core/state')
  return {
    name: 'mph-sustitutos-app',
    enforce: 'pre',
    async resolveId(fuente, importador, opciones) {
      const nombre = path.basename(fuente).replace(/\.tsx?$/, '')
      if (!importador || !SUSTITUTOS.has(nombre)) return null
      const r = await this.resolve(fuente, importador, { ...opciones, skipSelf: true })
      if (!r || path.normalize(path.dirname(r.id)) !== estado) return null
      return path.resolve(carpeta, 'src/sustitutos', `${nombre}.ts`)
    },
  }
}

export default defineConfig({
  root: carpeta,
  envDir: raiz, // comparte .env.local con la app (VITE_SUPABASE_*, VITE_REVENUECAT_WEB_KEY…)
  plugins: [sustitutosApp(), react(), tailwindcss(), urlsLimpias()],
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
        descarga: path.resolve(carpeta, 'descarga.html'),
        // La portada de las guías (/guias) y cada guía (/guias/<tema>).
        guias: path.resolve(carpeta, 'guias.html'),
        'guias/ejercicio': path.resolve(carpeta, 'guias/ejercicio.html'),
      },
    },
  },
})
