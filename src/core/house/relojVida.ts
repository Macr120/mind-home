/**
 * Reloj compartido de la «vida» de los objetos (hambre/ánimo decaen en horas):
 * UN solo setInterval para todos los objetos animados montados. Antes cada
 * instancia tenía el suyo — 30 objetos = 30 timers despertando la CPU y
 * disparando 30 setState escalonados.
 *
 * Uso: `const ahora = useSyncExternalStore(relojVida.subscribe, relojVida.getSnapshot)`.
 * El intervalo arranca con el primer suscriptor y muere con el último.
 */
export const MS_RELOJ_VIDA = 30_000

let ahora = Date.now()
let timer: number | null = null
const oyentes = new Set<() => void>()

export const relojVida = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    if (timer == null) {
      ahora = Date.now()
      timer = window.setInterval(() => {
        ahora = Date.now()
        for (const o of oyentes) o()
      }, MS_RELOJ_VIDA)
    }
    return () => {
      oyentes.delete(fn)
      if (oyentes.size === 0 && timer != null) {
        window.clearInterval(timer)
        timer = null
      }
    }
  },
  getSnapshot: () => ahora,
}
