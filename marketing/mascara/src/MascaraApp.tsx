import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Classifications, FaceLandmarker } from '@mediapipe/tasks-vision'
import {
  EXPRESIONES,
  PEINADOS,
  PELO_COLOR_DEFAULT,
  type ExpresionId,
  type PeinadoId,
} from '../../../src/core/house/apariencia'
import { CabezaAvatar } from './CabezaAvatar'
import { useFaceLandmarker } from './useFaceLandmarker'
import { iniciarGrabacion, guardarGrabacion, type Encuadre, type Grabador } from './grabador'
import { crearClasificador, nivelBoca, puntuaciones, senalesIniciales, type ModoCara, type SenalesCara } from './expresiones'
import { MASCARAS, mascaraDe } from './mascaras'
// Estilos del componente (acotados a `.mascara-ui`): así valen igual en el build
// standalone y dentro de la app, que no carga el `estilos.css` global.
import './mascara.css'

/** Configuración calibrable de la máscara, persistida en localStorage. */
interface Config {
  /** Cabeza que se lleva puesta (ver `MASCARAS`): la Base o la de un cuerpo prediseñado. */
  mascaraId: string
  expresion: ExpresionId
  peinado: PeinadoId
  piel: string
  pelo: string
  /** Tamaño de la cabeza respecto al espacio métrico (cm) de MediaPipe. */
  escala: number
  /** Ajuste vertical fino en cm (positivo = sube la máscara). */
  altura: number
  /**
   * Desplazamiento en cm sobre el eje frente-nuca de la cara (negativo = hacia
   * atrás). La matriz de MediaPipe ancla en la SUPERFICIE de la cara; sin este
   * retroceso el cubo queda por delante y la cabeza real asoma por detrás.
   */
  profundidad: number
  /** `amplio` = todo el campo de la cámara con fondo difuminado (zoom-out máximo); `lleno` = recorte 9:16. */
  encuadre: Encuadre
  /** Cámara activa; el espejo solo aplica a la frontal (como la app nativa). */
  camara: 'frontal' | 'trasera'
  /** deviceId de un lente concreto (p. ej. la ultra gran angular 0.5×); vacío = automática. */
  lenteId: string
  /** Cara del personaje: fija (manual), imita expresiones, o viva (expresiones + parpadeo + boca). */
  modoCara: ModoCara
}

const CONFIG_DEFAULT: Config = {
  mascaraId: 'base',
  expresion: 'feliz',
  peinado: 'corto',
  piel: '#ffd23b', // mismo amarillo del avatar Base por defecto
  pelo: PELO_COLOR_DEFAULT,
  escala: 48,
  altura: 0,
  profundidad: -8,
  encuadre: 'lleno',
  camara: 'frontal',
  lenteId: '',
  modoCara: 'estatico',
}

/** Capacidades opcionales que expone la pista de video (zoom continuo, linterna). */
interface CapacidadesCamara {
  zoom?: { min: number; max: number; step?: number }
  torch?: boolean
}

/** Ajustes no estándar (zoom/torch) sobre la pista, ignorando navegadores sin soporte. */
function aplicarPista(pista: MediaStreamTrack | undefined, ajustes: Record<string, number | boolean>) {
  pista?.applyConstraints({ advanced: [ajustes] } as unknown as MediaTrackConstraints).catch(() => {})
}

function cargarConfig(): Config {
  try {
    return { ...CONFIG_DEFAULT, ...JSON.parse(localStorage.getItem('mascara.config') ?? '{}') }
  } catch {
    return CONFIG_DEFAULT
  }
}

/**
 * Posa la cabeza con la matriz facial de MediaPipe: descompone y amortigua con
 * lerp/slerp para disimular el jitter del tracking. Sin cara detectada deja la
 * cabeza en una pose de espera girando suave (útil también sin cámara, en dev).
 */
