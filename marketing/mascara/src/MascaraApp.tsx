import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { renderSVG } from 'uqr'
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
import { crearComposicion, iniciarGrabacion, guardarGrabacion, type Composicion, type Encuadre, type Grabador } from './grabador'
import { crearClasificador, nivelBoca, puntuaciones, senalesIniciales, type ModoCara, type SenalesCara } from './expresiones'
import { MASCARAS, mascaraDe } from './mascaras'
import {
  controlar,
  emitir,
  generarCodigo,
  type AccionRemota,
  type ClaveAjuste,
  type Controlador,
  type CrearSenal,
  type Emisor,
  type EstadoConexion,
  type EstadoEmisor,
  type RolRemoto,
} from './remoto'
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
  remoto: string
  remotoPermitir: string
  remotoConectar: string
  remotoCodigo: string
  remotoEsperando: string
  remotoConectando: string
  remotoConectado: string
  remotoCortado: string
  remotoCortar: string
  remotoReintentar: string
  remotoAyuda: string
  remotoQr: string
  remotoVideo: string
  remotoError: (detalle: string) => string
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
  remoto: 'Remoto',
  remotoPermitir: 'Permitir control',
  remotoConectar: 'Conectar',
  remotoCodigo: 'Código',
  remotoEsperando: 'Esperando al otro teléfono…',
  remotoConectando: 'Conectando…',
  remotoConectado: 'Conectado',
  remotoCortado: 'Conexión cortada',
  remotoCortar: 'Cortar',
  remotoReintentar: 'Reintentar',
  remotoAyuda: 'Abre la Máscara AR en el otro teléfono y escribe este código en su sección Remoto.',
  remotoQr: 'O escanea el código QR con la cámara del otro teléfono.',
  remotoVideo: 'Esperando el video…',
  remotoError: (detalle) => `No se pudo conectar: ${detalle}`,
}

/** m:ss para el contador de grabación (local o el que difunde el emisor). */
const formatoReloj = (segundos: number) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`

/**
 * El panel de ajustes COMPLETO (máscara, cara, cámara, lente, zoom, encuadre,
 * expresión, peinado, colores y sliders). Lo pintan los dos teléfonos: el
 * emisor con su estado local y el controlador con el `EstadoEmisor` recibido —
 * mismos controles a los dos lados, solo cambia a dónde van los cambios.
 */
function ControlesAjustes({
  tx,
  v,
  onAjuste,
  onZoom,
  onLinterna,
}: {
  tx: TextosMascara
  v: EstadoEmisor
  onAjuste: (clave: ClaveAjuste, valor: string | number) => void
  onZoom: (valor: number) => void
  onLinterna: () => void
}) {
  // Cada máscara trae lo suyo horneado: solo la Base tiene piel/peinado editables,
  // y solo Base y Princesa llevan el rostro dibujado encima.
  const mascara = mascaraDe(v.mascaraId)
  const esBase = mascara.piezas === null
  return (
    <>
      <div className="flex items-center gap-1">
        <span className="mr-1">{tx.mascara}</span>
        <div className="flex flex-1 gap-1 overflow-x-auto pb-1">
          {MASCARAS.map((m) => (
            <button
              key={m.id}
              onClick={() => onAjuste('mascaraId', m.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${v.mascaraId === m.id ? 'bg-emerald-600' : 'bg-white/10'}`}
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
              onClick={() => onAjuste('modoCara', id)}
              className={`rounded-full px-2 py-1 ${v.modoCara === id ? 'bg-emerald-600' : 'bg-white/10'}`}
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
            onClick={() => onAjuste('camara', id)}
            className={`rounded-full px-2 py-1 ${v.camara === id ? 'bg-emerald-600' : 'bg-white/10'}`}
          >
            {nombre}
          </button>
        ))}
        {v.linterna !== null && (
          <button
            onClick={onLinterna}
            className={`ml-auto rounded-full px-2 py-1 ${v.linterna ? 'bg-amber-500 text-black' : 'bg-white/10'}`}
          >
            {tx.linterna}
          </button>
        )}
      </div>
      {v.lentes.length > 1 && (
        <select
          value={v.lenteId}
          onChange={(e) => onAjuste('lenteId', e.target.value)}
          className="w-full rounded bg-white/10 px-2 py-2"
        >
          <option value="">{tx.lenteAuto(v.camara === 'frontal' ? tx.frontal : tx.trasera)}</option>
          {v.lentes.map((d, i) => (
            <option key={d.id} value={d.id}>
              {d.nombre || tx.camaraN(i + 1)}
            </option>
          ))}
        </select>
      )}
      {v.zoom && (
        <label className="block">
          <span className="flex justify-between text-base">
            <span>{tx.zoom}</span>
            <span className="font-mono">{v.zoom.v.toFixed(1)}×</span>
          </span>
          <input
            type="range"
            min={v.zoom.min}
            max={v.zoom.max}
            step={v.zoom.step}
            value={v.zoom.v}
            onChange={(e) => onZoom(Number(e.target.value))}
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
            onClick={() => onAjuste('encuadre', id)}
            className={`rounded-full px-2 py-1 ${v.encuadre === id ? 'bg-emerald-600' : 'bg-white/10'}`}
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
              onClick={() => onAjuste('expresion', e.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${v.expresion === e.id ? 'bg-emerald-600' : 'bg-white/10'} ${
                v.modoCara !== 'estatico' && v.expresionDetectada === e.id ? 'ring-2 ring-sky-400' : ''
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
              onClick={() => onAjuste('peinado', p.id)}
              className={`shrink-0 rounded-full px-2 py-1 ${v.peinado === p.id ? 'bg-emerald-600' : 'bg-white/10'}`}
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
            <input type="color" value={v.piel} onChange={(e) => onAjuste('piel', e.target.value)} className="h-9 w-12" />
          </label>
          <label className="flex items-center gap-2">
            {tx.pelo}
            <input type="color" value={v.pelo} onChange={(e) => onAjuste('pelo', e.target.value)} className="h-9 w-12" />
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
            <span className="font-mono">{v[s.clave]}</span>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            value={v[s.clave]}
            onChange={(e) => onAjuste(s.clave, Number(e.target.value))}
          />
        </label>
      ))}
    </>
  )
}

