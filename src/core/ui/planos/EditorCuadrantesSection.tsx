import { useState } from 'react'
import { useLayout, mapFocusPos } from '../../state/layoutStore'
import { usePlanos } from '../../state/planosStore'
import { useCam } from '../../state/cameraStore'
import {
  bloquesPorFila,
  colorCuadrante,
  cuadrantesAuto,
  hayCuadrantes,
  rectMundo,
} from '../../house/cuadrantesMapa'
import type { CuadranteMapa } from '../../data/db'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

const BOTON =
  'rounded-lg px-2 py-1.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-40'
const NEUTRO = 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
const ACTIVO = 'bg-emerald-400/20 text-emerald-300 ring-1 ring-inset ring-emerald-400/55'

/**
 * Cuadrantes del mapa: en rejillas grandes la casa completa deja los cuartos
 * diminutos, así que el mapa se parte en bloques a los que la cámara salta de un
 * toque. «Mapa completo» siempre devuelve la vista general, y el usuario puede
 * dibujar sus propios cuadrantes arrastrando sobre el croquis.
 */
export function EditorCuadrantesSection() {
  const t = useT()
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const propios = useLayout((s) => s.cuadrantes)
  const renombrarCuadrante = useLayout((s) => s.renombrarCuadrante)
  const eliminarCuadrante = useLayout((s) => s.eliminarCuadrante)
  const activo = usePlanos((s) => s.cuadranteActivo)
  const setActivo = usePlanos((s) => s.setCuadranteActivo)
  const setVista = usePlanos((s) => s.setCuadranteVista)
  const dibujando = usePlanos((s) => s.dibujandoCuadrante)
  const setDibujando = usePlanos((s) => s.setDibujandoCuadrante)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  if (!hayCuadrantes(gridCols, gridRows)) return null

  const autos = cuadrantesAuto(gridCols, gridRows)

  const enfocar = (q: CuadranteMapa) => {
    const { centro, ancho, largo } = rectMundo(q)
    useCam.getState().enfocarZona(centro, ancho, largo)
    setActivo(q.id)
    // El recorte de render sigue al cuadrante enfocado (ver `RoomEnMapa`).
    setVista(q.id)
  }
  const verTodo = () => {
    useCam.getState().centrarIso(mapFocusPos())
    setActivo(null)
    setVista(null)
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('constructor.cuadrantes.titulo', 'Cuadrantes')}
      </p>

      <button
        type="button"
        onClick={verTodo}
        className={`${BOTON} flex w-full items-center justify-center gap-1.5 ${
          activo == null ? ACTIVO : NEUTRO
        }`}
      >
        <Icono nombre="centrar" /> {t('constructor.cuadrantes.todo', 'Mapa completo')}
      </button>

      <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('constructor.cuadrantes.referencias', 'Referencias')}
      </p>
      <p className="text-[10px] leading-snug text-white/45">
        {t('constructor.cuadrantes.referenciasHint', 'Solo mueven la vista; puedes editar donde quieras.')}
      </p>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${bloquesPorFila(gridCols)}, minmax(0, 1fr))` }}
      >
        {autos.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => enfocar(q)}
            title={t('constructor.cuadrantes.enfocar', 'Enfocar este cuadrante')}
            className={`${BOTON} ${activo === q.id ? ACTIVO : NEUTRO}`}
          >
            {q.nombre}
          </button>
        ))}
      </div>

      <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {t('constructor.cuadrantes.tuyas', 'Tus zonas')}
      </p>
      <p className="text-[10px] leading-snug text-white/45">
        {t(
          'constructor.cuadrantes.tuyasHint',
          'Al elegir una, en los demás menús solo se pueden editar sus celdas.',
        )}
      </p>

      {propios.length > 0 && (
        <div className="space-y-1">
          {propios.map((q) => (
            <div key={q.id} className="flex items-center gap-1">
              {editandoId === q.id ? (
                <input
                  autoFocus
                  defaultValue={q.nombre}
                  onBlur={(e) => {
                    void renombrarCuadrante(q.id, e.target.value.trim() || q.nombre)
                    setEditandoId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditandoId(null)
                  }}
                  className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => enfocar(q)}
                  onDoubleClick={() => setEditandoId(q.id)}
                  title={t('constructor.cuadrantes.enfocarRenombrar', 'Enfocar (doble clic para renombrar)')}
                  className={`${BOTON} flex min-w-0 flex-1 items-center gap-2 text-start ${
                    activo === q.id ? ACTIVO : NEUTRO
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorCuadrante(q, propios) }}
                  />
                  <span className="truncate">{q.nombre}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditandoId(q.id)}
                title={t('constructor.cuadrantes.renombrar', 'Cambiar el nombre')}
                className={`${BOTON} shrink-0 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90`}
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activo === q.id) setActivo(null)
                  void eliminarCuadrante(q.id)
                }}
                title={t('constructor.cuadrantes.eliminar', 'Eliminar cuadrante')}
                className={`${BOTON} shrink-0 bg-white/5 text-red-400 hover:bg-red-400/15`}
              >
                <Icono nombre="basura" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDibujando(!dibujando)}
        className={`${BOTON} flex w-full items-center justify-center gap-1.5 ${
          dibujando ? ACTIVO : NEUTRO
        }`}
      >
        <Icono nombre="expandir" />
        {dibujando
          ? t('constructor.cuadrantes.cancelar', 'Cancelar dibujo')
          : t('constructor.cuadrantes.dibujar', 'Dibujar cuadrante')}
      </button>
      {dibujando && (
        <p className="text-[10px] leading-snug text-white/45">
          {t(
            'constructor.cuadrantes.ayuda',
            'Arrastra sobre el croquis o sobre el mapa 3D el área que quieres poder enfocar.',
          )}
        </p>
      )}
    </div>
  )
}
