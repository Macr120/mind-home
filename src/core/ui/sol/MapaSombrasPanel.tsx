import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCiclo } from '../../state/cicloStore'
import { direccionSol, type ConfigSol } from '../../house/cielo'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

const RAD = Math.PI / 180
const dd = (n: number) => String(n).padStart(2, '0')
const hora = (m: number) => `${dd(Math.floor(m / 60) % 24)}:${dd(Math.floor(m % 60))}`

/** Temporadas de ejemplo: un punto de partida que luego se retoca a mano. */
const TEMPORADAS: { id: string; clave: string; defecto: string; valores: Pick<ConfigSol, 'alturaMax' | 'salida' | 'puesta'> }[] = [
  { id: 'verano', clave: 'sol.verano', defecto: 'Verano', valores: { alturaMax: 80, salida: 6 * 60, puesta: 20 * 60 } },
  { id: 'primavera', clave: 'sol.primavera', defecto: 'Primavera', valores: { alturaMax: 60, salida: 6 * 60 + 30, puesta: 18 * 60 + 30 } },
  { id: 'invierno', clave: 'sol.invierno', defecto: 'Invierno', valores: { alturaMax: 35, salida: 7 * 60 + 30, puesta: 17 * 60 + 30 } },
]

/** Un deslizador con su etiqueta y el valor a la derecha. */
function Ajuste({ etiqueta, valor, className, ...input }: { etiqueta: string; valor: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {etiqueta}
        <span className="tabular-nums text-white/70">{valor}</span>
      </span>
      <input type="range" {...input} className={`mt-0.5 w-full cursor-pointer ${className ?? ''}`} />
    </label>
  )
}

/**
 * Mapa de sombras de la casa: el recorrido del sol se dibuja en 3D sobre la propia
 * escena (`ArcoSol3D`, como shadowmap.org) y esta tarjeta flota a un lado sin
 * taparla. Allá se arrastra el sol (la hora) y el tirador del mediodía (por dónde
 * pasa y qué tan alto); aquí, lo mismo con deslizadores más la salida y la puesta.
 * Con el interruptor encendido la luz de la casa sigue ese recorrido. Va por
 * portal al body (el HUD lleva `backdrop-filter`, que encajonaría un `fixed`).
 */
export function MapaSombrasPanel() {
  const t = useT()
  const sol = useCiclo((s) => s.sol)
  const setSol = useCiclo((s) => s.setSol)
  const minutos = useCiclo((s) => s.minutos)
  const setMinutos = useCiclo((s) => s.setMinutos)
  const setMapaSombras = useCiclo((s) => s.setMapaSombras)
  const ahora = direccionSol(sol, minutos)

  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useCiclo.getState().setMapaSombras(false)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [])

  // Ajustar el recorrido lo enciende: si no, el cambio no se vería en la casa.
  const ajustar = (c: Partial<ConfigSol>) => setSol({ ...c, activo: true })

  return createPortal(
    <div
      data-tut="sol.panel"
      className="ui-panel-glass ui-pop fixed end-3 top-[calc(4.5rem+var(--safe-top))] z-40 flex max-h-[calc(100dvh-6rem-var(--safe-top))] w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-black text-white/90">
          <Icono nombre="brujula" /> {t('sol.titulo', 'Mapa de sombras')}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={sol.activo}
          onClick={() => setSol({ activo: !sol.activo })}
          title={t('sol.activarCasa', 'Usar este recorrido del sol en la casa')}
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition ${
            sol.activo ? 'border-transparent bg-emerald-500 text-white' : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          {sol.activo ? t('sol.encendido', 'Encendido') : t('sol.off', 'Apagado')}
        </button>
        <button
          type="button"
          onClick={() => setMapaSombras(false)}
          title={t('rutinas.cerrar', 'Cerrar')}
          aria-label={t('rutinas.cerrar', 'Cerrar')}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
      </header>
      <p className="text-[10px] leading-snug text-white/45">
        {t('sol.ayuda3d', 'Arrastra el sol por su arco para cambiar la hora, el círculo del mediodía para decidir qué tan alto va, y el círculo del piso para girar por dónde pasa.')}
      </p>

      {/* Cifras */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { etiqueta: t('sol.salida', 'Salida'), valor: hora(sol.salida), color: '#fb923c' },
          { etiqueta: t('sol.puesta', 'Puesta'), valor: hora(sol.puesta), color: '#c084fc' },
          { etiqueta: t('sol.hora', 'Hora'), valor: hora(minutos), color: '#facc15' },
          { etiqueta: t('sol.altura', 'Altura'), valor: `${Math.round(Math.max(0, ahora.altitud) / RAD)}°`, color: '#facc15' },
        ].map((c) => (
          <div key={c.etiqueta} className="rounded-lg border border-white/10 bg-white/5 px-0.5 py-1">
            <p className="truncate text-[8px] font-bold uppercase tracking-wide text-white/40">{c.etiqueta}</p>
            <p className="text-xs font-black tabular-nums" style={{ color: c.color }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Temporadas de ejemplo */}
      <div className="flex gap-1">
        {TEMPORADAS.map((tp) => (
          <button
            key={tp.id}
            type="button"
            onClick={() => ajustar(tp.valores)}
            className="flex-1 rounded-md border border-white/10 bg-white/5 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            {t(tp.clave, tp.defecto)}
          </button>
        ))}
      </div>

      <Ajuste
        etiqueta={t('sol.hora', 'Hora')}
        valor={hora(minutos)}
        min={0}
        max={1439}
        step={5}
        value={Math.floor(minutos)}
        onChange={(e) => setMinutos(Number(e.target.value))}
        className="accent-amber-400"
      />
      <Ajuste
        etiqueta={t('sol.lado', 'Por dónde pasa')}
        valor={`${Math.round(sol.rumbo)}°`}
        min={0}
        max={359}
        value={sol.rumbo}
        onChange={(e) => ajustar({ rumbo: Number(e.target.value) })}
        className="accent-sky-400"
      />
      <Ajuste
        etiqueta={t('sol.alturaMax', 'Altura al mediodía')}
        valor={`${Math.round(sol.alturaMax)}°`}
        min={5}
        max={90}
        value={sol.alturaMax}
        onChange={(e) => ajustar({ alturaMax: Number(e.target.value) })}
        className="accent-amber-400"
      />
      <div className="grid grid-cols-2 gap-2">
        <Ajuste
          etiqueta={t('sol.salida', 'Salida')}
          valor={hora(sol.salida)}
          min={3 * 60}
          max={11 * 60}
          step={5}
          value={sol.salida}
          onChange={(e) => ajustar({ salida: Number(e.target.value) })}
          className="accent-orange-400"
        />
        <Ajuste
          etiqueta={t('sol.puesta', 'Puesta')}
          valor={hora(sol.puesta)}
          min={13 * 60}
          max={22 * 60}
          step={5}
          value={sol.puesta}
          onChange={(e) => ajustar({ puesta: Number(e.target.value) })}
          className="accent-purple-400"
        />
      </div>
    </div>,
    document.body,
  )
}
