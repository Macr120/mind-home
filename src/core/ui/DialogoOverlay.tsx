import { useEffect, useRef, useState } from 'react'
import { useDialogo } from '../state/dialogoStore'
import { useMascota } from '../state/mascotaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useHud } from '../state/hudStore'
import { limpiarMarkdown } from '../chat/texto'
import { nombreAsistente, saludoAsistente } from '../chat/mascotas'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonVoz, ToggleVozAuto } from './BotonVoz'

/**
 * Overlay del modo diálogo cara a cara (estilo RPG): franja cinematográfica,
 * cabecera con el nombre del asistente y caja de diálogo con efecto máquina
 * de escribir. El campo para responder es el ChatBox de siempre, justo debajo
 * (así se conserva todo su pipeline: IA con historial, dictado, herramientas).
 */
export function DialogoOverlay() {
  const asistenteId = useDialogo((s) => s.asistenteId)
  if (!asistenteId) return null
  return <DialogoActivo key={asistenteId} id={asistenteId} />
}

function DialogoActivo({ id }: { id: string }) {
  const t = useT()
  const salir = useDialogo((s) => s.salir)
  const lista = useAsistentes((s) => s.lista)
  const mensaje = useMascota((s) => s.mensaje)
  const hablanteId = useMascota((s) => s.hablanteId)
  const pensando = useMascota((s) => s.pensando)
  const abrirConversacion = useMascota((s) => s.abrirConversacion)
  const conversacion = useMascota((s) => s.conversacion)
  // El chat de abajo puede crecer (texto largo, botones que envuelven en
  // móvil): la caja se ancla a su alto REAL, no a un hueco fijo que él mismo
  // podría rebasar (mismo cálculo que `PilaPrompts`, sin depender del orden
  // de montaje de los otros bloques del HUD).
  const topes = useHud((s) => s.topes)
  const bottomCaja = Math.max(96, ...Object.values(topes).map((p) => p + 12))

  const a = lista.find((x) => x.id === id) ?? lista[0]

  // Texto de la caja: copia local del último mensaje del asistente del diálogo
  // (la burbuja se borra sola a los segundos; la caja lo conserva).
  const [texto, setTexto] = useState('')
  const [reveladas, setReveladas] = useState(0)
  const refCaja = useRef<HTMLButtonElement>(null)

  // Saludo de entrada (no se persiste en el hilo): solo si no está ya hablando.
  useEffect(() => {
    const timer = setTimeout(() => {
      const st = useMascota.getState()
      if (!st.mensaje && !st.pensando) {
        st.decir(saludoAsistente(t, a), { asistenteId: id, persistir: false })
      }
    }, 450)
    return () => clearTimeout(timer)
    // Solo al entrar con este asistente; el saludo no debe repetirse por re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Copia lo que dice el asistente del diálogo (ignora mensajes de otros).
  useEffect(() => {
    // Espejo filtrado: solo pega el mensaje si habla ESTE asistente, así que el
    // texto no es derivable del store (debe conservar el último válido).
    if (mensaje && (hablanteId ?? useMascota.getState().mascota) === id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTexto(limpiarMarkdown(mensaje))
    }
  }, [mensaje, hablanteId, id])

  // Máquina de escribir (~35 caracteres/s); click en la caja la completa.
  useEffect(() => {
    // Cada texto nuevo reinicia la escritura desde el primer carácter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReveladas(0)
    if (!texto) return
    const timer = window.setInterval(() => {
      setReveladas((r) => {
        if (r + 1 >= texto.length) window.clearInterval(timer)
        return r + 1
      })
    }, 28)
    return () => window.clearInterval(timer)
  }, [texto])

  // Respuestas largas: la caja tiene tope de alto, así que sigue al texto que se escribe.
  useEffect(() => {
    const el = refCaja.current
    if (el) el.scrollTop = el.scrollHeight
  }, [reveladas])

  // Esc termina la conversación (fase capture, antes que el resto de la UI).
  // Los guardianes de cierre (cuarto/editor/cambio de vista) viven en dialogoStore.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      salir()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [salir])

  const visible = texto.slice(0, reveladas)
  return (
    <div className="ui-noche pointer-events-none absolute inset-0 z-40">
      {/* Franja cinematográfica superior */}
      <div className="absolute inset-x-0 top-0 h-[6vh] bg-black/80" aria-hidden />

      {/* Tocar fuera de la caja termina la conversación. Va PRIMERO (el resto de
          controles se pinta encima) y deja libre la franja de abajo, donde vive
          el ChatBox para responder; con el hilo completo abierto no se pone. */}
      {!conversacion && (
        <button
          type="button"
          onClick={salir}
          aria-label={t('dialogo.salir', 'Terminar la conversación (Esc)')}
          className="pointer-events-auto absolute inset-x-0 top-0 cursor-default"
          style={{ bottom: bottomCaja - 16 }}
        />
      )}

      {/* Cabecera: quién habla + historial + salir */}
      <div className="absolute left-1/2 top-[7vh] z-10 -translate-x-1/2">
        <div className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 py-1.5 ps-3 pe-1.5 shadow-xl backdrop-blur-md">
          <span className="text-base"><Icono emoji={a.emoji} /></span>
          <span className="max-w-48 truncate text-sm font-semibold text-white/90">
            {nombreAsistente(t, a)}
          </span>
          <button
            type="button"
            onClick={() => abrirConversacion(id)}
            className="rounded-full px-2 py-0.5 text-[12px] text-white/45 transition hover:bg-white/10 hover:text-white/85"
            title={t('chat.verConv', 'Ver la conversación completa')}
          >
            <Icono nombre="nota" />
          </button>
          <button
            type="button"
            onClick={salir}
            className="rounded-full px-2 py-0.5 text-sm text-white/45 transition hover:bg-white/10 hover:text-white/85"
            title={t('dialogo.salir', 'Terminar la conversación (Esc)')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Caja de diálogo RPG; responder se hace en el chat de abajo */}
      <div className="absolute inset-x-0 z-10 flex justify-center px-4" style={{ bottom: bottomCaja }}>
        <div className="relative w-full max-w-2xl">
          {/* Escuchar esta réplica + lectura automática, junto al texto que leen. */}
          <div className="pointer-events-auto absolute end-3 top-3 z-10 flex items-center gap-0.5 text-sm">
            <BotonVoz texto={texto} asistenteId={id} />
            <ToggleVozAuto asistenteId={id} />
          </div>
          <button
            ref={refCaja}
            type="button"
            onClick={() => setReveladas(texto.length)}
            // Tope de alto: una respuesta larga scrollea dentro de la caja en vez
            // de crecer hasta tapar la cabecera con el botón de salir.
            className="ui-panel-glass pointer-events-auto max-h-[55vh] w-full cursor-pointer overflow-y-auto rounded-2xl border border-white/10 px-4 py-3 text-start shadow-2xl backdrop-blur-md"
            title={t('dialogo.completar', 'Mostrar todo el texto')}
          >
            <p className="mb-1 pe-14 text-[10px] font-bold uppercase tracking-wider text-white/40">
              <Icono emoji={a.emoji} /> {nombreAsistente(t, a)}
            </p>
            {pensando ? (
              <p className="min-h-10 animate-pulse text-[15px] text-white/60">
                <Icono nombre="brillo" /> …
              </p>
            ) : (
              <p className="min-h-10 whitespace-pre-line text-[15px] leading-relaxed text-white/90">
                {visible}
                {reveladas < texto.length && <span className="animate-pulse text-white/60">▌</span>}
              </p>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
