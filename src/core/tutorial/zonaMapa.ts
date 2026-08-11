import { colorCuadrante, cuadrantePorId, rectMundo } from '../house/cuadrantesMapa'
import { cellToWorld, SPACING } from '../house/walls'
import { lienzoCam, useCam } from '../state/cameraStore'
import { useLayout } from '../state/layoutStore'
import { useZonaTut, type RegionMapa } from '../state/zonaTutStore'
import type { PasoTutorial, TutorialCtx } from './tipos'

/**
 * Regiones del mapa para los pasos de tutorial que enfocan y resaltan terreno
 * (campo `zona` de `PasoTutorial`), y el vuelo de cámara que las encuadra.
 *
 * Todo degrada a `null` sin ruido: en una casa sin esas zonas el paso se
 * comporta como siempre (tarjeta junto al mago, cámara quieta).
 */

/** Región de un cuadrante del mapa por id ('zona-pista', 'auto-0-1'…). */
export function regionCuadrante(id: string): RegionMapa | null {
  const { gridCols, gridRows, cuadrantes } = useLayout.getState()
  const q = cuadrantePorId(id, gridCols, gridRows, cuadrantes)
  // El contorno usa el color de la zona: el mismo que la pinta en el editor.
  return q ? { ...rectMundo(q), color: colorCuadrante(q, cuadrantes) } : null
}

/** Color con el que se marcaría esa zona en el mapa (null si no existe). */
export function colorDeZona(id: string): string | undefined {
  return regionCuadrante(id)?.color
}

/** Región de un rectángulo de celdas (extremos incluidos). */
export function regionCeldas(
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  extra?: Pick<RegionMapa, 'alto' | 'margen' | 'color'>,
): RegionMapa {
  const [x, y, z] = cellToWorld((c0 + c1) / 2, (r0 + r1) / 2)
  return {
    centro: [x, y, z],
    ancho: (c1 - c0 + 1) * SPACING,
    largo: (r1 - r0 + 1) * SPACING,
    ...extra,
  }
}

/** Resuelve un campo de región de un paso (valor directo o función del contexto). */
function resolver(
  campo: RegionMapa | ((ctx: TutorialCtx) => RegionMapa | null) | undefined,
  ctx: TutorialCtx | null,
): RegionMapa | null {
  if (!campo) return null
  return typeof campo === 'function' ? (ctx ? campo(ctx) : null) : campo
}

/**
 * Aire alrededor de lo resaltado. `zoomParaRect` ya encuadra al 92 % del
 * lienzo: sin este margen el hueco llenaría la pantalla y no quedaría velo que
 * leer alrededor. Con 1.35 la zona ocupa ~70 %.
 */
const AIRE = 1.35

/** Espera un frame; con la pestaña de fondo rAF no dispara y el tour se colgaría. */
const sigFrame = () =>
  new Promise<void>((r) => {
    const t = setTimeout(r, 120)
    requestAnimationFrame(() => {
      clearTimeout(t)
      r()
    })
  })

/**
 * Espera a que `CameraRig` haya publicado las medidas del lienzo. Sin ellas
 * `enfocarZona` conserva el zoom actual: la zona queda centrada pero sin
 * encuadrar. Pasaba al saltar de la casa real al demo con un tour por intent
 * (`demo/intent.ts`), que lo lanza con la escena recién montada, cuando dos
 * frames no bastaban; dentro del demo la escena ya llevaba rato corriendo y por
 * eso el mismo tour sí encuadraba.
 */
const esperarLienzo = async (topeMs = 1500) => {
  const inicio = performance.now()
  while (lienzoCam.fw <= 0 && performance.now() - inicio < topeMs) await sigFrame()
}

/**
 * Vuela la cámara hasta la región. `enfocarZona` ya entra en isométrica dentro
 * de su propio `set`: llamar antes a `setVista('iso')` recolocaría el foco
 * sobre el personaje y desharía el encuadre.
 *
 * Se dispara dos veces a propósito: `CameraRig` solo publica las medidas del
 * lienzo en frames isométricos, así que viniendo de 3ª persona el primer zoom
 * se calcula con un frustum viejo (o se conserva el zoom actual).
 */
export async function enfocarRegion(r: RegionMapa): Promise<void> {
  const m = r.margen ?? 0
  const volar = () =>
    useCam.getState().enfocarZona(r.centro, (r.ancho + m * 2) * AIRE, (r.largo + m * 2) * AIRE)
  volar()
  // El primer vuelo ya puso la vista isométrica: a partir de aquí el rig publica.
  await esperarLienzo()
  await sigFrame()
  await sigFrame()
  volar()
}

/**
 * Aplica las dos capas del paso: el CUADRANTE de fondo (que persiste si el paso
 * no lo cambia) y el OBJETO en ámbar (que es de cada paso). La cámara vuela a
 * lo más concreto de los dos, que es también lo que recorta el velo.
 */
export async function aplicarZonaPaso(
  p: PasoTutorial | undefined,
  ctx: TutorialCtx | null,
): Promise<void> {
  const Z = useZonaTut.getState()
  const zona = resolver(p?.zona, ctx)
  const foco = resolver(p?.foco, ctx)
  if (zona) Z.setZona(zona)
  Z.setFoco(foco)
  const destino = foco ?? zona
  if (destino) await enfocarRegion(destino)
}
