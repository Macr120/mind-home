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
          ],
        },
      },
    },
  },
})
