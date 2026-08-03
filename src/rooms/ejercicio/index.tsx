import { lazy } from 'react'
import type { RoomModule, EsquemaCaptura, RutinaSugerible } from '../../core/registry'
import { vTexto, vNumero, vFecha } from '../../core/registry'
import {
  rutinasCardioRepo,
  rutinasFlexRepo,
  rutinasFuerzaRepo,
  rutinasRepo,
  sesionesEjercicioRepo,
} from '../../core/data/repository'
import { normalizar } from '../../core/chat/dispatcher'
import type { TipoEntrenamiento } from '../../core/data/db'
import { actividadId } from '../../core/rutinas'
import { tGlobal } from '../../core/i18n/useT'
import { agendaDelDia } from './agenda'
import { planMetasEjercicio } from './plan'
import { fechaLocalISO } from '../../core/fechaLocal'
import { flujosEjercicio } from './tutorial'
import { OPERACIONES_IA } from './costosIA'

/** Los tres tipos, para recorrer lo agendado de todos a la vez. */
const TIPOS_ENTRENAMIENTO: TipoEntrenamiento[] = ['fuerza', 'resistencia', 'flexibilidad']

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
    fecha: fechaLocalISO(),
    tipo,
    titulo: texto.slice(0, 60),
    duracionMin: duracion,
    nota: texto,
  })
  return true
}

const ETIQUETA_TIPO: Record<TipoEntrenamiento, [string, string]> = {
  fuerza: ['ejercicio.tab.fuerza', 'Fuerza'],
  resistencia: ['ejercicio.tab.resistencia', 'Resistencia'],
  flexibilidad: ['ejercicio.tab.flexibilidad', 'Flexibilidad'],
}

/** Rutina del catálogo → bloque agendable, el MISMO que arma TarjetaRutina. */
function sugerible(
  tipo: TipoEntrenamiento,
  r: { id?: number; nombre: string; duracionMin: number; descripcion?: string },
): RutinaSugerible[] {
  if (r.id == null) return []
  return [
    {
      tipo,
      tipoEtiqueta: tGlobal(...ETIQUETA_TIPO[tipo]),
      descripcion: r.descripcion,
      actividad: {
        actividadId: actividadId(tipo, r.id),
        plantillaId: 'ejercicio',
        nombre: r.nombre,
        emoji: '💪',
        horaSugerida: '07:00',
        duracionMin: r.duracionMin,
        seccion: tipo,
        registroRapido: {
          esquemaId: 'sesion',
          valores: { tipo, titulo: r.nombre, duracionMin: r.duracionMin },
          etiqueta: tGlobal('ejercicio.registrarSesion', 'Registrar {n} min', { n: r.duracionMin }),
        },
      },
    },
  ]
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

// La app 2D se descarga al entrar al cuarto, no en el arranque (los puntos de
// montaje ya envuelven en Suspense). El resto del módulo (capturar, esquemas,
// metaDiaria) sí es eager: lo usa el núcleo sin abrir el cuarto.
const EjercicioApp = lazy(() => import('./EjercicioApp').then((m) => ({ default: m.EjercicioApp })))

const ejercicio: RoomModule = {
  id: 'ejercicio',
  nombre: 'Ejercicio · Rutinas',
  icon: '💪',
  categoria: 'cuerpo',
  color: '#fb7185',
  App: EjercicioApp,
  capturar,
  esquemas,
  operacionesIA: OPERACIONES_IA,
  flujos: flujosEjercicio,
  // Booleana a propósito: las metas de la app son SEMANALES (3 sesiones/semana) y
  // repartirlas entre 7 días daría objetivos absurdos ("0.43 sesiones hoy"). Aquí
  // solo se pregunta si entrenaste; el contrato semanal sigue en su pestaña.
  metaDiaria: {
    clave: 'ejercicio.metaDiaria',
    etiquetaEs: 'Entrena hoy',
    seccion: 'fuerza',
    del: async (fecha) => {
      const hecho = (await sesionesEjercicioRepo.list()).filter((s) => s.fecha === fecha).length
      // Por repo y no por `db`: esto corre dentro de `useLiveQuery`, que rastrea las
      // consultas para re-ejecutarse sola cuando cambia lo agendado.
      const rutinas = await rutinasRepo.list()
      const plan = TIPOS_ENTRENAMIENTO.flatMap((tipo) => agendaDelDia(rutinas, tipo, fecha))
      return {
        hecho,
        objetivo: 1,
        // Sin entrenar aún, lo agendado dice qué toca; ya entrenado, no estorba.
        detalle:
          hecho === 0 && plan.length > 0 ? plan.map((p) => p.rutinaNombre).join(' · ') : undefined,
      }
    },
  },
  // El planificador ✨ del cronograma ve las rutinas ya creadas (las de fábrica y
  // las del usuario) y sugiere cuáles agendar para la meta pedida.
  rutinasPlan: async () => {
    const [fuerza, cardio, flex] = await Promise.all([
      rutinasFuerzaRepo.list(),
      rutinasCardioRepo.list(),
      rutinasFlexRepo.list(),
    ])
    return [
      ...fuerza.flatMap((r) => sugerible('fuerza', r)),
      ...cardio.flatMap((r) => sugerible('resistencia', r)),
      ...flex.flatMap((r) => sugerible('flexibilidad', r)),
    ]
  },
  planMetas: planMetasEjercicio,
  comandos: [
    { seccion: 'metas', etiqueta: 'Metas', nombres: ['metas de ejercicio'] },
    { seccion: 'fuerza', etiqueta: 'Fuerza', nombres: ['fuerza', 'pesas', 'piramide'] },
    { seccion: 'resistencia', etiqueta: 'Resistencia', nombres: ['resistencia', 'cardio'] },
    { seccion: 'flexibilidad', etiqueta: 'Flexibilidad', nombres: ['flexibilidad', 'estiramientos'] },
    // El cronograma dejó de ser pestaña: vive al final de Metas, así que ahí lleva.
    { seccion: 'metas', etiqueta: 'Cronograma', nombres: ['plan de ejercicio', 'plan de entrenamiento', 'cronograma de ejercicio'] },
  ],
}

export default ejercicio
