import { useState } from 'react'
import { INPUT } from '../../../rooms/_shared/ui'
import { useSesion } from '../../cuenta/sesionStore'
import { useT } from '../../i18n/useT'
import { confirmar } from '../../state/confirmarStore'
import { useMascota } from '../../state/mascotaStore'
import { Icono } from '../../ui/iconos/Icono'
import { bloquear, buscarAlias, eliminarContacto, mensajeErrorBuzon, reportar, responder, solicitar } from '../api'
import { useContactos } from '../cache'
import { refrescarContactos } from '../motor'
import { asegurarNormas } from '../normas'
import { pedirReporte } from '../reportar'
import { ErrorBuzon, type Contacto, type ResultadoBusqueda } from '../tipos'
import { FormAlias } from './FilaAlias'
import { Retrato } from './Retrato'

/**
 * Panel de contactos del buzón (se pinta donde la configuración de asistentes):
 * el alias propio, buscar a alguien por su alias exacto, las solicitudes
 * recibidas y la lista de contactos con sus acciones. Sin alias no hay más:
 * elegirlo es el primer paso (así te pueden encontrar).
 */
export function ContactosPanel({ onAbrirHilo }: { onAbrirHilo: (hiloId: string) => void }) {
  const t = useT()
  const alias = useSesion((s) => s.alias)
  const nombre = useSesion((s) => s.nombre)
  const emoji = useSesion((s) => s.emoji)
  const retrato = useSesion((s) => s.retrato)
  const usuario = useSesion((s) => s.usuario)
  const contactos = useContactos() ?? []
  const hablar = useMascota((s) => s.decir)
  const [editandoAlias, setEditandoAlias] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultado, setResultado] = useState<ResultadoBusqueda | null | 'nada'>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const fallo = (e: unknown) => setError(mensajeErrorBuzon(e, t))
  const ejecutar = async (accion: () => Promise<void>) => {
    setOcupado(true)
    setError('')
    try {
      await accion()
      await refrescarContactos()
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  const buscar = () =>
    ejecutar(async () => {
      const a = busqueda.trim().toLowerCase().replace(/^@/, '')
      if (!a) return
      const r = await buscarAlias(a)
      setResultado(r ?? 'nada')
    })

  const pedir = (a: string) =>
    ejecutar(async () => {
      if (!(await asegurarNormas())) throw new ErrorBuzon('normas')
      const r = await solicitar(a)
      hablar(
        r.estado === 'aceptado'
          ? t('buzon.solicitud.aceptada', 'Ya son contactos')
          : t('buzon.solicitud.enviada', 'Solicitud enviada'),
        { persistir: false },
      )
      setResultado(null)
      setBusqueda('')
    })

  const aceptar = (c: Contacto | { contactoId: string }, si: boolean) =>
    ejecutar(async () => {
      if (si && !(await asegurarNormas())) throw new ErrorBuzon('normas')
      const hilo = await responder(c.contactoId, si)
      setResultado(null)
      if (si && hilo) onAbrirHilo(hilo)
    })

  const eliminar = (c: Contacto) =>
    void (async () => {
      const ok = await confirmar({
        titulo: t('buzon.eliminar', 'Eliminar contacto'),
        mensaje: t('buzon.eliminar.confirma', '¿Eliminar a @{a}? Se borrará la conversación para los dos.', { a: c.alias }),
        textoOk: t('buzon.eliminar', 'Eliminar contacto'),
        peligro: true,
      })
      if (ok) await ejecutar(() => eliminarContacto(c.contactoId, c.hiloId))
    })()

  const reportarA = (c: Contacto) =>
    void (async () => {
      const r = await pedirReporte(`@${c.alias}`, c.estado !== 'bloqueado')
      if (!r) return
      await ejecutar(async () => {
        await reportar(c.contactoId, null, r.motivo, r.detalle)
        if (r.bloquear) await bloquear(c.contactoId, true)
        hablar(t('buzon.reportar.listo', 'Gracias. Lo revisaremos en menos de 24 horas.'), { persistir: false })
      })
    })()

  const recibidas = contactos.filter((c) => c.estado === 'pendiente' && c.direccion === 'recibida')
  const resto = contactos.filter((c) => !(c.estado === 'pendiente' && c.direccion === 'recibida'))

  if (!usuario) {
    return <p className="px-2 py-3 text-center text-xs text-white/35">{t('buzon.sinSesion', 'Inicia sesión para escribir a tus contactos')}</p>
  }

  // Sin alias nadie te encuentra: es lo primero.
  if (!alias || editandoAlias) {
    return (
      <div>
        <p className="mb-1.5 px-1 text-xs text-white/60">{t('buzon.alias.sin', 'Elige un alias para que te encuentren')}</p>
        <FormAlias onListo={() => setEditandoAlias(false)} onCancelar={alias ? () => setEditandoAlias(false) : undefined} />
      </div>
    )
  }

  return (
    <div>

      {/* Mi alias */}
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
        <Retrato retrato={retrato} emoji={emoji} className="h-8 w-8" textoClase="text-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white/85">@{alias}</p>
          {nombre && <p className="truncate text-[10px] text-white/45">{nombre}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditandoAlias(true)}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/80"
        >
          {t('buzon.alias.editar', 'Editar alias')}
        </button>
      </div>

      {/* Buscar por alias exacto */}
      <div className="mb-2">
        <div className="flex gap-1.5">
          <div className={`${INPUT} flex min-w-0 flex-1 items-center gap-1 py-0`}>
            <span className="text-white/40">@</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === 'Enter' && void buscar()}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('buzon.buscar', 'Buscar por alias')}
              className="min-w-0 flex-1 bg-transparent py-1.5 focus:outline-none"
              aria-label={t('buzon.buscar', 'Buscar por alias')}
            />
          </div>
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={ocupado || !busqueda.trim()}
            className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            <Icono nombre="lupa" />
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] text-white/35">{t('buzon.buscar.ayuda', 'Escribe el alias exacto de la persona')}</p>
        {resultado === 'nada' && <p className="px-1 text-xs text-white/50">{t('buzon.buscar.nada', 'No hay nadie con ese alias')}</p>}
        {resultado && resultado !== 'nada' && (
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
            <Retrato retrato={resultado.retrato} emoji={resultado.emoji} className="h-8 w-8" textoClase="text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/85">{resultado.nombre || `@${resultado.alias}`}</p>
              <p className="truncate text-[10px] text-white/45">@{resultado.alias}</p>
            </div>
            {resultado.estado === 'yo' && <span className="text-[10px] text-white/40">{t('buzon.buscar.eresTu', 'Ese alias es el tuyo')}</span>}
            {resultado.estado === 'ninguno' && (
              <BotonAccion onClick={() => void pedir(resultado.alias)} disabled={ocupado} primario>
                {t('buzon.solicitar', 'Enviar solicitud')}
              </BotonAccion>
            )}
            {resultado.estado === 'pendiente-enviada' && <span className="text-[10px] text-white/40">{t('buzon.solicitud.enviada', 'Solicitud enviada')}</span>}
            {resultado.estado === 'pendiente-recibida' && resultado.contactoId && (
              <BotonAccion onClick={() => void aceptar({ contactoId: resultado.contactoId! }, true)} disabled={ocupado} primario>
                {t('buzon.aceptar', 'Aceptar')}
              </BotonAccion>
            )}
            {resultado.estado === 'aceptado' && resultado.hiloId && (
              <BotonAccion onClick={() => onAbrirHilo(resultado.hiloId!)} primario>
                {t('buzon.abrirChat', 'Abrir chat')}
              </BotonAccion>
            )}
            {resultado.estado === 'bloqueado' && resultado.contactoId && (
              <BotonAccion onClick={() => void ejecutar(() => bloquear(resultado.contactoId!, false))} disabled={ocupado}>
                {t('buzon.desbloquear', 'Desbloquear')}
              </BotonAccion>
            )}
          </div>
        )}
      </div>

      {error && <p className="mb-1 px-1 text-[11px] leading-snug text-red-400/90">{error}</p>}

      {/* Solicitudes recibidas */}
      {recibidas.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 px-1 text-[11px] font-semibold text-amber-300/80">{t('buzon.solicitudes', 'Solicitudes')}</p>
          {recibidas.map((c) => (
            <div key={c.contactoId} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <Retrato retrato={c.retrato} emoji={c.emoji} className="h-8 w-8" textoClase="text-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/85">{c.nombre || `@${c.alias}`}</p>
                <p className="truncate text-[10px] text-white/45">@{c.alias} · {t('buzon.solicitud.recibida', 'Te envió una solicitud')}</p>
              </div>
              <BotonAccion onClick={() => void aceptar(c, true)} disabled={ocupado} primario>
                {t('buzon.aceptar', 'Aceptar')}
              </BotonAccion>
              <BotonAccion onClick={() => void aceptar(c, false)} disabled={ocupado}>
                {t('buzon.rechazar', 'Rechazar')}
              </BotonAccion>
              <BotonIcono icono="bandera" titulo={t('buzon.reportar', 'Reportar')} onClick={() => reportarA(c)} disabled={ocupado} peligro />
            </div>
          ))}
        </div>
      )}

      {/* Contactos */}
      {resto.length === 0 && recibidas.length === 0 && (
        <p className="px-2 py-2 text-center text-xs text-white/35">{t('buzon.sinContactos', 'Aún no tienes contactos. Agrega uno por su alias.')}</p>
      )}
      {resto.map((c) => (
        <div key={c.contactoId} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 ${c.estado === 'pendiente' ? 'opacity-60' : ''}`}>
          <Retrato retrato={c.retrato} emoji={c.emoji} className="h-8 w-8" textoClase="text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/85">{c.nombre || `@${c.alias}`}</p>
            <p className="truncate text-[10px] text-white/45">
              @{c.alias}
              {c.estado === 'pendiente' &&` · ${t('buzon.solicitud.enviada', 'Solicitud enviada')}`}
              {c.estado === 'bloqueado' && ` · ${t('buzon.bloqueado', 'Bloqueado')}`}
            </p>
          </div>
          {c.estado === 'aceptado' && c.hiloId && (
            <BotonIcono icono="chat" titulo={t('buzon.abrirChat', 'Abrir chat')} onClick={() => onAbrirHilo(c.hiloId!)} />
          )}
          {c.estado !== 'pendiente' && (
            <BotonIcono
              icono={c.estado === 'bloqueado' ? 'confirmar' : 'quitar'}
              titulo={c.estado === 'bloqueado' ? t('buzon.desbloquear', 'Desbloquear') : t('buzon.bloquear', 'Bloquear')}
              onClick={() => void ejecutar(() => bloquear(c.contactoId, c.estado !== 'bloqueado'))}
              disabled={ocupado}
            />
          )}
          {c.estado !== 'pendiente' && (
            <BotonIcono icono="bandera" titulo={t('buzon.reportar', 'Reportar')} onClick={() => reportarA(c)} disabled={ocupado} peligro />
          )}
          <BotonIcono icono="basura" titulo={t('buzon.eliminar', 'Eliminar contacto')} onClick={() => eliminar(c)} disabled={ocupado} peligro />
        </div>
      ))}
    </div>
  )
}

function BotonAccion({
  children,
  onClick,
  disabled,
  primario,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primario?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
        primario ? 'bg-accent text-accent-ink hover:brightness-110' : 'bg-white/10 text-white/70 hover:bg-white/15'
      }`}
    >
      {children}
    </button>
  )
}

function BotonIcono({
  icono,
  titulo,
  onClick,
  disabled,
  peligro,
}: {
  icono: 'chat' | 'confirmar' | 'quitar' | 'basura' | 'bandera'
  titulo: string
  onClick: () => void
  disabled?: boolean
  peligro?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      aria-label={titulo}
      className={`shrink-0 rounded-lg px-1.5 py-1 text-sm text-white/40 transition hover:bg-white/10 disabled:opacity-50 ${
        peligro ? 'hover:text-red-400' : 'hover:text-white/85'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
