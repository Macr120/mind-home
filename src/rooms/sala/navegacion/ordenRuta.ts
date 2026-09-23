import { create } from 'zustand'
import { normalizarOrden } from '../../../core/navegador/ordenes'

/**
 * Puente entre el chat y «Cómo llegar». Con la vista Lugares elegida, lo que
 * escribes en la barra del chat es un DESTINO (igual que en la vista Navegador
 * es una búsqueda): el ChatBox deja aquí la petición y `NavegarTab` —el único
 * que sabe leer el GPS, geocodificar y pedirle la ruta a HERE— la atiende.
 */
interface OrdenRutaState {
  /** Destino pedido desde el chat, pendiente de trazar. */
  destino: string | null
  /** Sube con cada petición: pedir dos veces el mismo sitio vuelve a trazarlo. */
  sello: number
  pedirRuta: (destino: string) => void
  atendida: () => void
}

export const useOrdenRuta = create<OrdenRutaState>((set) => ({
  destino: null,
  sello: 0,
  pedirRuta: (destino) => set((s) => ({ destino, sello: s.sello + 1 })),
  atendida: () => set({ destino: null }),
}))

/**
 * Se queda con el sitio y tira el «llévame a…» de delante: el geocodificador
 * busca lugares, no frases. Los verbos sueltos («ruta», «ir», «go») exigen el
 * conector para que «Ruta 66» siga siendo un destino y no una orden.
 */
const PREFIJOS = new RegExp(
  '^(?:como (?:llego|llegar|voy)|llevame|llevanos|how do i get|take me)(?: a| al| a la| hasta| hacia| to)?\\s+' +
    '|^(?:ruta|ir|irme|quiero ir|vamos|navega|navegar|route|directions|go|navigate)(?: a| al| a la| hasta| hacia| to)\\s+',
)

export function destinoDeFrase(texto: string): string {
  const m = PREFIJOS.exec(normalizarOrden(texto))
  // El recorte va por PALABRAS: el texto normalizado perdió acentos y signos,
  // así que sus índices no sirven para cortar el original.
  if (!m) return texto.trim()
  return texto.trim().split(/\s+/).slice(m[0].trim().split(' ').length).join(' ')
}

/**
 * ¿La frase PIDE una ruta con todas las letras («llévame a la Alameda»)? Eso
 * vale desde cualquier vista del chat; el nombre del sitio a secas solo cuenta
 * con Lugares elegido, que si no cualquier palabra suelta sería un destino.
 */
export function rutaPedida(texto: string): string | null {
  if (!PREFIJOS.test(normalizarOrden(texto))) return null
  const destino = destinoDeFrase(texto)
  return destino.length > 1 ? destino : null
}
