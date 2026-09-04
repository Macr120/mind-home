import { useT, type TFunc } from '../../../core/i18n/useT'
import type { AvisosRedes } from '../../../core/redes/tipos'
import { Campo, INPUT } from '../../_shared/ui'
import { Chip } from '../Secciones'
import { LIMITES, type MetaYouTube } from './tipos'

export function validarYouTube(meta: MetaYouTube, t: TFunc): string | null {
  if (!meta.titulo.trim()) return t('video.publicar.campo.obligatorio', 'El título es obligatorio.')
  if (meta.titulo.length > LIMITES.youtube.titulo) return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.youtube.titulo })
  if (meta.descripcion.length > LIMITES.youtube.descripcion) {
    return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.youtube.descripcion })
  }
  if (meta.paraNinos == null) return t('video.publicar.yt.ninosElegir', 'Indica si el video está hecho para niños.')
  return null
}

export function FormularioYouTube({
  meta,
  onCambio,
  avisos,
  restantes,
}: {
  meta: MetaYouTube
  onCambio: (m: MetaYouTube) => void
  avisos: AvisosRedes
  restantes: number
}) {
  const t = useT()
  const privado = avisos.youtube === 'privado'
  const privacidades: { id: MetaYouTube['privacidad']; etiqueta: string }[] = [
    { id: 'public', etiqueta: t('video.publicar.yt.publico', 'Público') },
    { id: 'unlisted', etiqueta: t('video.publicar.yt.noListado', 'No listado') },
    { id: 'private', etiqueta: t('video.publicar.yt.privado', 'Privado') },
  ]
  return (
    <div className="space-y-2">
      <Campo etiqueta={`${t('video.publicar.campo.titulo', 'Título')} · ${meta.titulo.length}/${LIMITES.youtube.titulo}`}>
        <input value={meta.titulo} maxLength={LIMITES.youtube.titulo} onChange={(e) => onCambio({ ...meta, titulo: e.target.value })} enterKeyHint="done" className={INPUT} />
      </Campo>
      <Campo etiqueta={`${t('video.publicar.campo.descripcion', 'Descripción')} · ${meta.descripcion.length}/${LIMITES.youtube.descripcion}`}>
        <textarea value={meta.descripcion} maxLength={LIMITES.youtube.descripcion} rows={3} onChange={(e) => onCambio({ ...meta, descripcion: e.target.value })} className={INPUT} />
      </Campo>
      <Campo etiqueta={t('video.publicar.privacidad', 'Privacidad')}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {privacidades.map((p) => (
            <Chip key={p.id} activo={(privado ? 'private' : meta.privacidad) === p.id} disabled={privado && p.id !== 'private'} onClick={() => onCambio({ ...meta, privacidad: p.id })}>
              {p.etiqueta}
            </Chip>
          ))}
        </div>
        {privado && (
          <p className="mt-1 text-[11px] leading-snug text-amber-300/80">
            {t('video.publicar.yt.auditoria', 'Esta app aún está en revisión de Google: el video se sube como privado; puedes hacerlo público desde YouTube Studio.')}
          </p>
        )}
      </Campo>
      <Campo etiqueta={t('video.publicar.yt.ninos', '¿Está hecho para niños?')}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          <Chip activo={meta.paraNinos === false} onClick={() => onCambio({ ...meta, paraNinos: false })}>
            {t('video.publicar.yt.ninosNo', 'No, no es para niños')}
          </Chip>
          <Chip activo={meta.paraNinos === true} onClick={() => onCambio({ ...meta, paraNinos: true })}>
            {t('video.publicar.yt.ninosSi', 'Sí, es para niños')}
          </Chip>
        </div>
        <p className="mt-1 text-[11px] text-white/40">{t('video.publicar.yt.ninosNota', 'YouTube obliga a declararlo (ley COPPA), sea cual sea tu país.')}</p>
      </Campo>
      <p className="text-[11px] text-white/40">{t('video.publicar.yt.restantes', 'Quedan {n} subidas a YouTube hoy en la app.', { n: restantes })}</p>
    </div>
  )
}
