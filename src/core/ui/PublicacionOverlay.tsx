import { useState } from 'react'
import { abrirEnlace } from '../enlaces'
import { useT } from '../i18n/useT'
import { esAppNativa } from '../plataforma'
import { useRedes } from '../redes/redesStore'
import { cancelarTrabajo, descartarTrabajo } from '../redes/trabajos'
import { NOMBRE_RED } from '../redes/tipos'
import { confirmar } from '../state/confirmarStore'
import { Icono } from './iconos/Icono'
import { LogoRed } from './logosMarca'

/**
 * La píldora flotante de una publicación en curso cuando el diálogo del Studio
 * ya no está (el usuario siguió editando o salió del cuarto): «Subiendo a
 * YouTube · 43 %», y al terminar «Publicado · Ver · ×» o el error. Hermana de
 * `GrabacionPantallaOverlay`: misma capa (por encima del HUD, debajo de
 * `confirmar`) y mismo vidrio `ui-noche`.
 */
export default function PublicacionOverlay() {
  const t = useT()
  const trabajo = useRedes((s) => s.trabajo)
  const [cancelando, setCancelando] = useState(false)
  if (!trabajo || (trabajo.estado !== 'activo' && trabajo.visto)) return null
  const red = NOMBRE_RED[trabajo.plataforma]
  const activo = trabajo.estado === 'activo'

  const cancelar = async () => {
    if (cancelando) return
    setCancelando(true)
    const si = await confirmar({
      titulo: t('video.publicar.trabajo.cancelar', 'Cancelar'),
      mensaje: t('video.publicar.trabajo.cancelarMsg', '¿Cancelar la subida a {red}? El archivo exportado se conserva para reintentar.', { red }),
      peligro: true,
    })
    setCancelando(false)
    if (si) cancelarTrabajo()
  }

  let texto: string
  if (activo) {
    texto =
      trabajo.fase === 'publicando'
        ? t('video.publicar.trabajo.pildoraPublicando', 'Publicando en {red}…', { red })
        : t('video.publicar.trabajo.pildora', 'Subiendo a {red} · {pct} %', { red, pct: Math.round(trabajo.fraccion * 100) })
  } else if (trabajo.estado === 'listo') texto = t('video.publicar.resultado.ok', 'Publicado en {red}', { red })
  else if (trabajo.estado === 'cancelado') texto = t('video.publicar.trabajo.cancelado', 'Subida cancelada')
  else texto = t('video.publicar.resultado.error', 'No se pudo publicar en {red}', { red })

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+var(--safe-top))] z-[70] flex flex-col items-center gap-1.5 px-2">
      <div
        role="status"
        aria-live="off"
        className="ui-noche pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-black/75 py-1 pe-1 ps-3 text-sm text-white shadow-lg backdrop-blur"
      >
        <LogoRed plataforma={trabajo.plataforma} className="h-4 w-4" />
        <span className="min-w-0 truncate text-xs tabular-nums">{texto}</span>
        {activo ? (
          <button
            type="button"
            onClick={() => void cancelar()}
            aria-label={t('video.publicar.trabajo.cancelar', 'Cancelar')}
            title={t('video.publicar.trabajo.cancelar', 'Cancelar')}
            className="ui-boton grid h-7 w-7 place-items-center rounded-full text-xs transition hover:bg-white/15"
          >
            <Icono nombre="cerrar" />
          </button>
        ) : (
          <>
            {trabajo.resultado?.url && (
              <button
                type="button"
                onClick={() => void abrirEnlace(trabajo.resultado!.url!)}
                className="ui-boton rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25"
              >
                {t('video.publicar.historial.ver', 'Ver')}
              </button>
            )}
            <button
              type="button"
              onClick={descartarTrabajo}
              aria-label={t('rutinas.cerrar', 'Cerrar')}
              title={t('rutinas.cerrar', 'Cerrar')}
              className="ui-boton grid h-7 w-7 place-items-center rounded-full text-xs transition hover:bg-white/15"
            >
              <Icono nombre="cerrar" />
            </button>
          </>
        )}
      </div>
      {activo && esAppNativa() && trabajo.fase === 'subiendo' && trabajo.fraccion < 0.3 && (
        <p className="ui-noche rounded-full bg-black/60 px-3 py-1 text-center text-[11px] text-white/80 backdrop-blur">
          {t('video.publicar.trabajo.noCierres', 'No cierres la app ni bloquees la pantalla hasta que termine la subida.')}
        </p>
      )}
    </div>
  )
}
