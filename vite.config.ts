import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Respeta el puerto asignado por el entorno (PORT); por defecto 5173.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    rollupOptions: {
      output: {
        // Vendors estables en chunks propios: mejor caché entre versiones de la app.
        advancedChunks: {
          groups: [
            // Solo fiber/drei: postprocessing debe seguir en su chunk lazy propio.
            { name: 'three', test: /node_modules[\\/](three|@react-three[\\/](fiber|drei))[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            // Aquí NO va un grupo para `ui/editor`/`ui/planos`. Lo tuvo, y era
            // contraproducente: forzar esas carpetas a un chunk propio arrastraba
            // dentro módulos COMPARTIDOS que el arranque sí necesita (se veía
            // `layoutStore` exportándose desde él), así que el chunk entero
            // acababa siendo import ESTÁTICO del entry y se precargaba siempre.
            // Sus 609 KB gz parecían "del editor" pero en su mayoría eran código
            // común. Sin el grupo, rolldown deja el panel en su chunk perezoso
            // (`EditPanel-*`, por el `lazy()` de EditorHud, ~73 KB gz) y reparte
            // lo compartido donde toca. Medido: 1 166,8 → 1 097,2 KB gz.
            //
            // El grupo `chat` SÍ conviene: quitarlo también sube a 1 105,5 KB y
            // parte el arranque en 27 archivos.
            //
            // Regla al tocar esto: `advancedChunks` NO difiere nada, solo agrupa.
            // Un grupo con un único módulo del grafo eager se descarga entero.
            // Comprobar siempre con los `modulepreload` de `dist/index.html`, no
            // con el tamaño del chunk.
            { name: 'chat', test: /src[\\/]core[\\/]chat[\\/]/ },
          ],
        },
      },
    },
  },
})
