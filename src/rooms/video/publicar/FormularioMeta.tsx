import { useT, type TFunc } from '../../../core/i18n/useT'
import { useRedes } from '../../../core/redes/redesStore'
import type { AvisosRedes, CuentaRed } from '../../../core/redes/tipos'
import { Campo, INPUT } from '../../_shared/ui'
import type { AspectoVideo } from '../constantes'
import { Chip } from '../Secciones'
import { LIMITES, type MetaFacebook, type MetaInstagram } from './tipos'

/** Facebook e Instagram comparten cuenta (una app de Meta) y por eso viven en el mismo archivo. */

export function validarFacebook(meta: MetaFacebook, cuenta: CuentaRed | null, t: TFunc): string | null {
  if (!cuenta) return t('video.publicar.fb.sinPaginas', 'Tu cuenta no administra ninguna Página. Facebook solo permite publicar videos en Páginas, no en perfiles personales.')
  if (!meta.titulo.trim()) return t('video.publicar.campo.obligatorio', 'El título es obligatorio.')
  if (meta.titulo.length > LIMITES.facebook.titulo) return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.facebook.titulo })
  if (meta.descripcion.length > LIMITES.facebook.descripcion) {
    return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.facebook.descripcion })
  }
  return null
}

export function validarInstagram(meta: MetaInstagram, cuenta: CuentaRed | null, aspecto: AspectoVideo, mp4: boolean, t: TFunc): string | null {
  if (!cuenta) return t('video.publicar.ig.sinCuentas', 'No hay ninguna cuenta profesional de Instagram vinculada a tus Páginas.')
  if (!mp4) return t('video.publicar.menu.sinMp4', 'Necesita MP4: este dispositivo solo graba WebM')
  if (aspecto !== '9:16') return t('video.publicar.menu.solo916', 'Solo en formato 9:16')
  if (meta.caption.length > LIMITES.instagram.caption) return t('video.publicar.campo.largo', 'Demasiado largo: máximo {max} caracteres.', { max: LIMITES.instagram.caption })
  return null
}

