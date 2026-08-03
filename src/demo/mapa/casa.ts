/**
 * Cuadrante 1 · La casa de Pep@ (cols 0-5, rows 0-5).
 *
 * Los 15 cuartos con app viven en cols 1-3 × rows 1-3 (planta baja 3×3) y
 * cols 1-2 × rows 1-3 (piso 1, 2×3): la columna 3 queda descubierta para que
 * se vean los techos de abajo. El resto del cuadrante es su terreno: andador,
 * cochera y jardín delantero.
 *
 * El jardín (app Mindfulness) es el único de las 16 apps que vive fuera de
 * este cuadrante: normalmente está en su propia zona. Si el visitante no la
 * eligió, `jardinEnPatio` lo planta aquí (1×1 en el patio) — así ninguna app
 * se queda sin cuarto, que la dejaría inalcanzable en silencio.
 *
 * Ojo con las figuras: un recorte fino parte el lado y la mitad recta que
 * queda NO admite ventana (`MurosPerimetroFormaCuarto`), así que un cuarto
 * lleva esquina recortada o ventana, nunca las dos.
 */
import { db } from '../../core/data/db'
import { aplicarPisoExteriorCeldas } from '../../core/data/repository'
import { asignarPlantillaACuarto } from '../../core/gamificacion/plantillaBundle'
import type { PisoTipoId } from '../../core/house/pisos'
import type { TechoFormaId, TechoParams, TechoTipoId } from '../../core/house/techos'
import { getPlantilla } from '../../core/registry'
import { useCuartos } from '../../core/state/cuartosStore'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import { useLayout } from '../../core/state/layoutStore'
import { celdasRect, mundo } from './cuadrantes'

// Planta baja 3×3: vida social, cuerpo y logística.
const PLANTA_BAJA: { app: string; col: number; row: number }[] = [
  { app: 'cocina', col: 1, row: 1 },
  { app: 'sala', col: 2, row: 1 },
  { app: 'entretenimiento', col: 3, row: 1 },
  { app: 'despacho', col: 1, row: 2 },
  { app: 'calendario', col: 2, row: 2 },
  { app: 'agenda', col: 3, row: 2 },
  { app: 'ejercicio', col: 1, row: 3 },
  { app: 'diario', col: 2, row: 3 },
  { app: 'garage', col: 3, row: 3 },
]

// Piso 1, 2×3 sobre la mitad oeste: lo íntimo y lo mental.
const PISO_UNO: { app: string; col: number; row: number }[] = [
  { app: 'descanso', col: 1, row: 1 },
  { app: 'anecdotario', col: 2, row: 1 },
  { app: 'biblioteca', col: 1, row: 2 },
  { app: 'idiomas', col: 2, row: 2 },
  { app: 'hobbies', col: 1, row: 3 },
  { app: 'ideas', col: 2, row: 3 },
]

