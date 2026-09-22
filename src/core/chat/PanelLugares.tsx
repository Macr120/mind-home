import { lazy, Suspense } from 'react'
import { VACIO, lugaresViajeRepo } from '../data/repository'
import { useT } from '../i18n/useT'

// El mapa de calles (Leaflet) solo se descarga al abrir «Tus lugares».
const NavegarTab = lazy(() => import('../../rooms/sala/navegacion/NavegarTab'))

/**
 * Menú «Tus lugares» del chat: el navegador multimodal de la sala de viajes
 * («Cómo llegar»), con los lugares guardados del usuario como sugerencias.
 */
export function PanelLugares() {
  const t = useT()
  const lugares = lugaresViajeRepo.useAll() ?? VACIO
  return (
    <Suspense
      fallback={
        <p className="px-2 py-6 text-center text-xs text-white/40">{t('sala.nav.cargando', 'Cargando el mapa…')}</p>
      }
    >
      <NavegarTab lugares={lugares} />
    </Suspense>
  )
}
