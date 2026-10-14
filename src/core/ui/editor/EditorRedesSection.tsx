import { useEffect, useState } from 'react'
import { hayBackend } from '../../cuenta/supabase'
import { useSesion } from '../../cuenta/sesionStore'
import { useT } from '../../i18n/useT'
import { usePlataformasVisibles, useRedes } from '../../redes/redesStore'
import { NOMBRE_RED, type CuentaRed, type Plataforma } from '../../redes/tipos'
import { confirmar } from '../../state/confirmarStore'
import { Icono } from '../iconos/Icono'
import { LogoRed } from '../logosMarca'
import { mensajeVuelta, PaginaAMano } from '../../../rooms/video/publicar/PasoCuenta'

/**
 * «Cuentas conectadas» (Configuraciones): las redes a las que publica el
 * Studio de video, con Conectar/Desconectar. Existe aparte del diálogo de
 * publicar porque revocar el acceso tiene que poder hacerse sin abrir ningún
 * proyecto (lo exigen las revisiones de las tres plataformas).
 */
export function EditorRedesSection({ embed, sinTitulo }: { embed?: boolean; sinTitulo?: boolean }) {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const cuentas = useRedes((s) => s.cuentas)
  const cargado = useRedes((s) => s.cargado)
  const plataformas = usePlataformasVisibles()
  const cargando = useRedes((s) => s.cargando)
  const error = useRedes((s) => s.error)
  const vuelta = useRedes((s) => s.ultimaVuelta)
  const maxRanuras = useRedes((s) => s.maxRanuras)
  const conBackend = hayBackend()

  useEffect(() => {
    if (conBackend && usuario && !cargado) void useRedes.getState().refrescar()
  }, [conBackend, usuario, cargado])

  const cuerpo = !conBackend ? (
    <p className="text-xs text-white/50">{t('video.publicar.cuentas.sinBackend', 'Esta instalación no tiene backend: no se pueden conectar redes.')}</p>
  ) : !usuario ? (
    <p className="text-xs text-white/50">{t('video.publicar.cuentas.sinSesion', 'Inicia sesión en Cuenta para conectar tus redes.')}</p>
  ) : (
    <div className="space-y-1.5">
      {plataformas.map((p) =>
        maxRanuras > 1 ? (
          <GrupoRed key={p} plataforma={p} cuentas={cuentas} max={maxRanuras} cargando={cargando && !cargado} />
        ) : (
          <FilaRed key={p} plataforma={p} ranura={0} cuenta={cuentas.find((c) => c.plataforma === p) ?? null} cargando={cargando && !cargado} />
        ),
      )}
      {vuelta && !vuelta.ok && vuelta.plataforma && (
        <p className="text-[11px] leading-snug text-red-400/90">{mensajeVuelta(t, vuelta.error, NOMBRE_RED[vuelta.plataforma])}</p>
      )}
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
      <p className="text-[11px] text-white/40">{t('video.publicar.cuentas.nota', 'Solo se usan para publicar los videos del Studio cuando tú lo pides.')}</p>
    </div>
  )

  return (
    <section className={embed ? '' : 'rounded-xl border border-white/10 bg-white/5 p-3'}>
      {!sinTitulo && (
        <p className="mb-2 text-sm font-semibold text-white/85">
          <Icono nombre="red" /> {t('video.publicar.cuentas.titulo', 'Cuentas conectadas')}
        </p>
      )}
      {cuerpo}
    </section>
  )
}

/**
 * Con varias cuentas por red (una por idioma): las conectadas y una fila para
 * añadir la siguiente en la primera ranura libre. Facebook e Instagram
 * comparten ranura —la cuenta de Instagram es la de la Página—, así que en
 * Instagram solo se ofrece conectar mientras no haya ninguna.
 */
function GrupoRed({ plataforma, cuentas, max, cargando }: { plataforma: Plataforma; cuentas: CuentaRed[]; max: number; cargando: boolean }) {
  const meta = plataforma === 'facebook' || plataforma === 'instagram'
  const hayLoginMeta = useRedes((s) => s.cuentas.some((c) => c.plataforma === 'facebook') || s.avisos.falta_pagina === 'facebook')
  const propias = cuentas.filter((c) => c.plataforma === plataforma).sort((a, b) => a.ranura - b.ranura)
  const usadas = new Set(cuentas.filter((c) => (meta ? c.plataforma === 'facebook' || c.plataforma === 'instagram' : c.plataforma === plataforma)).map((c) => c.ranura))
  const libre = Array.from({ length: max }, (_, i) => i).find((i) => !usadas.has(i))
  const conAlta = libre != null && (plataforma !== 'instagram' || propias.length === 0)
  return (
    <div className="space-y-1">
      {propias.map((c) => (
        <FilaRed key={c.ranura} plataforma={plataforma} ranura={c.ranura} cuenta={c} cargando={cargando} compacta />
      ))}
      {conAlta && <FilaRed plataforma={plataforma} ranura={libre} cuenta={null} cargando={cargando} otra={propias.length > 0} />}
      {/* Con un login de Meta ya hecho, las demás Páginas se añaden por su enlace, sin otro OAuth. */}
      {plataforma === 'facebook' && hayLoginMeta && libre != null && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 pb-2">
          <PaginaAMano ranura={libre} otra />
        </div>
      )}
    </div>
  )
}

