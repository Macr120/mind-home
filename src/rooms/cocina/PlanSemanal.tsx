import { useState } from 'react'
import type { DietaGuardada, PerfilNutricion, PlanComida, Receta, RegistroComida } from '../../core/data/db'
import { comidasRepo, planComidasRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { HORA_SUGERIDA, MOMENTOS } from './constantes'
import { diasDelMes, hoyISO, inicioMes, nombreFecha, nombreMes, rangoCorto, sumarDias, sumarMeses } from './fecha'
import { claveHueco, huecosVacios, proponerPlan, type Hueco } from './generarPlan'
import { recetaEnMomento } from './momentos'
import { registrarRecetaEnDiario } from './registrar'

/** Cuántos días abarca la rejilla. El mes es el natural, no 30 días sueltos. */
type Ventana = 1 | 3 | 7 | 30

const VENTANAS: { dias: Ventana; clave: string; labelEs: string }[] = [
  { dias: 1, clave: 'cocina.plan.ver1', labelEs: 'Día' },
  { dias: 3, clave: 'cocina.plan.ver3', labelEs: '3 días' },
  { dias: 7, clave: 'cocina.plan.ver7', labelEs: 'Semana' },
  { dias: 30, clave: 'cocina.plan.verMes', labelEs: 'Mes' },
]

const CLAVE_VENTANA = claveLS('mh.cocina.planDias')

function leerVentana(): Ventana {
  const v = Number(localStorage.getItem(CLAVE_VENTANA))
  return VENTANAS.some((x) => x.dias === v) ? (v as Ventana) : 7
}

/**
 * Los días que se pintan. La semana se cuadra al lunes y el mes al día 1: así
 * moverse con ‹ › cae siempre en semanas y meses enteros, como un calendario.
 */
function diasDe(ancla: string, ventana: Ventana): string[] {
  if (ventana === 30) {
    const primero = inicioMes(ancla)
    return Array.from({ length: diasDelMes(ancla) }, (_, i) => isoMasDias(primero, i))
  }
  const arranque = ventana === 7 ? fechaLocalISO(inicioSemana(deIso(ancla))) : ancla
  return Array.from({ length: ventana }, (_, i) => isoMasDias(arranque, i))
}

/**
 * La rejilla del plan de comidas: los momentos del día contra los días de la
 * ventana, con su propio navegador de calendario.
 *
 * En mes se TRASPONE (días en filas, momentos en columnas): 31 columnas no
 * caben ni con scroll, y de arriba abajo se lee como una agenda.
 */
export function PlanSemanal({
  recetas,
  dietas,
  plan,
  comidas,
  perfil,
}: {
  recetas: Receta[]
  dietas: DietaGuardada[]
  plan: PlanComida[]
  comidas: RegistroComida[]
  perfil: PerfilNutricion
}) {
  const t = useT()
  const [ventana, setVentana] = useState<Ventana>(leerVentana)
  const [ancla, setAncla] = useState(hoyISO)
  /** Celda abierta abajo: sin ella no cabría elegir receta en una columna de 50 px. */
  const [sel, setSel] = useState<Hueco | null>(null)
  /** Dietas por las que se acota el recetario; vacío = todas las recetas. */
  const [dietasSel, setDietasSel] = useState<number[]>([])
  /** Escape del filtro por momento, por si la receta que quieres no está catalogada. */
  const [verTodas, setVerTodas] = useState(false)
  /** Huecos marcados a mano para generar solo en ellos; null = modo selección apagado. */
  const [marcados, setMarcados] = useState<Set<string> | null>(null)

  const dias = diasDe(ancla, ventana)
  const traspuesta = ventana === 30
  const recetaDe = (id: number) => recetas.find((r) => r.id === id)
  const planDe = (dia: string, momento: string) => plan.find((p) => p.fecha === dia && p.momento === momento)

  /** El recetario acotado a las dietas elegidas (sin ninguna elegida, entra todo). */
  const idsDeDietas = new Set(
    dietas.filter((d) => d.id != null && dietasSel.includes(d.id)).flatMap((d) => d.recetaIds),
  )
  const deLasDietas = dietasSel.length ? recetas.filter((r) => r.id != null && idsDeDietas.has(r.id)) : recetas

  /**
   * Una celda cuenta como comida solo si su registro sigue existiendo: si se
   * borró desde la lista del día, vuelve a estar pendiente en vez de mentir.
   */
  const yaComida = (p: PlanComida) => p.comidaId != null && comidas.some((c) => c.id === p.comidaId)

  const cambiarVentana = (v: Ventana) => {
    localStorage.setItem(CLAVE_VENTANA, String(v))
    setVentana(v)
    setSel(null)
  }

  /** ‹ › salta una ventana entera: día a día, semana a semana o mes a mes. */
  const mover = (signo: 1 | -1) => {
    setAncla((a) => (ventana === 30 ? sumarMeses(a, signo) : sumarDias(a, signo * ventana)))
    setSel(null)
  }

  const elegir = async (receta: Receta) => {
    if (!sel || receta.id == null) return
    const previo = planDe(sel.fecha, sel.momento)
    if (previo?.id) await planComidasRepo.update(previo.id, { recetaId: receta.id, comidaId: undefined })
    else
      await planComidasRepo.add({
        fecha: sel.fecha,
        momento: sel.momento,
        recetaId: receta.id,
        creadoEn: new Date().toISOString(),
      })
    setSel(null)
  }

  const comerla = async (p: PlanComida) => {
    const receta = recetaDe(p.recetaId)
    if (!receta || !p.id) return
    const comidaId = await registrarRecetaEnDiario(receta, p.fecha, p.momento)
    await planComidasRepo.update(p.id, { comidaId })
  }

  const deshacer = async (p: PlanComida) => {
    if (!p.id) return
    if (p.comidaId != null) await comidasRepo.remove(p.comidaId)
    await planComidasRepo.update(p.id, { comidaId: undefined })
  }

  const quitar = async (p: PlanComida) => {
    if (!p.id) return
    if (p.comidaId != null) await comidasRepo.remove(p.comidaId)
    await planComidasRepo.remove(p.id)
    setSel(null)
  }

  const libres = huecosVacios(dias, plan)
  /** Lo que va a rellenar el botón: lo marcado a mano, o todos los huecos a la vista. */
  const aRellenar = marcados?.size ? libres.filter((h) => marcados.has(claveHueco(h))) : libres

  const generar = async () => {
    const nuevas = proponerPlan(aRellenar, deLasDietas)
    if (nuevas.length) await planComidasRepo.bulkAdd(nuevas)
    setMarcados(null)
  }

  const marcar = (h: Hueco) => {
    setMarcados((prev) => {
      const s = new Set(prev ?? [])
      const k = claveHueco(h)
      if (s.has(k)) s.delete(k)
      else s.add(k)
      return s
    })
  }

  const tocarCelda = (h: Hueco, hayPlan: boolean) => {
    // En modo selección la rejilla es un tablero de casillas, no un menú: solo
    // se marcan huecos vacíos, que es lo único que el generador puede rellenar.
    if (marcados) {
      if (!hayPlan) marcar(h)
      return
    }
    setVerTodas(false)
    setSel((s) => (s?.fecha === h.fecha && s.momento === h.momento ? null : h))
  }

  const abierta = sel ? planDe(sel.fecha, sel.momento) : undefined
  const recetaAbierta = abierta ? recetaDe(abierta.recetaId) : undefined

  // Lo que se ofrece en la celda abierta: su momento manda, y las dietas acotan.
  const candidatas = sel ? deLasDietas.filter((r) => verTodas || recetaEnMomento(r, sel.momento)) : []
  const ocultasPorMomento = sel ? deLasDietas.length - candidatas.length : 0

  /** Kcal planeadas de un día (las recetas borradas no suman). */
  const kcalDia = (dia: string) =>
    plan
      .filter((p) => p.fecha === dia)
      .reduce((s, p) => s + (recetaDe(p.recetaId)?.calorias ?? 0), 0)

  const etiquetaRango =
    ventana === 30 ? nombreMes(ancla) : ventana === 1 ? nombreFecha(dias[0]) : rangoCorto(dias[0], dias[dias.length - 1])

  return (
    <div data-tut="cocina.plan.semana" className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      {/* Acciones + vista, agrupadas en la esquina superior: pastillas chicas,
          sin párrafo de ayuda (va como title, al pasar el mouse). */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('cocina.plan.semana', 'Plan de comidas')}
        </p>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {recetas.length > 0 && (
            <>
              <button
                type="button"
                onClick={generar}
                disabled={aRellenar.length === 0 || deLasDietas.length === 0}
                title={
                  marcados
                    ? t('cocina.plan.elegirAyuda', 'Toca los huecos que quieras llenar y pulsa Generar. Sin ninguno marcado se llenan todos.')
                    : t('cocina.plan.generarAyuda', 'Rellena solo los huecos vacíos de los días que ves, respetando el momento de cada receta. Lo que ya elegiste no se toca.')
                }
                className="flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-1 text-[10px] font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
              >
                <Icono nombre="brillo" /> {marcados?.size ? marcados.size : libres.length}
              </button>
              {libres.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMarcados((m) => (m ? null : new Set()))}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                    marcados ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {marcados ? t('cocina.plan.dejarElegir', 'Listo') : t('cocina.plan.elegirHuecos', 'Elegir')}
                </button>
              )}
            </>
          )}

          <div className="flex rounded-lg border border-white/10 p-0.5">
            {VENTANAS.map((v) => (
              <button
                key={v.dias}
                type="button"
                onClick={() => cambiarVentana(v.dias)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                  ventana === v.dias ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t(v.clave, v.labelEs)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navegador propio: esta pestaña no comparte la barra de fecha del Registro. */}
      <div className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label={t('cocina.plan.anterior', 'Periodo anterior')}
          className="rounded-lg px-3 py-0.5 text-lg hover:bg-white/10"
        >
          ‹
        </button>
        <div className="text-center">
          <span className="text-xs font-semibold capitalize">{etiquetaRango}</span>
          {!dias.includes(hoyISO()) && (
            <button
              type="button"
              onClick={() => setAncla(hoyISO())}
              className="ml-2 text-[10px] text-amber-400 hover:underline"
            >
              {t('nav.irHoy', 'Ir a hoy')}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label={t('cocina.plan.siguiente', 'Periodo siguiente')}
          className="rounded-lg px-3 py-0.5 text-lg hover:bg-white/10"
        >
          ›
        </button>
      </div>

      {recetas.length === 0 && (
        <p className="text-xs text-white/40">
          {t('cocina.plan.sinRecetas', 'Aún no tienes recetas: créalas en el recetario para poder planear.')}
        </p>
      )}

      {/* A 7 columnas no cabe en un teléfono sin desbordar: la rejilla scrollea
          dentro de su tarjeta. En mes se traspone y el scroll pasa a vertical. */}
      <div className={traspuesta ? 'max-h-96 overflow-y-auto' : 'overflow-x-auto'}>
        <table className={`w-full border-separate border-spacing-1 ${traspuesta ? '' : 'min-w-[28rem]'}`}>
          <thead>
            <tr>
              <th className="w-16" />
              {traspuesta
                ? MOMENTOS.map((m) => (
                    <th key={m.id} className="text-[10px] font-semibold text-white/50">
                      <Icono emoji={m.icon} />
                    </th>
                  ))
                : dias.map((d) => (
                    <th key={d} className="text-[10px] font-semibold text-white/50">
                      <span className="block capitalize">
                        {deIso(d).toLocaleDateString(localeActual(), { weekday: 'short' })}
                      </span>
                      <span className={d === hoyISO() ? 'text-amber-400' : 'text-white/30'}>{d.slice(8)}</span>
                    </th>
                  ))}
              {traspuesta && (
                <th className="text-[10px] font-semibold text-white/40">{t('cocina.plan.kcal', 'kcal')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {traspuesta
              ? dias.map((d) => (
                  <tr key={d}>
                    <th className="text-left text-[10px] font-semibold text-white/50">
                      <span className={d === hoyISO() ? 'text-amber-400' : ''}>
                        {deIso(d).toLocaleDateString(localeActual(), { weekday: 'short', day: 'numeric' })}
                      </span>
                    </th>
                    {MOMENTOS.map((m) => {
                      const p = planDe(d, m.id)
                      return (
                        <td key={m.id}>
                          <Celda
                            hueco={{ fecha: d, momento: m.id }}
                            plan={p}
                            receta={p ? recetaDe(p.recetaId) : undefined}
                            comida={p ? yaComida(p) : false}
                            activa={sel?.fecha === d && sel.momento === m.id}
                            marcada={marcados?.has(`${d}|${m.id}`) ?? false}
                            modoSel={marcados !== null}
                            compacta
                            onTocar={tocarCelda}
                          />
                        </td>
                      )
                    })}
                    <td className="text-right text-[10px] font-semibold text-white/45">{kcalDia(d) || ''}</td>
                  </tr>
                ))
              : MOMENTOS.map((m) => (
                  <tr key={m.id}>
                    <th title={HORA_SUGERIDA[m.id]} className="text-left text-[10px] font-semibold text-white/50">
                      <Icono emoji={m.icon} /> {t(`cocina.momento.${m.id}`, m.label)}
                    </th>
                    {dias.map((d) => {
                      const p = planDe(d, m.id)
                      return (
                        <td key={d}>
                          <Celda
                            hueco={{ fecha: d, momento: m.id }}
                            plan={p}
                            receta={p ? recetaDe(p.recetaId) : undefined}
                            comida={p ? yaComida(p) : false}
                            activa={sel?.fecha === d && sel.momento === m.id}
                            marcada={marcados?.has(`${d}|${m.id}`) ?? false}
                            modoSel={marcados !== null}
                            onTocar={tocarCelda}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
          </tbody>
          {!traspuesta && (
            <tfoot>
              <tr>
                <th className="text-left text-[10px] font-semibold text-white/40">
                  {t('cocina.plan.kcal', 'kcal')}
                </th>
                {dias.map((d) => (
                  <td key={d} className="text-center text-[10px] font-semibold text-white/45">
                    {kcalDia(d) || '—'}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Totales dias={dias} plan={plan} recetaDe={recetaDe} perfil={perfil} />

      {sel && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-white/80">
              {t(`cocina.momento.${sel.momento}`, MOMENTOS.find((m) => m.id === sel.momento)!.label)} · {sel.fecha}
            </p>
            <button
              type="button"
              onClick={() => setSel(null)}
              aria-label={t('cocina.plan.cerrarCelda', 'Cerrar')}
              className="ml-auto text-white/30 hover:text-white/70"
            >
              ✕
            </button>
          </div>

          {abierta && recetaAbierta ? (
            <div className="space-y-2">
              <p className="text-sm text-white/85">
                <Icono emoji={recetaAbierta.emoji} /> {recetaAbierta.nombre}
                {recetaAbierta.calorias > 0 && (
                  <span className="text-xs text-white/40"> · {recetaAbierta.calorias} kcal</span>
                )}
              </p>
              <div className="flex gap-2">
                {yaComida(abierta) ? (
                  <button
                    type="button"
                    onClick={() => deshacer(abierta)}
                    className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold hover:bg-white/15"
                  >
                    {t('cocina.plan.deshacer', 'Deshacer')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => comerla(abierta)}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold texto-cta hover:brightness-110"
                  >
                    {t('cocina.plan.comerla', 'Ya me la comí')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quitar(abierta)}
                  className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  {t('cocina.plan.quitar', 'Quitar')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-white/50">
              {t('cocina.plan.elige', 'Elige la receta que va en este hueco.')}
            </p>
          )}

          {/* El mismo filtro de arriba, a mano: aquí es donde se busca la receta. */}
          <ChipsDietas dietas={dietas} seleccionadas={dietasSel} onCambio={setDietasSel} compacto />

          {candidatas.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {candidatas.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => elegir(r)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
                  >
                    <span className="text-lg">
                      <Icono emoji={r.emoji} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-white/85">{r.nombre}</span>
                    {r.calorias > 0 && <span className="text-[10px] text-white/40">{r.calorias} kcal</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {candidatas.length === 0 && (
            <p className="text-[11px] text-white/40">
              {dietasSel.length > 0
                ? t('cocina.plan.sinCandidatasDieta', 'Ninguna receta de esas dietas encaja aquí.')
                : t('cocina.plan.sinCandidatas', 'Ninguna receta está catalogada para este momento.')}
            </p>
          )}

          {/* El filtro por momento es una ayuda, no una cárcel: si la receta que
              buscas no está catalogada, sigue estando a un toque. */}
          {(ocultasPorMomento > 0 || verTodas) && (
            <button
              type="button"
              onClick={() => setVerTodas((v) => !v)}
              className="text-[10px] font-semibold text-amber-400 hover:underline"
            >
              {verTodas
                ? t('cocina.plan.soloDelMomento', 'Ver solo las de este momento')
                : t('cocina.plan.verTodas', `Ver las ${ocultasPorMomento} recetas de otros momentos`, {
                    n: String(ocultasPorMomento),
                  })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Una casilla de la rejilla: hueco vacío, receta planeada o comida ya registrada. */
function Celda({
  hueco,
  plan,
  receta,
  comida,
  activa,
  marcada,
  modoSel,
  compacta,
  onTocar,
}: {
  hueco: Hueco
  plan: PlanComida | undefined
  receta: Receta | undefined
  comida: boolean
  activa: boolean
  marcada: boolean
  modoSel: boolean
  compacta?: boolean
  onTocar: (h: Hueco, hayPlan: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={modoSel ? marcada : undefined}
      onClick={() => onTocar(hueco, plan != null)}
      className={`flex w-full flex-col items-center justify-center rounded-lg px-1 leading-tight transition ${
        compacta ? 'h-9 text-[8px]' : 'h-12 text-[9px]'
      } ${activa ? 'ring-2 ring-amber-400' : ''} ${marcada ? 'ring-2 ring-sky-400' : ''} ${
        comida
          ? 'bg-emerald-500/20 text-emerald-300'
          : receta
            ? 'bg-white/10 text-white/80'
            : marcada
              ? 'bg-sky-500/20 text-sky-200'
              : 'bg-white/5 text-white/25 hover:bg-white/10'
      }`}
    >
      {receta ? (
        <>
          <span className={compacta ? 'text-sm' : 'text-base'}>
            <Icono emoji={comida ? '✅' : receta.emoji} />
          </span>
          {!compacta && <span className="w-full truncate">{receta.nombre}</span>}
        </>
      ) : (
        <span>{marcada ? '✓' : '+'}</span>
      )}
    </button>
  )
}

/** Filtro de dietas: acota el recetario del que salen las sugerencias y el generador. */
function ChipsDietas({
  dietas,
  seleccionadas,
  onCambio,
  compacto,
}: {
  dietas: DietaGuardada[]
  seleccionadas: number[]
  onCambio: (ids: number[]) => void
  compacto?: boolean
}) {
  const t = useT()
  if (dietas.length === 0) return null

  const alternar = (id: number) =>
    onCambio(seleccionadas.includes(id) ? seleccionadas.filter((x) => x !== id) : [...seleccionadas, id])

  return (
    <div>
      <span className="text-[10px] text-white/45">
        {t('cocina.plan.filtroDietas', 'Sacar las recetas de estas dietas')}
      </span>
      <div className={`mt-1 flex flex-wrap gap-1.5 ${compacto ? 'max-h-20 overflow-y-auto' : ''}`}>
        {dietas.map((d) => {
          const puesta = d.id != null && seleccionadas.includes(d.id)
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={puesta}
              onClick={() => d.id != null && alternar(d.id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                puesta ? 'bg-amber-600 texto-cta' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {d.nombre}
            </button>
          )
        })}
        {seleccionadas.length > 0 && (
          <button
            type="button"
            onClick={() => onCambio([])}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:text-white/80"
          >
            {t('cocina.plan.dietasTodas', 'Todas')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Lo que suma el periodo: comidas planeadas, energía y macros, contra el objetivo. */
function Totales({
  dias,
  plan,
  recetaDe,
  perfil,
}: {
  dias: string[]
  plan: PlanComida[]
  recetaDe: (id: number) => Receta | undefined
  perfil: PerfilNutricion
}) {
  const t = useT()
  const enRango = plan.filter((p) => dias.includes(p.fecha))
  const suma = enRango.reduce(
    (acc, p) => {
      const r = recetaDe(p.recetaId)
      if (!r) return acc
      return {
        kcal: acc.kcal + r.calorias,
        prot: acc.prot + r.proteinas,
        carb: acc.carb + r.carbohidratos,
        gras: acc.gras + r.grasas,
      }
    },
    { kcal: 0, prot: 0, carb: 0, gras: 0 },
  )

  // El promedio se reparte entre los días CON algo planeado: dividir entre los
  // 31 del mes cuando solo hay tres días puestos daría un número sin sentido.
  const diasConPlan = new Set(enRango.map((p) => p.fecha)).size
  const promedio = diasConPlan > 0 ? Math.round(suma.kcal / diasConPlan) : 0
  const objetivo = perfil.calorias
  const delta = objetivo > 0 && diasConPlan > 0 ? promedio - objetivo : 0

  return (
    <div className="rounded-lg bg-black/20 p-3 space-y-1.5">
      <div className="flex items-center">
        <p className="text-xs font-semibold text-white/70">
          <Icono nombre="progreso" /> {t('cocina.plan.totales', 'Totales del periodo')}
        </p>
        <span className="ml-auto text-sm font-bold text-amber-400">{suma.kcal.toLocaleString()} kcal</span>
      </div>

      {enRango.length === 0 ? (
        <p className="text-[11px] text-white/35">
          {t('cocina.plan.sinTotales', 'Nada planeado en este periodo todavía.')}
        </p>
      ) : (
        <>
          <p className="text-[11px] text-white/45">
            {t('cocina.plan.totalComidas', `${enRango.length} comidas en ${diasConPlan} días`, {
              n: String(enRango.length),
              d: String(diasConPlan),
            })}
            {' · '}
            {t('cocina.plan.promedioDia', `${promedio} kcal al día`, { n: String(promedio) })}
          </p>
          <p className="text-[11px] text-white/45">
            P {suma.prot} g · C {suma.carb} g · G {suma.gras} g
          </p>
          {objetivo > 0 && (
            <p className={`text-[11px] font-semibold ${Math.abs(delta) <= objetivo * 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {delta === 0
                ? t('cocina.plan.enObjetivo', 'Justo en tu objetivo diario.')
                : delta > 0
                  ? t('cocina.plan.sobreObjetivo', `${delta} kcal al día por encima de tu objetivo`, {
                      n: String(delta),
                    })
                  : t('cocina.plan.bajoObjetivo', `${Math.abs(delta)} kcal al día por debajo de tu objetivo`, {
                      n: String(Math.abs(delta)),
                    })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
