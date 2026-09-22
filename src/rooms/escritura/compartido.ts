/**
 * El Studio de escritura por enlace: convertir una hoja en un documento
 * compartido y recibir las que otras personas comparten.
 *
 * Se comparte la HOJA (`Documento`), no el libro: al receptor le aparece dentro
 * de un libro local «Compartidos conmigo» (`Historia.compartidos`), con lo que
 * no hay que negociar carpetas, fichas ni relaciones entre dos bibliotecas.
 */
import type { Editor } from '@tiptap/core'
import { prosemirrorJSONToYDoc } from '@tiptap/y-tiptap'
import * as Y from 'yjs'
import { abrirApp } from '../../core/abrirApp'
import { documentosRepo, historiasRepo } from '../../core/data/repository'
import * as api from '../../core/espacios/api'
import { refrescarEspacios } from '../../core/espacios/conectar'
import { nombreTipo } from '../../core/espacios/enlaces'
import type { Espacio } from '../../core/espacios/tipos'
import { b64 } from '../../core/espacios/yjs'
import { tGlobal } from '../../core/i18n/useT'
import { notificar } from '../../core/notificaciones'
import { useDiseño } from '../../core/state/disenoStore'

/** El fragmento que usa la extensión `Collaboration` de TipTap. */
const FRAGMENTO = 'default'

const sinTitulo = () => tGlobal('esp.sinTitulo', 'Sin título')

/**
 * Crea el espacio de una hoja y sube su texto actual como snapshot inicial:
 * nadie entra nunca a un documento vacío. Devuelve el `espacioId`.
 */
export async function compartirDocumento(id: number, editor: Editor): Promise<string> {
  const d = (await documentosRepo.list()).find((x) => x.id === id)
  const espacio = await api.crear('documento', d?.titulo || sinTitulo(), {})
  const ydoc = prosemirrorJSONToYDoc(editor.schema, editor.getJSON(), FRAGMENTO)
  try {
    // `hastaSeq: 0` — el log está vacío, esto solo deja el estado de partida.
    await api.guardarSnapshot(espacio.espacioId, { v: 1, yjs: b64(Y.encodeStateAsUpdate(ydoc)) }, 0)
  } finally {
    ydoc.destroy()
  }
  await documentosRepo.update(id, { espacioId: espacio.espacioId })
  await refrescarEspacios()
  return espacio.espacioId
}

/** El libro local donde caen las hojas que me comparten (se estrena una vez). */
async function asegurarLibroCompartidos(): Promise<number> {
  const ya = (await historiasRepo.list()).find((h) => h.compartidos && h.id != null)
  if (ya?.id != null) return ya.id
  const ahora = new Date().toISOString()
  return historiasRepo.add({
    titulo: tGlobal('esp.doc.libro', 'Compartidos conmigo'),
    tipo: 'blanco',
    compartidos: true,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/**
 * La hoja local de un espacio de tipo documento: la que ya existe, o una nueva
 * y vacía dentro de «Compartidos conmigo» (el contenido llega por Yjs al abrir).
 */
export async function asegurarDocumentoLocal(e: Pick<Espacio, 'espacioId' | 'titulo'>): Promise<number> {
  const ya = (await documentosRepo.list()).find((d) => d.espacioId === e.espacioId)
  if (ya?.id != null) return ya.id
  const historiaId = await asegurarLibroCompartidos()
  const ahora = new Date().toISOString()
  return documentosRepo.add({
    titulo: e.titulo || sinTitulo(),
    contenido: '',
    palabras: 0,
    historiaId,
    seccion: 'capitulo',
    espacioId: e.espacioId,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/**
 * Entrar por el enlace: la hoja queda lista y la app se abre encima de ella.
 *
 * El enlace abre la app entera, así que esto puede correr ANTES de que la casa
 * haya leído sus objetos de Dexie; sin esperarlos, `abrirApp` no encontraría el
 * escritorio de Escritura aunque esté puesto y saldría el aviso de que falta.
 */
export async function aterrizarDocumento(e: Espacio): Promise<void> {
  const id = await asegurarDocumentoLocal(e)
  for (let i = 0; i < 50 && !useDiseño.getState().cargado; i++) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (abrirApp('escritura', 'libros', `doc:${id}`) !== null) return
  void notificar({
    clave: `espacio:${e.espacioId}`,
    titulo: e.titulo || sinTitulo(),
    cuerpo: tGlobal('esp.aterrizar.sinApp', 'Coloca la app {n} en tu casa para abrirlo', { n: nombreTipo('documento') }),
    efimero: true,
  })
}
