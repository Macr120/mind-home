import type { RoomModule, EsquemaCaptura, ComandoApp } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { mediaArchivoRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoMedia, EstadoMedia } from '../../core/data/db'
import { EntretenimientoApp } from './EntretenimientoApp'
import { tutorialEntretenimiento } from './tutorial'
import { JUEGOS_REALES, type IdJuegoReal } from './juegos/catalogo'
import { fechaLocalISO } from '../../core/fechaLocal'

const TIPOS_MEDIA: [string[], TipoMedia][] = [
  [['pelicula', 'filme', 'film', 'cine'], 'pelicula'],
  [['serie', 'episodio', 'temporada', 'capitulo'], 'serie'],
  [['libro', 'lei', 'leer', 'novela', 'lectura'], 'libro'],
  [['videojuego', 'juego', 'game', 'jugue'], 'videojuego'],
]

const ESTADOS_COMPLETADO = new Set(['vi', 'termine', 'complete', 'lei', 'acabe', 'finalice', 'viendo', 'acabe'])
const ESTADOS_EN_CURSO = new Set(['estoy', 'empece', 'empezando', 'leyendo', 'jugando', 'viendo'])

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  let tipo: TipoMedia | null = null
  for (const [claves, t] of TIPOS_MEDIA) {
    if (claves.some((k) => tokens.has(k))) { tipo = t; break }
  }
  if (!tipo) return false

  // Estado: completado vs en curso
  const estado: EstadoMedia = ESTADOS_COMPLETADO.has([...tokens].find(t => ESTADOS_COMPLETADO.has(t)) ?? '')
    ? 'completado'
    : ESTADOS_EN_CURSO.has([...tokens].find(t => ESTADOS_EN_CURSO.has(t)) ?? '')
    ? 'en_curso'
    : 'completado' // default al reportar algo

  // Intenta extraer el título: texto después de la palabra clave de tipo
  const PALABRAS_TIPO = ['pelicula', 'serie', 'libro', 'videojuego', 'juego', 'filme']
  let titulo = texto
  for (const p of PALABRAS_TIPO) {
    const idx = norm.indexOf(p)
    if (idx !== -1) {
      titulo = texto.slice(idx + p.length).replace(/^[\s:"-]+/, '').trim()
      break
    }
  }
  if (!titulo) titulo = texto.slice(0, 80)

  // Calificación opcional: "8/10", "4 estrellas", "calificacion 9"
  const calMatch = norm.match(/(\d+)\s*(?:\/\s*10|estrellas?|\/\s*5)/) ?? norm.match(/(?:calificacion|nota)[:\s]+(\d+)/)
  const calificacion = calMatch ? Math.min(5, Math.round(parseInt(calMatch[1]) / 2)) : 0

  await mediaArchivoRepo.add({
    tipo,
    titulo: titulo.slice(0, 120),
    genero: '',
    fecha: fechaLocalISO(),
    estado,
    calificacion,
    resena: texto,
    creadoEn: new Date().toISOString(),
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'media',
    descripcion: 'Una película, serie, libro o videojuego que el usuario vio, leyó, jugó o quiere registrar.',
    campos: [
      { campo: 'tipo', tipo: 'opcion', opciones: ['pelicula', 'serie', 'libro', 'videojuego'], descripcion: 'Tipo de contenido', requerido: true },
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título de la obra', requerido: true },
      { campo: 'estado', tipo: 'opcion', opciones: ['pendiente', 'en_curso', 'completado'], descripcion: "Lo terminó = 'completado'; lo está viendo/leyendo = 'en_curso'; lo quiere ver = 'pendiente'" },
      { campo: 'calificacion', tipo: 'numero', descripcion: 'Calificación 0–5 (0 = sin puntuar)' },
      { campo: 'genero', tipo: 'texto', descripcion: 'Género (si se menciona)' },
      { campo: 'resena', tipo: 'texto', descripcion: 'Opinión breve del usuario' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha de consumo yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const tipo = vTexto(v.tipo)
      const estado = vTexto(v.estado, 'completado')
      await mediaArchivoRepo.add({
        tipo: (['pelicula', 'serie', 'libro', 'videojuego'].includes(tipo) ? tipo : 'pelicula') as TipoMedia,
        titulo: vTexto(v.titulo, 'Sin título').slice(0, 120),
        genero: vTexto(v.genero),
        fecha: vFecha(v.fecha),
        estado: (['pendiente', 'en_curso', 'completado'].includes(estado) ? estado : 'completado') as EstadoMedia,
        calificacion: Math.min(5, Math.max(0, vNumero(v.calificacion))),
        resena: vTexto(v.resena),
        creadoEn: new Date().toISOString(),
      })
    },
  },
]

/** Nombres extra con los que se pide cada juego (además de su nombre del catálogo). */
const SINONIMOS_JUEGO: Partial<Record<IdJuegoReal, string[]>> = {
  viborita: ['vibora', 'snake', 'serpiente'],
  space: ['space', 'marcianos', 'invaders'],
  dino: ['dino', 'dinosaurio'],
  hockey: ['hockey'],
  cuatroenlinea: ['cuatro en linea', 'conecta 4'],
  simon: ['simon'],
  memorama: ['memoria'],
  debates: ['debate'],
}

/** Cada juego de la mesa es pedible por chat: «quiero jugar la viborita». */
const comandosJuegos: ComandoApp[] = JUEGOS_REALES.map((j) => ({
  seccion: 'mesa',
  dato: j.id,
  etiqueta: j.nombre,
  nombres: [normalizar(j.nombre), ...(SINONIMOS_JUEGO[j.id] ?? [])],
}))

const entretenimiento: RoomModule = {
  id: 'entretenimiento',
  nombre: 'Entretenimiento',
  icon: '🎮',
  categoria: 'complemento',
  posicion: [-3, 0, 0],
  color: '#34d399',
  App: EntretenimientoApp,
  tutorial: tutorialEntretenimiento,
  capturar,
  esquemas,
  comandos: [
    { seccion: 'archivo', etiqueta: 'Archivo', nombres: ['archivo', 'mis peliculas', 'mis series'] },
    { seccion: 'mesa', etiqueta: 'Juegos de mesa', nombres: ['juegos', 'juegos de mesa', 'mesa de juegos'] },
    ...comandosJuegos,
  ],
}

export default entretenimiento
