import { abrirEnlace } from '../../../core/enlaces'
import { useT, type TFunc } from '../../../core/i18n/useT'
import type { OpcionesTikTok } from '../../../core/redes/tipos'
import { BotonSecundario, Campo, INPUT, Spinner } from '../../_shared/ui'
import { Chip } from '../Secciones'
import { Interruptor } from './Interruptor'
import { LIMITES, URL_TIKTOK_MARCA, URL_TIKTOK_MUSICA, type MetaTikTok } from './tipos'

export function validarTikTok(meta: MetaTikTok, info: OpcionesTikTok | null, duracion: number, t: TFunc): string | null {
  if (!info) return t('video.publicar.tt.cargandoCreador', 'Consultando tu cuenta de TikTok…')
  if (!meta.titulo.trim()) return t('video.publicar.campo.obligatorio', 'El título es obligatorio.')
  if (meta.titulo.length > LIMITES.tiktok.titulo) return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.tiktok.titulo })
  if (duracion > info.max_duracion_seg) {
    return t('video.publicar.duracionTope', 'El video dura {seg} s y {red} admite hasta {max} s.', { seg: Math.round(duracion), red: 'TikTok', max: info.max_duracion_seg })
  }
  if (!meta.privacidad) return t('video.publicar.privacidad.elegir', 'Elige quién puede verlo.')
  if (meta.comercial && !meta.tuMarca && !meta.contenidoMarca) {
    return t('video.publicar.tt.comercialSinCasilla', 'Tienes que indicar si tu contenido te promociona a ti, a un tercero o a ambos.')
  }
  if (meta.comercial && meta.contenidoMarca && meta.privacidad === 'SELF_ONLY') {
    return t('video.publicar.tt.marcaNoPrivado', 'La visibilidad del contenido de marca no puede ser privada.')
  }
  return null
}

/** Texto de consentimiento con sus enlaces: `{musica}` y `{politica}` se sustituyen por botones. */
function Consentimiento({ plantilla, t }: { plantilla: string; t: TFunc }) {
  const partes = plantilla.split(/(\{musica\}|\{politica\})/)
  return (
    <p className="text-[11px] leading-snug text-white/55">
      {partes.map((p, i) => {
        if (p === '{musica}' || p === '{politica}') {
          const url = p === '{musica}' ? URL_TIKTOK_MUSICA : URL_TIKTOK_MARCA
          const texto = p === '{musica}' ? t('video.publicar.tt.enlaceMusica', 'Confirmación de uso de música') : t('video.publicar.tt.enlacePolitica', 'Política de contenido de marca')
          return (
            <button key={i} type="button" onClick={() => void abrirEnlace(url)} className="underline">
              {texto}
            </button>
          )
        }
        return <span key={i}>{p}</span>
      })}
    </p>
  )
}

/**
 * Formulario de TikTok tal como lo exige el audit del Content Posting API:
 * nickname del creador, privacidad SIN valor por defecto y solo con las opciones
 * que devuelve `creator_info`, interacciones apagadas por defecto (y en gris si
 * el creador las tiene desactivadas), declaración de contenido comercial con
 * su consentimiento y el aviso de procesamiento.
 */
