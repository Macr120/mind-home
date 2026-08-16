import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { conversarConAsistente, iaActiva } from './ia'
import { responder, saludoAsistente, nombreAsistente, type Asistente } from './mascotas'
import { detectarEmocion, EMOCIONES, type EmocionId } from './emociones'
import { limpiarMarkdown } from './texto'
import { reaccionar, useEmocionActiva, useExpresionViva } from '../state/emocionesStore'
import { useChatArUi } from '../state/chatArUiStore'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { AsistenteModelo } from '../house/AsistenteModelo'
import { GestoEmocion } from '../house/GestoEmocion'
import { anclasDe } from '../house/apariencia'
import { forzarSiempre } from '../house/animacion'
import { hablarComoAsistente, callarComoAsistente } from '../audio/voz'
import { useDictado } from '../audio/useDictado'
import { mensajesChatRepo, ultimosMensajesAsistente } from '../data/repository'
import { ErrorIA } from '../cuenta/api'
import { OP_CHAT_AR } from '../cuenta/catalogoNucleo'
import { Creditos } from '../ui/Creditos'
import { Icono } from '../ui/iconos/Icono'
import { useT } from '../i18n/useT'

/**
 * Chat AR: la cámara del dispositivo de fondo y el asistente 3D encima, cara a
 * cara, para conversar por micrófono o texto con respuesta hablada. Comparte el
 * hilo del chat normal (mensajesChat) y las reacciones emocionales de la casa.
 * Se monta lazy desde App.tsx (patrón MascaraOverlay); sin MediaPipe: el
 * personaje no se ancla a la cara, la cámara es solo el fondo.
 */

type Encuadre = 'cuerpo' | 'busto'

/** Posición del personaje en la pantalla, en fracción del ancho/alto visible. */
interface Punto {
  x: number
  y: number
}

/** Tope del arrastre: el personaje no puede salirse del todo de la pantalla. */
const TOPE_ARRASTRE = 0.4

/** Cámara del dispositivo: stream al <video>, con voltear y reintento. */
function useCamaraAr() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<'permiso' | 'sinCamara' | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    let stream: MediaStream | null = null
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('sinCamara')
      return
    }
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
        })
      } catch (e) {
        if (vivo) {
          setError(
            e instanceof DOMException && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
              ? 'sinCamara'
              : 'permiso',
          )
        }
        return
      }
      // Se desmontó (o volteó) mientras el permiso resolvía: apagar en seco.
      if (!vivo) {
        stream.getTracks().forEach((tr) => tr.stop())
        return
      }
      if (videoRef.current) videoRef.current.srcObject = stream
    })()
    return () => {
      vivo = false
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [facing, intento])

  return {
    videoRef,
    facing,
    error,
    voltear: () => setFacing((f) => (f === 'user' ? 'environment' : 'user')),
    reintentar: () => setIntento((n) => n + 1),
  }
}

/** Encuadre conmutable: acerca/aleja la cámara 3D con suavidad (cuerpo ↔ busto). */
function CamaraEncuadre({ encuadre, alturaCabeza }: { encuadre: Encuadre; alturaCabeza: number }) {
  useFrame(({ camera }, dt) => {
    const busto = encuadre === 'busto'
    const px = 0
    const py = busto ? alturaCabeza : 1.1
    const pz = busto ? 2 : 5.2
    const k = Math.min(1, dt * 6)
    camera.position.x += (px - camera.position.x) * k
    camera.position.y += (py - camera.position.y) * k
    camera.position.z += (pz - camera.position.z) * k
    camera.lookAt(0, busto ? alturaCabeza : 0.85, 0)
  })
  return null
}

/**
 * Coloca al personaje donde el usuario lo arrastró. `arrastre` viene en fracción
 * de pantalla, así que se convierte a unidades del mundo con el viewport a esa
 * distancia: el personaje sigue al dedo 1:1, sea cual sea el encuadre.
 */
