import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ClipAvatar, EscenaActor } from '../../../core/data/db'
import { suave } from '../../../core/house/animacion'
import { puntoSueloBajoCursor } from '../../../core/house/arrastreCelda'
import { VEL_PASEO } from '../../../core/house/Asistente3D'
import { amortiguar, avanzarBoca } from '../../../core/house/bocaHabla'
import { aplicarCamara, lerpCamara } from '../../../core/state/cameraStore'
import { cancelarReaccion, reaccionar, useEmociones } from '../../../core/state/emocionesStore'
import { useHouse } from '../../../core/state/houseStore'
import { useLayout } from '../../../core/state/layoutStore'
import { useMascota } from '../../../core/state/mascotaStore'
import {
  actoresFrame,
  colocarEnMapa,
  ES_JUGADOR,
  nuevoEstadoActor,
  peliculaFrame,
  usePelicula,
} from '../../../core/state/peliculaStore'
import { playerPos } from '../../../core/state/playerPosition'
import { posAsistentes } from '../../../core/state/posAsistentes'
import { aperturaBoca, fin, principalEn, type ProyectoAbierto } from '../modelo'
import { bocaEnVivo } from '../render'

/**
 * La escena del modo película dentro del `<Canvas>` de la casa (lazy: solo se
 * descarga al entrar al modo). Dos piezas:
 *
 * - `Director`: cada frame lee `peliculaFrame.t` (lo escribe el Editor desde su
 *   motor, o el de export) y lleva la casa a ese instante: la cámara del plano
 *   activo (corte o paneo) y, por actor, posición (caminando desde su punto
 *   anterior), rumbo, boca, globo, emoción y preset. Todo es función de `t`
 *   salvo el globo y la emoción, que se disparan una vez por entrada y se
 *   rearman con `seekTick`. Escribe `actoresFrame`; Character y Asistente3D lo
 *   leen ANTES de su lógica normal. Corre con prioridad -1: antes que ellos y
 *   que los rigs de cámara, sin tomar el render.
 * - `Colocador`: con un actor seleccionado en el editor, tocar el mapa lo
 *   coloca ahí (raycast al suelo, como el trazo libre de las pistas) y un
 *   anillo marca su punto.
 */

type ClipActor = ClipAvatar & { escena: EscenaActor }

interface Indice {
  proyecto: ProyectoAbierto
  /** Clips de actor por personaje, ordenados por inicio. */
  porActor: Map<string, ClipActor[]>
}

/** Velocidad del avatar a pie en u/s (el `SPEED` por frame de Character.tsx, a 60 fps). */
const VEL_JUGADOR = 0.0413 * 60

function construirIndice(p: ProyectoAbierto): Indice {
  const porActor = new Map<string, ClipActor[]>()
  for (const c of p.clips) {
    if (c.pista !== 'avatar' || c.modo !== 'escena' || !c.escena) continue
    const lista = porActor.get(c.asistenteId) ?? []
    lista.push(c as ClipActor)
    porActor.set(c.asistenteId, lista)
  }
  for (const lista of porActor.values()) lista.sort((a, b) => a.inicio - b.inicio)
  return { proyecto: p, porActor }
}

/** Cuánto dura leída una línea sin audio (≈18 caracteres por segundo), acotada al clip. */
const durHabla = (texto: string, duracion: number) => Math.min(duracion, 0.6 + texto.length * 0.055)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Dónde está hoy un personaje (para mirarlo): su estado de actor, o su posición viva en el mapa. */
function puntoDe(id: string): { x: number; z: number } {
  const a = actoresFrame[id]
  if (a) return a
  if (id === ES_JUGADOR) return playerPos
  return posAsistentes[id] ?? playerPos
}