function Escena({
  landmarker,
  videoRef,
  config,
  expresion,
  senales,
  onCara,
  onExpresion,
}: {
  landmarker: FaceLandmarker | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  config: Config
  /** Expresión efectiva (la detectada en modos automáticos; la manual como base). */
  expresion: ExpresionId
  senales: React.RefObject<SenalesCara>
  onCara: (v: boolean) => void
  onExpresion: (e: ExpresionId | null) => void
}) {
  const grupo = useRef<THREE.Group>(null)
  const tuvoCara = useRef(false)
  const clasificador = useRef(crearClasificador())
  const ultimaNotificada = useRef<ExpresionId | null>(null)
  const ultimaCaraMs = useRef(0)
  const util = useMemo(
    () => ({
      mat: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      rot: new THREE.Quaternion(),
      esc: new THREE.Vector3(),
      reposo: new THREE.Vector3(0, 0, -46),
      qReposo: new THREE.Quaternion(),
      euler: new THREE.Euler(),
    }),
    [],
  )

  // Al cambiar de modo, la detección arranca de cero y la cara vuelve a la base.
  useEffect(() => {
    clasificador.current.reiniciar()
    ultimaNotificada.current = null
    onExpresion(null)
  }, [config.modoCara, onExpresion])

  // eslint-disable-next-line react-hooks/immutability -- muta el ref compartido `senales` por frame (bus de señales con RostroVivo)
  useFrame(({ clock }) => {
    const g = grupo.current
    if (!g) return
    const video = videoRef.current
    let visto = false
    let blend: Classifications | null = null
    if (landmarker && video && video.readyState >= 2) {
      const res = landmarker.detectForVideo(video, performance.now())
      const m = res.facialTransformationMatrixes?.[0]
      blend = res.faceBlendshapes?.[0] ?? null
      if (m) {
        visto = true
        tuvoCara.current = true
        util.mat.fromArray(m.data)
        util.mat.decompose(util.pos, util.rot, util.esc)
        g.position.lerp(util.pos, 0.4)
        g.quaternion.slerp(util.rot, 0.4)
      }
    }

    if (config.modoCara !== 'estatico' && blend?.categories.length) {
      ultimaCaraMs.current = performance.now()
      if (config.modoCara === 'vivo') {
        const b = puntuaciones(blend)
        const s = senales.current
        // eslint-disable-next-line react-hooks/immutability -- `senales` es un ref compartido; se rellena por frame
        s.parpadeoL = b.eyeBlinkLeft ?? 0
        s.parpadeoR = b.eyeBlinkRight ?? 0
        s.boca = nivelBoca(b)
        s.sonrisa = ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2
        s.cejas = b.browInnerUp ?? 0
      }
      const e = clasificador.current.paso(blend, config.modoCara === 'vivo')
      // setState solo cuando la expresión comprometida CAMBIA (la histéresis lo acota).
      if (e !== ultimaNotificada.current) {
        ultimaNotificada.current = e
        onExpresion(e)
      }
    } else {
      // Sin cara o en modo estático: las señales decaen (RostroVivo suaviza la vuelta)
      // y tras 800 ms sin cara la expresión regresa a la base elegida a mano.
      const s = senales.current
      s.parpadeoL = s.parpadeoR = s.boca = s.sonrisa = s.cejas = 0
      if (
        config.modoCara !== 'estatico' &&
        ultimaNotificada.current !== null &&
        performance.now() - ultimaCaraMs.current > 800
      ) {
        clasificador.current.reiniciar()
        ultimaNotificada.current = null
        onExpresion(null)
      }
    }

    if (!visto && !tuvoCara.current) {
      // Pose de espera: centrada, girando despacio (así la página "vive" sin cámara).
      util.euler.set(0, Math.sin(clock.elapsedTime * 0.8) * 0.5, 0)
      util.qReposo.setFromEuler(util.euler)
      g.position.lerp(util.reposo, 0.1)
      g.quaternion.slerp(util.qReposo, 0.1)
    }
    g.scale.setScalar(config.escala)
    onCara(visto)
  })

  return (
    <group ref={grupo}>
      {/* Ajustes locales en cm: se dividen por la escala porque el grupo exterior ya escala. */}
      <group position={[0, config.altura / config.escala, config.profundidad / config.escala]}>
        <CabezaAvatar
          piel={config.piel}
          mascara={config.mascaraId}
          expresion={expresion}
          peinado={config.peinado}
          pelo={config.pelo}
          viva={config.modoCara === 'vivo'}
          senales={senales}
        />
      </group>
    </group>
  )
}

