import { useState } from 'react'
import {
  activarPisoExteriorImagen,
  ajustarPisoExteriorImagen,
  aplicarPisoExteriorCeldas,
  eliminarPisoExteriorImagen,
  setFormaPisoExteriorCeldas,
  subirPisoExteriorImagen,
} from '../../data/repository'
import { getPisoTipo, PISO_SIN_PISO, esSinPiso, type PisoTipoId } from '../../house/pisos'
import type { Cell } from '../../house/walls'
import type { FormaLoseta } from '../../house/formasLoseta'
import { EditorPisoMaterialForm } from '../editor/EditorPisoMaterialForm'
import { LosetaFormaSvg } from './LosetaFormaSvg'
import { usePreviewBlob } from '../editor/usePreviewBlob'
import { useT } from '../../i18n/useT'

const FORMAS: { id: FormaLoseta; nombre: string }[] = [
  { id: 'cuadrado', nombre: 'Cuadrado' },
  { id: 'triangular', nombre: 'Triángulo' },
  { id: 'circular', nombre: 'Círculo' },
]

/** Selector de piso para celdas exteriores (selección múltiple o grupo completo). */
export function EditorPisoExteriorSection({
  celdas,
  nivel,
  pisoTipoInicial,
  pisoColorInicial,
  pisoImagenInicial,
  pisoImagenActivaInicial,
  pisoImagenAjusteInicial,
}: {
  celdas: Cell[]
  nivel: number
  pisoTipoInicial?: string | null
  pisoColorInicial?: string
  pisoImagenInicial?: Blob
  pisoImagenActivaInicial?: boolean
  pisoImagenAjusteInicial?: string
}) {
  const t = useT()
  const pisoConf = pisoTipoInicial && !esSinPiso(pisoTipoInicial) ? getPisoTipo(pisoTipoInicial as PisoTipoId) : null
  const imagenInicial = !!(pisoImagenActivaInicial && pisoImagenInicial)

  const [pisoTipo, setPisoTipo] = useState<string | null>(pisoTipoInicial ?? null)
  const [floorColor, setFloorColor] = useState(pisoColorInicial ?? pisoConf?.color ?? '#4a5568')
  const [imagenActiva, setImagenActiva] = useState(imagenInicial)
  const [previewBlob, setPreviewBlob] = useState<Blob | undefined>(pisoImagenInicial)
  const [ajuste, setAjuste] = useState(pisoImagenAjusteInicial ?? 'x1')
  const previewUrl = usePreviewBlob(previewBlob)

  const guardar = async (pisoTipoVal: string | null, pisoColor: string) => {
    if (celdas.length === 0) return
    await aplicarPisoExteriorCeldas(nivel, celdas, pisoTipoVal, pisoColor, { limpiarImagen: true })
  }

  const descripcion = `${celdas.length} ${
    celdas.length === 1
      ? t('planos.celdasPiso', 'loseta de piso')
      : t('planos.celdasPiso', 'losetas de piso')
  } · ${t('planos.nivel', 'Nivel')} ${nivel}`

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          {t('planos.forma', 'Forma')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMAS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void setFormaPisoExteriorCeldas(nivel, celdas, f.id)}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1 py-2 text-white/70 transition hover:bg-white/10"
            >
              <svg width={26} height={26} viewBox="0 0 26 26">
                <LosetaFormaSvg x={0} y={0} w={26} h={26} forma={{ forma: f.id, rotacion: 0 }} fill="#94a3b8" rx={4} />
              </svg>
              <span className="text-[10px] font-medium leading-tight">{f.nombre}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-white/35">
          {t('planos.formaPisoHint', 'Repite la misma forma para rotarla 90°.')}
        </p>
      </div>
      <EditorPisoMaterialForm
        descripcion={descripcion}
      pisoTipo={pisoTipo}
      floorColor={floorColor}
      imagenActiva={imagenActiva}
      previewUrl={previewUrl}
      ajuste={ajuste}
      onMaterial={(tipo, color) => {
        setPisoTipo(tipo)
        setFloorColor(color)
        setImagenActiva(false)
        setPreviewBlob(undefined)
        void guardar(tipo, color)
      }}
      onColor={(c) => {
        setPisoTipo(null)
        setFloorColor(c)
        setImagenActiva(false)
        void guardar(null, c)
      }}
      onQuitarPiso={() => {
        setPisoTipo(PISO_SIN_PISO)
        setImagenActiva(false)
        setPreviewBlob(undefined)
        void guardar(PISO_SIN_PISO, '')
      }}
      onSubirImagen={(file) => {
        setPreviewBlob(file)
        setImagenActiva(true)
        setPisoTipo(null)
        void subirPisoExteriorImagen(nivel, celdas, file, ajuste)
      }}
      onActivarImagen={() => {
        setImagenActiva(true)
        void activarPisoExteriorImagen(nivel, celdas, true)
      }}
      onDesactivarImagen={() => {
        setImagenActiva(false)
        void activarPisoExteriorImagen(nivel, celdas, false)
      }}
      onEliminarImagen={() => {
        setImagenActiva(false)
        setPreviewBlob(undefined)
        void eliminarPisoExteriorImagen(nivel, celdas)
      }}
      onAjusteImagen={(a) => {
        setAjuste(a)
        void ajustarPisoExteriorImagen(nivel, celdas, a)
      }}
      />
    </div>
  )
}
