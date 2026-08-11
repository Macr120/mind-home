/**
 * Cuadrante · Las canchas.
 *
 * Una cancha es un objeto de mapa `cancha:<clase>` con tamaño REAL en metros
 * (`CANCHAS[clase].largo` = eje X, `.ancho` = eje Z). No colisionan, pero
 * entrar en su rectángulo dispara su minijuego: por eso van a escala reducida
 * y con holgura, y en desarrollo se avisa si dos se traslapan. Las posiciones
 * son OFFSETS del área útil del cuadrante — si la malla crece, el complejo se
 * mueve con su bloque en vez de quedarse corto.
 *
 * También siembra el AÑO de marcadores (`db.marcadores`, una fila por cancha):
 * el último partido de Pep@ en cada una.
 */
import type { MarcadorCancha } from '../../core/data/db'
import { aplicarPisoExteriorCeldas, marcadoresRepo } from '../../core/data/repository'
import { CANCHAS, TIPO_CANCHA_PREFIJO, type ClaseCancha } from '../../core/state/canchasStore'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import { TAM_CELDA_BASE } from '../../core/house/walls'
import { areaUtilZona, celdasRect, mundo, TAM_CELDA } from './cuadrantes'

/**
 * Escala EFECTIVA: con celda de 8 m, el área útil de la zona es de 40 × 32 m.
 * Es el máximo que admite ese rectángulo con las cuatro canchas: manda el FONDO
 * (fútbol 15 + béisbol girado 24 = 39 × escala) más el pasillo entre bandas.
 * Subirla más dispara `avisarTraslapes`.
 */
const ESCALA = 0.74
/**
 * Lo que se GUARDA en el objeto: las canchas escalan con la celda del mapa (`escalaCancha`),
 * así que se compensa el 8/6 del demo para que el tamaño en pantalla sea exactamente ESCALA.
 */
const ESCALA_GUARDADA = (ESCALA * TAM_CELDA_BASE) / TAM_CELDA

type Rect = { c0: number; r0: number; c1: number; r1: number }

interface Colocacion {
  clase: ClaseCancha
  /** Offsets (en celdas, con fracción) desde la esquina del área útil. */
  dc: number
  dr: number
  rot: 0 | 90
  /** El último partido de Pep@ en esta cancha (año de uso). */
  marcador: Omit<MarcadorCancha, 'id' | 'canchaId'>
}

// Dos bandas: arriba las someras (fútbol y básquet), abajo las profundas
// (béisbol y tenis, ambos girados 90°). Girar el béisbol es lo que permite la
// escala actual: de pie ocupa 28 m de fondo y no cabían las dos bandas. Entre
// bandas quedan ~2.1 m de pasillo para cruzar sin disparar el minijuego vecino,
// y todas se apartan ≥1 m de los faroles de las esquinas.
const CANCHAS_DEMO: Colocacion[] = [
  { clase: 'futbol', dc: 1.03, dr: 0.244, rot: 0, marcador: { yo: 3, rival: 2 } },
  { clase: 'basket', dc: 3.26, dr: 0.244, rot: 0, marcador: { yo: 21, rival: 15 } },
  { clase: 'beisbol', dc: 1.17, dr: 2.31, rot: 90, marcador: { yo: 5, rival: 4 } },
  {
    clase: 'tenis',
    dc: 3.35,
    dr: 2.31,
    rot: 90,
    marcador: { yo: 0, rival: 0, juegosYo: 4, juegosRival: 3, setsYo: 2, setsRival: 1, mejorPeloteo: 18 },
  },
]

/**
 * Las cuatro esquinas de la EXPLANADA (no el centro de la celda esquina): a ~1 m
 * del borde los faroles dejan de comerse los 3 m de duela que necesitan las
 * canchas para crecer.
 */
const RETRANQUEO_FAROL = 0.375
const esquinasFarol = (u: Rect) => {
  const r = RETRANQUEO_FAROL
  return [
    { col: u.c0 - r, row: u.r0 - r },
    { col: u.c1 + r, row: u.r0 - r },
    { col: u.c0 - r, row: u.r1 + r },
    { col: u.c1 + r, row: u.r1 + r },
  ]
}

