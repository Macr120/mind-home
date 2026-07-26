import { useEffect, useRef } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { useCiclo } from '../state/cicloStore'
import { useDiseño } from '../state/disenoStore'
import { colorFondoVisible } from '../house/cielo'
import { getTema } from '../house/temas'
import { aplicarTemaUI, baseSegunLuz, type ModoVarsUI } from './temasUI'

/**
 * Modo transparente: mantiene la paleta del chrome de acuerdo con la luz de la
 * casa. El vidrio deja pasar la escena, así que su color lo pone el fondo: de
 * día el panel queda claro y pide tinta oscura; de noche queda oscuro y pide
 * tinta clara. Con una variante fija, medio día del ciclo el texto se leía por
 * debajo de 3:1.
 *
 * Solo actúa en `transparente`; los modos claro/oscuro tienen paneles sólidos y
 * no dependen de lo que haya detrás.
 */
export function useVidrioSegunLuz(): void {
  const modoUI = useAjustes((s) => s.modoUI)
  const temaUI = useAjustes((s) => s.temaUI)
  const minutos = useCiclo((s) => s.minutos)
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoColorFijo = useDiseño((s) => s.fondoColorFijo)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  // Base vigente: `baseSegunLuz` la necesita para aplicar la histéresis y no
  // conmutar de ida y vuelta mientras el sol cruza el horizonte.
  const base = useRef<ModoVarsUI>('claro')
  // Última combinación aplicada: al arrastrar la barra de 24 h el efecto corre
  // muchas veces seguidas y casi siempre no hay nada que cambiar.
  const aplicado = useRef('')

  useEffect(() => {
    if (modoUI !== 'transparente') {
      base.current = modoUI === 'oscuro' ? 'oscuro' : 'claro'
      aplicado.current = ''
      return
    }
    const fondo = colorFondoVisible({
      fondoId,
      fondoColorFijo,
      fondoImagenActivo,
      temaFondo: getTema(temaGlobal)?.fondo ?? null,
      minutos,
    })
    const siguiente = baseSegunLuz(fondo, base.current)
    base.current = siguiente
    // El tema/modo se reaplican desde ajustesStore SIN esta base, así que hay
    // que rehacerlo también cuando cambia el tema, no solo la luz.
    const firma = `${temaUI}|${siguiente}`
    if (firma === aplicado.current) return
    aplicado.current = firma
    aplicarTemaUI(temaUI, modoUI, siguiente)
  }, [modoUI, temaUI, minutos, fondoId, fondoColorFijo, fondoImagenActivo, temaGlobal])
}
