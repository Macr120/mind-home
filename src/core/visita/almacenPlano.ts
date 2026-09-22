/**
 * Dónde vive el plano de la casa: el bucket `partida-casa` (`partida/api.ts`) o,
 * en el modo LOCAL de pruebas (`?partidaLocal=<codigo>`), una Dexie MINÚSCULA
 * aparte.
 *
 * El stub local existe para poder verificar la visita entera con dos pestañas y
 * sin backend: `mind-home-planos-locales` la comparten todas las ventanas del
 * mismo origen, así que lo que arma el anfitrión lo encuentra el invitado. Es
 * una BD aparte a propósito — la de la visita se vacía al volcar, y la del
 * anfitrión no debe ganar ni una tabla por una prueba.
 */
import Dexie, { type Table } from 'dexie'
import * as api from '../partida/api'
import { partidaLocal } from '../partida/transporte'

interface PlanoLocal {
  id: string
  cuerpo: Blob
}

let bdLocal: Dexie | null = null

function almacenLocal(): Table<PlanoLocal, string> {
  if (!bdLocal) {
    bdLocal = new Dexie('mind-home-planos-locales')
    bdLocal.version(1).stores({ planos: 'id' })
  }
  return (bdLocal as Dexie & { planos: Table<PlanoLocal, string> }).planos
}

/** El anfitrión publica su plano. En local se guarda tal cual (sin gzip: no hace falta). */
export async function guardarPlano(salaId: string, plano: Blob): Promise<void> {
  if (partidaLocal() === null) {
    await api.subirPlano(salaId, plano)
    return
  }
  await almacenLocal().put({ id: salaId, cuerpo: plano })
}

/** El invitado baja el plano ya inflado. */
export async function traerPlano(salaId: string): Promise<ArrayBuffer> {
  if (partidaLocal() === null) return api.bajarPlano(salaId)
  const fila = await almacenLocal().get(salaId)
  if (!fila) throw new Error('sin plano local')
  return fila.cuerpo.arrayBuffer()
}
