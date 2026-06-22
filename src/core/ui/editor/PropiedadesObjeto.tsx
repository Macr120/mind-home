import type { ObjetoCuarto } from '../../data/db'
import { useDiseño } from '../../state/disenoStore'
import { ColorPicker } from './ColorPicker'
import { PropiedadGrupo } from './PropiedadGrupo'
import { RotationControl } from './RotationControl'

export function PropiedadesObjeto({ objeto }: { objeto: ObjetoCuarto }) {
  const setObjetoColor = useDiseño((s) => s.setObjetoColor)
  const setObjetoRotacion = useDiseño((s) => s.setObjetoRotacion)

  if (objeto.id == null) return null

  return (
    <div className="space-y-4">
      <PropiedadGrupo titulo="Rotación">
        <RotationControl
          grados={objeto.rotY ?? 0}
          onChange={(g) => setObjetoRotacion(objeto.id!, g)}
        />
      </PropiedadGrupo>
      <PropiedadGrupo titulo="Color">
        <ColorPicker
          value={objeto.color}
          onChange={(c) => setObjetoColor(objeto.id!, c)}
        />
      </PropiedadGrupo>
    </div>
  )
}