/**
 * Standalone no pasa props; la app principal pasa `onSalir`, sus textos
 * traducidos y `crearSenal` (la señalización del control remoto; sin ella la
 * sección Remoto no aparece, como en el build standalone sin backend).
 * `urlRemota` arma la URL que codifica el QR del emisor y `codigoInicial`
 * (llega del propio QR, vía `?mascara=`) conecta como controlador al abrir.
 */
export function MascaraApp({
  onSalir,
  textos,
  crearSenal,
  urlRemota,
  codigoInicial,
}: {
  onSalir?: () => void
  textos?: Partial<TextosMascara>
  crearSenal?: CrearSenal
  urlRemota?: (codigo: string) => string
  codigoInicial?: string
} = {}) {
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
  // Control remoto: rol de este teléfono, estado de la conexión y, en el
  // controlador, el stream recibido y el estado que difunde el emisor.
  const [remoto, setRemoto] = useState<{ rol: RolRemoto; codigo: string } | null>(null)
  const [estadoRemoto, setEstadoRemoto] = useState<EstadoConexion>('esperando')
  const [errorRemoto, setErrorRemoto] = useState<string | null>(null)
  const [codigoEntrada, setCodigoEntrada] = useState('')
  const [remotoPlegado, setRemotoPlegado] = useState(true)
  // Llegó por el QR: la cámara local no se pide mientras la conexión automática siga en pie.
  const [conectandoAuto, setConectandoAuto] = useState(!!codigoInicial)
  const [videoRemoto, setVideoRemoto] = useState<MediaStream | null>(null)
  const [estadoEmisor, setEstadoEmisor] = useState<EstadoEmisor | null>(null)
  const videoRemotoRef = useRef<HTMLVideoElement>(null)
  const emisorRef = useRef<Emisor | null>(null)
  const controlRef = useRef<Controlador | null>(null)
  const composicionRef = useRef<Composicion | null>(null)
  const configRef = useRef(config)
  const espejo = config.camara === 'frontal'
  const esControl = remoto?.rol === 'control'

  useEffect(() => {
    configRef.current = config
  }, [config])

  // Cámara sin audio (el micrófono se pide al empezar a grabar). Se reabre al
  // cambiar de cámara o de lente; el cleanup apaga el stream anterior. En modo
  // controlador (o llegando por QR hacia él) la cámara local se apaga: el video
  // llega del emisor y no hay que asustar con el permiso de cámara.
  useEffect(() => {
    if (esControl || conectandoAuto) return
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
            // Muy por encima de cualquier sensor: al ser `ideal`, el navegador
            // entrega el modo MÁS GRANDE que tenga la cámara (su máxima
            // resolución real); el aspectRatio inclina la elección al 4:3 del
            // sensor completo para no perder campo visual por un 16:9 recortado.
            width: { ideal: 4096 },
            height: { ideal: 3072 },
            aspectRatio: { ideal: 4 / 3 },
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
  }, [config.camara, config.lenteId, esControl, conectandoAuto])

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
  const reloj = formatoReloj(segundos)
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

  // ——— Control remoto ———

  /**
   * Aplica un ajuste (propio o del controlador) validando el valor: las órdenes
   * llegan por el DataChannel y no se confía en ellas a ciegas.
   */
  const aplicarAjuste = (clave: ClaveAjuste, valor: string | number) => {
    switch (clave) {
      case 'camara':
        if (valor === 'frontal' || valor === 'trasera') cambiarCamara(valor)
        break
      case 'lenteId':
        if (valor === '' || lentes.some((d) => d.deviceId === valor)) cambiar('lenteId', valor as string)
        break
      case 'mascaraId':
        if (MASCARAS.some((m) => m.id === valor)) cambiar('mascaraId', valor as string)
        break
      case 'modoCara':
        if (valor === 'estatico' || valor === 'expresiones' || valor === 'vivo') cambiar('modoCara', valor)
        break
      case 'encuadre':
        if (valor === 'lleno' || valor === 'amplio') cambiar('encuadre', valor)
        break
      case 'expresion':
        if (EXPRESIONES.some((e) => e.id === valor)) cambiar('expresion', valor as ExpresionId)
        break
      case 'peinado':
        if (PEINADOS.some((p) => p.id === valor)) cambiar('peinado', valor as PeinadoId)
        break
      case 'piel':
      case 'pelo':
        if (typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor)) cambiar(clave, valor)
        break
      case 'escala':
        if (typeof valor === 'number') cambiar('escala', Math.min(80, Math.max(30, valor)))
        break
      case 'altura':
        if (typeof valor === 'number') cambiar('altura', Math.min(10, Math.max(-10, valor)))
        break
      case 'profundidad':
        if (typeof valor === 'number') cambiar('profundidad', Math.min(5, Math.max(-20, valor)))
        break
    }
  }

  /** Ejecuta una orden del controlador con los mismos manejadores de la UI local. */
  const manejarAccion = (orden: AccionRemota) => {
    switch (orden.accion) {
      case 'ajuste':
        aplicarAjuste(orden.clave, orden.valor)
        break
      case 'zoom':
        if (typeof orden.valor === 'number') cambiarZoom(orden.valor)
        break
      case 'linterna':
        alternarLinterna()
        break
      case 'grabar':
        void alternarGrabacion()
        break
    }
  }
  // Ref refrescado por render: el DataChannel vive fuera de React y necesita
  // llegar siempre a los manejadores con el estado vigente.
  const manejarAccionRef = useRef(manejarAccion)
  useEffect(() => {
    manejarAccionRef.current = manejarAccion
  })

  /** Este teléfono emite: compone cámara + máscara y espera al controlador con un código. */
  const iniciarEmision = async () => {
    if (!crearSenal || !videoRef.current || !canvas3dRef.current) return
    setErrorRemoto(null)
    try {
      const codigo = generarCodigo()
      const senal = await crearSenal(codigo)
      const comp = crearComposicion(videoRef.current, canvas3dRef.current, () => ({
        encuadre: configRef.current.encuadre,
        espejo: configRef.current.camara === 'frontal',
      }))
      composicionRef.current = comp
      emisorRef.current = emitir(senal, comp.canvas.captureStream(24), {
        onEstado: setEstadoRemoto,
        onAccion: (orden) => manejarAccionRef.current(orden),
      })
      setEstadoRemoto('esperando')
      setRemoto({ rol: 'emisor', codigo })
    } catch (e) {
      setErrorRemoto(e instanceof Error ? e.message : String(e))
    }
  }

  /** Este teléfono controla: se une al código del emisor (tecleado o del QR) y pasa a ver su streaming. */
  const conectarControl = async (codigoDirecto?: string) => {
    const codigo = (codigoDirecto ?? codigoEntrada).trim().toUpperCase()
    if (!crearSenal || !codigo) return
    setErrorRemoto(null)
    try {
      const senal = await crearSenal(codigo)
      controlRef.current = controlar(senal, {
        onEstado: setEstadoRemoto,
        onVideo: setVideoRemoto,
        onEstadoEmisor: setEstadoEmisor,
      })
      setEstadoRemoto('conectando')
      setRemoto({ rol: 'control', codigo })
    } catch (e) {
      setErrorRemoto(e instanceof Error ? e.message : String(e))
      setConectandoAuto(false)
    }
  }

  // Abierto desde el QR (`?mascara=CODIGO`): conecta solo, sin teclear nada.
  const autoConectado = useRef(false)
  useEffect(() => {
    if (autoConectado.current || !codigoInicial || !crearSenal) return
    autoConectado.current = true
    setCodigoEntrada(codigoInicial)
    void conectarControl(codigoInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar; conectarControl es del render
  }, [])

  const cortarRemoto = () => {
    emisorRef.current?.cerrar()
    controlRef.current?.cerrar()
    composicionRef.current?.detener()
    emisorRef.current = null
    controlRef.current = null
    composicionRef.current = null
    setRemoto(null)
    setVideoRemoto(null)
    setEstadoEmisor(null)
    setEstadoRemoto('esperando')
    setConectandoAuto(false)
  }

  const mandar = (orden: AccionRemota) => controlRef.current?.enviarAccion(orden)

  // Al desmontar (Salir de la máscara) se corta cualquier conexión viva.
  useEffect(
    () => () => {
      emisorRef.current?.cerrar()
      controlRef.current?.cerrar()
      composicionRef.current?.detener()
    },
    [],
  )

  // El estado completo de este teléfono con la forma que pinta ControlesAjustes:
  // alimenta el panel local Y es lo que se difunde al controlador — así el otro
  // lado ve EXACTAMENTE los mismos controles.
  const estadoActual: EstadoEmisor = {
    camara: config.camara,
    lenteId: config.lenteId,
    lentes: lentes.map((d) => ({ id: d.deviceId, nombre: d.label ?? '' })),
    mascaraId: config.mascaraId,
    modoCara: config.modoCara,
    encuadre: config.encuadre,
    expresion: config.expresion,
    expresionDetectada,
    peinado: config.peinado,
    piel: config.piel,
    pelo: config.pelo,
    escala: config.escala,
    altura: config.altura,
    profundidad: config.profundidad,
    zoom:
      zoom !== null && capCamara.zoom
        ? { v: zoom, min: capCamara.zoom.min, max: capCamara.zoom.max, step: capCamara.zoom.step ?? 0.1 }
        : null,
    linterna: capCamara.torch ? linterna : null,
    grabando,
    segundos,
    conCara,
  }

  // El emisor difunde su estado en cada cambio: el controlador pinta con él.
  useEffect(() => {
    if (remoto?.rol !== 'emisor') return
    emisorRef.current?.enviarEstado(estadoActual)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- estadoActual se rearma por render; disparan sus fuentes
  }, [remoto, config, lentes, expresionDetectada, zoom, capCamara, linterna, grabando, segundos, conCara])

  // El stream remoto se enchufa al <video> del controlador cuando llega.
  useEffect(() => {
    const v = videoRemotoRef.current
    if (v && videoRemoto && v.srcObject !== videoRemoto) {
      v.srcObject = videoRemoto
      v.play().catch(() => {})
    }
  }, [videoRemoto, esControl, estadoRemoto])
  // QR del emisor: codifica la URL que abre la app del otro teléfono conectando sola.
  const urlQr = remoto?.rol === 'emisor' && urlRemota ? urlRemota(remoto.codigo) : null
  const qr = useMemo(
    () => (urlQr ? 'data:image/svg+xml;utf8,' + encodeURIComponent(renderSVG(urlQr, { border: 1 })) : null),
    [urlQr],
  )
  // La sección Remoto nace plegada; se abre a mano, con una sesión viva o con un error que enseñar.
  const remotoAbierto = !remotoPlegado || remoto !== null || !!errorRemoto

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
      <ControlesAjustes tx={tx} v={estadoActual} onAjuste={aplicarAjuste} onZoom={cambiarZoom} onLinterna={alternarLinterna} />
      {crearSenal && (
        <div className="space-y-2 rounded-lg bg-white/5 p-2">
          <button className="flex w-full items-center justify-between" onClick={() => setRemotoPlegado((v) => !v)}>
            <span>{tx.remoto}</span>
            <span className="opacity-70">{remotoAbierto ? '▾' : '▸'}</span>
          </button>
          {remotoAbierto && (
            <>
              {!remoto ? (
                <div className="flex flex-wrap items-center gap-1">
                  <button onClick={() => void iniciarEmision()} className="rounded-full bg-white/10 px-2 py-1">
                    {tx.remotoPermitir}
                  </button>
                  <input
                    value={codigoEntrada}
                    onChange={(e) => setCodigoEntrada(e.target.value.toUpperCase())}
                    placeholder={tx.remotoCodigo}
                    maxLength={6}
                    className="w-28 rounded bg-white/10 px-2 py-1 text-center font-mono uppercase tracking-widest"
                  />
                  <button
                    onClick={() => void conectarControl()}
                    disabled={codigoEntrada.trim().length < 6}
                    className="rounded-full bg-white/10 px-2 py-1 disabled:opacity-40"
                  >
                    {tx.remotoConectar}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-black/40 px-2 py-1 font-mono text-lg tracking-widest">{remoto.codigo}</span>
                    <span>
                      {estadoRemoto === 'conectado'
                        ? tx.remotoConectado
                        : estadoRemoto === 'conectando'
                          ? tx.remotoConectando
                          : estadoRemoto === 'cortado'
                            ? tx.remotoCortado
                            : tx.remotoEsperando}
                    </span>
                    <button onClick={cortarRemoto} className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-1">
                      {tx.remotoCortar}
                    </button>
                  </div>
                  {estadoRemoto !== 'conectado' && (
                    <div className="flex items-start gap-3 pt-1">
                      {qr && <img src={qr} alt={tx.remotoCodigo} className="h-32 w-32 shrink-0 rounded" />}
                      <p className="text-xs opacity-80">
                        {tx.remotoAyuda}
                        {qr && ` ${tx.remotoQr}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {errorRemoto && <p className="rounded bg-red-900/70 px-2 py-1 text-xs">{tx.remotoError(errorRemoto)}</p>}
            </>
          )}
        </div>
      )}
    </>
  )

  // Modo controlador: nada de cámara ni MediaPipe locales; el streaming del
  // emisor a pantalla completa y los controles que mandan órdenes por WebRTC.
  if (esControl) {
    const est = estadoEmisor
    return (
      <div className="mascara-ui flex h-full items-center justify-center bg-[#0f1115] text-white">
        <div
          className="relative h-full max-h-full w-auto max-w-full overflow-hidden"
          style={{ aspectRatio: '9 / 16' }}
        >
          {/* El lienzo compuesto ya viene espejado desde el emisor: aquí no se voltea nada. */}
          <video ref={videoRemotoRef} playsInline autoPlay muted className="absolute inset-0 h-full w-full object-contain" />
          {(estadoRemoto !== 'conectado' || !videoRemoto) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <p>
                {estadoRemoto === 'cortado'
                  ? tx.remotoCortado
                  : estadoRemoto === 'conectado'
                    ? tx.remotoVideo
                    : tx.remotoConectando}
              </p>
              {estadoRemoto === 'cortado' && (
                <button
                  className="rounded bg-white/10 px-3 py-2"
                  onClick={() => {
                    setEstadoRemoto('conectando')
                    controlRef.current?.reintentar()
                  }}
                >
                  {tx.remotoReintentar}
                </button>
              )}
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-sm">
            <button className="rounded bg-black/40 px-2 py-1 font-semibold" onClick={cortarRemoto}>
              ✕ {tx.salir}
            </button>
            <span className="rounded bg-black/40 px-2 py-1">
              {tx.remoto} ·{' '}
              {estadoRemoto === 'conectado'
                ? est?.conCara
                  ? tx.caraDetectada
                  : tx.buscandoCara
                : estadoRemoto === 'cortado'
                  ? tx.remotoCortado
                  : tx.remotoConectando}
            </span>
          </div>
          {est && estadoRemoto === 'conectado' && (
            <div className="absolute inset-x-0 bottom-0 max-h-[75%] space-y-2 overflow-y-auto bg-gradient-to-t from-black/70 via-black/50 to-transparent p-3 text-sm">
              <ControlesAjustes
                tx={tx}
                v={est}
                onAjuste={(clave, valor) => {
                  // Eco optimista: los controles no esperan el viaje de ida y vuelta.
                  setEstadoEmisor((s) => (s ? { ...s, [clave]: valor } : s))
                  mandar({ accion: 'ajuste', clave, valor })
                }}
                onZoom={(valor) => {
                  setEstadoEmisor((s) => (s?.zoom ? { ...s, zoom: { ...s.zoom, v: valor } } : s))
                  mandar({ accion: 'zoom', valor })
                }}
                onLinterna={() => mandar({ accion: 'linterna' })}
              />
              <div className="flex items-center justify-center gap-4 pb-2">
                <button
                  onClick={() => mandar({ accion: 'grabar' })}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white ${est.grabando ? 'bg-red-600' : 'bg-red-500'}`}
                  aria-label={est.grabando ? tx.detener : tx.grabar}
                >
                  {est.grabando ? (
                    <span className="h-6 w-6 rounded bg-white" />
                  ) : (
                    <span className="h-10 w-10 rounded-full bg-red-700" />
                  )}
                </button>
                {est.grabando && <span className="font-mono text-lg">{formatoReloj(est.segundos)}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
                {remoto?.rol === 'emisor' && estadoRemoto === 'conectado' && ` · ${tx.remoto}`}
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
