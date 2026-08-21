import type { ReactNode } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useTemaActivo } from '../../house/useTema'
import type { TemaId } from '../../house/temas'
import { useT } from '../../i18n/useT'
import { EditorEstiloSection } from './EditorEstiloSection'

/** Fila etiqueta + selector de color compacto. */
function FilaColor({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-white/70">
      <span className="min-w-0 truncate">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
    </label>
  )
}

/** Fila etiqueta + slider + valor. */
function FilaSlider({
  label,
  value,
  min,
  max,
  step = 0.05,
  fmt = (v) => v.toFixed(2),
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  fmt?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="tabular-nums text-white/50">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{titulo}</p>
      {children}
    </div>
  )
}

/**
 * Desglose editable del tema activo: colores del cascarón, fondo/tinte, materiales
 * y luz/niebla. Cada cambio se guarda como personalización del tema (setTemaOverride)
 * y se ve al instante en la escena. "Restaurar" borra la personalización.
 */
export function EditorTemaDetalle() {
  const t = useT()
  const temaGlobal = useDiseño((s) => s.temaGlobal) as TemaId | null
  const tema = useTemaActivo()
  const override = useDiseño((s) => (temaGlobal ? s.temasOverrides[temaGlobal] : undefined))
  const setTemaOverride = useDiseño((s) => s.setTemaOverride)
  const resetTema = useDiseño((s) => s.resetTema)

  if (!temaGlobal || !tema) return null

  const set = (patch: Parameters<typeof setTemaOverride>[1]) => setTemaOverride(temaGlobal, patch)
  const shell = tema.shell
  const luz = tema.luz
  const niebla = tema.niebla

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/80">
          {t('editor.tema.ajustesDe', 'Ajustes de')} {t(`tema.${tema.id}`, tema.nombre)}
        </p>
        <button
          type="button"
          onClick={() => resetTema(temaGlobal)}
          disabled={!override}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-35"
        >
          {t('editor.tema.restaurar', 'Restaurar')}
        </button>
      </div>

      <EditorEstiloSection embed sinDestino />

      <Grupo titulo={t('editor.tema.cascaron', 'Colores del cascarón')}>
        <FilaColor label={t('editor.tema.muroInt', 'Muro interior')} value={shell.muroInt} onChange={(c) => set({ shell: { muroInt: c } })} />
        <FilaColor label={t('editor.tema.muroExt', 'Fachada')} value={shell.muroExt} onChange={(c) => set({ shell: { muroExt: c } })} />
        <FilaColor label={t('editor.tema.piso', 'Piso')} value={shell.piso} onChange={(c) => set({ shell: { piso: c } })} />
        <FilaColor label={t('editor.tema.techo', 'Techo')} value={shell.techo} onChange={(c) => set({ shell: { techo: c } })} />
      </Grupo>

      <Grupo titulo={t('editor.tema.fondoTinte', 'Fondo y tinte')}>
        <FilaColor label={t('editor.tema.fondo', 'Fondo del cielo')} value={tema.fondo} onChange={(c) => set({ fondo: c })} />
        <FilaColor label={t('editor.tema.tinte', 'Tinte de objetos')} value={tema.tinte} onChange={(c) => set({ tinte: c })} />
        <FilaSlider label={t('editor.tema.fuerza', 'Fuerza del tinte')} value={tema.fuerza} min={0} max={1} onChange={(v) => set({ fuerza: v })} />
      </Grupo>

      <Grupo titulo={t('editor.tema.materiales', 'Materiales')}>
        <FilaSlider label={t('editor.tema.roughness', 'Rugosidad')} value={tema.roughness} min={0} max={1} onChange={(v) => set({ roughness: v })} />
        <FilaSlider label={t('editor.tema.metalness', 'Metalidad')} value={tema.metalness} min={0} max={1} onChange={(v) => set({ metalness: v })} />
        <FilaColor label={t('editor.tema.emissive', 'Brillo (color)')} value={tema.emissive} onChange={(c) => set({ emissive: c })} />
        <FilaSlider label={t('editor.tema.emissiveInt', 'Brillo (fuerza)')} value={tema.emissiveIntensity} min={0} max={1} onChange={(v) => set({ emissiveIntensity: v })} />
      </Grupo>

      <Grupo titulo={t('editor.tema.luzNiebla', 'Luz y niebla')}>
        <FilaColor label={t('editor.tema.sol', 'Sol (tinte)')} value={luz?.sol ?? '#ffffff'} onChange={(c) => set({ luz: { sol: c } })} />
        <FilaSlider label={t('editor.tema.intSol', 'Intensidad del sol')} value={luz?.intensidadSol ?? 1} min={0} max={2} onChange={(v) => set({ luz: { intensidadSol: v } })} />
        <FilaColor label={t('editor.tema.ambiente', 'Luz ambiental')} value={luz?.ambiente ?? '#ffffff'} onChange={(c) => set({ luz: { ambiente: c } })} />
        <FilaColor label={t('editor.tema.focos', 'Focos nocturnos')} value={luz?.focos ?? '#ffd9a0'} onChange={(c) => set({ luz: { focos: c } })} />
        <FilaSlider label={t('editor.tema.exposicion', 'Exposición')} value={luz?.exposicion ?? 1} min={0.5} max={1.5} onChange={(v) => set({ luz: { exposicion: v } })} />
        <FilaSlider label={t('editor.tema.ibl', 'Reflejos')} value={luz?.ibl ?? 0.25} min={0} max={1} onChange={(v) => set({ luz: { ibl: v } })} />
        <FilaColor label={t('editor.tema.niebla', 'Niebla (color)')} value={niebla?.color ?? '#8a97a8'} onChange={(c) => set({ niebla: { color: c, near: niebla?.near ?? 35, far: niebla?.far ?? 100 } })} />
        <FilaSlider label={t('editor.tema.nieblaCerca', 'Niebla cerca')} value={niebla?.near ?? 35} min={5} max={80} step={1} fmt={(v) => String(Math.round(v))} onChange={(v) => set({ niebla: { color: niebla?.color ?? '#8a97a8', near: v, far: niebla?.far ?? 100 } })} />
        <FilaSlider label={t('editor.tema.nieblaLejos', 'Niebla lejos')} value={niebla?.far ?? 100} min={40} max={160} step={1} fmt={(v) => String(Math.round(v))} onChange={(v) => set({ niebla: { color: niebla?.color ?? '#8a97a8', near: niebla?.near ?? 35, far: v } })} />
      </Grupo>
    </div>
  )
}
