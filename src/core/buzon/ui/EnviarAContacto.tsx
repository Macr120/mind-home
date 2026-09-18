import { useState } from 'react'
import { VistaBlob } from '../../../rooms/_shared/ImagenIA'
import { BotonPrimario, BotonSecundario, INPUT, Modal } from '../../../rooms/_shared/ui'
import { sonar } from '../../audio/sfx'
import { useSesion } from '../../cuenta/sesionStore'
import { useT } from '../../i18n/useT'
import { getPlantilla } from '../../registry'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { mensajeErrorBuzon } from '../api'
import { useBuzon } from '../buzonStore'
import { useContactosAceptados } from '../cache'
import type { Paquete } from '../compartibles'
import { clavePrevia, enviar } from '../motor'
import { Retrato } from './Retrato'

/**
 * «Enviar a un contacto» desde cualquier cuarto: se monta UNA vez en la raíz de
 * la app (dentro de un cuarto el ChatBox no existe). Lee el paquete que dejó
 * `abrirCompartir`, pide el contacto y un texto opcional, y envía.
 */
export function EnviarAContacto() {
  const paquete = useBuzon((s) => s.compartirPendiente)
  const n = useBuzon((s) => s.compartirN)
  if (!paquete) return null
  // Cada paquete nuevo arranca el diálogo limpio: la `key` remonta el formulario.
  return <Dialogo key={n} paquete={paquete} />
}

function Dialogo({ paquete }: { paquete: Paquete }) {
  const t = useT()
  const cerrar = useBuzon((s) => s.cerrarCompartir)
  const usuario = useSesion((s) => s.usuario)
  const contactos = useContactosAceptados()
  const [hilo, setHilo] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const app = getPlantilla(paquete.app)
  const previa = paquete.blobs ? clavePrevia({ ...paquete, blobs: Object.fromEntries(Object.keys(paquete.blobs).map((k) => [k, { path: '', size: 0, mime: '', nombre: k }])) }) : null
  const miniatura = previa ? paquete.blobs?.[previa] : undefined

  const enviarAhora = async () => {
    const c = contactos?.find((x) => x.hiloId === hilo)
    if (!c?.hiloId) return
    setOcupado(true)
    setError('')
    try {
      await enviar(c.hiloId, { texto, paquete })
      sonar('tick')
      useMascota.getState().decir(t('buzon.enviarA.listo', 'Enviado a @{a}', { a: c.alias }), { persistir: false })
      cerrar()
    } catch (e) {
      setError(mensajeErrorBuzon(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={t('buzon.enviarA.titulo', 'Enviar «{n}»', { n: paquete.nombre })} onCerrar={cerrar}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
          {miniatura ? (
            <VistaBlob blob={miniatura} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/5 text-2xl">
              <Icono emoji={paquete.emoji ?? app?.icon ?? '📦'} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{paquete.nombre}</p>
            <p className="truncate text-[11px] text-white/45">
              {paquete.resumen ? `${paquete.resumen} · ` : ''}
              {t('buzon.contenido.de', 'de {app}', { app: t(`room.${paquete.app}.nombre`, app?.nombre ?? paquete.app).split(' · ')[0] })}
            </p>
          </div>
        </div>

        {!usuario ? (
          <p className="text-xs text-white/50">{t('buzon.sinSesion', 'Inicia sesión para escribir a tus contactos')}</p>
        ) : (
          <>
            <div>
              <p className="mb-1 text-[11px] font-semibold text-white/50">{t('buzon.enviarA.para', 'Para')}</p>
              {contactos && contactos.length === 0 && (
                <p className="text-xs text-white/50">{t('buzon.sinContactos', 'Aún no tienes contactos. Agrega uno por su alias.')}</p>
              )}
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {(contactos ?? []).map((c) => (
                  <button
                    key={c.contactoId}
                    type="button"
                    onClick={() => setHilo(c.hiloId)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-start transition ${
                      hilo === c.hiloId ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Retrato retrato={c.retrato} emoji={c.emoji} className="h-8 w-8" textoClase="text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{c.nombre || `@${c.alias}`}</span>
                      <span className="block truncate text-[10px] text-white/45">@{c.alias}</span>
                    </span>
                    {hilo === c.hiloId && (
                      <span className="text-accent">
                        <Icono nombre="confirmar" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder={t('buzon.enviarA.mensaje', 'Mensaje (opcional)')}
              className={`${INPUT} w-full resize-none`}
            />
            {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
            <div className="flex justify-end gap-2">
              <BotonSecundario onClick={cerrar}>{t('chat.mapa.descartar', 'Ahora no')}</BotonSecundario>
              <BotonPrimario onClick={() => void enviarAhora()} disabled={ocupado || !hilo}>
                <Icono nombre="enviar" /> {t('buzon.enviar', 'Enviar')}
              </BotonPrimario>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