function Director() {
  const indice = useRef<Indice | null>(null)
  const ultimoSeek = useRef(peliculaFrame.seekTick)
  const planoActual = useRef<string | null>(null)
  const disparados = useRef(new Set<string>())
  const caminos = useRef(new Map<string, number>())

  useFrame((state, delta) => {
    const p = peliculaFrame.proyecto
    if (!peliculaFrame.activo || !p) return
    if (indice.current?.proyecto !== p) indice.current = construirIndice(p)
    const { porActor } = indice.current
    const t = peliculaFrame.t
    const seekeado = peliculaFrame.seekTick !== ultimoSeek.current
    if (seekeado) {
      ultimoSeek.current = peliculaFrame.seekTick
      disparados.current.clear()
    }

    // 1. Cámara del plano activo. Sin plano, la cámara queda libre.
    const pos = principalEn(p.clips, t)
    const f = pos?.clip.fuente
    if (pos && f?.tipo === 'escena3d') {
      const entra = planoActual.current !== pos.clip.id || seekeado
      if (f.camFin) {
        // Paneo: función exacta del tiempo mientras corre; en pausa solo al entrar (deja encuadrar a mano).
        if (peliculaFrame.reproduciendo || entra) {
          aplicarCamara(lerpCamara(f.cam, f.camFin, suave(clamp01(pos.tLocal / pos.clip.duracion))), true)
        }
      } else if (entra) aplicarCamara(f.cam, true)
      planoActual.current = pos.clip.id
    } else planoActual.current = null

    // 2. Actores: posición, boca, globo, emoción y preset.
    const dt = Math.min(delta, 0.25)
    caminos.current.clear()
    for (const [id, clips] of porActor) {
      const e = (actoresFrame[id] ??= nuevoEstadoActor(id))
      let i = -1
      for (let k = 0; k < clips.length; k++) {
        const c = clips[k]
        if (c.inicio <= t && t < fin(c)) {
          i = k
          break
        }
      }
      const activo = i >= 0 ? clips[i] : null
      if (activo) {
        const anterior = i > 0 ? clips[i - 1] : null
        if (activo.escena.llegar && anterior) {
          const dx = activo.escena.x - anterior.escena.x
          const dz = activo.escena.z - anterior.escena.z
          const dist = Math.hypot(dx, dz)
          const dur = Math.min(activo.duracion, dist / (id === ES_JUGADOR ? VEL_JUGADOR : VEL_PASEO))
          const q = dur > 0 ? suave(clamp01((t - activo.inicio) / dur)) : 1
          e.x = anterior.escena.x + dx * q
          e.z = anterior.escena.z + dz * q
          e.caminando = q < 1
          if (e.caminando) caminos.current.set(id, Math.atan2(dx, dz))
        } else {
          e.x = activo.escena.x
          e.z = activo.escena.z
          e.caminando = false
        }
      } else {
        // Entre clips se queda donde acabó el último; antes del primero, en su primer punto.
        let ultimo = clips[0]
        for (let k = clips.length - 1; k >= 0; k--) {
          if (fin(clips[k]) <= t) {
            ultimo = clips[k]
            break
          }
        }
        e.x = ultimo.escena.x
        e.z = ultimo.escena.z
        e.caminando = false
      }

      // Boca (envolvente del audio, o sintética mientras «lee») y globo, una vez por entrada.
      const texto = activo?.texto?.trim()
      if (activo && texto) {
        const tRel = t - activo.inicio
        const objetivo = activo.envolvente ? aperturaBoca(activo, tRel) : tRel < durHabla(texto, activo.duracion) ? bocaEnVivo(tRel) : 0
        avanzarBoca(e.boca.current, objetivo, delta)
        e.energia = amortiguar(e.energia, e.boca.current.hablando ? 1 : 0, dt, 0.3)
        if (e.hablaClipId !== activo.id) {
          e.hablaClipId = activo.id
          const clave = `habla:${activo.id}`
          // El globo es DOM: no sale en el export, y tu avatar no tiene nube.
          if (!disparados.current.has(clave) && !peliculaFrame.exportando && id !== ES_JUGADOR) {
            disparados.current.add(clave)
            useMascota.getState().decir(texto, { asistenteId: id, persistir: false, saludar: false })
          }
        }
      } else {
        avanzarBoca(e.boca.current, 0, delta)
        e.energia = amortiguar(e.energia, 0, dt, 0.3)
        if (e.hablaClipId) {
          e.hablaClipId = null
          const m = useMascota.getState()
          if (m.hablanteId === id && m.mensaje) m.programarOcultar(0)
        }
      }

      // Emoción: una vez por entrada; se apaga al salir del clip (también por scrub).
      const emocion = activo?.escena.emocion
      if (activo && emocion) {
        const clave = `emo:${activo.id}`
        if (!disparados.current.has(clave)) {
          disparados.current.add(clave)
          reaccionar(id, emocion, Math.max(50, (fin(activo) - t) * 1000))
        }
      } else if (useEmociones.getState().porAsistente[id]) cancelarReaccion(id)

      // Preset de animación: derivado del clip (no-op si no cambia).
      usePelicula.getState().setPreset(id, activo?.escena.anim)

      // Tu avatar solo es actor DURANTE sus clips: fuera de ellos te mueves por el mapa como siempre
      // (los asistentes sí se quedan en su marca entre clips, para que no se vayan de paseo).
      if (id === ES_JUGADOR && !activo) {
        e.boca.current.nivel = 0
        e.boca.current.hablando = false
        delete actoresFrame[id]
      }
    }

    // 3. Rumbo: caminando mira adonde va; parado, a la cámara, a otro actor o adonde iba.
    for (const [id, clips] of porActor) {
      const e = actoresFrame[id]
      if (!e) continue
      const camino = caminos.current.get(id)
      if (camino != null) {
        e.rumbo = camino
        continue
      }
      let activo: ClipActor | null = null
      for (const c of clips) {
        if (c.inicio <= t && t < fin(c)) {
          activo = c
          break
        }
      }
      const mirar = activo?.escena.mirar ?? 'camara'
      if (mirar === 'rumbo') continue
      const o = typeof mirar === 'object' ? puntoDe(mirar.actor) : state.camera.position
      e.rumbo = Math.atan2(o.x - e.x, o.z - e.z)
    }

    // 4. Quien ya no está en el proyecto vuelve a su vida normal.
    for (const id of Object.keys(actoresFrame)) {
      if (porActor.has(id)) continue
      delete actoresFrame[id]
      cancelarReaccion(id)
      usePelicula.getState().setPreset(id, undefined)
    }
  }, -1)

  return null
}

/** Con un actor seleccionado, tocar el suelo lo coloca ahí; el anillo marca su punto. */
function Colocador() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const colocando = usePelicula((s) => s.colocando)
  const marcador = usePelicula((s) => s.marcador)

  useEffect(() => {
    if (!colocando) return
    const dom = gl.domElement
    const opts = { canvas: dom, camera, nivel: 0, apilado, gridCols, gridRows }
    let downX = 0
    let downY = 0
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue cámara
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (p) colocarEnMapa(p.x, p.z)
    }
    dom.addEventListener('pointerdown', onDown, true)
    dom.addEventListener('pointerup', onUp, true)
    return () => {
      dom.removeEventListener('pointerdown', onDown, true)
      dom.removeEventListener('pointerup', onUp, true)
    }
  }, [gl, camera, apilado, gridCols, gridRows, colocando])

  if (!marcador) return null
  return (
    <mesh position={[marcador.x, 0.26, marcador.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.45, 0.62, 32]} />
      <meshBasicMaterial color="#f87171" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}

export default function EscenaPelicula() {
  return (
    <>
      <Director />
      <Colocador />
    </>
  )
}
