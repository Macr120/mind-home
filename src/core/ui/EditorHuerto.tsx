import { useHuerto, type HerramientaHuerto } from '../state/huertoStore'
import { ESPECIES } from '../house/cultivos'
import { VACIO, cestaRepo } from '../data/repository'
import type { EspecieCultivo } from '../data/db'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { MarcoEditorInfra } from './MarcoEditorInfra'
import { PestanasCampo } from './PestanasCampo'

// `min-w-0`: sin él, un item de grid no encoge bajo el ancho de su propio
// contenido y el texto largo ("Aspersor") desborda la columna en vez de
// achicarse con ella. El label va en su propio span truncado como respaldo.
const btn =
  'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 text-xs font-semibold text-white transition active:scale-95'

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
  const cesta = (cestaRepo.useAll() ?? VACIO).filter((c) => c.cantidad > 0)
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
      <Icono nombre={icono} />
      <span className="min-w-0 truncate">{etiqueta}</span>
    </button>
  )

  return (
    <MarcoEditorInfra
      icono="sembrar"
      titulo={t('room.huerto.nombre', 'Comida')}
      tut="huerto"
      onSalir={() => h.salir()}
      ancho="max-w-full"
      pestanas={<PestanasCampo activa="huerto" />}
    >
      {herramienta === 'sembrar' && (
            <div data-tut="huerto.especies" className="grid max-w-xl grid-cols-3 gap-1.5 sm:grid-cols-6">
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
          {/* Rejilla: los botones quedan alineados en columnas y sin filas huérfanas. */}
          <div data-tut="huerto.herramientas" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
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
    </MarcoEditorInfra>
  )
}