export async function construirCanchas(cols: number, rows: number): Promise<void> {
  const D = useDiseño.getState
  const u = areaUtilZona('zona-canchas', cols, rows)

  // Explanada del complejo deportivo.
  await aplicarPisoExteriorCeldas(0, celdasRect(u.c0, u.r0, u.c1, u.r1), 'cemento', '#8b949e')

  avisarTraslapes(u)
  avisarFarolesEncimados(u)

  for (const c of CANCHAS_DEMO) {
    const meta = CANCHAS[c.clase]
    const { x, z } = mundo(u.c0 + c.dc, u.r0 + c.dr)
    const id = await D().addObjeto(MAPA_ROOM, `${TIPO_CANCHA_PREFIJO}${c.clase}`, meta.color, undefined, { x, z })
    if (c.rot) await D().setObjetoRotacion(id, c.rot)
    await D().setObjetoEscala(id, ESCALA_GUARDADA)
    await D().setObjetoNombre(id, meta.nombre)
    await marcadoresRepo.add({ canchaId: id, ...c.marcador })
  }

  // Faroles de las esquinas del complejo.
  for (const { col, row } of esquinasFarol(u)) {
    const { x, z } = mundo(col, row)
    await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, { x, z })
  }
}

/** Rectángulo que ocupa una cancha en metros de mundo, ya rotado y escalado. */
function rectDe(u: Rect, c: Colocacion) {
  const meta = CANCHAS[c.clase]
  const largo = meta.largo * ESCALA
  const ancho = meta.ancho * ESCALA
  const [ex, ez] = c.rot === 90 ? [ancho, largo] : [largo, ancho]
  const { x, z } = mundo(u.c0 + c.dc, u.r0 + c.dr)
  return { x0: x - ex / 2, x1: x + ex / 2, z0: z - ez / 2, z1: z + ez / 2 }
}

/** En desarrollo: dos canchas encimadas se pelean el minijuego. */
function avisarTraslapes(u: Rect): void {
  if (!import.meta.env.DEV) return
  const HOLGURA = 2 // metros mínimos entre rectángulos
  for (let i = 0; i < CANCHAS_DEMO.length; i++) {
    for (let j = i + 1; j < CANCHAS_DEMO.length; j++) {
      const a = rectDe(u, CANCHAS_DEMO[i])
      const b = rectDe(u, CANCHAS_DEMO[j])
      const separadas =
        a.x1 + HOLGURA <= b.x0 || b.x1 + HOLGURA <= a.x0 || a.z1 + HOLGURA <= b.z0 || b.z1 + HOLGURA <= a.z0
      if (!separadas) {
        console.warn(
          `[MPH demo] Canchas demasiado juntas: ${CANCHAS_DEMO[i].clase} y ${CANCHAS_DEMO[j].clase}`,
        )
      }
    }
  }
  // Y que ninguna se salga del área útil (media celda de holgura al borde).
  const limite = {
    x0: mundo(u.c0 - 0.5, 0).x,
    x1: mundo(u.c1 + 0.5, 0).x,
    z0: mundo(0, u.r0 - 0.5).z,
    z1: mundo(0, u.r1 + 0.5).z,
  }
  for (const c of CANCHAS_DEMO) {
    const r = rectDe(u, c)
    if (r.x0 < limite.x0 || r.x1 > limite.x1 || r.z0 < limite.z0 || r.z1 > limite.z1) {
      console.warn(`[MPH demo] La cancha ${c.clase} se sale de su cuadrante (celda ${TAM_CELDA} m)`)
    }
  }
}

/**
 * En desarrollo: un farol de esquina dentro del rectángulo de una cancha se ve
 * clavado en la duela, y de noche la ilumina desde dentro. Las canchas crecen
 * con `ESCALA`, así que este aviso avisa antes de que vuelva a pasar.
 */
function avisarFarolesEncimados(u: Rect): void {
  if (!import.meta.env.DEV) return
  const MARGEN = 1 // metros libres alrededor del poste
  for (const e of esquinasFarol(u)) {
    const { x, z } = mundo(e.col, e.row)
    for (const c of CANCHAS_DEMO) {
      const r = rectDe(u, c)
      const dentro =
        x >= r.x0 - MARGEN && x <= r.x1 + MARGEN && z >= r.z0 - MARGEN && z <= r.z1 + MARGEN
      if (dentro) {
        console.warn(
          `[MPH demo] El farol de la celda (${e.col},${e.row}) cae sobre la cancha de ${c.clase}`,
        )
      }
    }
  }
}
