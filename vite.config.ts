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
            // Paneles del editor y de planos. El panel ya se monta con `lazy()`
            // desde `EditorHud`, pero el chunk SIGUE precargándose al arrancar:
            // basta un módulo del grupo en el grafo eager para que se descargue
            // entero, y hay ayudantes hoja en estas carpetas que importa UI
            // siempre presente — `SliderProp` (CarreraOverlay, EditorCanchas,
            // MarcadorCancha, PaintballOverlay), `ColorPicker`, `EditorPiezas`
            // (ObjetosCatalogo → RoomSideMenu), `LosetaFormaSvg`
            // (ControlHerramienta), `usePreviewBlob` y los cuatro `plano*` de
            // los controladores 3D.
            // Excluirlos por regex NO funciona (probado: build byte-idéntico);
            // para cobrar los ~630 KB gz hay que MOVER esos archivos fuera de
            // `ui/editor`/`ui/planos`.
            { name: 'editor', test: /src[\\/]core[\\/]ui[\\/](editor|planos)[\\/]/ },
            { name: 'chat', test: /src[\\/]core[\\/]chat[\\/]/ },
          ],
        },
      },
    },
  },
})