function FilaRed({
  plataforma,
  ranura,
  cuenta,
  cargando,
  compacta = false,
  otra = false,
}: {
  plataforma: Plataforma
  ranura: number
  cuenta: CuentaRed | null
  cargando: boolean
  /** Una de varias cuentas ya conectadas: sin las notas de la red, que van en la fila de añadir. */
  compacta?: boolean
  /** La fila para añadir una cuenta más a una red que ya tiene alguna. */
  otra?: boolean
}) {
  const t = useT()
  const pendiente = useRedes((s) => s.pendiente?.plataforma === plataforma && s.pendiente.ranura === ranura)
  const tiktokPrivado = useRedes((s) => s.avisos.tiktok === 'solo-yo')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const red = NOMBRE_RED[plataforma]

  const conectar = async () => {
    setError(null)
    setOcupado(true)
    const err = await useRedes.getState().conectar(plataforma, ranura)
    setOcupado(false)
    if (err) setError(err)
  }
  const desconectar = async () => {
    const si = await confirmar({
      titulo: t('video.publicar.cuenta.desconectar', 'Desconectar'),
      mensaje: t('video.publicar.cuenta.desconectarMsg', '¿Quitar el acceso de esta app a tu cuenta de {red}? Podrás conectarla de nuevo cuando quieras.', { red }),
      textoOk: t('video.publicar.cuenta.desconectar', 'Desconectar'),
      peligro: true,
    })
    if (!si) return
    setOcupado(true)
    const err = await useRedes.getState().desconectar(plataforma, ranura)
    setOcupado(false)
    if (err) setError(err)
  }

  const destino = cuenta?.extra.username ? `@${cuenta.extra.username}` : cuenta?.nombre
  const estado = cargando
    ? t('video.publicar.cuenta.cargando', 'Buscando tus cuentas…')
    : pendiente
      ? t('video.publicar.cuenta.esperando', 'Esperando a que vuelvas de {red}…', { red })
      : !cuenta
        ? otra
          ? t('video.publicar.cuentas.otra', 'Añadir otra cuenta')
          : t('video.publicar.cuentas.noConectada', 'No conectada')
        : cuenta.estado === 'caducada'
          ? t('video.publicar.cuenta.caducado', 'El acceso caducó: vuelve a conectar la cuenta.')
          : t('video.publicar.cuentas.conectadaComo', '{nombre} · {destino}', { nombre: cuenta.nombre, destino: destino ?? '' })

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
      <LogoRed plataforma={plataforma} className="h-4 w-4 text-white/80" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white/85">{red}</p>
        <p className={`truncate text-[11px] ${cuenta?.estado === 'caducada' ? 'text-amber-300/80' : 'text-white/50'}`}>{estado}</p>
        {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
        {/* El canal lo elige Google en SU pantalla de consentimiento y la app no
            puede saber cuál salió: con el scope `youtube.upload` no se pueden
            leer los canales, y ampliarlo dispararía otra auditoría. */}
        {plataforma === 'youtube' && !compacta && (
          <p className="text-[11px] leading-snug text-white/40">
            {t(
              'video.publicar.cuenta.canalYoutube',
              'Si tu cuenta de Google tiene varios canales, elige cuál usar en la pantalla de Google. Para cambiarlo, vuelve a conectar.',
            )}
          </p>
        )}
        {/* Mientras TikTok no audite la app, lo publicado queda en «Solo yo»:
            se avisa ANTES de conectar, no solo en el formulario de publicar. */}
        {plataforma === 'tiktok' && tiktokPrivado && !compacta && (
          <p className="text-[11px] leading-snug text-amber-300/80">
            {t(
              'video.publicar.cuenta.tiktokPrivado',
              'En TikTok, por ahora, las publicaciones se guardan como privadas hasta que TikTok apruebe la app.',
            )}
          </p>
        )}
      </div>
      {/* Esperando la vuelta del OAuth: sin esta salida la fila se queda trabada
          hasta recargar, porque «Conectar» está deshabilitado mientras tanto. */}
      {pendiente ? (
        <button
          type="button"
          onClick={() => useRedes.setState({ pendiente: null })}
          className="ui-boton rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
        >
          {t('video.publicar.cuenta.cancelar', 'Cancelar')}
        </button>
      ) : cuenta && cuenta.estado === 'ok' ? (
        <button
          type="button"
          onClick={() => void desconectar()}
          disabled={ocupado}
          className="ui-boton rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        >
          {t('video.publicar.cuenta.desconectar', 'Desconectar')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void conectar()}
          disabled={ocupado || cargando || pendiente}
          className="ui-boton rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        >
          {cuenta?.estado === 'caducada' ? t('video.publicar.cuenta.reconectarCorto', 'Reconectar') : t('video.publicar.menu.conectar', 'Conectar')}
        </button>
      )}
    </div>
  )
}
