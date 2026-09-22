import { useEffect, useRef, useState } from 'react'
import { documentosRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { EditorDocumento } from './EditorDocumento'
import { ListaLibros } from './ListaLibros'

/**
 * Studio de escritura: la estantería de libros y el editor. Las carpetas del
 * libro (capítulos, personajes, lugares y actos con sus tramas) viven DENTRO
 * del editor (`PanelHistoria`); abrir un libro va directo a su último texto.
 */
export function EscrituraApp() {
  const t = useT()
  // La intención puede traer una HOJA concreta (`doc:12`, una compartida por
  // enlace) o un LIBRO (el número suelto que devuelve `importarDocumento`).
  const [docAbierto, setDocAbierto] = useState<number | null>(() => {
    const m = /^doc:(\d+)$/.exec(intencionApp('escritura')?.dato ?? '')
    return m ? Number(m[1]) : null
  })

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

  // Un libro entero en la intención (lo que devuelve importar un documento del
  // buzón): se abre su texto más reciente. Una sola vez por montaje.
  const abrirLibroRef = useRef(abrirLibro)
  useEffect(() => {
    abrirLibroRef.current = abrirLibro
  })
  useEffect(() => {
    const dato = intencionApp('escritura')?.dato ?? ''
    if (/^\d+$/.test(dato)) void abrirLibroRef.current(Number(dato))
  }, [])

  if (docAbierto != null) {
    return <EditorDocumento id={docAbierto} alCerrar={() => setDocAbierto(null)} onIrADoc={setDocAbierto} />
  }
  return <ListaLibros onAbrir={(id) => void abrirLibro(id)} />
}
