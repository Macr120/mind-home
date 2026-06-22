import type { RoomModule, EsquemaCaptura } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import { sesionesEjercicioRepo } from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoEntrenamiento } from '../../core/data/db'
import { EjercicioApp } from './EjercicioApp'

const TIPO_FUERZA = ['pesas', 'gym', 'gimnasio', 'fuerza', 'musculacion', 'pecho', 'espalda', 'piernas', 'brazos', 'hombros']
const TIPO_FLEXIBILIDAD = ['yoga', 'stretching', 'flexibilidad', 'estiramiento', 'estirar', 'pilates']
const TIPO_RESISTENCIA = ['corri', 'correr', 'cardio', 'bici', 'nado', 'nadar', 'caminata', 'caminar', 'trote', 'maraton', 'km', 'kilometros']

function detectarTipo(tokens: Set<string>): TipoEntrenamiento {
  if (TIPO_FUERZA.some((k) => tokens.has(k))) return 'fuerza'
  if (TIPO_FLEXIBILIDAD.some((k) => tokens.has(k))) return 'flexibilidad'
  if (TIPO_RESISTENCIA.some((k) => tokens.has(k))) return 'resistencia'
  return 'resistencia'
}

async function capturar(texto: string): Promise<boolean> {
  const norm = normalizar(texto)
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean))

  // Detecta duración: "30 minutos", "30 min", "1 hora", "45m"
  const minMatch = norm.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/)
  const hrMatch = norm.match(/(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?/)
  if (!minMatch && !hrMatch) return false

  const duracion = minMatch
    ? parseInt(minMatch[1])
    : Math.round(parseFloat(hrMatch![1]) * 60)
  if (duracion <= 0) return false

  const tipo = detectarTipo(tokens)

  await sesionesEjercicioRepo.add({
    fecha: new Date().toISOString().slice(0, 10),
    tipo,
    titulo: texto.slice(0, 60),
    duracionMin: duracion,
    nota: texto,
  })
  return true
}

const esquemas: EsquemaCaptura[] = [
  {
    id: 'sesion',
    descripcion: 'Una sesión de ejercicio que el usuario realizó.',
    campos: [
      { campo: 'tipo', tipo: 'opcion', opciones: ['fuerza', 'resistencia', 'flexibilidad'], descripcion: "Modalidad: pesas/gym = 'fuerza'; correr/cardio/bici/nadar = 'resistencia'; yoga/estiramiento = 'flexibilidad'", requerido: true },
      { campo: 'duracionMin', tipo: 'numero', descripcion: 'Duración en minutos', requerido: true },
      { campo: 'titulo', tipo: 'texto', descripcion: 'Título corto de la sesión (ej. "Pierna y glúteo", "Carrera 5K")' },
      { campo: 'distanciaKm', tipo: 'numero', descripcion: 'Kilómetros recorridos (solo resistencia, si se mencionan)' },
      { campo: 'rpe', tipo: 'numero', descripcion: 'Esfuerzo percibido 1–10 (si se menciona)' },
      { campo: 'fecha', tipo: 'fecha', descripcion: 'Fecha yyyy-mm-dd (hoy si no se menciona)' },
      { campo: 'nota', tipo: 'texto', descripcion: 'Observación breve' },
    ],
    guardar: async (v) => {
      const duracion = vNumero(v.duracionMin)
      if (duracion <= 0) return
      const tipo = vTexto(v.tipo)
      const distancia = vNumero(v.distanciaKm)
      const rpe = vNumero(v.rpe)
      await sesionesEjercicioRepo.add({
        fecha: vFecha(v.fecha),
        tipo: tipo === 'fuerza' || tipo === 'flexibilidad' ? tipo : 'resistencia',
        titulo: vTexto(v.titulo, 'Sesión de ejercicio'),
        duracionMin: duracion,
        distanciaKm: distancia > 0 ? distancia : undefined,
        rpe: rpe >= 1 && rpe <= 10 ? rpe : undefined,
        nota: vTexto(v.nota) || undefined,
      })
    },
  },
]

const ejercicio: RoomModule = {
  id: 'ejercicio',
  nombre: 'Ejercicio · Rutinas',
  icon: '💪',
  categoria: 'cuerpo',
  posicion: [-3, 0, -6],
  color: '#fb7185',
  App: EjercicioApp,
  capturar,
  esquemas,
}

export default ejercicio
