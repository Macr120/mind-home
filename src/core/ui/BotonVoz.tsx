import { useEffect, useRef, useState } from 'react'
import { callarComoAsistente, hablarComoAsistente, hayVoz } from '../audio/voz'
import { useVozGenerando } from '../audio/vozIA'
import { vibrar } from '../audio/vibrar'
import { getAsistente, useAsistentes } from '../state/asistentesStore'
import { limpiarMarkdown } from '../chat/texto'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Botón para ESCUCHAR un mensaje del asistente con su propia voz. Va donde el
 * asistente contesta (hilo de chat, burbuja 3D y diálogo cara a cara) para que
 * la lectura esté a mano aunque la automática esté apagada; vuelve a tocarse
 * para callarla. Si el navegador no tiene speechSynthesis no se dibuja.
 */
export function BotonVoz({
  texto,
  asistenteId,
  className = '',
}: {
  texto: string
  asistenteId: string
  className?: string
}) {
  const t = useT()
  const [hablando, setHablando] = useState(false)
  // Acuse de la voz IA: mientras el proveedor prepara el audio (segundos de
  // red) el botón pulsa y se deshabilita, que se vea que la petición salió.
  const generando = useVozGenerando((s) => s.generando)
  // Solo corta al desmontar si era ESTE botón el que sonaba.
  const hablandoRef = useRef(false)
  useEffect(() => {
    hablandoRef.current = hablando
  }, [hablando])
  useEffect(
    () => () => {
      if (hablandoRef.current) callarComoAsistente()
    },
    [],
  )

  const a = getAsistente(asistenteId)
  if ((!hayVoz() && !a.vozIA) || !texto.trim()) return null

  const leer = async () => {
    if (hablando) {
      callarComoAsistente()
      setHablando(false)
      return
    }
    vibrar(10)
    // Se llama también si otra lectura cancela esta.
    const ok = await hablarComoAsistente(limpiarMarkdown(texto), a, () => setHablando(false))
    setHablando(ok)
  }

  return (
    <button
      type="button"
      onClick={leer}
      disabled={generando}
      title={
        hablando
          ? t('voz.callar', 'Dejar de leer')
          : generando
            ? t('voz.generando', 'Generando la voz…')
            : t('voz.escuchar', 'Escuchar')
      }
      className={`shrink-0 rounded px-1 text-white/35 transition hover:bg-white/10 hover:text-white/80 ${
        hablando ? 'text-accent' : ''
      } ${generando ? 'animate-pulse text-accent' : ''} ${className}`}
    >
      <Icono nombre={hablando ? 'pausa' : 'bocina'} />
    </button>
  )
}

/**
 * Interruptor de la lectura automática DE ESE asistente (mismo campo `vozLeer`
 * que la casilla de su ficha en el panel ⚙️).
 */
export function ToggleVozAuto({
  asistenteId,
  className = '',
}: {
  asistenteId: string
  className?: string
}) {
  const t = useT()
  const guardar = useAsistentes((s) => s.guardar)
  const leer = useAsistentes(
    (s) => (s.lista.find((a) => a.id === asistenteId) ?? s.ocultos.find((a) => a.id === asistenteId))?.vozLeer ?? false,
  )
  const vozIA = useAsistentes(
    (s) => (s.lista.find((a) => a.id === asistenteId) ?? s.ocultos.find((a) => a.id === asistenteId))?.vozIA ?? false,
  )
  if (!hayVoz() && !vozIA) return null
  return (
    <button
      type="button"
      onClick={() => {
        if (leer) callarComoAsistente()
        void guardar({ ...getAsistente(asistenteId), vozLeer: !leer })
      }}
      title={
        leer
          ? t('voz.autoOn', 'Lee sus respuestas en voz alta')
          : t('voz.autoOff', 'Leer sus respuestas en voz alta')
      }
      className={`shrink-0 rounded px-1.5 py-1 text-sm transition hover:bg-white/10 ${
        leer ? 'text-accent' : 'text-white/25 hover:text-white/70'
      } ${className}`}
    >
      <Icono nombre="bocina" />
    </button>
  )
}
