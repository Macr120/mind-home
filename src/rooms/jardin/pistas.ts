import type { PaisajeId } from '../../core/audio/paisaje'

export interface Pista {
  id: PaisajeId
  icono: string
  nombre: string
  desc: string
}

/**
 * Las cuatro pistas de la meditación. El sonido se genera en vivo con Web Audio
 * (`core/audio/paisaje.ts`): no hay archivos que descargar ni derechos que pagar.
 */
export const PISTAS: Pista[] = [
  { id: 'bosque', icono: '🌲', nombre: 'Sonidos del bosque', desc: 'Viento entre los árboles y pájaros lejanos.' },
  { id: 'mar', icono: '🌊', nombre: 'Sonidos del mar', desc: 'Olas que van y vienen, sin prisa.' },
  { id: 'lluvia', icono: '🌧️', nombre: 'Lluvia', desc: 'Lluvia pareja, como desde la ventana.' },
  { id: 'cuencos', icono: '🔔', nombre: 'Cuencos tibetanos', desc: 'Resonancias largas que se apagan solas.' },
]

export const DURACIONES_PISTA = [2, 5, 10, 20]
