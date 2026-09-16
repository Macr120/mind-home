import { mueblesRepo } from '../data/repository'
import { TIPO_PIEZAS } from '../house/catalogo'
import { pedirDestinoObjeto } from '../state/destinoObjetoStore'
import { useDiseño } from '../state/disenoStore'
import { useEditorUi } from '../state/editorUiStore'
import { piezas3DDeMueble } from './piezas3d'
import type { Mueble } from './tipos'

/**
 * Salida del taller: el mueble terminado se convierte en un objeto real de la
 * casa. La receta viaja con el objeto (`ObjetoCuarto.mueble`), que es lo que
 * permite reabrirlo en el taller y volver a ajustarle las medidas.
 */

/** Carpeta de la biblioteca donde caen los muebles del taller. */
export const CAT_MUEBLES = 'Muebles a medida'

export interface ResultadoPublicar {
  /** Objeto que hay que dejar seleccionado al cerrar el taller. */
  objetoId: number | null
  /** Fila de `muebles` (la biblioteca de diseños). */
  disenoId: number | null
  /** El usuario canceló el diálogo de destino: el mueble quedó solo guardado. */
  soloGuardado: boolean
}

/** Guarda (o actualiza) el diseño en la biblioteca de recetas del taller. */
async function guardarDiseno(m: Mueble, disenoId: number | null): Promise<number | null> {
  const ahora = new Date().toISOString()
  if (disenoId != null) {
    await mueblesRepo.update(disenoId, { nombre: m.nombre, mueble: m, actualizadoEn: ahora })
    return disenoId
  }
  const id = await mueblesRepo.add({
    nombre: m.nombre,
    mueble: m,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
  return typeof id === 'number' ? id : null
}

/**
 * Publica el mueble. Con `objetoId` REESCRIBE ese objeto (conserva su sitio,
 * escala y rotación); sin él crea la pieza de biblioteca y coloca una copia en
 * el destino que elija el usuario.
 */
export async function publicarMueble(
  m: Mueble,
  opts: { objetoId?: number | null; disenoId?: number | null } = {},
): Promise<ResultadoPublicar> {
  const piezas = piezas3DDeMueble(m)
  const d = useDiseño.getState()
  const disenoId = await guardarDiseno(m, opts.disenoId ?? null)

  if (opts.objetoId != null) {
    await d.setObjetoPiezas(opts.objetoId, piezas)
    await d.setObjetoNombre(opts.objetoId, m.nombre)
    await d.setObjetoMueble(opts.objetoId, m)
    return { objetoId: opts.objetoId, disenoId, soloGuardado: false }
  }

  const libId = await d.addObjetoLibreria(TIPO_PIEZAS, m.tablero.color, CAT_MUEBLES, piezas)
  await d.setObjetoNombre(libId, m.nombre)
  await d.setObjetoMueble(libId, m)

  const destino = await pedirDestinoObjeto()
  if (destino == null) {
    // Sin destino el mueble no se pierde: queda en la biblioteca de objetos,
    // listo para arrastrarlo al mapa cuando el usuario decida dónde va.
    return { objetoId: null, disenoId, soloGuardado: true }
  }
  const insId = await d.instanciarObjetoEnMapa(libId, undefined, destino)
  if (insId != null) useEditorUi.getState().setObjetoSel(insId)
  return { objetoId: insId, disenoId, soloGuardado: false }
}
