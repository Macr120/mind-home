import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { PISOS, type PisoTipo } from '../../house/pisos'
import { ColorPicker } from '../editor/ColorPicker'
import { useT } from '../../i18n/useT'
import {
  MAPA_SUPERFICIE_DEFAULT,
  MAPA_SUPERFICIE_ID,
  type MapaSuperficieAjustes,
} from '../../house/mapaSuperficie'

function swatchStyle(p: PisoTipo): CSSProperties {
  if (p.textura)
    return { backgroundColor: p.color, backgroundImage: `url(/textures/floors/${p.textura}_color.jpg)` }
  return { backgroundColor: p.color }
}

/** Personaliza color, textura o foto del papel del plano, rejilla y base 3D. */
export function EditorMapaSuperficieSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const setMapaSuperficie = useDiseño((s) => s.setMapaSuperficie)
  const roomPisoImagenes = useDiseño((s) => s.roomPisoImagenes)
  const roomPisoImagenActiva = useDiseño((s) => s.roomPisoImagenActiva)
  const subirRoomPisoImagen = useDiseño((s) => s.subirRoomPisoImagen)
  const activarRoomPisoImagen = useDiseño((s) => s.activarRoomPisoImagen)
  const desactivarRoomPisoImagen = useDiseño((s) => s.desactivarRoomPisoImagen)
  const eliminarRoomPisoImagen = useDiseño((s) => s.eliminarRoomPisoImagen)

  const imagenUrl = roomPisoImagenes[MAPA_SUPERFICIE_ID]
  const imagenActiva = !!imagenUrl && (roomPisoImagenActiva[MAPA_SUPERFICIE_ID] ?? false)
  const a = mapaSuperficie

  const patch = (p: Partial<MapaSuperficieAjustes>) => void setMapaSuperficie({ ...a, ...p })

  const onSubir = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    void subirRoomPisoImagen(MAPA_SUPERFICIE_ID, file).then(() => {
      patch({ modo: 'imagen' })
    })
  }

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && (
        <p className="text-sm font-semibold">{t('planos.superficie.titulo', 'Superficie del mapa')}</p>
      )}
      <p className="text-[11px] leading-snug text-white/45">
        {t(
          'planos.superficie.desc',
          'Afecta el papel del croquis, la rejilla del plano y la base del mapa 3D.',
        )}
      </p>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.relleno', 'Relleno del plano')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              desactivarRoomPisoImagen(MAPA_SUPERFICIE_ID)
              patch({ modo: 'color', texturaId: null })
            }}
            className={[
              'rounded-lg border px-1 py-2 text-[10px] transition',
              a.modo === 'color' && !imagenActiva
                ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            ].join(' ')}
          >
            <div className="mx-auto mb-1 h-7 w-full rounded-md" style={{ background: a.colorSuelo }} />
            {t('planos.superficie.color', 'Color')}
          </button>
          <button
            type="button"
            onClick={() => {
              desactivarRoomPisoImagen(MAPA_SUPERFICIE_ID)
              patch({ modo: 'ninguno', texturaId: null })
            }}
            className={[
              'rounded-lg border px-1 py-2 text-[10px] transition',
              a.modo === 'ninguno' && !imagenActiva
                ? 'border-rose-400/70 bg-rose-400/15 text-rose-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            ].join(' ')}
          >
            <div className="relative mx-auto mb-1 h-7 w-full rounded-md border border-dashed border-white/25 bg-[#0a0c10]">
              <span className="absolute inset-0 flex items-center justify-center text-sm text-white/35">✕</span>
            </div>
            {t('planos.superficie.sinRelleno', 'Sin relleno')}
          </button>
          {PISOS.filter((p) => p.textura).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                desactivarRoomPisoImagen(MAPA_SUPERFICIE_ID)
                patch({ modo: 'textura', texturaId: p.id })
              }}
              className={[
                'rounded-lg border px-1 py-2 text-[10px] transition',
                a.modo === 'textura' && a.texturaId === p.id
                  ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
              ].join(' ')}
              title={p.nombre}
            >
              <div className="mx-auto mb-1 h-7 w-full rounded-md bg-cover" style={swatchStyle(p)} />
              <span className="block truncate">{p.nombre}</span>
            </button>
          ))}
        </div>
        {a.modo === 'color' && !imagenActiva && (
          <ColorPicker value={a.colorSuelo} onChange={(colorSuelo) => patch({ colorSuelo, papelColor: colorSuelo })} />
        )}
        {a.modo === 'ninguno' && !imagenActiva && (
          <p className="text-[10px] leading-snug text-white/40">
            {t(
              'planos.superficie.sinRellenoHint',
              'Papel y base 3D transparentes. La rejilla sigue visible; elige color o textura para restaurar el relleno.',
            )}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('planos.superficie.foto', 'Foto de fondo')}
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-black hover:bg-emerald-400"
          >
            {t('planos.superficie.subir', '+ Subir')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onSubir(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {imagenUrl ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <img src={imagenUrl} alt="" className="aspect-video w-full object-cover" draggable={false} />
            <div className="flex border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  void activarRoomPisoImagen(MAPA_SUPERFICIE_ID)
                  patch({ modo: 'imagen' })
                }}
                className={`flex-1 py-1.5 text-[10px] ${imagenActiva ? 'text-emerald-300' : 'text-white/50 hover:bg-white/5'}`}
              >
                {imagenActiva ? '✓ ' : ''}
                {t('planos.superficie.usar', 'Usar en plano')}
              </button>
              <button
                type="button"
                onClick={() => void eliminarRoomPisoImagen(MAPA_SUPERFICIE_ID)}
                className="flex-1 border-l border-white/10 py-1.5 text-[10px] text-red-300/70 hover:bg-red-500/10"
              >
                {t('planos.superficie.borrar', 'Borrar')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-white/35">
            {t('planos.superficie.sinFoto', 'Sube una imagen para el papel del croquis y la base 3D.')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.rejilla', 'Rejilla')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-white/45">{t('planos.superficie.rejillaFuerte', 'Líneas principales')}</span>
            <ColorPicker value={a.rejillaFuerte} onChange={(rejillaFuerte) => patch({ rejillaFuerte })} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-white/45">{t('planos.superficie.rejillaSuave', 'Líneas finas')}</span>
            <ColorPicker value={a.rejillaSuave} onChange={(rejillaSuave) => patch({ rejillaSuave })} />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.borde', 'Borde del papel')}
        </p>
        <ColorPicker value={a.papelBorde} onChange={(papelBorde) => patch({ papelBorde })} />
      </div>

      <button
        type="button"
        onClick={() => {
          void eliminarRoomPisoImagen(MAPA_SUPERFICIE_ID)
          void setMapaSuperficie({ ...MAPA_SUPERFICIE_DEFAULT })
        }}
        className="w-full rounded-lg border border-white/10 py-2 text-[11px] text-white/50 transition hover:bg-white/5 hover:text-white/75"
      >
        {t('planos.superficie.restaurar', 'Restaurar valores por defecto')}
      </button>
    </div>
  )
}
