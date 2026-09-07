import { useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { useRedes } from '../../../core/redes/redesStore'
import { NOMBRE_RED, type CuentaRed, type MotivoVuelta, type Plataforma } from '../../../core/redes/tipos'
import { LogoRed } from '../../../core/ui/logosMarca'
import { Spinner, TARJETA } from '../../_shared/ui'

/** Mismo botón que los de Google/Apple del login (`BotonesOAuth`). */
const BOTON_CONECTAR =
  'flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-50'

/** Texto del motivo con el que volvió el OAuth. */
export function mensajeVuelta(t: ReturnType<typeof useT>, motivo: MotivoVuelta | null, red: string): string {
  switch (motivo) {
    case 'denegado':
      return t('video.publicar.cuenta.denegado', 'No diste permiso a la app en {red}.', { red })
    case 'permisos':
      return t('video.publicar.cuenta.permisos', 'Falta el permiso para publicar: vuelve a conectar y acepta todos los permisos.')
    case 'sin-pagina':
      return t('video.publicar.fb.sinPaginas', 'Tu cuenta no administra ninguna Página. Facebook solo permite publicar videos en Páginas, no en perfiles personales.')
    case 'sin-instagram':
      return t('video.publicar.ig.sinCuentas', 'No hay ninguna cuenta profesional de Instagram vinculada a tus Páginas.')
    case 'configuracion':
      return t('video.publicar.cuenta.configuracion', 'Esta red aún no está configurada en el servidor.')
    default:
      return t('video.publicar.cuenta.error', 'No se pudo conectar la cuenta: {e}', { e: motivo ?? '' })
  }
}

/**
 * Sin cuenta conectada (o caducada): «Conectar {red}» abre el OAuth fuera y se
 * queda esperando la vuelta; en cuanto la cuenta aparece en el store, el
 * diálogo avanza solo al formulario.
 */
export function PasoCuenta({ plataforma, cuenta }: { plataforma: Plataforma; cuenta: CuentaRed | null }) {
  const t = useT()
  const pendiente = useRedes((s) => s.pendiente)
  const vuelta = useRedes((s) => s.ultimaVuelta)
  const cargando = useRedes((s) => s.cargando && !s.cargado)
  const [error, setError] = useState<string | null>(null)
  const red = NOMBRE_RED[plataforma]
  const esperando = pendiente?.plataforma === plataforma
  // Facebook conectado pero sin Páginas en el listado: se pide a mano (solo ahí, no en Instagram).
  const faltaPagina = useRedes((s) => s.avisos.falta_pagina === 'facebook') && plataforma === 'facebook' && !esperando

  const conectar = async () => {
    setError(null)
    useRedes.getState().limpiarVuelta()
    const err = await useRedes.getState().conectar(plataforma)
    if (err) setError(err)
  }

  return (
    <div className={`${TARJETA} space-y-3 text-center`}>
      <p className="flex justify-center text-white/80">
        <LogoRed plataforma={plataforma} className="h-8 w-8" />
      </p>
      {cargando ? (
        <Spinner etiqueta={t('video.publicar.cuenta.cargando', 'Buscando tus cuentas…')} />
      ) : esperando ? (
        <>
          <p className="text-sm text-white/75">{t('video.publicar.cuenta.esperando', 'Esperando a que vuelvas de {red}…', { red })}</p>
          <Spinner pequeno />
          <button type="button" onClick={() => useRedes.setState({ pendiente: null })} className="text-xs text-white/50 underline">
            {t('video.publicar.cuenta.cancelar', 'Cancelar')}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-white/75">
            {cuenta?.estado === 'caducada'
              ? t('video.publicar.cuenta.caducado', 'El acceso caducó: vuelve a conectar la cuenta.')
              : t('video.publicar.cuenta.ninguna', 'Aún no has conectado {red}.', { red })}
          </p>
          <button type="button" onClick={() => void conectar()} className={BOTON_CONECTAR}>
            <LogoRed plataforma={plataforma} />
            {cuenta?.estado === 'caducada'
              ? t('video.publicar.cuenta.reconectar', 'Reconectar {red}', { red })
              : t('video.publicar.cuenta.conectar', 'Conectar {red}', { red })}
          </button>
        </>
      )}
      {vuelta && !vuelta.ok && vuelta.plataforma === plataforma && (
        <p className="text-[11px] leading-snug text-red-400/90">{mensajeVuelta(t, vuelta.error, red)}</p>
      )}
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
      {faltaPagina && <PaginaAMano />}
    </div>
  )
}

/**
 * Facebook conectó pero no devolvió ninguna Página. Pasa siempre que la Página se
 * administra desde un portafolio de negocio: `/me/accounts` no la lista aunque el
 * acceso exista. Se pide su enlace y el servidor la resuelve por id.
 */
function PaginaAMano() {
  const t = useT()
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviar = async () => {
    const ref = referenciaPagina(texto)
    if (!ref) {
      setError(t('video.publicar.fb.paginaInvalida', 'No reconozco esa dirección: copia el enlace de tu Página desde Facebook.'))
      return
    }
    setError(null)
    setEnviando(true)
    const err = await useRedes.getState().elegirPagina('facebook', ref)
    setEnviando(false)
    if (err) setError(err)
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-3 text-left">
      <p className="text-[11px] leading-snug text-white/60">
        {t(
          'video.publicar.fb.pegarPagina',
          'Si administras tu Página desde un portafolio de negocio, Facebook no nos la muestra en la lista. Pega aquí su enlace:',
        )}
      </p>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="https://www.facebook.com/MiPagina"
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 outline-none focus:border-white/25"
      />
      <button type="button" onClick={() => void enviar()} disabled={enviando || !texto.trim()} className={BOTON_CONECTAR}>
        {enviando ? <Spinner pequeno /> : t('video.publicar.fb.usarPagina', 'Usar esta Página')}
      </button>
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
    </div>
  )
}

/**
 * Saca de lo que pegue el usuario el tramo que la Graph API entiende: el id
 * numérico de `profile.php?id=…` o el nombre de usuario de `facebook.com/loQueSea`.
 */
export function referenciaPagina(texto: string): string | null {
  const limpio = texto.trim()
  if (!limpio) return null
  const porId = limpio.match(/[?&]id=(\d+)/)
  if (porId) return porId[1]
  const porRuta = limpio.match(/facebook\.com\/([A-Za-z0-9._-]{1,80})/i)
  const bruto = porRuta ? porRuta[1] : limpio
  return /^[A-Za-z0-9._-]{1,80}$/.test(bruto) ? bruto : null
}
