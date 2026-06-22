import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { sesionesMindfulnessRepo, registroAnimoRepo, gratitudDiariaRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoPractica } from '../../core/data/db'
import { JardinApp } from './JardinApp'

const TIPOS_PRACTICA: [string[], TipoPractica][] = [
  [['medite', 'meditacion', 'meditar'], 'meditacion'],
  [['respire', 'respiracion', 'respirar', 'respiratorio'], 'respiracion'],
  [['gratitud', 'agradeci', 'agradezco'], 'gratitud'],
  [['yoga', 'movimiento', 'tai'], 'movimiento'],
]

function detectarPractica(tokens: Set<string>): TipoPractica {
  for (const [claves, tipo] of TIPOS_PRACTICA) {
    if (claves.some((k) => tokens.has(k))) return tipo
  }
  return 'meditacion'
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Registro de ánimo: "animo 7", "estado de animo 8/10", "me siento 6"
  const animoMatch = norm.match(/(?:animo|mood|siento|estado)[^0-9]*(\d+)/)
  if (animoMatch) {
    const nivel = Math.min(10, Math.max(1, parseInt(animoMatch[1])))
    const EMOCIONES: Record<number, string> = { 1: 'muy mal', 2: 'mal', 3: 'bajo', 4: 'regular', 5: 'neutral', 6: 'bien', 7: 'bien', 8: 'muy bien', 9: 'excelente', 10: 'increíble' }
    await registroAnimoRepo.add({
      fecha: new Date().toISOString().slice(0, 10),
      nivel,
      emocion: EMOCIONES[nivel] ?? 'neutral',
      nota: texto,
    })
    return true
  }

  // Sesión de práctica: necesita duración
  const minMatch = norm.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/)
  const hrMatch = norm.match(/(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?/)
  if (!minMatch && !hrMatch) return false

  const duracion = minMatch
    ? parseInt(minMatch[1])
    : Math.round(parseFloat(hrMatch![1]) * 60)
  if (duracion <= 0) return false

  const tipo = detectarPractica(tokens)
  await sesionesMindfulnessRepo.add({
    fecha: new Date().toISOString().slice(0, 10),
    tipo,
    titulo: texto.slice(0, 60),
    duracionMin: duracion,
    nota: texto,
  })
  return true
}

const PRACTICAS_VALIDAS = new Set<string>(['meditacion', 'respiracion', 'sueno', 'gratitud', 'sonido', 'movimiento'])

const esquemas: EsquemaCaptura[] = [
  {
    id: 'animo',
    descripcion: 'Cómo se siente el usuario hoy (check-in de ánimo).',
    campos: [
      { campo: 'nivel', tipo: 'numero', descripcion: 'Nivel de ánimo 1–10 (1 = muy mal, 10 = increíble)', requerido: true },
      { campo: 'emocion', tipo: 'texto', descripcion: 'Emoción en una palabra (tranquilo, ansioso, contento…)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Por qué se siente así, en breve' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      await registroAnimoRepo.add({
        fecha: vFecha(v.fecha),
        nivel: Math.min(10, Math.max(1, vNumero(v.nivel, 5))),
        emocion: vTexto(v.emocion, 'neutral'),
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
  {
    id: 'practica',
    descripcion: 'Una práctica de mindfulness que el usuario realizó (meditación, respiración, yoga…).',
    campos: [
      { campo: 'tipo', tipo: 'opcion', opciones: ['meditacion', 'respiracion', 'sueno', 'gratitud', 'sonido', 'movimiento'], descripcion: 'Tipo de práctica; yoga/tai-chi = movimiento', requerido: true },
      { campo: 'duracionMin', tipo: 'numero', descripcion: 'Duración en minutos', requerido: true },
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título corto de la sesión' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const duracion = vNumero(v.duracionMin)
      if (duracion <= 0) return
      const tipo = vTexto(v.tipo)
      await sesionesMindfulnessRepo.add({
        fecha: vFecha(v.fecha),
        tipo: (PRACTICAS_VALIDAS.has(tipo) ? tipo : 'meditacion') as TipoPractica,
        titulo: vTexto(v.titulo, 'Práctica'),
        duracionMin: duracion,
      })
    },
  },
  {
    id: 'gratitud',
    descripcion: 'Cosas por las que el usuario está agradecido hoy (hasta tres).',
    campos: [
      { campo: 'item1', tipo: 'texto', descripcion: 'Primera cosa por la que agradece', requerido: true },
      { campo: 'item2', tipo: 'texto', descripcion: 'Segunda cosa (si la menciona)' },
      { campo: 'item3', tipo: 'texto', descripcion: 'Tercera cosa (si la menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
    ],
    guardar: async (v) => {
      const item1 = vTexto(v.item1)
      if (!item1) return
      await gratitudDiariaRepo.add({
        fecha: vFecha(v.fecha),
        item1,
        item2: vTexto(v.item2),
        item3: vTexto(v.item3),
      })
    },
  },
]

const jardin: RoomModule = {
  id: 'jardin',
  nombre: 'Jardín · Mindfulness',
  icon: '🧘',
  categoria: 'complemento',
  posicion: [9, 0, 0],
  color: '#4ade80',
  App: JardinApp,
  capturar,
  esquemas,
}

export default jardin