export function FormularioTikTok({
  meta,
  onCambio,
  info,
  errorInfo,
  onReintentar,
  duracion,
}: {
  meta: MetaTikTok
  onCambio: (m: MetaTikTok) => void
  info: OpcionesTikTok | null
  errorInfo: string | null
  onReintentar: () => void
  duracion: number
}) {
  const t = useT()
  if (errorInfo) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-red-400/90">{t('video.publicar.tt.errorCreador', 'TikTok no respondió: {e}', { e: errorInfo })}</p>
        <BotonSecundario pequeno onClick={onReintentar}>
          {t('video.publicar.tt.reintentar', 'Reintentar')}
        </BotonSecundario>
      </div>
    )
  }
  if (!info) {
    return (
      <div className="py-4 text-center">
        <Spinner etiqueta={t('video.publicar.tt.cargandoCreador', 'Consultando tu cuenta de TikTok…')} />
      </div>
    )
  }
  const etiquetaPrivacidad: Record<string, string> = {
    PUBLIC_TO_EVERYONE: t('video.publicar.tt.privacidad.PUBLIC_TO_EVERYONE', 'Todos'),
    MUTUAL_FOLLOW_FRIENDS: t('video.publicar.tt.privacidad.MUTUAL_FOLLOW_FRIENDS', 'Amigos'),
    FOLLOWER_OF_CREATOR: t('video.publicar.tt.privacidad.FOLLOWER_OF_CREATOR', 'Seguidores'),
    SELF_ONLY: t('video.publicar.tt.privacidad.SELF_ONLY', 'Solo yo'),
  }
  const marca = meta.comercial && meta.contenidoMarca
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/70">{t('video.publicar.tt.creador', 'Se publicará en la cuenta de {nick}', { nick: info.nickname })}</p>
      <Campo etiqueta={`${t('video.publicar.campo.titulo', 'Título')} · ${meta.titulo.length}/${LIMITES.tiktok.titulo}`}>
        <textarea value={meta.titulo} maxLength={LIMITES.tiktok.titulo} rows={2} onChange={(e) => onCambio({ ...meta, titulo: e.target.value })} className={INPUT} />
      </Campo>
      <Campo etiqueta={t('video.publicar.privacidad', 'Privacidad')}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {info.privacidad.map((p) => (
            <Chip
              key={p}
              activo={meta.privacidad === p}
              disabled={marca && p === 'SELF_ONLY'}
              onClick={() => onCambio({ ...meta, privacidad: p })}
            >
              {etiquetaPrivacidad[p] ?? p}
            </Chip>
          ))}
        </div>
        {!meta.privacidad && <p className="mt-1 text-[11px] text-white/40">{t('video.publicar.privacidad.elegir', 'Elige quién puede verlo.')}</p>}
        {/* La guía de TikTok pide que, con «Contenido de marca» puesto, además de
            deshabilitar «Solo yo» se explique por qué. */}
        {marca && (
          <p className="mt-1 text-[11px] leading-snug text-amber-200/80">
            {t('video.publicar.tt.marcaNoPrivado', 'La visibilidad del contenido de marca no puede ser privada.')}
          </p>
        )}
        {!info.auditado && (
          <p className="mt-1 text-[11px] leading-snug text-amber-300/80">
            {t('video.publicar.tt.auditoria', 'Esta app aún está en revisión de TikTok: el video se publica como «Solo yo».')}
          </p>
        )}
      </Campo>
      <Campo etiqueta={t('video.publicar.tt.interaccion', 'Permitir a los demás')}>
        <div className="space-y-1.5">
          <Interruptor
            etiqueta={t('video.publicar.tt.comentarios', 'Comentarios')}
            activo={meta.comentarios}
            disabled={!info.comentarios}
            nota={!info.comentarios ? t('video.publicar.tt.desactivadoCreador', 'Desactivado en tu cuenta de TikTok') : undefined}
            onCambio={(v) => onCambio({ ...meta, comentarios: v })}
          />
          <Interruptor
            etiqueta={t('video.publicar.tt.duo', 'Dúo')}
            activo={meta.duo}
            disabled={!info.duet}
            nota={!info.duet ? t('video.publicar.tt.desactivadoCreador', 'Desactivado en tu cuenta de TikTok') : undefined}
            onCambio={(v) => onCambio({ ...meta, duo: v })}
          />
          <Interruptor
            etiqueta={t('video.publicar.tt.stitch', 'Stitch')}
            activo={meta.stitch}
            disabled={!info.stitch}
            nota={!info.stitch ? t('video.publicar.tt.desactivadoCreador', 'Desactivado en tu cuenta de TikTok') : undefined}
            onCambio={(v) => onCambio({ ...meta, stitch: v })}
          />
        </div>
      </Campo>
      <Campo etiqueta={t('video.publicar.tt.comercial', 'Contenido comercial')}>
        <Interruptor
          etiqueta={t('video.publicar.tt.comercialNota', 'Este video promociona una marca, un producto o un servicio')}
          activo={meta.comercial}
          onCambio={(v) => onCambio({ ...meta, comercial: v, tuMarca: v ? meta.tuMarca : false, contenidoMarca: v ? meta.contenidoMarca : false })}
        />
        {meta.comercial && (
          <div className="mt-2 space-y-1.5">
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={meta.tuMarca} onChange={(e) => onCambio({ ...meta, tuMarca: e.target.checked })} className="mt-0.5" />
              <span>
                <span className="font-semibold text-white/80">{t('video.publicar.tt.tuMarca', 'Tu marca')}</span>
                <span className="block text-[11px] text-white/45">{t('video.publicar.tt.tuMarcaNota', 'Promocionas tu propio negocio.')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={meta.contenidoMarca} onChange={(e) => onCambio({ ...meta, contenidoMarca: e.target.checked })} className="mt-0.5" />
              <span>
                <span className="font-semibold text-white/80">{t('video.publicar.tt.contenidoMarca', 'Contenido de marca')}</span>
                <span className="block text-[11px] text-white/45">{t('video.publicar.tt.contenidoMarcaNota', 'Promocionas a otra marca o a un tercero.')}</span>
              </span>
            </label>
            {/* La etiqueta sale de UNA sola línea, no de las notas de cada casilla: si el
                usuario marca las dos, TikTok clasifica el video como «Colaboración pagada». */}
            {(meta.tuMarca || meta.contenidoMarca) && (
              <p className="text-[11px] leading-snug text-amber-200/80">
                {meta.contenidoMarca
                  ? t('video.publicar.tt.etiquetaPagada', 'Tu video se etiquetará como «Colaboración pagada».')
                  : t('video.publicar.tt.etiquetaPromo', 'Tu video se etiquetará como «Contenido promocional».')}
              </p>
            )}
          </div>
        )}
      </Campo>
      <Interruptor etiqueta={t('video.publicar.tt.esIA', 'Marcar como contenido generado con IA')} activo={meta.esIA} onCambio={(v) => onCambio({ ...meta, esIA: v })} />
      <Consentimiento
        t={t}
        plantilla={
          marca
            ? t('video.publicar.tt.consentimientoMarca', 'Al publicar, aceptas la {politica} y la {musica} de TikTok.')
            : t('video.publicar.tt.consentimiento', 'Al publicar, aceptas la {musica} de TikTok.')
        }
      />
      <p className="text-[11px] text-white/40">{t('video.publicar.tt.procesando', 'El video tardará unos minutos en procesarse y aparecer en tu perfil.')}</p>
      {duracion > info.max_duracion_seg && (
        <p className="text-xs text-red-400/90">
          {t('video.publicar.duracionTope', 'El video dura {seg} s y {red} admite hasta {max} s.', { seg: Math.round(duracion), red: 'TikTok', max: info.max_duracion_seg })}
        </p>
      )}
    </div>
  )
}
