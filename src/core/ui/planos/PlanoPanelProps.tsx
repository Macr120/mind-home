import { useState } from 'react'
import { useCuartos, getCuarto } from '../../state/cuartosStore'
import { useLayout } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { usePlanos } from '../../state/planosStore'
import { zonasRepo, pisosExteriorRepo } from '../../data/repository'
import { WallEditor } from '../WallEditor'
import { ZonaWallEditor } from './ZonaWallEditor'
import { EditorPisoCuartoSection } from '../editor/EditorPisoCuartoSection'
import { EditorTechoCuartoSection } from '../editor/EditorTechoCuartoSection'
import { EditorZonaPisoSection } from './EditorZonaPisoSection'
import { EditorPisoExteriorSection } from './EditorPisoExteriorSection'
import { EditorPisoInterioresSection } from './EditorPisoInterioresSection'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { footprintCells, cellId } from '../../house/walls'
import type { PisoTipoId } from '../../house/pisos'

/** Panel derecho contextual del editor de planos. */
export function PlanoPanelProps() {
  const t = useT()
  const seleccion = usePlanos((s) => s.seleccion)
  const capa = usePlanos((s) => s.capa)
  const nivelPlano = usePlanos((s) => s.nivel)
  const herramienta = usePlanos((s) => s.herramienta)
  const aviso = usePlanos((s) => s.aviso)
  const pendienteNombre = usePlanos((s) => s.pendienteNombre)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const setAviso = usePlanos((s) => s.setAviso)
  const setPendienteNombre = usePlanos((s) => s.setPendienteNombre)

  const eliminarCuarto = useCuartos((s) => s.eliminar)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const moveRoom = useLayout((s) => s.moveRoom)
  const removeRoomCell = useLayout((s) => s.removeRoomCell)
  const adoptarFormaCuarto = useLayout((s) => s.adoptarFormaCuarto)

  const roomNames = useDiseño((s) => s.roomNames)
  const setRoomName = useDiseño((s) => s.setRoomName)
  const setRoomPisoTipo = useDiseño((s) => s.setRoomPisoTipo)
  const setRoomPisoColor = useDiseño((s) => s.setRoomPisoColor)
  const subirRoomPisoImagen = useDiseño((s) => s.subirRoomPisoImagen)

  const zonas = zonasRepo.useAll() ?? []
  const pisosExterior = pisosExteriorRepo.useAll() ?? []

  const [nombreNuevo, setNombreNuevo] = useState('')
  const [nombreZonaEdit, setNombreZonaEdit] = useState('')
  const [nombreEdit, setNombreEdit] = useState('')

  const cuartos = useCuartos((s) => s.cuartos)
  const sinColocar = cuartos.filter((r) => !placed[r.id])

  const guardarNombreCuarto = async () => {
    const nombre = nombreNuevo.trim()
    if (!nombre || pendienteNombre == null) return
    await zonasRepo.update(pendienteNombre, { nombre })
    setPendienteNombre(null)
    setAviso(null)
    setSeleccion({ tipo: 'zona', zonaId: pendienteNombre })
  }

  const colocarApp = async (roomId: string, col: number, row: number) => {
    const zona = zonas.find(
      (z) =>
        z.nivel === nivelPlano &&
        z.celdas.some((c) => Math.round(c.col) === Math.round(col) && Math.round(c.row) === Math.round(row)),
    )
    if (zona?.id != null) {
      // El cuarto adopta la geometría de la zona (forma + paredes + losetas) y su piso; la
      // zona se elimina. El footprint del cuarto es la única fuente de verdad de la forma.
      const { zonaAnchorFootprint } = await import('../../house/planoGeometria')
      const { formasAbsAOff } = await import('../../house/formasLoseta')
      const { anchor, footprint } = zonaAnchorFootprint(zona.celdas)
      const muros = zona.muros ?? {}
      if (!placed[roomId]) await toggleRoom(roomId)
      await adoptarFormaCuarto(roomId, anchor, footprint, muros, formasAbsAOff(zona.formasCelda, anchor))
      if (zona.pisoImagen) await subirRoomPisoImagen(roomId, zona.pisoImagen)
      else if (zona.pisoTipo) await setRoomPisoTipo(roomId, zona.pisoTipo as PisoTipoId)
      else if (zona.pisoColor) await setRoomPisoColor(roomId, zona.pisoColor)
      await zonasRepo.remove(zona.id)
    } else {
      if (!placed[roomId]) await toggleRoom(roomId)
      await moveRoom(roomId, { col, row })
    }
    setSeleccion({ tipo: 'cuarto', roomId })
  }

  if (pendienteNombre != null) {
    const zona = zonas.find((z) => z.id === pendienteNombre)
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-emerald-400">
          {t('planos.nombrarTitulo', 'Nombra tu cuarto')}
        </p>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'planos.nombrarHint',
            'El cuarto ya tiene paredes, piso y techo genéricos. Elige un nombre para identificarlo.',
          )}
        </p>
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder={zona?.nombre ?? t('planos.nombreZona', 'Nombre del cuarto')}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nombreNuevo.trim()) void guardarNombreCuarto()
          }}
        />
        <button
          type="button"
          onClick={() => void guardarNombreCuarto()}
          disabled={!nombreNuevo.trim()}
          className="w-full rounded-lg bg-emerald-500/25 py-2.5 text-xs font-bold text-emerald-400 disabled:opacity-40"
        >
          {t('planos.confirmarNombre', 'Confirmar nombre')}
        </button>
      </div>
    )
  }

  if (capa === 'paredes' && seleccion?.tipo === 'arista') {
    return (
      <div className="space-y-3">
        <WallEditor roomId={seleccion.roomId} sinCroquis />
        <p className="text-[11px] text-white/45">
          {t('planos.props.paredes', 'Edita la arista seleccionada en el croquis.')}
        </p>
      </div>
    )
  }

  if (capa === 'paredes' && seleccion?.tipo === 'arista-zona') {
    return (
      <div className="space-y-3">
        <ZonaWallEditor
          zonaId={seleccion.zonaId}
          off={seleccion.off}
          side={seleccion.side}
        />
        <p className="text-[11px] text-white/45">
          {t('planos.props.paredesZona', 'Edita la arista del cuarto básico.')}
        </p>
      </div>
    )
  }

  if (capa === 'pisos' && seleccion?.tipo === 'pisos-interiores') {
    return (
      <div className="space-y-3">
        <EditorPisoInterioresSection nivel={nivelPlano} />
      </div>
    )
  }

  if (capa === 'pisos' && seleccion?.tipo === 'cuarto') {
    const room = getCuarto(seleccion.roomId)
    if (!room) return null
    return (
      <div className="space-y-3">
        <EditorPisoCuartoSection room={room} />
      </div>
    )
  }

  if (capa === 'pisos' && seleccion?.tipo === 'zona') {
    const zona = zonas.find((z) => z.id === seleccion.zonaId)
    if (!zona) return null
    return (
      <div className="space-y-3">
        <EditorZonaPisoSection zona={zona} />
      </div>
    )
  }

  if (capa === 'pisos' && seleccion?.tipo === 'exterior' && seleccion.celdas.length > 0) {
    const primera = seleccion.celdas[0]
    const reg = pisosExterior.find(
      (p) => p.nivel === nivelPlano && p.col === primera.col && p.row === primera.row,
    )
    return (
      <div className="space-y-3">
        <EditorPisoExteriorSection
          celdas={seleccion.celdas}
          nivel={nivelPlano}
          pisoTipoInicial={reg?.pisoTipo ?? null}
          pisoColorInicial={reg?.pisoColor}
          pisoImagenInicial={reg?.pisoImagen}
          pisoImagenActivaInicial={reg?.pisoImagenActiva}
          pisoImagenAjusteInicial={reg?.pisoImagenAjuste}
        />
      </div>
    )
  }

  if (capa === 'techos' && seleccion?.tipo === 'cuarto') {
    const room = getCuarto(seleccion.roomId)
    if (!room) return null
    return (
      <div className="space-y-3">
        <EditorTechoCuartoSection room={room} />
      </div>
    )
  }

  if (seleccion?.tipo === 'zona') {
    const zona = zonas.find((z) => z.id === seleccion.zonaId)
    if (!zona) return null
    const nombre = nombreZonaEdit || zona.nombre
    return (
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('planos.nombre', 'Nombre')}
          </span>
          <div className="flex gap-1">
            <input
              value={nombre}
              onChange={(e) => setNombreZonaEdit(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (zona.id == null) return
                const n = nombre.trim()
                if (!n) return
                void zonasRepo.update(zona.id, { nombre: n })
                setNombreZonaEdit('')
              }}
              className="rounded-lg bg-emerald-500/20 px-2 text-xs font-bold text-emerald-400"
            >
              ✓
            </button>
          </div>
        </label>

        <p className="text-[11px] text-white/40">
          {zona.celdas.length} {t('planos.celdas', 'celdas')} · {t('planos.nivel', 'Nivel')} {zona.nivel}
        </p>
        {herramienta === 'mover' && (
          <p className="text-[11px] leading-snug text-white/45">
            {t('planos.moverZonaHint', 'Arrastra el cuarto en el plano para moverlo.')}
          </p>
        )}
        <button
          type="button"
          onClick={() => zona.id != null && void zonasRepo.remove(zona.id)}
          className="w-full rounded-lg border border-red-400/30 bg-red-400/10 py-2 text-xs font-semibold text-red-400"
        >
          {t('planos.eliminarZona', 'Eliminar cuarto básico')}
        </button>
      </div>
    )
  }

  if (seleccion?.tipo === 'cuarto') {
    const room = getCuarto(seleccion.roomId)
    if (!room) return null
    const anchor = cells[room.id]
    const fp = footprints[room.id]
    const nombre = roomNames[room.id] || room.nombre.split(' · ')[0]

    return (
      <div className="space-y-4">
        <p className="text-sm font-black" style={{ color: room.color }}>
          <Icono emoji={room.icon} /> {nombre}
        </p>

        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('planos.nombre', 'Nombre')}
          </span>
          <div className="flex gap-1">
            <input
              value={nombreEdit || nombre}
              onChange={(e) => setNombreEdit(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => void setRoomName(room.id, nombreEdit || nombre)}
              className="rounded-lg bg-emerald-500/20 px-2 text-xs font-bold text-emerald-400"
            >
              ✓
            </button>
          </div>
        </label>

        {capa === 'cuartos' && anchor && fp && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {t('planos.forma', 'Forma')}
            </p>
            <p className="mb-2 text-[11px] text-white/40">
              {t('planos.formaHint', 'Usa − en celdas del borde para quitar parte del footprint:')}
            </p>
            <div className="flex flex-wrap gap-1">
              {footprintCells(anchor, fp).map((c) => (
                <button
                  key={cellId(c.col, c.row)}
                  type="button"
                  onClick={() => void removeRoomCell(room.id, c)}
                  className="rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400"
                  title={t('planos.quitarCelda', 'Quitar celda')}
                >
                  − ({c.col},{c.row})
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            void eliminarCuarto(room.id)
            setSeleccion(null)
          }}
          className="w-full rounded-lg border border-red-400/30 bg-red-400/10 py-2 text-xs font-semibold text-red-400"
        >
          {t('planos.eliminarCuarto', 'Eliminar cuarto')}
        </button>
      </div>
    )
  }

  if (seleccion?.tipo === 'celda' && capa === 'cuartos') {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-white/45">
          {t('planos.celdaVacia', 'Celda')} ({seleccion.col}, {seleccion.row})
        </p>
        {sinColocar.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {t('planos.colocarApp', 'Colocar app')}
            </p>
            <div className="flex flex-col gap-1">
              {sinColocar.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void colocarApp(r.id, seleccion.col, seleccion.row)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                >
                  <Icono emoji={r.icon} /> {r.nombre.split(' · ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {aviso && (
        <p className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-snug text-amber-400">
          {aviso}
        </p>
      )}
      <p className="text-[11px] leading-snug text-white/45">
        {capa === 'pisos'
          ? t(
              'planos.pisosHint',
              'Selecciona cuartos o marca varias celdas exteriores (clic repetido). Elige textura y color en el panel.',
            )
          : capa === 'paredes'
            ? t(
                'planos.paredesHint',
                'Toca una pared en el croquis o en el mapa 3D para ponerle muro, puerta o ventana.',
              )
            : t(
                'planos.ayuda',
                'Elige una forma abajo a la izquierda y toca el plano o el mapa 3D para dibujar cuartos.',
              )}
      </p>
      {sinColocar.length > 0 && capa === 'cuartos' && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            {t('planos.appsFuera', 'Apps fuera del mapa')}
          </p>
          <div className="flex flex-col gap-1">
            {sinColocar.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  void toggleRoom(r.id)
                  setSeleccion({ tipo: 'cuarto', roomId: r.id })
                }}
                className="rounded-lg border border-dashed border-white/15 px-2 py-1.5 text-left text-xs text-white/60 hover:border-emerald-400/40 hover:text-white"
              >
                + <Icono emoji={r.icon} /> {r.nombre.split(' · ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
