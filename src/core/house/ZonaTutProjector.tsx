import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useCam } from '../state/cameraStore'
import { AMBAR_FOCO, regionResaltada, useZonaTut, type Punto } from '../state/zonaTutStore'
import { ContornoRegion3D } from './ContornoRegion3D'

/**
 * El resalte de zona de los tutoriales, en sus dos mitades:
 *  - marca el área sobre el TERRENO (contorno del cuadrante, como el ghost del
 *    editor), que es lo que ancla la forma al mundo;
 *  - proyecta su SILUETA a píxeles para que el velo del tutorial se recorte con
 *    ella. En isométrica el suelo se ve como un rombo: un rectángulo de pantalla
 *    abarcaría terreno ajeno (y hasta parte del HUD).
 *
 * La proyección va por `useFrame` (no por intervalo) para acompañar al vuelo de
 * la cámara, que `CameraRig` interpola frame a frame. No usa `<Html>` de drei,
 * como el resto de anclas de la casa: bloquearía el raycast del mapa.
 */

const _v = new THREE.Vector3()
/** Altura del contorno: la que ya usan CuadranteGhost3D y PlanoPisosSeleccion3D. */
const Y_CONTORNO = 0.35
/** El objeto resaltado va un pelo más alto que su cuadrante, para no pelearse. */
const Y_FOCO = 0.4
/** Color del cuadrante cuando su zona no trae uno propio. */
const COLOR_ZONA_DEFECTO = '#38bdf8'
/** Píxeles que la silueta puede sobresalir antes de darse por fuera de cuadro. */
const FUERA = 24
/** Aire entre la silueta y el filo del hueco, para que el contorno se lea entero. */
const HOLGURA = 10

/** Envolvente convexa (monotone chain) de los puntos proyectados. */
function envolvente(pts: Punto[]): Punto[] {
  const orden = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cruz = (o: Punto, a: Punto, b: Punto) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const media = (entrada: Punto[]) => {
    const out: Punto[] = []
    for (const p of entrada) {
      while (out.length >= 2 && cruz(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...media(orden), ...media(orden.reverse())]
}

/** Aparta los vértices del centroide, para que el contorno quede dentro del hueco. */
function expandir(poli: Punto[], px: number): Punto[] {
  const cx = poli.reduce((s, p) => s + p[0], 0) / poli.length
  const cy = poli.reduce((s, p) => s + p[1], 0) / poli.length
  return poli.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1
    return [Math.round(x + ((x - cx) / d) * px), Math.round(y + ((y - cy) / d) * px)] as Punto
  })
}

export function ZonaTutProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  // Suscripción (no `getState`): los contornos se redibujan al cambiar de paso.
  const zona = useZonaTut((s) => s.zona)
  const foco = useZonaTut((s) => s.foco)

  // Al desmontarse (entrar a un cuarto) no debe quedar un hueco fantasma.
  useEffect(() => () => useZonaTut.getState().setProyeccion(null), [])

  useFrame(() => {
    const estado = useZonaTut.getState()
    const { setProyeccion } = estado
    // El velo se recorta sobre lo más concreto: el objeto si lo hay.
    const r = regionResaltada(estado)
    // Solo en isométrica: en 1ª/3ª persona manda la cámara de perspectiva y la
    // silueta proyectada no significaría nada (el contorno 3D sí se queda).
    if (!r || useCam.getState().vista !== 'iso') {
      setProyeccion(null)
      return
    }

    const [cx, cy, cz] = r.centro
    const hx = r.ancho / 2
    const hz = r.largo / 2
    const alto = r.alto ?? 0
    const pts: Punto[] = []

    // Las esquinas del área (y las de arriba si hay que envolver algo elevado).
    for (const dx of [-hx, hx]) {
      for (const dz of [-hz, hz]) {
        for (const dy of alto > 0 ? [0, alto] : [0]) {
          _v.set(cx + dx, cy + dy, cz + dz).project(camera)
          const x = (_v.x * 0.5 + 0.5) * size.width
          const y = (-_v.y * 0.5 + 0.5) * size.height
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            setProyeccion(null)
            return
          }
          pts.push([x, y])
        }
      }
    }

    const poligono = expandir(envolvente(pts), HOLGURA)
    const xs = poligono.map((p) => p[0])
    const ys = poligono.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Entera fuera de cuadro: sin resalte (el overlay cae a velo plano + mago).
    if (minX > size.width + FUERA || maxX < -FUERA || minY > size.height + FUERA || maxY < -FUERA) {
      setProyeccion(null)
      return
    }
    if (poligono.length < 3 || maxX - minX < 1 || maxY - minY < 1) {
      setProyeccion(null)
      return
    }

    // La caja envolvente la usa la colocación de la tarjeta y del mago; el
    // polígono, el recorte del velo. El polígono NO se recorta al viewport: el
    // rectángulo exterior del velo ya limita lo que se pinta.
    setProyeccion({
      caja: {
        left: Math.round(minX),
        top: Math.round(minY),
        width: Math.round(maxX - minX),
        height: Math.round(maxY - minY),
      },
      poligono,
    })
  })

  if (!zona && !foco) return null
  return (
    <>
      {/* El cuadrante, marcado de fondo con el color de su zona. */}
      {zona && (
        <ContornoRegion3D
          region={zona}
          color={zona.color ?? COLOR_ZONA_DEFECTO}
          y={Y_CONTORNO}
          sobreTodo
        />
      )}
      {/* El objeto del paso, en ámbar y con relleno para que salte a la vista. */}
      {foco && (
        <ContornoRegion3D
          region={foco}
          color={foco.color ?? AMBAR_FOCO}
          y={Y_FOCO}
          relleno
          sobreTodo
        />
      )}
    </>
  )
}
