import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vFecha } from '../../core/registry'
import { noticiasRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import type { CategoriaNoticia } from '../../core/data/db'
import { DiarioApp } from './DiarioApp'

const CATEGORIAS_NOTICIA: [string[], CategoriaNoticia][] = [
  [['politica', 'gobierno', 'presidente', 'eleccion', 'partido'], 'politica'],
  [['economia', 'mercado', 'bolsa', 'inflacion', 'finanzas', 'banco'], 'economia'],
  [['tecnologia', 'tech', 'ia', 'inteligencia', 'software', 'app'], 'tecnologia'],
  [['ciencia', 'investigacion', 'estudio', 'descubrimiento'], 'ciencia'],
  [['salud', 'medicina', 'virus', 'vacuna', 'hospital'], 'salud'],
  [['deporte', 'futbol', 'basket', 'tennis', 'olimpico'], 'deportes'],
  [['cultura', 'arte', 'musica', 'pelicula', 'libro'], 'cultura'],
  [['mundo', 'internacional', 'guerra', 'pais', 'global'], 'mundo'],
  [['nacional', 'mexico', 'local', 'ciudad', 'estado'], 'nacional'],
]

function detectarCategoria(tokens: Set<string>): CategoriaNoticia {
  for (const [claves, cat] of CATEGORIAS_NOTICIA) {
    if (claves.some((k) => tokens.has(k))) return cat
  }
  return 'otro'
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Requiere que mencione "noticia" o "noticias" para captura segura
  // (evitar falsos positivos con solo palabras clave de briefing)
  const esNoticia = tokens.has('noticia') || tokens.has('noticias') || tokens.has('briefing')
  if (!esNoticia) return false

  // Título: quita la palabra "noticia/s" del inicio si está
  let titulo = texto.replace(/^noticia[s]?[:\s]*/i, '').trim()
  if (!titulo) titulo = texto

  await noticiasRepo.add({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: detectarCategoria(tokens),
    titulo: titulo.slice(0, 150),
    resumen: texto,
    leido: true,
    destacada: false,
    creadoEn: new Date().toISOString(),
  })
  return true
}

const CATEGORIAS_VALIDAS = new Set<string>([
  'mundo', 'nacional', 'politica', 'economia', 'tecnologia', 'ciencia',
  'salud', 'deportes', 'cultura', 'entretenimiento', 'local', 'otro',
])

const esquemas: EsquemaCaptura[] = [
  {
    id: 'noticia',
    descripcion: 'Una noticia que el usuario quiere guardar en su central personal.',
    campos: [
      { campo: 'titulo', tipo: 'texto', descripcion: 'Titular de la noticia', requerido: true },
      { campo: 'categoria', tipo: 'opcion', opciones: [...CATEGORIAS_VALIDAS], descripcion: 'Categoría de la noticia', requerido: true },
      { campo: 'resumen', tipo: 'texto', descripcion: 'Resumen breve de la noticia' },
      { campo: 'fuente', tipo: 'texto', descripcion: 'Medio o fuente (si se menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const cat = vTexto(v.categoria, 'otro')
      await noticiasRepo.add({
        fecha: vFecha(v.fecha),
        categoria: (CATEGORIAS_VALIDAS.has(cat) ? cat : 'otro') as CategoriaNoticia,
        titulo: vTexto(v.titulo, 'Noticia').slice(0, 150),
        resumen: vTexto(v.resumen),
        fuente: vTexto(v.fuente) || undefined,
        leido: true,
        destacada: false,
        creadoEn: new Date().toISOString(),
      })
    },
  },
]

const diario: RoomModule = {
  id: 'diario',
  nombre: 'Diario · Noticias',
  icon: '📰',
  categoria: 'complemento',
  posicion: [-3, 0, 6],
  color: '#f472b6',
  App: DiarioApp,
  capturar,
  esquemas,
}

export default diario