/**
 * Textos de la interfaz. El standalone usa estos (en español); la app los pasa
 * ya traducidos desde `MascaraOverlay`, así las claves `t()` viven en `src/` y
 * el verificador de i18n las ve. Es `Partial`: lo que no llegue cae al español.
 */
export interface TextosMascara {
  salir: string
  ocultar: string
  mostrar: string
  menos: string
  ajustes: string
  mascara: string
  mascaraNombre: (id: string, nombre: string) => string
  cara: string
  caraFija: string
  caraImita: string
  caraViva: string
  camara: string
  frontal: string
  trasera: string
  linterna: string
  lenteAuto: (camara: string) => string
  camaraN: (n: number) => string
  zoom: string
  encuadre: string
  vertical: string
  amplio: string
  piel: string
  pelo: string
  tamano: string
  altura: string
  profundidad: string
  grabar: string
  detener: string
  errorModelo: string
  sinCamara: string
  cargando: string
  caraDetectada: string
  buscandoCara: string
  errorCamara: (detalle: string) => string
  errorGrabar: (detalle: string) => string
  expresion: (id: ExpresionId, nombre: string) => string
  peinado: (id: PeinadoId, nombre: string) => string
}

export const TEXTOS_ES: TextosMascara = {
  salir: 'Salir',
  ocultar: 'Ocultar',
  mostrar: 'Mostrar interfaz',
  menos: 'Menos',
  ajustes: 'Ajustes',
  mascara: 'Máscara',
  mascaraNombre: (_id, nombre) => nombre,
  cara: 'Cara',
  caraFija: 'Fija',
  caraImita: 'Imita',
  caraViva: 'Viva',
  camara: 'Cámara',
  frontal: 'Frontal',
  trasera: 'Trasera',
  linterna: 'Linterna',
  lenteAuto: (camara) => `Lente automático (${camara})`,
  camaraN: (n) => `Cámara ${n}`,
  zoom: 'Zoom',
  encuadre: 'Encuadre',
  vertical: 'Vertical',
  amplio: 'Amplio (bandas)',
  piel: 'Piel',
  pelo: 'Pelo',
  tamano: 'Tamaño',
  altura: 'Altura',
  profundidad: 'Profundidad',
  grabar: 'Grabar',
  detener: 'Detener grabación',
  errorModelo: 'Error al cargar MediaPipe',
  sinCamara: 'Sin cámara',
  cargando: 'Cargando modelo…',
  caraDetectada: 'Cara detectada',
  buscandoCara: 'Buscando cara…',
  errorCamara: (detalle) => `Cámara no disponible (${detalle}). En iPhone abre la URL del túnel HTTPS.`,
  errorGrabar: (detalle) => `No se pudo grabar: ${detalle}`,
  expresion: (_id, nombre) => nombre,
  peinado: (_id, nombre) => nombre,
}

