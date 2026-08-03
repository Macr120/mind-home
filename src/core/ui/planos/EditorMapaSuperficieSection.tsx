import { useRef, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useLayout } from '../../state/layoutStore'
import { TAM_CELDA_MIN, TAM_CELDA_MAX } from '../../house/walls'
import { ColorPicker, SIN_COLOR } from '../editor/ColorPicker'
import { useT } from '../../i18n/useT'
import {
  MAPA_SUPERFICIE_DEFAULT,
  MAPA_SUPERFICIE_ID,
  type MapaSuperficieAjustes,
} from '../../house/mapaSuperficie'

/** 7 colores del arcoíris (el 8º "sin color" lo añade el propio ColorPicker). */
const ARCOIRIS = [
  '#ef4444', '#f97316', '#facc15', '#22c55e',
  '#3b82f6', '#4f46e5', '#a855f7',
] as const

/**
 * Superficie del mapa, en 4 ajustes: relleno del plano, líneas principales,
 * líneas secundarias y foto de fondo. Afecta el croquis y la base del mapa 3D.
 */
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

  const tamCelda = useLayout((s) => s.tamCelda)
  const setTamCeldaMapa = useLayout((s) => s.setTamCeldaMapa)
  // El cambio remonta toda la escena 3D: se aplica al SOLTAR el deslizador, no en vivo.
  const [celdaLocal, setCeldaLocal] = useState<number | null>(null)
  const celda = celdaLocal ?? tamCelda
  const aplicarCelda = () => {
    if (celdaLocal == null) return
    void setTamCeldaMapa(celdaLocal)
    setCeldaLocal(null)
  }

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
    <div className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}>
      {!embed && (
        <p className="text-sm font-semibold">{t('planos.superficie.titulo', 'Superficie del mapa')}</p>
      )}

      {/* 0. Tamaño de celda: lado en metros de cada cuadro de la malla */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <p className="font-bold uppercase tracking-wider text-white/40">
            {t('planos.superficie.tamCelda', 'Tamaño de celda')}
          </p>
          <span className="tabular-nums text-white/60">{celda} m</span>
        </div>
        <input
          type="range"
          min={TAM_CELDA_MIN}
          max={TAM_CELDA_MAX}
          step={0.5}
          value={celda}
          onChange={(e) => setCeldaLocal(parseFloat(e.target.value))}
          onPointerUp={aplicarCelda}
          onKeyUp={aplicarCelda}
          onBlur={aplicarCelda}
          className="w-full accent-emerald-400"
        />
        <p className="text-[10px] leading-snug text-white/45">
          {t(
            'planos.superficie.tamCeldaHint',
            'Los cuartos, muros, techos y canchas se escalan con la celda; los personajes y demás objetos conservan su tamaño.',
          )}
        </p>
      </div>

      {/* 1. Relleno del plano (8º = sin color → plano transparente) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.relleno', 'Relleno del plano')}
        </p>
        <ColorPicker
          value={a.modo === 'ninguno' && !imagenActiva ? SIN_COLOR : a.colorSuelo}
          onChange={(c) => {
            void desactivarRoomPisoImagen(MAPA_SUPERFICIE_ID)
            if (c === SIN_COLOR) patch({ modo: 'ninguno', texturaId: null })
            else patch({ modo: 'color', texturaId: null, colorSuelo: c, papelColor: c })
          }}
          paleta={ARCOIRIS}
          sinColor
          personalizado={false}
        />
      </div>

      {/* 2. Líneas principales (8º = sin color → líneas ocultas) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.rejillaFuerte', 'Líneas principales')}
        </p>
        <ColorPicker
          value={a.rejillaFuerte}
          onChange={(rejillaFuerte) => patch({ rejillaFuerte })}
          paleta={ARCOIRIS}
          sinColor
          personalizado={false}
        />
      </div>

      {/* 3. Líneas secundarias (8º = sin color → líneas ocultas) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.superficie.rejillaSuave', 'Líneas secundarias')}
        </p>
        <ColorPicker
          value={a.rejillaSuave}
          onChange={(rejillaSuave) => patch({ rejillaSuave })}
          paleta={ARCOIRIS}
          sinColor
          personalizado={false}
        />
      </div>

      {/* 4. Foto de fondo */}
      <div className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('planos.superficie.foto', 'Foto de fondo')}
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold texto-cta hover:bg-emerald-600"
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
                className={`flex-1 py-1.5 text-[10px] ${imagenActiva ? 'text-emerald-400' : 'text-white/50 hover:bg-white/5'}`}
              >
                {imagenActiva ? '✓ ' : ''}
                {t('planos.superficie.usar', 'Usar en plano')}
              </button>
              <button
                type="button"
                onClick={() => void eliminarRoomPisoImagen(MAPA_SUPERFICIE_ID)}
                className="flex-1 border-l border-white/10 py-1.5 text-[10px] text-red-400/70 hover:bg-red-500/10"
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
