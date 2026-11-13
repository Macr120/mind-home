import { useEffect, useRef, useState } from 'react'
import { mensajeErrorIA } from '../../core/cuenta/api'
import type { ClipVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, INPUT, Modal, Spinner } from '../_shared/ui'
import { pedirCambios } from './cambiosChat'
import { COLOR } from './constantes'

const EJEMPLOS: [string, string][] = [
  ['video.chat.ej1', 'Títulos más grandes'],
  ['video.chat.ej2', 'Quita el zoom del final'],
  ['video.chat.ej3', 'Subtítulos en amarillo y arriba'],
  ['video.chat.ej4', 'Baja la música'],
]

/**
 * Formulario de «Pedir cambios por chat» sobre un video ya editado: cada
 * pedido es una llamada (1 crédito) que cambia solo lo pedido; lo hecho queda
 * en una lista y el último se puede deshacer.
 */
export function PedirCambios({ clips, onAplicar }: { clips: ClipVideo[]; onAplicar: (clips: ClipVideo[]) => void }) {
  const t = useT()
  const [pedido, setPedido] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState<{ pedido: string; resumen: string; previos: ClipVideo[] }[]>([])
  const vivo = useRef(true)
  useEffect(
    () => () => {
      vivo.current = false
    },
    [],
  )

  const enviar = async () => {
    const texto = pedido.trim()
    if (!texto || ocupado) return
    setError('')
    setOcupado(true)
    try {
      const r = await pedirCambios(clips, texto)
      if (!vivo.current) return
      if (r.tocados === 0) {
        setError(r.resumen || t('video.chat.nada', 'La IA no encontró qué cambiar. Prueba a decirlo de otra forma.'))
        return
      }
      onAplicar(r.clips)
      setHechos((h) => [...h, { pedido: texto, resumen: r.resumen, previos: clips }])
      setPedido('')
    } catch (e) {
      if (vivo.current) setError(mensajeErrorIA(e, t, t('video.chat.error', 'No se pudo hacer el cambio')))
    } finally {
      if (vivo.current) setOcupado(false)
    }
  }

  const deshacer = () => {
    const ultimo = hechos[hechos.length - 1]
    if (!ultimo) return
    onAplicar(ultimo.previos)
    setHechos((h) => h.slice(0, -1))
  }

  return (
    <div className="space-y-2">
      {hechos.length > 0 && (
        <ul className="space-y-1 text-xs">
          {hechos.map((h, i) => (
            <li key={i} className="rounded-lg bg-white/5 px-2 py-1.5">
              <p className="text-white/50">«{h.pedido}»</p>
              <p className="flex items-start gap-1.5 text-white/80">
                <Icono nombre="hecho" /> {h.resumen || t('video.chat.hecho', 'Hecho')}
              </p>
            </li>
          ))}
        </ul>
      )}
      <textarea
        value={pedido}
        onChange={(e) => setPedido(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void enviar()
          }
        }}
        rows={2}
        maxLength={600}
        disabled={ocupado}
        placeholder={t('video.chat.ph', '¿Qué quieres cambiar? Ej.: títulos más grandes')}
        className={INPUT}
      />
      <div className="flex flex-wrap gap-1.5">
        {EJEMPLOS.map(([clave, es]) => (
          <button
            key={clave}
            type="button"
            disabled={ocupado}
            onClick={() => setPedido(t(clave, es))}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10"
          >
            {t(clave, es)}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-amber-300">{error}</p>}
      <div className="flex gap-2">
        {hechos.length > 0 && (
          <BotonSecundario onClick={deshacer} disabled={ocupado}>
            <Icono nombre="deshacer" /> {t('video.chat.deshacer', 'Deshacer el último')}
          </BotonSecundario>
        )}
        <BotonPrimario type="button" app={COLOR} disabled={ocupado || !pedido.trim()} onClick={() => void enviar()}>
          {ocupado ? <Spinner pequeno /> : <Icono nombre="enviar" />} {t('video.chat.enviar', 'Cambiar')} {!ocupado && <Creditos n={1} />}
        </BotonPrimario>
      </div>
    </div>
  )
}

/** El mismo formulario en su propio modal (entrada desde el panel ✨ del Editor). */
export function CambiosPorChat({ clips, onAplicar, onCerrar }: { clips: ClipVideo[]; onAplicar: (clips: ClipVideo[]) => void; onCerrar: () => void }) {
  const t = useT()
  return (
    <Modal titulo={t('video.chat.titulo', 'Pedir cambios por chat')} onCerrar={onCerrar}>
      <p className="text-xs text-white/55">
        {t('video.chat.intro', 'Dile a la IA qué cambiar del video y lo cambia sin rehacer toda la edición.')}
      </p>
      <PedirCambios clips={clips} onAplicar={onAplicar} />
    </Modal>
  )
}
