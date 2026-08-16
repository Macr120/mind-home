import { MascaraApp } from '../../../marketing/mascara/src/MascaraApp'
import { useT } from '../i18n/useT'
import { useMascaraUi } from '../state/mascaraUiStore'

/**
 * Máscara AR dentro de la app: envuelve la MascaraApp de marketing/mascara
 * (mismo código que el build standalone del puerto 5175). Se monta lazy desde
 * App.tsx: el segundo <Canvas> y MediaPipe no tocan el arranque. OJO: aquí no
 * se importa su estilos.css (sus reglas globales de html/body pisarían la app).
 */
export default function MascaraOverlay() {
  const cerrar = useMascaraUi((s) => s.cerrar)
  const t = useT()
  return (
    <div className="fixed inset-0 z-[60] bg-[#0f1115]">
      <MascaraApp onSalir={cerrar} textoSalir={t('mascara.salir', 'Salir')} />
    </div>
  )
}
