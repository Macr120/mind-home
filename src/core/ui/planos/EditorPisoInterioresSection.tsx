import { useMemo, useState } from 'react'
import { zonasRepo } from '../../data/repository'
import { PISO_SIN_PISO } from '../../house/pisos'
import { conteoPisosInteriores } from '../../house/planoPisoSeleccion'
import { EditorPisoMaterialForm } from '../editor/EditorPisoMaterialForm'
import { usePreviewBlob } from '../editor/usePreviewBlob'
import { useT } from '../../i18n/useT'
import {
  activarPisoImagenInterioresNivel,
  ajustarPisoImagenInterioresNivel,
  aplicarPisoInterioresNivel,
  eliminarPisoImagenInterioresNivel,
  subirPisoImagenInterioresNivel,
  quitarPisoInterioresNivel,
} from './planoPisoGrupo'

/** Personalización masiva de pisos interiores (cuartos del registro + zonas). */
export function EditorPisoInterioresSection({ nivel }: { nivel: number }) {
  const t = useT()
  const zonas = zonasRepo.useAll() ?? []
  const { nCuartos, nZonas, total } = useMemo(
    () => conteoPisosInteriores(nivel, zonas),
    [nivel, zonas],
  )

  const [pisoTipo, setPisoTipo] = useState<string | null>(null)
  const [floorColor, setFloorColor] = useState('#a8a29e')
  const [imagenActiva, setImagenActiva] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | undefined>()
  const [ajuste, setAjuste] = useState('x1')
  const previewUrl = usePreviewBlob(previewBlob)

  const descripcion =
    total === 0
      ? t('planos.grupo.interiorVacio', 'No hay pisos interiores en este nivel')
      : t('planos.grupo.interiorDesc', '{cuartos} cuartos · {zonas} básicos · Nivel {n}', {
          cuartos: nCuartos,
          zonas: nZonas,
          n: nivel,
        })

  if (total === 0) {
    return <p className="text-[11px] text-white/45">{descripcion}</p>
  }

  return (
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
        void aplicarPisoInterioresNivel(nivel, zonas, tipo, color)
      }}
      onColor={(c) => {
        setPisoTipo(null)
        setFloorColor(c)
        setImagenActiva(false)
        void aplicarPisoInterioresNivel(nivel, zonas, null, c)
      }}
      onQuitarPiso={() => {
        setPisoTipo(PISO_SIN_PISO)
        setImagenActiva(false)
        setPreviewBlob(undefined)
        void quitarPisoInterioresNivel(nivel, zonas)
      }}
      onSubirImagen={(file) => {
        setPreviewBlob(file)
        setImagenActiva(true)
        setPisoTipo(null)
        void subirPisoImagenInterioresNivel(nivel, zonas, file, ajuste)
      }}
      onActivarImagen={() => {
        setImagenActiva(true)
        void activarPisoImagenInterioresNivel(nivel, zonas, true)
      }}
      onDesactivarImagen={() => {
        setImagenActiva(false)
        void activarPisoImagenInterioresNivel(nivel, zonas, false)
      }}
      onEliminarImagen={() => {
        setImagenActiva(false)
        setPreviewBlob(undefined)
        void eliminarPisoImagenInterioresNivel(nivel, zonas)
      }}
      onAjusteImagen={(a) => {
        setAjuste(a)
        void ajustarPisoImagenInterioresNivel(nivel, zonas, a)
      }}
    />
  )
}
