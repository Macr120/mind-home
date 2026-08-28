import { createRoot } from 'react-dom/client'
import { MascaraApp } from '../../marketing/mascara/src/MascaraApp'
import '../../marketing/mascara/src/estilos.css'

// Tercer hogar de la máscara (junto al standalone y MascaraOverlay de la app):
// misma pantalla completa que el standalone, con sus propios reset y Tailwind.
createRoot(document.getElementById('root')!).render(<MascaraApp />)
