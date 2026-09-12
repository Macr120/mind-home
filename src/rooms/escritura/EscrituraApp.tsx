import { useState } from 'react'
import { documentosRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { EditorDocumento } from './EditorDocumento'
import { ListaLibros } from './ListaLibros'

/**
 * Studio de escritura: la estantería de libros y el editor. Las carpetas del
 * libro (capítulos, personajes, lugares y actos con sus tramas) viven DENTRO
 * del editor (`PanelHistoria`); abrir un libro va directo a su último texto.
 */
export function EscrituraApp() {
  const t = useT()
  const [docAbierto, setDocAbierto] = useState<number | null>(null)

  /** Abre el texto más reciente del libro; un libro vacío estrena su primer capítulo. */
  const abrirLibro = async (id: number) => {
    // El repo lista por `actualizadoEn` descendente: el primero es el más reciente.
    const docs = (await documentosRepo.list()).filter((d) => d.historiaId === id)
    let docId = docs[0]?.id
    if (docId == null) {
      const ahora = new Date().toISOString()
      docId = await documentosRepo.add({
        titulo: t('escritura.libros.capitulo1', 'Capítulo 1'),
        contenido: '',
        palabras: 0,
        historiaId: id,
        seccion: 'capitulo',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    }
    setDocAbierto(docId)
  }

  if (docAbierto != null) {
    return <EditorDocumento id={docAbierto} alCerrar={() => setDocAbierto(null)} onIrADoc={setDocAbierto} />
  }
  return <ListaLibros onAbrir={(id) => void abrirLibro(id)} />
}