function PersonajeMovible({ arrastre, children }: { arrastre: RefObject<Punto>; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((state, dt) => {
    const grupo = g.current
    if (!grupo) return
    const v = state.viewport.getCurrentViewport(state.camera, [0, 0, 0])
    const k = Math.min(1, dt * 18)
    grupo.position.x += (arrastre.current.x * v.width - grupo.position.x) * k
    grupo.position.y += (arrastre.current.y * v.height - grupo.position.y) * k
  })
  return <group ref={g}>{children}</group>
}

/** El asistente sobre la cámara: modelo compartido + emoción viva (cara y gesto). */
function EscenaAr({
  asistente,
  encuadre,
  arrastre,
}: {
  asistente: Asistente
  encuadre: Encuadre
  arrastre: RefObject<Punto>
}) {
  const expViva = useExpresionViva(asistente.id, asistente.expresion)
  const escala = asistente.escala ?? 1
  const alturaCabeza = anclasDe(asistente).cabezaY * escala
  // Su animación guardada forzada a 'siempre'; sin ninguna, un flote suave de vida.
  const anim = forzarSiempre(asistente.animacion) ?? {
    activacion: 'siempre' as const,
    preset: 'flotar' as const,
    velocidad: 0.6,
    intensidad: 0.35,
  }
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />
      <CamaraEncuadre encuadre={encuadre} alturaCabeza={alturaCabeza} />
      <PersonajeMovible arrastre={arrastre}>
        <GestoEmocion asistenteId={asistente.id}>
          <AsistenteModelo asistente={asistente} anim={anim} expresion={expViva} />
        </GestoEmocion>
      </PersonajeMovible>
    </>
  )
}