/** Standalone no pasa props; la app principal pasa `onSalir` (y sus textos traducidos). */
export function MascaraApp({ onSalir, textos }: { onSalir?: () => void; textos?: Partial<TextosMascara> } = {}) {
  const tx = { ...TEXTOS_ES, ...textos }
  const videoRef = useRef<HTMLVideoElement>(null)
  const fondoRef = useRef<HTMLVideoElement>(null)
  const contRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null)
  const grabadorRef = useRef<Grabador | null>(null)
  const { landmarker, error: errorModelo } = useFaceLandmarker()
  const [config, setConfig] = useState<Config>(cargarConfig)
  const [conCara, setConCara] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [limpio, setLimpio] = useState(false)
  const [panel, setPanel] = useState(true)
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [lentes, setLentes] = useState<MediaDeviceInfo[]>([])
  const [expresionDetectada, setExpresionDetectada] = useState<ExpresionId | null>(null)
  const senalesRef = useRef<SenalesCara>(senalesIniciales())
  const [pantallaAncha, setPantallaAncha] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [capCamara, setCapCamara] = useState<CapacidadesCamara>({})
  const [zoom, setZoom] = useState<number | null>(null)
  const [linterna, setLinterna] = useState(false)
  const espejo = config.camara === 'frontal'

  // Cámara sin audio (el micrófono se pide al empezar a grabar). Se reabre al
  // cambiar de cámara o de lente; el cleanup apaga el stream anterior.
  useEffect(() => {
    let stream: MediaStream | null = null
    let vivo = true
    ;(async () => {
      try {
        setErrorCamara(null)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            // 4:3 = el sensor completo; pedir 16:9 entrega un recorte que ya "acerca".
            ...(config.lenteId
              ? { deviceId: { exact: config.lenteId } }
              : { facingMode: config.camara === 'frontal' ? 'user' : 'environment' }),
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
        })
        if (!vivo) return
        streamRef.current = stream
        const pista = stream.getVideoTracks()[0]
        const cap = (pista.getCapabilities?.() ?? {}) as CapacidadesCamara
        setCapCamara(cap)
        setLinterna(false)
        if (cap.zoom) {
          // Frontal: zoom al mínimo (máximo campo). Trasera: el que traiga el lente.
          const inicial =
            config.camara === 'frontal'
              ? cap.zoom.min
              : ((pista.getSettings() as { zoom?: number }).zoom ?? cap.zoom.min)
          setZoom(inicial)
          aplicarPista(pista, { zoom: inicial })
        } else {
          setZoom(null)
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (fondoRef.current) {
          fondoRef.current.srcObject = stream
          fondoRef.current.play().catch(() => {})
        }
        // Con el permiso ya concedido, las etiquetas de los lentes vienen con nombre.
        const dispositivos = await navigator.mediaDevices.enumerateDevices()
        if (vivo) setLentes(dispositivos.filter((d) => d.kind === 'videoinput'))
      } catch (e) {
        if (vivo) setErrorCamara(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      vivo = false
      for (const pista of stream?.getTracks() ?? []) pista.stop()
    }
  }, [config.camara, config.lenteId])

  // El layout ancho (PC/tablet) mueve los controles a una columna lateral.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const alCambiar = () => setPantallaAncha(mq.matches)
    mq.addEventListener('change', alCambiar)
    window.addEventListener('resize', alCambiar) // respaldo: algunos entornos no disparan el change del MQ
    return () => {
      mq.removeEventListener('change', alCambiar)
      window.removeEventListener('resize', alCambiar)
    }
  }, [])

  // Al volver al encuadre amplio, el video de fondo se remonta y hay que re-enchufarle el stream.
  useEffect(() => {
    const fondo = fondoRef.current
    if (fondo && streamRef.current && fondo.srcObject !== streamRef.current) {
      fondo.srcObject = streamRef.current
      fondo.play().catch(() => {})
    }
  }, [config.encuadre])

  /**
   * Alinea el lienzo 3D con el rectángulo REAL del video en pantalla (cover
   * desborda recortado, contain deja bandas): así la proyección de la máscara
   * cae exactamente sobre la imagen de la cámara en ambos encuadres.
   */
  useEffect(() => {
    const video = videoRef.current
    const calcular = () => {
      const cont = contRef.current
      if (!cont || !video?.videoWidth) return
      const cw = cont.clientWidth
      const ch = cont.clientHeight
      const va = video.videoWidth / video.videoHeight
      let w = cw
      let h = cw / va
      if (config.encuadre === 'lleno' ? va > cw / ch : va < cw / ch) {
        h = ch
        w = ch * va
      }
      setRect({ left: (cw - w) / 2, top: (ch - h) / 2, width: w, height: h })
    }
    calcular()
    video?.addEventListener('loadedmetadata', calcular)
    window.addEventListener('resize', calcular)
    return () => {
      video?.removeEventListener('loadedmetadata', calcular)
      window.removeEventListener('resize', calcular)
    }
  }, [config.encuadre])

  useEffect(() => {
    localStorage.setItem('mascara.config', JSON.stringify(config))
  }, [config])

  useEffect(() => {
    if (!grabando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [grabando])

  const alternarGrabacion = async () => {
    if (grabando) {
      setGrabando(false)
      const blob = await grabadorRef.current!.detener()
      grabadorRef.current = null
      await guardarGrabacion(blob)
      return
    }
    if (!videoRef.current || !canvas3dRef.current) return
    try {
      grabadorRef.current = await iniciarGrabacion(videoRef.current, canvas3dRef.current, config.encuadre, espejo)
      setSegundos(0)
      setGrabando(true)
    } catch (e) {
      alert(tx.errorGrabar(e instanceof Error ? e.message : String(e)))
    }
  }

  const cambiar = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => ({ ...c, [k]: v }))
  const reloj = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
  const cambiarCamara = (lado: Config['camara']) => setConfig((c) => ({ ...c, camara: lado, lenteId: '' }))
  const cambiarZoom = (v: number) => {
    setZoom(v)
    aplicarPista(streamRef.current?.getVideoTracks()[0], { zoom: v })
  }
  const alternarLinterna = () => {
    setLinterna((v) => {
      aplicarPista(streamRef.current?.getVideoTracks()[0], { torch: !v })
      return !v
    })
  }
  // Cada máscara trae lo suyo horneado: solo la Base tiene piel/peinado editables,
  // y solo Base y Princesa llevan el rostro dibujado encima.
  const mascara = mascaraDe(config.mascaraId)
  const esBase = mascara.piezas === null

  /** La detectada manda en modos automáticos; el chip manual es la cara base/reposo. */
  const expresionEfectiva = config.modoCara !== 'estatico' && expresionDetectada ? expresionDetectada : config.expresion

  const avisoError = (errorCamara || errorModelo) && (
    <p className="rounded bg-red-900/70 px-2 py-1 text-xs">
      {errorModelo ?? tx.errorCamara(errorCamara ?? '')}
    </p>
  )

  const botonGrabar = (
    <>
      <button
        onClick={alternarGrabacion}
        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white ${grabando ? 'bg-red-600' : 'bg-red-500'}`}
        aria-label={grabando ? tx.detener : tx.grabar}
      >
        {grabando ? <span className="h-6 w-6 rounded bg-white" /> : <span className="h-10 w-10 rounded-full bg-red-700" />}
      </button>
      {grabando && <span className="font-mono text-lg">{reloj}</span>}
    </>
  )

  // Los mismos controles se colocan superpuestos (móvil) o en la columna lateral (PC/tablet).
  const controles = (
    <>
      <div className="flex items-center gap-1">
        <span className="mr-1">{tx.mascara}</span>
        <div className="flex flex-1 gap-1 overflow-x-auto pb-1">
          {MASCARAS.map((m) => (
            <button
              key={m.id}
              onClick={() => cambiar('mascaraId', m.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${config.mascaraId === m.id ? 'bg-emerald-600' : 'bg-white/10'}`}
            >
              {m.emoji} {tx.mascaraNombre(m.id, m.nombre)}
            </button>
          ))}
        </div>
      </div>
      {mascara.conRostro && (
        <div className="flex items-center gap-1">
          <span className="mr-1">{tx.cara}</span>
          {(
            [
              ['estatico', tx.caraFija],
              ['expresiones', tx.caraImita],
              ['vivo', tx.caraViva],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              onClick={() => cambiar('modoCara', id)}
              className={`rounded-full px-2 py-1 ${config.modoCara === id ? 'bg-emerald-600' : 'bg-white/10'}`}
            >
              {nombre}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="mr-1">{tx.camara}</span>
        {(
          [
            ['frontal', tx.frontal],
            ['trasera', tx.trasera],
          ] as const
        ).map(([id, nombre]) => (
          <button
            key={id}
            onClick={() => cambiarCamara(id)}
            className={`rounded-full px-2 py-1 ${config.camara === id ? 'bg-emerald-600' : 'bg-white/10'}`}
          >
            {nombre}
          </button>
        ))}
        {capCamara.torch && (
          <button
            onClick={alternarLinterna}
            className={`ml-auto rounded-full px-2 py-1 ${linterna ? 'bg-amber-500 text-black' : 'bg-white/10'}`}
          >
            {tx.linterna}
          </button>
        )}
      </div>
      {lentes.length > 1 && (
        <select
          value={config.lenteId}
          onChange={(e) => cambiar('lenteId', e.target.value)}
          className="w-full rounded bg-white/10 px-2 py-2"
        >
          <option value="">{tx.lenteAuto(config.camara === 'frontal' ? tx.frontal : tx.trasera)}</option>
          {lentes.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || tx.camaraN(i + 1)}
            </option>
          ))}
        </select>
      )}
      {zoom !== null && capCamara.zoom && (
        <label className="block">
          <span className="flex justify-between text-base">
            <span>{tx.zoom}</span>
            <span className="font-mono">{zoom.toFixed(1)}×</span>
          </span>
          <input
            type="range"
            min={capCamara.zoom.min}
            max={capCamara.zoom.max}
            step={capCamara.zoom.step ?? 0.1}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
          />
        </label>
      )}
      <div className="flex items-center gap-1">
        <span className="mr-1">{tx.encuadre}</span>
        {(
          [
            ['lleno', tx.vertical],
            ['amplio', tx.amplio],
          ] as const
        ).map(([id, nombre]) => (
          <button
            key={id}
            onClick={() => cambiar('encuadre', id)}
            className={`rounded-full px-2 py-1 ${config.encuadre === id ? 'bg-emerald-600' : 'bg-white/10'}`}
          >
            {nombre}
          </button>
        ))}
      </div>
      {mascara.conRostro && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {EXPRESIONES.map((e) => (
            <button
              key={e.id}
              onClick={() => cambiar('expresion', e.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${config.expresion === e.id ? 'bg-emerald-600' : 'bg-white/10'} ${
                config.modoCara !== 'estatico' && expresionDetectada === e.id ? 'ring-2 ring-sky-400' : ''
              }`}
            >
              {e.emoji} {tx.expresion(e.id, e.nombre)}
            </button>
          ))}
        </div>
      )}
      {esBase && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {PEINADOS.map((p) => (
            <button
              key={p.id}
              onClick={() => cambiar('peinado', p.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${config.peinado === p.id ? 'bg-emerald-600' : 'bg-white/10'}`}
            >
              {p.emoji} {tx.peinado(p.id, p.nombre)}
            </button>
          ))}
        </div>
      )}
      {esBase && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            {tx.piel}
            <input type="color" value={config.piel} onChange={(e) => cambiar('piel', e.target.value)} className="h-9 w-12" />
          </label>
          <label className="flex items-center gap-2">
            {tx.pelo}
            <input type="color" value={config.pelo} onChange={(e) => cambiar('pelo', e.target.value)} className="h-9 w-12" />
          </label>
        </div>
      )}
      {(
        [
          { clave: 'escala', nombre: tx.tamano, min: 30, max: 80 },
          { clave: 'altura', nombre: tx.altura, min: -10, max: 10 },
          { clave: 'profundidad', nombre: tx.profundidad, min: -20, max: 5 },
        ] as const
      ).map((s) => (
        <label key={s.clave} className="block">
          <span className="flex justify-between text-base">
            <span>{s.nombre}</span>
            <span className="font-mono">{config[s.clave]}</span>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            value={config[s.clave]}
            onChange={(e) => cambiar(s.clave, Number(e.target.value))}
          />
        </label>
      ))}
    </>
  )

  return (
    <div className="mascara-ui flex h-full items-center justify-center bg-[#0f1115] text-white">
      {/* Lienzo 9:16: el video, la cabeza 3D alineada a su rectángulo real, y todo espejado junto. */}
      <div
        ref={contRef}
        className="relative h-full max-h-full w-auto max-w-full overflow-hidden"
        style={{ aspectRatio: '9 / 16' }}
      >
        {config.encuadre === 'amplio' && (
          <video ref={fondoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover blur-2xl brightness-[.55]" />
        )}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full ${espejo ? '-scale-x-100' : ''} ${config.encuadre === 'amplio' ? 'object-contain' : 'object-cover'}`}
        />
        <div className="pointer-events-none absolute" style={rect ?? { inset: 0 }}>
          <Canvas
            className={espejo ? '-scale-x-100' : ''}
            style={{ position: 'absolute', inset: 0 }}
            dpr={[1, 2]}
            gl={{ preserveDrawingBuffer: true, alpha: true }}
            camera={{ fov: 63, near: 1, far: 1000, position: [0, 0, 0] }}
            onCreated={({ gl }) => {
              canvas3dRef.current = gl.domElement
            }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[4, 8, 5]} intensity={1.1} />
            <directionalLight position={[-4, 3, -3]} intensity={0.35} />
            <Escena
              landmarker={landmarker}
              videoRef={videoRef}
              config={config}
              expresion={expresionEfectiva}
              senales={senalesRef}
              onCara={setConCara}
              onExpresion={setExpresionDetectada}
            />
          </Canvas>
        </div>

        {limpio ? (
          // Modo limpio para la grabación de pantalla de iOS: solo un punto para volver.
          <button
            className="absolute left-3 top-3 h-8 w-8 rounded-full bg-white/10"
            onClick={() => setLimpio(false)}
            aria-label={tx.mostrar}
          />
        ) : (
          <>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-sm">
              {onSalir ? (
                <button className="rounded bg-black/40 px-2 py-1 font-semibold" onClick={onSalir}>
                  ✕ {tx.salir}
                </button>
              ) : (
                <span className="rounded bg-black/40 px-2 py-1 font-semibold">Máscara MPH</span>
              )}
              <span className="rounded bg-black/40 px-2 py-1">
                {errorModelo
                  ? tx.errorModelo
                  : errorCamara
                    ? tx.sinCamara
                    : !landmarker
                      ? tx.cargando
                      : conCara
                        ? tx.caraDetectada
                        : tx.buscandoCara}
              </span>
              <button className="rounded bg-black/40 px-2 py-1" onClick={() => setLimpio(true)}>
                {tx.ocultar}
              </button>
            </div>

            {!pantallaAncha && (
              <div className="absolute inset-x-0 bottom-0 max-h-[75%] space-y-2 overflow-y-auto bg-gradient-to-t from-black/70 via-black/50 to-transparent p-3 text-sm">
                {avisoError}
                {panel && controles}
                <div className="flex items-center justify-center gap-4 pb-2">
                  <button className="rounded bg-white/10 px-3 py-2" onClick={() => setPanel((v) => !v)}>
                    {panel ? tx.menos : tx.ajustes}
                  </button>
                  {botonGrabar}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pantallas anchas (PC/tablet): los controles en columna lateral, sin tapar el video.
          Los controles hacen scroll; el botón de grabar queda SIEMPRE visible al pie. */}
      {!limpio && pantallaAncha && (
        <div className="flex h-full w-80 shrink-0 flex-col bg-black/40 p-4 text-sm">
          {avisoError}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{controles}</div>
          <div className="flex items-center justify-center gap-4 pt-3">{botonGrabar}</div>
        </div>
      )}
    </div>
  )
}
