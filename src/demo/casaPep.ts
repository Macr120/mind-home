/**
 * El mapa de la casa demo, construido PROGRAMÁTICAMENTE con las mismas
 * funciones del editor (así muros, puertas, accesos y bundles quedan idénticos
 * a una casa hecha a mano).
 *
 * El mapa se parte en bloques de 6×6 celdas de 8 m, que son los cuadrantes de
 * referencia del editor — uno por zona (ver `mapa/cuadrantes.ts`):
 *
 *   A1 La casa      B1 Canchas       C1 Santuario
 *   A2 Pista        B2 Mindfulness   C2 Tren y feria
 *
 * Se construyen SIEMPRE las seis zonas sobre una rejilla de 18×12, y un anillo
 * de riel por el perímetro las une. La demo es una plantilla llena: recortarla
 * por intereses dejaba a los tutoriales enseñando sobre terreno inexistente.
 *
 * Corre dentro de `construirDemo` (BD demo VIRGEN y stores recién hidratados
 * de ella — lo garantiza el DemoGate). Todo secuencial: `recompute` del layout
 * depende del estado ya asentado, igual que en la bienvenida real.
 */
import { colorZona } from '../core/house/cuadrantesMapa'
import { useAsistentes } from '../core/state/asistentesStore'
import { useDiseño } from '../core/state/disenoStore'
import { useLayout } from '../core/state/layoutStore'
import { BUILDERS_DEMO } from './builders'
import { construirCanchas } from './mapa/canchas'
import { construirCasa } from './mapa/casa'
import { CUADRANTES, TAM_CELDA, dimsMapaDemo } from './mapa/cuadrantes'
import { construirExteriorBase } from './mapa/exterior'
import { construirFeria } from './mapa/feria'
import { construirMindfulness } from './mapa/mindfulness'
import { construirPista } from './mapa/pista'
import { construirSantuario } from './mapa/santuario'
import { construirTren } from './mapa/tren'

export async function construirCasaPep(): Promise<void> {
  const L = useLayout.getState

  // ── Celda de 8 m ANTES de crear nada: colisiones, puertas y coordenadas
  // de mundo salen del SIZE activo. Se persiste en mapaConfig. ─────────────
  await L().setTamCeldaMapa(TAM_CELDA)

  // ── Rejilla de las seis zonas (E y S no desplazan lo ya puesto) ──────────
  const { cols, rows } = dimsMapaDemo()
  for (let i = L().gridCols; i < cols; i++) await L().expandGrid('E')
  for (let i = L().gridRows; i < rows; i++) await L().expandGrid('S')

  // Césped y calles primero: cada zona repinta encima lo suyo.
  await construirExteriorBase(cols, rows)

  const ids = await construirCasa({ jardinEnPatio: false })
  await construirCanchas(cols, rows)
  await construirSantuario(cols, rows)
  await construirPista(cols, rows)
  ids.jardin = await construirMindfulness(cols, rows)
  await construirFeria(cols, rows)
  // El anillo va al final: sus andenes se pintan sobre el suelo de las zonas.
  await construirTren(cols, rows)

  avisarAppsSinCuarto(ids)

  // ── Las zonas, con nombre: el editor las lista y la cámara salta a ellas ─
  for (const [i, q] of CUADRANTES.entries()) {
    // Campo a campo: el `emoji` es de la lista de zonas y no debe acabar
    // guardado en `mapaConfig`.
    await L().agregarCuadrante({
      id: q.id,
      nombre: q.nombre,
      col: q.col,
      row: q.row,
      cols: q.cols,
      rows: q.rows,
      color: colorZona(i),
    })
  }

  // ── Identidad: Pep@ y su gata Laika ──────────────────────────────────────
  const D = useDiseño.getState
  await D().setAvatarNombre('Pep@')
  await D().setAvatarPrenda('playera', '#f59e0b')
  await D().setAvatarPrenda('pantalon', '#334155')
  await D().setAvatarPrenda('tenis', '#e5e7eb')

  await useAsistentes.getState().guardar({
    id: 'custom-laika',
    nombre: 'Laika',
    emoji: '🐱',
    forma: 'gato',
    historia: 'La gata de Pep@. Llegó a la casa el mismo mes en que empezó a correr.',
    personalidad: 'Curiosa y dormilona; opina de todo con calma felina.',
    saludo: 'Miau. ¿Ya saliste a correr hoy?',
    cuartos: [],
    color: '#8a8f98',
    enMapa: true,
    corazon: 0.5,
  })
}

/**
 * Red de seguridad en desarrollo: una app cuyo builder escribe su año pero sin
 * cuarto en el mapa queda INALCANZABLE en silencio — `abrirApp` devuelve null
 * y el tour se aborta sin aviso. Si algún reparto futuro deja una app fuera,
 * que se vea aquí.
 *
 * El calendario no cuenta: su builder existe, pero se abre desde el reloj del
 * HUD y a propósito no tiene cuarto.
 */
const SIN_CUARTO_A_PROPOSITO = new Set(['calendario'])

function avisarAppsSinCuarto(ids: Record<string, string>): void {
  if (!import.meta.env.DEV) return
  const huerfanas = Object.keys(BUILDERS_DEMO).filter(
    (app) => !ids[app] && !SIN_CUARTO_A_PROPOSITO.has(app),
  )
  if (huerfanas.length) {
    console.warn('[MPH demo] Apps con builder pero sin cuarto en el mapa:', huerfanas)
  }
}