export default function ChatArOverlay() {
  const t = useT()
  const cerrar = useChatArUi((s) => s.cerrar)
  const asistentes = useAsistentes((s) => s.lista)
  const [asistenteId, setAsistenteId] = useState(() => useMascota.getState().mascota)
  const asistente = asistentes.find((a) => a.id === asistenteId) ?? asistentes[0]
  const [texto, setTexto] = useState('')
  const [burbuja, setBurbuja] = useState<string | null>(null)
  const [pensando, setPensando] = useState(false)
  const [encuadre, setEncuadre] = useState<Encuadre>('cuerpo')
  const [selector, setSelector] = useState(false)
  const emocion = useEmocionActiva(asistente.id)
  const cam = useCamaraAr()
  const dictado = useDictado({ onTexto: setTexto, onError: (m) => setBurbuja(m) })
  const detenerDictado = useRef(dictado.detener)
  detenerDictado.current = dictado.detener
  // Dónde puso el usuario al personaje: ref (no estado) porque lo lee la escena
  // por frame y arrastrar no debe re-renderizar el overlay.
  const arrastre = useRef<Punto>({ x: 0, y: 0 })

  // Saludo al abrir y al cambiar de asistente (hablado: abrir el overlay ya fue un gesto).
  useEffect(() => {
    const saludo = saludoAsistente(t, asistente)
    setBurbuja(saludo)
    void hablarComoAsistente(limpiarMarkdown(saludo), asistente)
    return () => callarComoAsistente()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saluda solo al cambiar de asistente
  }, [asistente.id])

  // Esc cierra (fase capture, antes que el resto de la UI) y cleanup del dictado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      cerrar()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      detenerDictado.current()
    }
  }, [cerrar])

  /**
   * Arrastrar al personaje por la pantalla con el dedo o el puntero. El
   * seguimiento va en `window` (no con pointer capture) para no dejar muertos
   * los botones del overlay si el gesto termina encima de uno.
   */
  const tomarPersonaje = (e: React.PointerEvent) => {
    const inicio = { x: e.clientX, y: e.clientY }
    const base = { ...arrastre.current }
    const tope = (v: number) => Math.max(-TOPE_ARRASTRE, Math.min(TOPE_ARRASTRE, v))
    const mover = (ev: PointerEvent) => {
      arrastre.current = {
        x: tope(base.x + (ev.clientX - inicio.x) / window.innerWidth),
        // La pantalla crece hacia abajo y el mundo 3D hacia arriba.
        y: tope(base.y - (ev.clientY - inicio.y) / window.innerHeight),
      }
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  const enviarAr = async () => {
    const txt = texto.trim()
    if (!txt || pensando) return
    if (!iaActiva()) {
      setBurbuja(t('chatAr.sinIa', 'Para conversar aquí primero elige un modelo de IA en el chat de la casa.'))
      return
    }
    callarComoAsistente()
    setTexto('')
    setPensando(true)
    try {
      // El historial se lee ANTES de guardar el turno (si no, el mensaje llega doble).
      const historial = await ultimosMensajesAsistente(asistente.id, 12)
      await mensajesChatRepo.add({ asistenteId: asistente.id, rol: 'usuario', texto: txt, creado: new Date().toISOString() })
      let respuesta: string
      let emo: EmocionId | null
      try {
        const r = await conversarConAsistente(txt, asistente.id, historial)
        respuesta = r.respuesta
        emo = r.emocion
      } catch (err) {
        if (err instanceof ErrorIA && (err.codigo === 'cuota-agotada' || err.codigo === 'sin-pro')) {
          setBurbuja(
            err.codigo === 'cuota-agotada'
              ? t('chat.cuotaAgotada', 'Agotaste tu cuota de IA de este mes. Revisa tu uso en Editor → Configuraciones → Cuenta.')
              : t('chat.sinPro', 'Tu cuenta no tiene la suscripción activa.'),
          )
          return
        }
        // Sin red u otro fallo: frase enlatada del personaje, que la charla no muera.
        respuesta = responder(asistente.forma, { tipo: 'sinClasificar' }, t)
        emo = detectarEmocion(respuesta)
      }
      reaccionar(asistente.id, emo)
      await mensajesChatRepo.add({ asistenteId: asistente.id, rol: 'asistente', texto: respuesta, creado: new Date().toISOString() })
      const limpio = limpiarMarkdown(respuesta)
      setBurbuja(limpio)
      // Se lee SIEMPRE (es el propósito del modo), tenga o no `vozLeer` el asistente.
      void hablarComoAsistente(limpio, asistente)
    } finally {
      setPensando(false)
    }
  }

  const botonTop =
    'ui-panel-glass grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-lg text-white/80 transition hover:bg-white/10'

  return (
    <div className="ui-noche fixed inset-0 z-[60] bg-black">
      {/* Cámara de fondo (espejada si es la frontal) */}
      {!cam.error && (
        <video
          ref={cam.videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${cam.facing === 'user' ? '-scale-x-100' : ''}`}
        />
      )}

      {/* Cámara denegada o inexistente: aviso amable, nunca cerrar solo */}
      {cam.error && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="ui-panel-glass w-full max-w-sm rounded-2xl border border-white/10 p-5 text-center">
            <div className="text-3xl">
              <Icono nombre="chat-ar" />
            </div>
            <p className="mt-3 text-sm text-white/80">
              {cam.error === 'permiso'
                ? t('chatAr.permiso', 'El navegador bloqueó la cámara. Actívala en el candado junto a la dirección.')
                : t('chatAr.sinCamara', 'No encontré ninguna cámara en este equipo.')}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={cam.reintentar}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/20"
              >
                {t('chatAr.reintentar', 'Reintentar')}
              </button>
              <button
                type="button"
                onClick={cerrar}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/20"
              >
                {t('chatAr.salir', 'Salir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* El asistente 3D encima del video: arrastrable con el dedo o el puntero
          (doble toque lo vuelve a centrar). */}
      {!cam.error && (
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={tomarPersonaje}
          onDoubleClick={() => {
            arrastre.current = { x: 0, y: 0 }
          }}
        >
          <Canvas gl={{ alpha: true }} dpr={[1, 1.5]} camera={{ position: [0, 1.1, 5.2], fov: 35, near: 0.1, far: 100 }}>
            <EscenaAr asistente={asistente} encuadre={encuadre} arrastre={arrastre} />
          </Canvas>
        </div>
      )}

      {/* Botonera superior */}
      <div className="absolute end-3 top-3 flex gap-2" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {!cam.error && (
          <>
            <button type="button" onClick={cam.voltear} className={botonTop} title={t('chatAr.voltear', 'Cambiar de cámara')}>
              <Icono nombre="sincronizar" />
            </button>
            <button
              type="button"
              onClick={() => setEncuadre((e) => (e === 'cuerpo' ? 'busto' : 'cuerpo'))}
              className={botonTop}
              title={t('chatAr.encuadre', 'Cambiar encuadre')}
            >
              <Icono nombre={encuadre === 'cuerpo' ? 'perfil' : 'persona'} />
            </button>
          </>
        )}
        <button type="button" onClick={callarComoAsistente} className={botonTop} title={t('chatAr.callar', 'Silenciar la voz')}>
          <Icono nombre="silencio" />
        </button>
        <button type="button" onClick={cerrar} className={botonTop} title={t('chatAr.salir', 'Salir')}>
          <Icono nombre="cerrar" />
        </button>
      </div>

      {/* Selector de asistente (chip arriba a la izquierda) */}
      <div className="absolute start-3 top-3" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button
          type="button"
          onClick={() => setSelector((v) => !v)}
          className="ui-panel-glass flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          title={t('chatAr.asistente', 'Cambiar de asistente')}
        >
          <Icono emoji={asistente.emoji} />
          <span>{nombreAsistente(t, asistente)}</span>
        </button>
        {selector && (
          <div className="ui-panel-glass ui-pop mt-2 w-52 rounded-2xl border border-white/10 p-2 shadow-xl">
            {asistentes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelector(false)
                  if (a.id !== asistente.id) {
                    callarComoAsistente()
                    setAsistenteId(a.id)
                  }
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs font-semibold transition hover:bg-white/10 ${
                  a.id === asistente.id ? 'bg-white/10 text-white' : 'text-white/70'
                }`}
              >
                <Icono emoji={a.emoji} />
                <span className="flex-1 truncate">{nombreAsistente(t, a)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Burbuja de la respuesta + reacción */}
      {(burbuja || pensando) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
          <div className="ui-panel-glass ui-pop max-w-md rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/90 shadow-xl">
            <div className="flex items-start gap-2">
              {emocion && (
                <span className="ui-pop text-xl">
                  <Icono emoji={EMOCIONES[emocion].emoji} />
                </span>
              )}
              <span>{pensando ? <span className="animate-pulse">···</span> : burbuja}</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior: texto + mic + enviar */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviarAr()
          }}
          placeholder={t('chatAr.placeholder', 'Háblale o escríbele…')}
          className="ui-panel-glass h-11 min-w-0 flex-1 rounded-xl border border-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40"
        />
        {dictado.soportado && (
          <button
            type="button"
            onClick={() => {
              callarComoAsistente() // que el micrófono no transcriba al propio asistente
              dictado.toggle()
            }}
            disabled={dictado.transcribiendo}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-lg transition ${
              dictado.grabando
                ? 'animate-pulse bg-red-500/25 text-red-400'
                : dictado.transcribiendo
                  ? 'ui-panel-glass animate-pulse text-white/45'
                  : 'ui-panel-glass text-white/80 hover:bg-white/10'
            }`}
            title={dictado.grabando ? t('chat.vozParar', 'Detener dictado') : t('chat.voz', 'Dictar por voz')}
          >
            <Icono nombre="microfono" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void enviarAr()}
          disabled={pensando || !texto.trim()}
          className="ui-panel-glass relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-lg text-white/80 transition enabled:hover:bg-white/10 disabled:opacity-50"
          title={t('chatAr.enviar', 'Enviar')}
        >
          <Icono nombre="enviar" />
          <span className="absolute -end-1 -top-1">
            <Creditos op={OP_CHAT_AR} />
          </span>
        </button>
      </div>
    </div>
  )
}
