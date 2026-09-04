import { compartirTexto } from '../../../core/compartir'
import { abrirEnlace } from '../../../core/enlaces'
import { useT } from '../../../core/i18n/useT'
import { NOMBRE_RED, type TrabajoPublicacion } from '../../../core/redes/tipos'
import { Icono } from '../../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, TARJETA } from '../../_shared/ui'
import { COLOR } from '../constantes'

/** Cómo acabó la publicación: enlace, privado por auditoría, o error con reintento (sin volver a exportar). */
export function Resultado({
  trabajo,
  onReintentar,
  onEditar,
  onCerrar,
}: {
  trabajo: TrabajoPublicacion
  onReintentar: () => void
  onEditar: () => void
  onCerrar: () => void
}) {
  const t = useT()
  const red = NOMBRE_RED[trabajo.plataforma]
  const r = trabajo.resultado
  if (trabajo.estado === 'listo' && r) {
    const procesa = trabajo.plataforma === 'tiktok' || trabajo.plataforma === 'instagram'
    return (
      <div className="space-y-3">
        <div className={`${TARJETA} space-y-1 text-center`}>
          <p className="text-2xl">
            <Icono nombre={r.privado ? 'candado' : 'hecho'} />
          </p>
          <p className="text-sm font-semibold">{t('video.publicar.resultado.ok', 'Publicado en {red}', { red })}</p>
          {r.privado && (
            <p className="text-xs leading-relaxed text-white/60">
              {t(
                'video.publicar.resultado.privado',
                'Se subió como privado: la app aún está en revisión de {red}. Puedes hacerlo público desde la propia app de {red}.',
                { red },
              )}
            </p>
          )}
          {procesa && <p className="text-xs text-white/50">{t('video.publicar.tt.procesando', 'El video tardará unos minutos en procesarse y aparecer en tu perfil.')}</p>}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {r.url && (
            <>
              <BotonSecundario pequeno onClick={() => void compartirTexto(trabajo.titulo, r.url!)}>
                <Icono nombre="compartir" /> {t('video.publicar.resultado.compartir', 'Compartir enlace')}
              </BotonSecundario>
              <BotonPrimario type="button" pequeno app={COLOR} onClick={() => void abrirEnlace(r.url!)}>
                {t('video.publicar.resultado.ver', 'Ver en {red}', { red })}
              </BotonPrimario>
            </>
          )}
          <BotonSecundario pequeno onClick={onCerrar}>
            {t('video.publicar.resultado.cerrar', 'Listo')}
          </BotonSecundario>
        </div>
      </div>
    )
  }
  const cancelado = trabajo.estado === 'cancelado'
  return (
    <div className="space-y-3">
      <div className={`${TARJETA} space-y-1 text-center`}>
        <p className="text-2xl">
          <Icono nombre="alerta" />
        </p>
        <p className="text-sm font-semibold">
          {cancelado ? t('video.publicar.trabajo.cancelado', 'Subida cancelada') : t('video.publicar.resultado.error', 'No se pudo publicar en {red}', { red })}
        </p>
        {trabajo.error && <p className="text-xs leading-relaxed text-white/60">{trabajo.error}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <BotonSecundario pequeno onClick={onEditar}>
          {t('video.publicar.resultado.editar', 'Editar datos')}
        </BotonSecundario>
        <BotonPrimario type="button" pequeno app={COLOR} onClick={onReintentar}>
          {t('video.publicar.resultado.reintentar', 'Reintentar')}
        </BotonPrimario>
      </div>
    </div>
  )
}
