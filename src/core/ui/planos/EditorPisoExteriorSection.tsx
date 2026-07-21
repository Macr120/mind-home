import { useState } from 'react'
import {
  activarPisoExteriorImagen,
  ajustarPisoExteriorImagen,
  aplicarPisoExteriorCeldas,
  eliminarPisoExteriorImagen,
  subirPisoExteriorImagen,
} from '../../data/repository'
import { getPisoTipo, PISO_SIN_PISO, esSinPiso, type PisoTipoId } from '../../house/pisos'
import type { Cell } from '../../house/walls'
import { EditorPisoMaterialForm } from '../editor/EditorPisoMaterialForm'
import { usePreviewBlob } from '../editor/usePreviewBlob'
import { useT } from '../../i18n/useT'

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
