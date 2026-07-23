/**
 * Bandera efímera: ¿se guardó algo en una app durante la visita actual a un
 * cuarto? La marca `data/repository.ts` en cada escritura nueva (`add`/
 * `bulkAdd`); la consume `core/gamificacion/SisifoFestejo.tsx` al detectar la
 * salida del cuarto, para festejar en silencio si hubo registro.
 */
let huboRegistro = false

export function marcarRegistro(): void {
  huboRegistro = true
}

/** Lee y resetea la bandera de una sola vez (para no festejar dos veces). */
export function tomarHuboRegistro(): boolean {
  const v = huboRegistro
  huboRegistro = false
  return v
}
