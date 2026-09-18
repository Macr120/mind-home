import { lazy } from 'react'
import { vTexto, type EsquemaCaptura, type Plantilla } from '../../core/appContrato'
import { documentosRepo, historiasRepo } from '../../core/data/repository'
import type { TipoLibro } from '../../core/data/db'
import { registrarProveedorRecursos } from '../../core/recursosStudio'
import { registrarProveedorCompartible } from '../../core/buzon/compartibles'
import { COLOR_FABRICA } from './constantes'
import { OPERACIONES_IA } from './costosIA'

const TIPOS_LIBRO: TipoLibro[] = ['blanco', 'cuento', 'guion', 'teatro']

/**
 * Lo único que el chat guarda aquí: un texto que el usuario dicta o que pide
 * redactar («escribe un cuento sobre… y guárdalo en mis libros»). Nace como un
 * libro nuevo con ese texto de primer capítulo, igual que el botón «Nuevo libro»
 * y como los documentos sueltos que la estantería envuelve.
 */
const esquemas: EsquemaCaptura[] = [
  {
    id: 'texto',
    descripcion:
      'Un texto para guardar como libro nuevo en el Studio de escritura: una nota, un poema, un cuento, una carta o un guion que el usuario dicta o te pide redactar. Si te pide redactarlo, escribe tú el texto completo.',
    campos: [
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título del libro', requerido: true },
      { campo: 'texto', tipo: 'texto', descripcion: 'El texto completo, en párrafos separados por una línea en blanco', requerido: true },
      { campo: 'tipo', tipo: 'opcion', opciones: TIPOS_LIBRO, descripcion: 'Portada: blanco (notas, cartas, poemas), cuento, guion o teatro' },
    ],
    guardar: async (v) => {
      const { contarPalabras, parrafosHtml } = await import('./sanitizarHtml')
      const texto = vTexto(v.texto)
      const titulo = vTexto(v.titulo, texto.split('\n')[0].slice(0, 60))
      const tipoPedido = vTexto(v.tipo) as TipoLibro
      const ahora = new Date().toISOString()
      const historiaId = await historiasRepo.add({
        titulo,
        tipo: TIPOS_LIBRO.includes(tipoPedido) ? tipoPedido : 'blanco',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      await documentosRepo.add({
        titulo,
        contenido: parrafosHtml(texto),
        palabras: contarPalabras(texto),
        historiaId,
        seccion: 'capitulo',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    },
  },
]

// El Studio de video trae los textos como guion de narración (registro eager, datos con import()).
registrarProveedorRecursos({
  app: 'escritura',
  listar: async () => (await import('./recursos')).listarRecursos(),
  obtener: async (clave) => (await import('./recursos')).obtenerRecurso(clave),
})

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense).
const EscrituraApp = lazy(() => import('./EscrituraApp').then((m) => ({ default: m.EscrituraApp })))

// Los documentos se pueden mandar a otra persona por el buzón (registro eager, datos con import()).
registrarProveedorCompartible({
  app: 'escritura',
  tipos: [
    {
      tipo: 'documento',
      icono: 'libro',
      etiqueta: (t) => t('buzon.compartible.documento', 'Documento'),
      listar: async () => (await import('./compartible')).listarDocumentos(),
      empaquetar: async (clave) => (await import('./compartible')).empaquetarDocumentoPorClave(clave),
      importar: async (p) => (await import('./compartible')).importarDocumento(p),
    },
  ],
})

const escritura: Plantilla = {
  id: 'escritura',
  nombre: 'Escritura · Libros',
  icon: '📝',
  categoria: 'mente',
  color: COLOR_FABRICA,
  App: EscrituraApp,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  comandos: [
    {
      seccion: 'libros',
      etiqueta: 'Libros',
      nombres: ['libro', 'libros', 'documento', 'documentos', 'escribir', 'escritura', 'historia', 'historias', 'novela', 'cuento', 'guion', 'word'],
    },
  ],
}

export default escritura
