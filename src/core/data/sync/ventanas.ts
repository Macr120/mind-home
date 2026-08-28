/**
 * Aviso entre las VENTANAS de este mismo equipo: la app y la casa puesta de
 * fondo de pantalla. Comparten el origen `app://mph` y por tanto la base de
 * datos, pero no la memoria — cada ventana tiene sus propios stores, y los de la
 * casa leen Dexie UNA vez al importarse. Sin esto, el fondo se quedaba con la
 * casa tal y como estaba al encenderlo: había que quitarlo y volverlo a poner
 * para ver un cuarto nuevo o un mueble movido.
 *
 * No hace falta inventar el repintado: `notificarRepintado` ya sabe recargar los
 * stores de la casa a partir de las tablas tocadas, y es lo que usa el pull de
 * sync para pintar lo que llega del otro dispositivo. Aquí solo hay que decirle
 * QUÉ se ha tocado, y de eso se entera el middleware de Dexie.
 */
import type { DBCore, DBCoreMutateRequest, Middleware } from 'dexie'
import { notificarRepintado } from './repintar'

const CANAL = 'mph.ventanas'

/** Mover un mueble son decenas de escrituras seguidas: se anuncian de una vez. */
const AGRUPAR_MS = 500

let canal: BroadcastChannel | null = null

function elCanal(): BroadcastChannel | null {
  try {
    canal ??= new BroadcastChannel(CANAL)
    return canal
  } catch {
    // Sin BroadcastChannel el fondo no se entera de los cambios y sigue como
    // hasta ahora; no es motivo para romper una escritura.
    return null
  }
}

const tocadas = new Set<string>()
let pendiente: ReturnType<typeof setTimeout> | null = null

function anunciar(tabla: string): void {
  tocadas.add(tabla)
  if (pendiente) return
  pendiente = setTimeout(() => {
    pendiente = null
    const lista = [...tocadas]
    tocadas.clear()
    // BroadcastChannel NO se lo entrega a quien publica, así que la ventana que
    // escribe no se repinta a sí misma y no hay eco entre las dos.
    elCanal()?.postMessage(lista)
  }, AGRUPAR_MS)
}

/** Anuncia a las otras ventanas qué tablas se acaban de tocar. */
export const ventanasMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'mhVentanas',
  create: (core) => ({
    ...core,
    table: (nombre) => {
      const tabla = core.table(nombre)
      return {
        ...tabla,
        async mutate(req: DBCoreMutateRequest) {
          const res = await tabla.mutate(req)
          anunciar(nombre)
          return res
        },
      }
    },
  }),
}

/**
 * Repinta esta ventana cuando otra toca la casa. La llama el fondo de pantalla:
 * la ventana normal no lo necesita, porque es la que edita.
 */
export function escucharOtrasVentanas(): void {
  const c = elCanal()
  if (!c) return
  c.onmessage = (e: MessageEvent<unknown>) => {
    const tablas = Array.isArray(e.data) ? (e.data as string[]) : []
    if (tablas.length > 0) notificarRepintado(new Set(tablas))
  }
}