export async function construirCasa({
  jardinEnPatio,
}: {
  jardinEnPatio: boolean
}): Promise<Record<string, string>> {
  const L = useLayout.getState
  const C = useCuartos.getState
  const D = useDiseño.getState

  const crearCuartoApp = async (app: string, col: number, row: number, nivel: number) => {
    const p = getPlantilla(app)
    const id = await C().crearEnCeldas({ color: p?.color, categoria: p?.categoria }, [{ col, row }], nivel)
    await asignarPlantillaACuarto(id, app)
    return id
  }

  const ids: Record<string, string> = {}
  for (const c of PLANTA_BAJA) ids[c.app] = await crearCuartoApp(c.app, c.col, c.row, 0)
  for (const c of PISO_UNO) ids[c.app] = await crearCuartoApp(c.app, c.col, c.row, 1)

  // Escalera al piso 1 por el centro (calendario ↔ idiomas): abre el muro de
  // subida y el de bajada — la única vía que hace ambos.
  L().pedirAccesoNivel(1, 2, 2)
  await L().confirmarAccesoNivel('escalera')

  // ── Figuras: tres esquinas redondeadas y dos chaflanes rectos ────────────
  await L().pintarSubformaCelda(ids.cocina, 0, 0, 0, 'circular') // NO de la casa
  await L().pintarSubformaCelda(ids.entretenimiento, 0, 0, 1, 'circular') // NE
  await L().pintarSubformaCelda(ids.ejercicio, 0, 0, 2, 'circular') // SO
  await L().pintarSubformaCelda(ids.hobbies, 0, 0, 2, 'triangular') // SO del piso 1
  await L().pintarSubformaCelda(ids.ideas, 0, 0, 3, 'triangular') // SE del piso 1

  // ── Techos: tejas rojas de base + acentos por cuarto ─────────────────────
  await D().setTechoTipo('tejas_rojas')
  const techo = async (
    id: string,
    forma: TechoFormaId,
    params?: Partial<TechoParams>,
    tipo?: TechoTipoId,
  ) => {
    await D().setRoomTechoForma(id, forma)
    if (params) await D().setRoomTechoParam(id, params)
    if (tipo) await D().setRoomTechoTipo(id, tipo)
  }
  await techo(ids.descanso, 'dos_aguas', { aguas: 2, dir: 0 })
  await techo(ids.anecdotario, 'dos_aguas', { aguas: 1, dir: 1 })
  await techo(ids.biblioteca, 'cupula', { altura: 1.2 }, 'losa_pizarra')
  await techo(ids.idiomas, 'abovedado', { dir: 1 })
  await techo(ids.hobbies, 'dos_aguas', { aguas: 2, dir: 0 })
  // Con recorte fino solo se fabrican plano, faldones y tienda (`cupula`).
  await techo(ids.ideas, 'cupula', { altura: 1.1 })
  // La columna 3 no tiene piso encima: sus techos también se ven.
  await techo(ids.entretenimiento, 'dos_aguas', { aguas: 2, dir: 1 }, 'tejas_oscuras')
  await techo(ids.agenda, 'dos_aguas', { aguas: 1, dir: 1 })
  await techo(ids.garage, 'plano', { inclinacion: 0.4, dir: 2 }, 'metal')

  // ── Pisos interiores: cada cuarto con su material ────────────────────────
  const piso = async (id: string, tipo: PisoTipoId, color?: string) => {
    await D().setRoomPisoTipo(id, tipo)
    if (color) await D().setRoomPisoColor(id, color)
  }
  await piso(ids.ejercicio, 'cemento', '#3f4750') // gym: cemento oscuro
  await piso(ids.cocina, 'ajedrez')
  await piso(ids.biblioteca, 'parquet')
  await piso(ids.despacho, 'parquet')
  await piso(ids.sala, 'parquet')
  await piso(ids.descanso, 'madera', '#a8763e')
  await piso(ids.anecdotario, 'madera', '#a8763e')
  await piso(ids.entretenimiento, 'grid_neon') // arcade
  await piso(ids.garage, 'cemento', '#8b949e')
  await piso(ids.idiomas, 'mosaico')
  await piso(ids.calendario, 'mosaico')
  await piso(ids.hobbies, 'madera')
  await piso(ids.agenda, 'madera')
  await piso(ids.ideas, 'mosaico', '#cdd6e0')
  await piso(ids.diario, 'cemento')

  // ── Ventanas de fachada (solo en cuartos sin esquina recortada) ──────────
  const ventana = (id: string, lado: 'N' | 'S' | 'E' | 'O') =>
    L().setEdgeEstilo(id, { col: 0, row: 0 }, lado, { muro: { ventana: true } })
  await ventana(ids.sala, 'N')
  await ventana(ids.despacho, 'O')
  await ventana(ids.agenda, 'E')
  await ventana(ids.diario, 'S')
  await ventana(ids.garage, 'E')
  await ventana(ids.descanso, 'N')
  await ventana(ids.descanso, 'O')
  await ventana(ids.anecdotario, 'N')
  await ventana(ids.anecdotario, 'E')
  await ventana(ids.biblioteca, 'O')
  await ventana(ids.idiomas, 'E')

  // ── Grafiti del maratón en el muro sur del garage (esquina recta) ────────
  await db.grafitis.add({ superficie: `cuarto:${ids.garage}:0,0,S:S`, imagen: await pngGrafiti() })

  // ── Suelo de la casa: entarimado de parquet en TODO el bloque, bajo los
  // cuartos y el patio. Sin césped a la vista: la casa se apoya en su propia
  // plataforma de madera y se despega del verde del resto del mapa. ─────────
  await aplicarPisoExteriorCeldas(0, celdasRect(1, 1, 4, 4), 'parquet', '#9c6030')
  const enCelda = async (col: number, row: number, tipo: string, color: string) => {
    const { x, z } = mundo(col, row)
    return await D().addObjeto(MAPA_ROOM, tipo, color, undefined, { x, z })
  }
  await enCelda(4, 3, 'bicicleta', '#ef4444')
  const coche = await enCelda(4, 4, 'automovil', '#7a6a4f')
  await D().setObjetoRotacion(coche, 90)
  await D().setObjetoNombre(coche, 'Coche viejo')
  const letrero = await enCelda(2, 4, 'espectacular', '#334155')
  await D().setObjetoTexto(letrero, 'CASA DE PEP@')
  await enCelda(3, 4, 'planta', '#3f8f4f')

  // ── El jardín, cuando su zona no se construye: rincón zen en el patio ────
  if (jardinEnPatio) {
    ids.jardin = await crearCuartoApp('jardin', 1, 4, 0)
    // Sin muros (lo marca su plantilla): la curva es de la loseta, no del muro.
    for (let q = 0; q < 4; q++) await L().pintarSubformaCelda(ids.jardin, 0, 0, q, 'circular')
    await D().setRoomPisoTipo(ids.jardin, 'pasto')
  } else {
    await enCelda(1, 4, 'planta', '#3f8f4f')
  }

  return ids
}

/** PNG con alfa dibujado en canvas: el «42K» que Pep@ pintó tras el maratón. */
async function pngGrafiti(): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  g.clearRect(0, 0, c.width, c.height)
  g.font = 'bold 120px sans-serif'
  g.textAlign = 'center'
  g.lineWidth = 10
  g.strokeStyle = '#111827'
  g.fillStyle = '#f59e0b'
  g.strokeText('42K ✓', 256, 160)
  g.fillText('42K ✓', 256, 160)
  return await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
}
