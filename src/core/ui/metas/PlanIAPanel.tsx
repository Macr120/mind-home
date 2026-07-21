import { useState } from 'react'
import type { EntradaPlan, NivelPartida, PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { fechaLocalISO, isoMasDias } from '../../fechaLocal'
import { iaActiva } from '../../chat/ia'
import { localeActual, useT } from '../../i18n/useT'
import { generarPlan, type PlanPropuesto } from '../../planIA'
import { aplanar, siguienteNombrePlan } from '../../planMeta'
import { colorDe } from '../coloresRutina'
import { Icono } from '../iconos/Icono'

/** Los mismos que ofrece el formulario; el usuario no escribe un número libre. */
const HORAS = [2, 5, 10, 20]
const NIVELES: NivelPartida[] = ['cero', 'algo', 'medio', 'avanzado']
/** Índices de `Rutina.dias`: 0=domingo. Se muestran L→D, como la semana del calendario. */
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0]

/**
 * Panel ✨ del cronograma: pregunta de cuánto tiempo dispone el usuario y le pide a
 * la IA un plan para la meta. El plan se guarda como PROPUESTA — aquí no nace
 * ninguna meta real: eso es cosa de aceptarlo, ya viéndolo sobre el eje.
 *
 * El formulario es fijo a propósito, sin mini-chat: preguntar por conversación son
 * varias llamadas más y el modelo se queda dando vueltas antes de generar nada.
 */
export function PlanIAPanel({
  meta,
  planes,
  onCerrar,
}: {
  meta: Rutina
  planes: PlanMeta[]
  onCerrar: () => void
}) {
  const t = useT()
  const [sinFecha, setSinFecha] = useState(true)
  const [fechaObjetivo, setFechaObjetivo] = useState(() => isoMasDias(fechaLocalISO(), 90))
  const [horasSemana, setHorasSemana] = useState(5)
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [nivel, setNivel] = useState<NivelPartida>('cero')
  const [cargando, setCargando] = useState(false)
  const [propuesta, setPropuesta] = useState<PlanPropuesto | null>(null)
  const [fallo, setFallo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const color = colorDe(meta)
  const conIA = iaActiva()
  const hoy = fechaLocalISO()
  const entrada: EntradaPlan = {
    fechaObjetivo: sinFecha ? undefined : fechaObjetivo,
    horasSemana,
    dias,
    nivel,
  }

  const generar = async () => {
    if (cargando) return
    setCargando(true)
    setFallo(false)
    try {
      setPropuesta(await generarPlan(meta.nombre, entrada, hoy))
    } catch {
      // `generarPlan` lanza a propósito: sin plan no hay nada que enseñar.
      setFallo(true)
    }
    setCargando(false)
  }

  const guardar = async () => {
    if (!propuesta || guardando || meta.id == null) return
    setGuardando(true)
    await planesMetaRepo.add({
      metaId: meta.id,
      nombre: siguienteNombrePlan(planes, meta.id, (letra) => t('cal.plan.nombreAuto', 'Plan {letra}', { letra })),
      inicioISO: hoy,
      nodos: aplanar(propuesta.nodos),
      entrada,
      resumen: propuesta.resumen || undefined,
      creadoEn: new Date().toISOString(),
    })
    onCerrar()
  }

  const toggleDia = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const locale = localeActual()
  const fechaCorta = (iso: string) =>
    new Date(iso + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            <Icono nombre="brillo" /> {t('cal.plan.titulo', 'Planear «{meta}»', { meta: meta.nombre })}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {propuesta === null && (
          <>
            <p className="text-xs leading-relaxed text-white/45">
              {t('cal.plan.desc', 'Dime cuánto tiempo tienes y la IA arma un cronograma de sub-metas.')}
            </p>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {t('cal.plan.fechaObjetivo', 'Fecha objetivo')}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fechaObjetivo}
                  min={hoy}
                  disabled={sinFecha}
                  onChange={(e) => setFechaObjetivo(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-white/30 disabled:opacity-30"
                />
                <button
                  type="button"
                  onClick={() => setSinFecha((v) => !v)}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    sinFecha ? 'font-semibold text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  style={sinFecha ? { background: color } : undefined}
                >
                  {t('cal.plan.sinFecha', 'Sin fecha')}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {t('cal.plan.horasSemana', 'Horas por semana')}
              </p>
              <div className="flex items-center gap-2">
                {HORAS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setHorasSemana(n)}
                    className={`rounded-full px-3 py-1 text-xs tabular-nums transition ${
                      horasSemana === n ? 'font-semibold text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    style={horasSemana === n ? { background: color } : undefined}
                  >
                    {n} h
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {t('cal.plan.dias', 'Días que puedes dedicarle')}
              </p>
              <div className="flex items-center gap-1">
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className={`h-7 flex-1 rounded-lg text-[10px] font-semibold uppercase transition ${
                      dias.includes(d) ? 'text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                    style={dias.includes(d) ? { background: color } : undefined}
                  >
                    {t(`cal.plan.dia.${d}`, ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d])}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                {t('cal.plan.nivel', 'Punto de partida')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {NIVELES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNivel(n)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      nivel === n ? 'font-semibold text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    style={nivel === n ? { background: color } : undefined}
                  >
                    {t(`cal.plan.nivel.${n}`, TEXTO_NIVEL[n])}
                  </button>
                ))}
              </div>
            </div>

            {!conIA && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                {t('cal.plan.iaApagada', 'La IA no está disponible: revisa tu clave y tu conexión. Mientras, puedes agregar las sub-metas a mano.')}
              </p>
            )}
            {fallo && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                {t('cal.plan.fallo', 'La IA no pudo armar el plan. Reintenta o agrega las sub-metas a mano.')}
              </p>
            )}

            <button
              type="button"
              onClick={() => void generar()}
              disabled={cargando || !conIA || dias.length === 0}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
              style={{ background: color }}
            >
              {cargando ? (
                <span className="animate-pulse">
                  <Icono nombre="reloj-arena" /> {t('cal.plan.generando', 'Armando el cronograma…')}
                </span>
              ) : (
                <>
                  <Icono nombre="brillo" /> {t('cal.plan.generar', 'Generar plan')}
                </>
              )}
            </button>
          </>
        )}

        {propuesta !== null && (
          <>
            <p className="text-xs leading-relaxed text-white/45">
              {propuesta.resumen || t('cal.plan.revisar', 'Este es el plan. Guárdalo para verlo sobre tu cronograma.')}
            </p>

            {/* Solo lectura: un cronograma no es una lista de sugerencias sueltas —
                quitarle una fase descuadra las fechas de las demás. Si no gusta, se
                regenera. */}
            {aplanar(propuesta.nodos).map((n) => (
              <div
                key={n.id}
                style={{ marginLeft: n.padre ? 14 : 0 }}
                className="flex items-baseline gap-2 rounded-lg bg-black/20 px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 text-xs text-white/90">{n.nombre}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-white/35">
                  {fechaCorta(isoMasDias(hoy, n.ini))} – {fechaCorta(isoMasDias(hoy, n.fin))}
                </span>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPropuesta(null)}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                {t('cal.plan.otraVez', 'Volver')}
              </button>
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={guardando}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                style={{ background: color }}
              >
                {t('cal.plan.guardar', 'Guardar plan')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Fallbacks en español de los niveles; el inglés vive en `dict.ts`. */
const TEXTO_NIVEL: Record<NivelPartida, string> = {
  cero: 'Desde cero',
  algo: 'Algo de base',
  medio: 'Intermedio',
  avanzado: 'Avanzado',
}
