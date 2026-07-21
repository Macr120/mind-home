import { useHuerto, type HerramientaHuerto } from '../state/huertoStore'
import { ESPECIES } from '../house/cultivos'
import { cestaRepo } from '../data/repository'
import type { EspecieCultivo } from '../data/db'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

const btn =
  'flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-white transition active:scale-95'

/** Duración legible de una especie ("30 min", "2 h", "1 d"). */
function duracion(min: number): string {
  if (min < 60) return `${min} min`
  if (min < 1440) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} d`
}

/**
 * Overlay del editor del Huerto: herramientas de parcela/siembra/riego/cosecha
 * (HuertoController aplica el clic por celda). Con "sembrar" activa se elige la
 * especie; cada una crece en tiempo real y pide riego periódico.
 */
export function EditorHuerto() {
  const t = useT()
  const activo = useHuerto((s) => s.activo)
  const herramienta = useHuerto((s) => s.herramienta)
  const especie = useHuerto((s) => s.especie)
  const cesta = (cestaRepo.useAll() ?? []).filter((c) => c.cantidad > 0)
  if (!activo) return null
  const h = useHuerto.getState()

  const herrBtn = (hr: HerramientaHuerto, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`huerto.herr.${hr}`}
      onClick={() => h.setHerramienta(hr)}
      title={etiqueta}
      aria-label={etiqueta}
      className={`${btn} ${herramienta === hr ? 'border-emerald-400/60 bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
    >
      <Icono nombre={icono} /> {etiqueta}
    </button>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Encabezado. */}
      <div className="absolute left-0 right-0 top-3 flex items-start justify-center">
        <div
          data-tut="huerto.header"
          className="ui-hud ui-pop pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Icono nombre="sembrar" /> {t('room.huerto.nombre', 'Huerto')}
          <button
            type="button"
            data-tut="huerto.salir"
            onClick={() => h.salir()}
            title={t('infra.salirEditor', 'Salir del editor')}
            aria-label={t('infra.salirEditor', 'Salir del editor')}
            className="ml-2 rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barra de herramientas y especies. */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-2">
        <div
          data-tut="huerto.barra"
          data-tut-zona="app:huerto"
          className="ui-hud ui-pop pointer-events-auto flex max-w-full flex-col gap-2 rounded-xl border border-white/10 p-2"
        >
          {herramienta === 'sembrar' && (
            <div data-tut="huerto.especies" className="flex max-w-xl flex-wrap items-center justify-center gap-1.5">
              {(Object.keys(ESPECIES) as EspecieCultivo[]).map((e) => {
                const def = ESPECIES[e]
                return (
                  <button
                    key={e}
                    type="button"
                    data-tut={`huerto.especie.${e}`}
                    onClick={() => h.setEspecie(e)}
                    title={`${t(`huerto.especie.${e}`, def.nombre)} · ${duracion(def.duracionMin)}`}
                    aria-label={t(`huerto.especie.${e}`, def.nombre)}
                    className={`flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-semibold text-white transition active:scale-95 ${
                      especie === e
                        ? 'border-emerald-400/60 bg-emerald-600'
                        : 'border-white/10 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-base leading-none">
                      <Icono emoji={def.icon} />
                    </span>
                    {t(`huerto.especie.${e}`, def.nombre)}
                    <span className="font-normal text-white/60">
                      {duracion(def.duracionMin)} · <Icono nombre="regadera" /> {duracion(def.riegoCadaMin)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <div data-tut="huerto.herramientas" className="flex flex-wrap items-center justify-center gap-1.5">
            {herrBtn('parcela', 'parcela', t('huerto.herr.parcela', 'Parcela'))}
            {herrBtn('sembrar', 'sembrar', t('huerto.herr.sembrar', 'Sembrar'))}
            {herrBtn('regar', 'regadera', t('huerto.herr.regar', 'Regar'))}
            {herrBtn('cosechar', 'cosechar', t('huerto.herr.cosechar', 'Cosechar'))}
            {herrBtn('aspersor', 'aspersor', t('huerto.herr.aspersor', 'Aspersor'))}
            {herrBtn('quitar', 'basura', t('huerto.herr.quitar', 'Quitar'))}
          </div>
          {cesta.length > 0 && (
            <div
              data-tut="huerto.cesta"
              className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-white/60"
            >
              <Icono nombre="cosechar" /> {t('huerto.cesta', 'Cesta')}:
              {cesta.map((c) => (
                <span key={c.especie} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-semibold">
                  <Icono emoji={ESPECIES[c.especie].icon} /> {c.cantidad}
                </span>
              ))}
            </div>
          )}
          <p className="max-w-md text-center text-[10px] leading-tight text-white/50">
            {t('huerto.ayuda', 'Los cultivos crecen en tiempo real y piden riego: la gota azul avisa; si no riegas, se marchitan. Un aspersor riega solo su celda y las 8 vecinas. Las cosechas van a la cesta (también al caminar sobre lo listo): alimentan a los animales.')}
          </p>
        </div>
      </div>
    </div>
  )
}