/** Selector de Página cuando la cuenta administra varias: cambiarla la fija en el servidor (`elegir`). */
function SelectorPagina({ cuenta, plataforma }: { cuenta: CuentaRed; plataforma: 'facebook' | 'instagram' }) {
  const t = useT()
  const paginas = (cuenta.extra.paginas ?? []).filter((p) => plataforma === 'facebook' || p.instagram)
  const actual = cuenta.extra.page_id ?? ''
  if (paginas.length <= 1) return null
  const etiqueta = (p: (typeof paginas)[number]) => (plataforma === 'instagram' && p.instagram ? `@${p.instagram.username}` : p.nombre)
  return (
    <Campo etiqueta={plataforma === 'facebook' ? t('video.publicar.fb.pagina', 'Página') : t('video.publicar.ig.cuenta', 'Cuenta')}>
      {paginas.length > 4 ? (
        <select value={actual} onChange={(e) => void useRedes.getState().elegirPagina(plataforma, e.target.value)} className={INPUT}>
          {paginas.map((p) => (
            <option key={p.id} value={p.id}>
              {etiqueta(p)}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {paginas.map((p) => (
            <Chip key={p.id} activo={p.id === actual} onClick={() => void useRedes.getState().elegirPagina(plataforma, p.id)}>
              {etiqueta(p)}
            </Chip>
          ))}
        </div>
      )}
    </Campo>
  )
}

function AvisoModoDesarrollo({ avisos }: { avisos: AvisosRedes }) {
  const t = useT()
  if (avisos.meta !== 'modo-desarrollo') return null
  return (
    <p className="text-[11px] leading-snug text-amber-300/80">
      {t('video.publicar.fb.modoDesarrollo', 'La app de Meta aún está en revisión: solo pueden publicar las cuentas de prueba registradas en ella.')}
    </p>
  )
}

export function FormularioFacebook({
  meta,
  onCambio,
  cuenta,
  aspecto,
  avisos,
}: {
  meta: MetaFacebook
  onCambio: (m: MetaFacebook) => void
  cuenta: CuentaRed | null
  aspecto: AspectoVideo
  avisos: AvisosRedes
}) {
  const t = useT()
  if (!cuenta) {
    return (
      <p className="text-xs text-red-400/90">
        {t('video.publicar.fb.sinPaginas', 'Tu cuenta no administra ninguna Página. Facebook solo permite publicar videos en Páginas, no en perfiles personales.')}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/70">{t('video.publicar.cuenta.publicaComo', 'Se publicará como {nombre}', { nombre: cuenta.nombre })}</p>
      <SelectorPagina cuenta={cuenta} plataforma="facebook" />
      <Campo etiqueta={`${t('video.publicar.campo.titulo', 'Título')} · ${meta.titulo.length}/${LIMITES.facebook.titulo}`}>
        <input value={meta.titulo} maxLength={LIMITES.facebook.titulo} onChange={(e) => onCambio({ ...meta, titulo: e.target.value })} enterKeyHint="done" className={INPUT} />
      </Campo>
      <Campo etiqueta={`${t('video.publicar.campo.descripcion', 'Descripción')} · ${meta.descripcion.length}/${LIMITES.facebook.descripcion}`}>
        <textarea value={meta.descripcion} maxLength={LIMITES.facebook.descripcion} rows={3} onChange={(e) => onCambio({ ...meta, descripcion: e.target.value })} className={INPUT} />
      </Campo>
      <p className="text-[11px] text-white/40">
        {aspecto === '9:16'
          ? t('video.publicar.fb.reel', 'Se publicará como Reel (formato 9:16).')
          : aspecto === '1:1'
            ? t('video.publicar.fb.videoCuadrado', 'Se publicará como video normal (formato 1:1).')
            : t('video.publicar.fb.video', 'Se publicará como video normal (formato 16:9).')}
      </p>
      <AvisoModoDesarrollo avisos={avisos} />
    </div>
  )
}

export function FormularioInstagram({
  meta,
  onCambio,
  cuenta,
  aspecto,
  mp4,
  avisos,
}: {
  meta: MetaInstagram
  onCambio: (m: MetaInstagram) => void
  cuenta: CuentaRed | null
  aspecto: AspectoVideo
  mp4: boolean
  avisos: AvisosRedes
}) {
  const t = useT()
  if (!cuenta) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-red-400/90">{t('video.publicar.ig.sinCuentas', 'No hay ninguna cuenta profesional de Instagram vinculada a tus Páginas.')}</p>
        <p className="text-[11px] text-white/40">
          {t('video.publicar.ig.requisitos', 'Instagram necesita una cuenta profesional vinculada a una Página de Facebook, video 9:16 y archivo MP4.')}
        </p>
      </div>
    )
  }
  const bloqueo = !mp4
    ? t('video.publicar.menu.sinMp4', 'Necesita MP4: este dispositivo solo graba WebM')
    : aspecto !== '9:16'
      ? t('video.publicar.menu.solo916', 'Solo en formato 9:16')
      : null
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/70">{t('video.publicar.cuenta.publicaComo', 'Se publicará como {nombre}', { nombre: `@${cuenta.nombre}` })}</p>
      <SelectorPagina cuenta={cuenta} plataforma="instagram" />
      <Campo etiqueta={`${t('video.publicar.campo.caption', 'Texto de la publicación')} · ${meta.caption.length}/${LIMITES.instagram.caption}`}>
        <textarea value={meta.caption} maxLength={LIMITES.instagram.caption} rows={3} onChange={(e) => onCambio({ ...meta, caption: e.target.value })} className={INPUT} />
      </Campo>
      <p className="text-[11px] text-white/40">{t('video.publicar.ig.reel', 'Se publicará como Reel.')}</p>
      <p className="text-[11px] text-white/40">
        {t('video.publicar.ig.requisitos', 'Instagram necesita una cuenta profesional vinculada a una Página de Facebook, video 9:16 y archivo MP4.')}
      </p>
      {bloqueo && <p className="text-xs text-red-400/90">{bloqueo}</p>}
      <AvisoModoDesarrollo avisos={avisos} />
    </div>
  )
}
