import { useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { atuendosGuardadosRepo } from '../../data/repository'
import { ATUENDOS_PRESET } from '../../house/atuendos'
import type { Ropa } from '../../house/apariencia'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

const inputCls =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'

/**
 * Botón cuadrado de la grilla de atuendos: emoji + nombre debajo. Los atuendos
 * sugeridos aplican de un toque; `crear` da el estilo de acción (borde punteado,
 * acento) que ya usa el botón «Crear» de personajes, para distinguirlo de un
 * atuendo normal.
 */
function AtuendoBtn({
  emoji,
  label,
  crear = false,
  disabled = false,
  onClick,
}: {
  emoji: string
  label: string
  crear?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-center transition disabled:opacity-30 ${
        crear
          ? 'border-dashed border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="text-lg leading-none">
        <Icono emoji={emoji} />
      </span>
      <span className={`w-full truncate text-[9px] font-medium ${crear ? '' : 'text-white/60'}`}>{label}</span>
    </button>
  )
}

function parseRopaGuardada(raw: string): Ropa {
  try {
    return JSON.parse(raw) as Ropa
  } catch {
    return {}
  }
}

/**
 * Categoría «Atuendos» del personaje principal: aplica de un toque combinaciones
 * de prendas ya listas (sugeridas por los cuartos de la casa: chef, deportista…)
 * o guarda lo que trae puesto ahora mismo como un atuendo propio para reusarlo.
 * Reemplaza TODA la ropa puesta (`setAvatarRopaCompleta`), no la combina.
 */
export function AtuendosEditor() {
  const t = useT()
  const guardados = atuendosGuardadosRepo.useAll()
  const ropa = useDiseño((s) => s.avatar.ropa)
  const aplicar = useDiseño((s) => s.setAvatarRopaCompleta)
  const desnudar = useDiseño((s) => s.desnudarAvatar)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')

  const hayPuesto = Object.keys(ropa).length > 0

  const cancelarCreacion = () => {
    setCreando(false)
    setNombre('')
  }

  const guardarActual = async () => {
    if (!nombre.trim() || !hayPuesto) return
    await atuendosGuardadosRepo.add({ nombre: nombre.trim(), ropa: JSON.stringify(ropa), creadoEn: Date.now() })
    cancelarCreacion()
  }

  return (
    <div className="space-y-3">
      {/* Sugeridos, inspirados en los cuartos de la casa, + crear/quitar */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('editor.pers.atuendosSugeridos', 'Sugeridos')}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {ATUENDOS_PRESET.map((a) => (
            <AtuendoBtn
              key={a.id}
              emoji={a.emoji}
              label={t(`editor.pers.atuendo.${a.id}`, a.nombre)}
              onClick={() => void aplicar(a.ropa)}
            />
          ))}
          <AtuendoBtn
            emoji="➕"
            label={t('editor.pers.atuendoCrear', 'Crear atuendo')}
            crear
            onClick={() => {
              // Empieza en blanco: así lo que se guarde no arrastra prendas
              // que ya traía puestas de antes.
              void desnudar()
              setCreando(true)
            }}
          />
          <AtuendoBtn
            emoji="♻️"
            label={t('editor.pers.atuendoDesnudar', 'Quitar toda la ropa')}
            disabled={!hayPuesto}
            onClick={() => void desnudar()}
          />
        </div>
      </div>

      {/* Nombrar y guardar el atuendo actual (solo tras tocar «Crear atuendo») */}
      {creando && (
        <div className="flex gap-1.5">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void guardarActual()
              if (e.key === 'Escape') cancelarCreacion()
            }}
            placeholder={t('editor.pers.atuendoNombrePh', 'Nombre del atuendo')}
            autoFocus
            autoComplete="off"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={() => void guardarActual()}
            disabled={!nombre.trim()}
            className="rounded-md border border-accent/30 bg-accent/10 px-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-30"
            title={t('editor.pers.atuendoGuardar', 'Guardar el atuendo actual')}
          >
            <Icono nombre="guardar" />
          </button>
          <button
            type="button"
            onClick={cancelarCreacion}
            title={t('editor.pers.cancelar', 'Cancelar')}
            className="rounded-md border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Guardados por el usuario */}
      {(guardados ?? []).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('editor.pers.atuendosTuyos', 'Tus atuendos')}
          </p>
          <div className="space-y-1.5">
            {guardados!.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => void aplicar(parseRopaGuardada(a.ropa))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-base leading-none">
                    <Icono nombre="ropa" />
                  </span>
                  <span className="truncate text-xs font-semibold text-white/80">{a.nombre}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void atuendosGuardadosRepo.remove(a.id!)}
                  title={t('editor.pers.borrar', 'Eliminar')}
                  className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-red-500/25"
                >
                  <Icono nombre="basura" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
