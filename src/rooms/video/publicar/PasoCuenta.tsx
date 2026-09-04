import { useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { useRedes } from '../../../core/redes/redesStore'
import { NOMBRE_RED, type CuentaRed, type MotivoVuelta, type Plataforma } from '../../../core/redes/tipos'
import { LogoRed } from '../../../core/ui/logosMarca'
import { Spinner, TARJETA } from '../../_shared/ui'

/** Mismo botón que los de Google/Apple del login (`BotonesOAuth`). */
export const BOTON_CONECTAR =
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
    </div>
  )
}
