import { useEffect, useState } from 'react'
import type { EntradaPlan, MaterialPlan, NivelPartida, PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo, rutinasRepo } from '../../data/repository'
import { fechaLocalISO, isoMasDias } from '../../fechaLocal'
import { iaActiva } from '../../chat/ia'
import { localeActual, useT } from '../../i18n/useT'
import { appsParaEnlace, destinosDeApp } from '../../enlaceApp'
import { generarPlan, type AppParaPlan, type ContextoPlanApp, type PlanPropuesto } from '../../planIA'
import { aplanar, diasDePlan, siguienteNombrePlan } from '../../planMeta'
import { getPlantilla, type RutinaSugerible } from '../../registry'
import { buscarAgenda } from '../../rutinas'
import { colorDe } from '../coloresRutina'
import { agendarActividad, sumarMin } from '../HorarioActividad'
import { Icono } from '../iconos/Icono'
import { ChipApp } from './ChipApp'
import { Creditos } from '../Creditos'
import { OP_PLAN_IA } from '../../cuenta/catalogoNucleo'

/** Los mismos que ofrece el formulario; el usuario no escribe un número libre. */
const HORAS = [2, 5, 10, 20]
const NIVELES: NivelPartida[] = ['cero', 'algo', 'medio', 'avanzado']
/** Índices de `Rutina.dias`: 0=domingo. Se muestran L→D, como la semana del calendario. */
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0]

/** Una rutina existente que la propuesta trae puesta: editable antes de guardar. */
interface SugerenciaElegible {
  r: RutinaSugerible
  dias: number[]
  /** La hora del bloque en el calendario: se pregunta aquí para que el plan quede calendarizado. */
  hora: string
  activa: boolean
}

/** Una pieza del material de la app que la propuesta trae puesta: descartable antes de guardar. */
interface MaterialElegible {
  m: MaterialPlan
  activa: boolean
}

const HORA_DEFECTO = '08:00'

/**
 * Las apps de la casa que la IA puede colgar de un paso, con las secciones que cada
 * una declara para el chat. Se lee al generar (no al montar): la casa se edita en
 * caliente y el catálogo de un plan tiene que ser el de este momento.
 */
function catalogoApps(): AppParaPlan[] {
  return appsParaEnlace().map((p) => ({
    id: p.id,
    nombre: p.nombre,
    secciones: destinosDeApp(p).flatMap((d) =>
      d.seccion ? [{ id: d.seccion, etiqueta: d.etiqueta, dato: d.dato }] : [],
    ),
  }))
}

/**
 * Qué se hace con el calendario: `sin` lo deja fuera (las fases nacen sin fechar y
 * se las va poniendo el usuario), `ia` deja que el modelo decida cuánto dura y
 * `fija` lo acota a una fecha objetivo.
 */
type Plazo = 'sin' | 'ia' | 'fija'
const PLAZOS: Plazo[] = ['sin', 'ia', 'fija']

/**
 * El ✨ de la vista Planes: pregunta de cuánto tiempo dispone el usuario y le pide a
 * la IA un plan para la meta. El plan se guarda como PROPUESTA — aquí no nace
 * ninguna meta real: eso es cosa de aceptarlo, ya leyéndolo en su hoja.
 *
 * Ocupa la página entera, no un modal: antes vivía en una caja de 28 rem con scroll
 * propio donde un cronograma de ocho fases no se podía ni leer, y al guardar se
 * cerraba dejando el plan invisible. Ahora `onGuardado` entrega el id recién creado
 * y quien llama abre su hoja.
 *
 * El formulario es fijo a propósito, sin mini-chat: preguntar por conversación son
 * varias llamadas más y el modelo se queda dando vueltas antes de generar nada.
 */
export function GeneradorPlan({
  meta,
  planes,
  onCancelar,
  onGuardado,
}: {
  meta: Rutina
  planes: PlanMeta[]
  onCancelar: () => void
  onGuardado: (id: number) => void
}) {
  const t = useT()
  // El plazo es OPCIONAL y por defecto lo pone la IA: en la mayoría de las metas el
  // usuario no sabe cuánto tardará — es justo lo que le está preguntando. Con fecha
  // límite el plan se acota a ella; sin ella, la IA calcula lo que la meta exige. Y
  // «sin plazo» es para las metas que no van contra el reloj: el plan queda como una
  // lista ordenada, sin ocupar el eje.
  const [plazo, setPlazo] = useState<Plazo>('ia')
  const [fechaInicio, setFechaInicio] = useState(() => fechaLocalISO())
  const [fechaObjetivo, setFechaObjetivo] = useState(() => isoMasDias(fechaLocalISO(), 90))
  const [horasSemana, setHorasSemana] = useState(5)
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [nivel, setNivel] = useState<NivelPartida>('cero')
  const [cargando, setCargando] = useState(false)
  const [propuesta, setPropuesta] = useState<PlanPropuesto | null>(null)
  // El MOTIVO, no un booleano: «reintenta» no ayuda cuando lo que falla es la
  // cuota del proveedor o la clave, que es justo lo que el usuario debe leer.
  const [fallo, setFallo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Rutinas ya creadas que la app dueña de la meta ofrece al planificador.
  const [disponibles, setDisponibles] = useState<RutinaSugerible[]>([])
  const [sugeridas, setSugeridas] = useState<SugerenciaElegible[]>([])
  // Material de la app (recetas…) que la IA eligió y justificó para este plan.
  const [materialSel, setMaterialSel] = useState<MaterialElegible[]>([])
  // Acotamiento de la app dueña: guía + datos reales + nivel sugerido.
  const [ctxApp, setCtxApp] = useState<ContextoPlanApp | undefined>()

  useEffect(() => {
    const plantilla = meta.plantillaId ? getPlantilla(meta.plantillaId) : undefined
    void plantilla?.rutinasPlan?.(meta.ambitoId).then(setDisponibles)
    void plantilla?.planMetas?.(meta.ambitoId).then((c) => {
      setCtxApp(c)
      if (c.nivel) setNivel(c.nivel)
    })
  }, [meta.plantillaId, meta.ambitoId])

  const color = colorDe(meta)
  const conIA = iaActiva()
  const hoy = fechaLocalISO()
  const sinFechas = plazo === 'sin'
  const fechasValidas =
    sinFechas || (!!fechaInicio && (plazo !== 'fija' || (!!fechaObjetivo && fechaObjetivo > fechaInicio)))
  const entrada: EntradaPlan = {
    // Se guarda incluso sin plazo: es el ancla latente para cuando el plan quiera fechas.
    fechaInicio,
    fechaObjetivo: plazo === 'fija' ? fechaObjetivo : undefined,
    horasSemana,
    dias,
    nivel,
  }

  const generar = async () => {
    if (cargando) return
    setCargando(true)
    setFallo(null)
    try {
      const plan = await generarPlan(
        meta.nombre,
        entrada,
        hoy,
        disponibles.map((d) => ({
          nombre: d.actividad.nombre,
          tipo: d.tipo,
          duracionMin: d.actividad.duracionMin ?? 0,
        })),
        ctxApp,
        catalogoApps(),
      )
      setPropuesta(plan)
      // La elección de la IA, ya editable: días recortados a los que el usuario
      // marcó como disponibles; sin días viables, se reparte L-X-V por defecto.
      setSugeridas(
        plan.rutinas.flatMap((s) => {
          const r = disponibles.find((d) => d.actividad.nombre === s.nombre)
          if (!r) return []
          const viables = s.dias.filter((d) => dias.includes(d))
          const porDefecto = dias.length < 7 ? dias : [1, 3, 5]
          return [
            {
              r,
              dias: viables.length ? viables : porDefecto,
              hora: r.actividad.horaSugerida ?? HORA_DEFECTO,
              activa: true,
            },
          ]
        }),
      )
      setMaterialSel(plan.material.map((m) => ({ m, activa: true })))
    } catch (e) {
      // `generarPlan` lanza a propósito: sin plan no hay nada que enseñar.
      console.error('[plan IA]', e)
      setFallo(e instanceof Error ? e.message : String(e))
    }
    setCargando(false)
  }

  /** El alta que comparten las dos vías: la propuesta de la IA y el plan escrito a mano. */
  const crearPlan = (extra: Pick<PlanMeta, 'nodos' | 'resumen' | 'material'>) => {
    if (meta.id == null) return undefined
    return planesMetaRepo.add({
      metaId: meta.id,
      nombre: siguienteNombrePlan(planes, meta.id, (letra) => t('cal.plan.nombreAuto', 'Plan {letra}', { letra })),
      // Sin plazo el arranque no se pregunta, pero el plan lo guarda igual: es lo que
      // valdrá el día 0 si más tarde se le ponen fechas.
      inicioISO: fechaInicio || hoy,
      entrada,
      creadoEn: new Date().toISOString(),
      ...extra,
    })
  }

  const guardar = async () => {
    if (!propuesta || guardando || meta.id == null) return
    setGuardando(true)
    const material = materialSel.filter((x) => x.activa).map((x) => x.m)
    const id = await crearPlan({
      nodos: nodosPropuestos,
      resumen: propuesta.resumen || undefined,
      material: material.length > 0 ? material : undefined,
    })
    // Las rutinas marcadas se agendan de verdad: el mismo bloque que crearía el
    // botón «Agendar» de la app. Si ya estaban agendadas, se les pone el horario nuevo.
    const vivas = await rutinasRepo.list()
    for (const s of sugeridas) {
      if (!s.activa) continue
      const dur = s.r.actividad.duracionMin
      const previa = buscarAgenda(vivas, s.r.actividad.actividadId)
      if (previa?.id != null)
        await rutinasRepo.update(previa.id, {
          dias: s.dias,
          hora: s.hora,
          horaFin: dur ? sumarMin(s.hora, dur) : undefined,
        })
      else await agendarActividad({ ...s.r.actividad, horaSugerida: s.hora }, { dias: s.dias })
    }
    // El id recién creado abre su hoja: sin esto el plan quedaba guardado e invisible.
    if (typeof id === 'number') onGuardado(id)
    else onCancelar()
  }

  /**
   * El plan a mano: nace VACÍO y se escribe fase a fase en su hoja, que es donde ya
   * vivía la edición de nodos. Es la única vía cuando la IA no responde — y el aviso
   * de arriba lleva prometiéndola desde siempre.
   */
  const guardarManual = async () => {
    if (guardando || !fechasValidas) return
    setGuardando(true)
    const id = await crearPlan({ nodos: [] })
    if (typeof id === 'number') onGuardado(id)
    else onCancelar()
  }

  const toggleDia = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const toggleSugerida = (i: number) =>
    setSugeridas((prev) => prev.map((s, j) => (j === i ? { ...s, activa: !s.activa } : s)))

  const toggleMaterial = (i: number) =>
    setMaterialSel((prev) => prev.map((x, j) => (j === i ? { ...x, activa: !x.activa } : x)))

  const toggleDiaSugerida = (i: number, d: number) =>
    setSugeridas((prev) =>
      prev.map((s, j) =>
        j === i
          ? { ...s, dias: s.dias.includes(d) ? s.dias.filter((x) => x !== d) : [...s.dias, d].sort() }
          : s,
      ),
    )

  const ponerHoraSugerida = (i: number, hora: string) =>
    setSugeridas((prev) => prev.map((s, j) => (j === i ? { ...s, hora: hora || s.hora } : s)))

  const locale = localeActual()
  const fechaCorta = (iso: string) =>
    new Date(iso + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  // La propuesta ya en la forma en que se va a guardar: sin plazo se le tiran los
  // días, que es justo lo que se pidió — el guion sí, el calendario lo pone el usuario.
  const nodosPropuestos = propuesta ? aplanar(propuesta.nodos, !sinFechas) : []
  // Lo que la propuesta acabó ocupando: con plazo confirma que cabe, y sin plazo ES
  // la respuesta a «¿cuánto me va a llevar?» (ahí se mide sobre los días crudos).
  const diasPropuestos = propuesta ? diasDePlan(aplanar(propuesta.nodos)) : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onCancelar}
          className="shrink-0 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
        >
          ‹ {t('cal.plan.volverLista', 'Volver a los planes')}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          <Icono nombre="brillo" /> {t('cal.plan.titulo', 'Planear «{meta}»', { meta: meta.nombre })}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-3">
          {propuesta === null && (
            <>
              <p className="text-xs leading-relaxed text-white/45">
                {t('cal.plan.desc', 'Dime cuánto tiempo tienes y la IA arma un cronograma de sub-metas.')}
              </p>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  {t('cal.plan.plazo', 'Plazo')}
                </p>
                <div className="flex rounded-lg border border-white/10 p-0.5">
                  {PLAZOS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPlazo(v)}
                      className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                        plazo === v ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                      }`}
                    >
                      {t(`cal.plan.plazo.${v}`, TEXTO_PLAZO[v])}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-white/35">
                  {t(`cal.plan.plazo.${plazo}.desc`, DESC_PLAZO[plazo])}
                </p>
                {!sinFechas && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="date"
                      value={fechaInicio}
                      min={hoy}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      title={t('cal.plan.fechaInicio', 'Cuándo arranca el plan')}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-white/30"
                    />
                    {plazo === 'fija' && (
                      <>
                        <span className="shrink-0 text-xs text-white/30">→</span>
                        <input
                          type="date"
                          value={fechaObjetivo}
                          min={fechaInicio}
                          onChange={(e) => setFechaObjetivo(e.target.value)}
                          title={t('cal.plan.fechaObjetivo', 'Fecha objetivo')}
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-white/30"
                        />
                      </>
                    )}
                  </div>
                )}
                {plazo === 'fija' && !fechasValidas && (
                  <p className="text-[10px] text-amber-300">
                    {t('cal.plan.fechasInvalidas', 'La fecha objetivo debe ir después del inicio.')}
                  </p>
                )}
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
                  {t('cal.plan.iaApagada', 'La IA no está disponible: revisa tu clave y tu conexión. Mientras, puedes crear el plan a mano.')}
                </p>
              )}
              {fallo && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                  <p>{t('cal.plan.fallo', 'La IA no pudo armar el plan. Reintenta o créalo a mano.')}</p>
                  <p className="mt-1 break-words font-mono text-[10px] text-amber-300">{fallo}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void generar()}
                disabled={cargando || !conIA || dias.length === 0 || !fechasValidas}
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
              <div className="flex justify-center">
                <Creditos op={OP_PLAN_IA} />
              </div>

              {/* La vía sin IA, siempre viva: el plan se guarda vacío y las fases se
                  escriben en su hoja, que es donde de todos modos se retocan. */}
              <div className="space-y-1 border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => void guardarManual()}
                  disabled={guardando || !fechasValidas}
                  className="w-full rounded-xl border border-white/15 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <Icono nombre="editar" /> {t('cal.plan.aMano', 'Crear a mano')}
                </button>
                <p className="text-center text-[10px] leading-relaxed text-white/35">
                  {t('cal.plan.aMano.desc', 'Guarda el plan vacío y escribes tú las fases, sin gastar créditos.')}
                </p>
              </div>
            </>
          )}

          {propuesta !== null && (
            <>
              {/* Lo primero que hay que ver cuando no se dio plazo: cuánto pide la meta.
                  Sin plazo el plan no tiene calendario, así que solo se dice el esfuerzo. */}
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/40">
                  {sinFechas
                    ? t('cal.plan.sinPlazo', 'Sin plazo')
                    : plazo === 'fija'
                      ? t('cal.plan.duracionPlan', 'Duración del plan')
                      : t('cal.plan.duracionPropuesta', 'Tiempo que propone la IA')}
                </p>
                <p className="text-sm font-semibold text-white/90">
                  {t('cal.plan.semanas', '{n} semanas', { n: Math.max(1, Math.round(diasPropuestos / 7)) })}
                  <span className="ml-1 font-normal text-white/40">
                    ({t('cal.plan.duracion', '{n} días', { n: diasPropuestos })}
                    {!sinFechas && (
                      <>
                        {' · '}
                        {t('cal.plan.hasta', 'hasta el {fecha}', {
                          fecha: fechaCorta(isoMasDias(fechaInicio, diasPropuestos - 1)),
                        })}
                      </>
                    )}
                    )
                  </span>
                </p>
              </div>

              <p className="text-xs leading-relaxed text-white/45">
                {propuesta.resumen || t('cal.plan.revisar', 'Este es el plan. Guárdalo para verlo sobre tu cronograma.')}
              </p>

              {/* Solo lectura: un cronograma no es una lista de sugerencias sueltas —
                  quitarle una fase descuadra las fechas de las demás. Si no gusta, se
                  regenera; y ya guardado, se retoca nodo a nodo en su hoja. */}
              {nodosPropuestos.map((n) => (
                <div
                  key={n.id}
                  style={{ marginLeft: n.padre ? 18 : 0 }}
                  className="flex items-baseline gap-2 rounded-lg bg-black/20 px-3 py-2"
                >
                  <span className={`min-w-0 flex-1 text-sm ${n.padre ? 'text-white/75' : 'font-semibold text-white/90'}`}>
                    {n.nombre}
                  </span>
                  {/* Dónde propone la IA que se registre el paso. Inerte hasta guardar:
                      abrir la app dejaría la propuesta a medias y sin guardar. */}
                  {n.enlaceApp && <ChipApp enlace={n.enlaceApp} soloLectura />}
                  {n.ini != null && n.fin != null && (
                    <span className="shrink-0 text-[11px] tabular-nums text-white/35">
                      {fechaCorta(isoMasDias(fechaInicio, n.ini))} – {fechaCorta(isoMasDias(fechaInicio, n.fin))}
                    </span>
                  )}
                </div>
              ))}

              {materialSel.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    {ctxApp?.material?.titulo ?? t('cal.plan.material', 'Material del plan')}
                  </p>
                  <p className="text-[10px] leading-relaxed text-white/35">
                    {t('cal.plan.material.desc', 'Lo que el plan usa de esta app, con su porqué. Se guarda junto al plan.')}
                  </p>
                  {materialSel.map((x, i) => (
                    <div key={x.m.nombre} className="rounded-lg bg-black/20 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleMaterial(i)}
                          aria-pressed={x.activa}
                          title={t('cal.plan.material.usar', 'Incluir en el plan')}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] transition ${
                            x.activa ? 'border-transparent text-black' : 'border-white/20 text-transparent hover:border-white/40'
                          }`}
                          style={x.activa ? { background: color } : undefined}
                        >
                          <Icono nombre="confirmar" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-xs text-white/90">{x.m.nombre}</span>
                        {x.m.rutina && <span className="shrink-0 text-[10px] text-white/35">{x.m.rutina}</span>}
                      </div>
                      {x.activa && x.m.motivo && (
                        <p className="mt-1 text-[10px] leading-relaxed text-white/40">{x.m.motivo}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {sugeridas.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    {t('cal.plan.rutinas', 'Agendar en el calendario')}
                  </p>
                  <p className="text-[10px] leading-relaxed text-white/35">
                    {t(
                      'cal.plan.rutinas.desc',
                      'Las marcadas se agendan en el calendario al guardar el plan, con su hora y sus días.',
                    )}
                  </p>
                  {sugeridas.map((s, i) => (
                    <div key={s.r.actividad.actividadId} className="rounded-lg bg-black/20 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSugerida(i)}
                          aria-pressed={s.activa}
                          title={t('cal.plan.rutinas.usar', 'Agendar esta rutina')}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] transition ${
                            s.activa ? 'border-transparent text-black' : 'border-white/20 text-transparent hover:border-white/40'
                          }`}
                          style={s.activa ? { background: color } : undefined}
                        >
                          <Icono nombre="confirmar" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-xs text-white/90">
                          {s.r.actividad.nombre}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/35">
                          {s.r.tipoEtiqueta}
                          {s.r.actividad.duracionMin ? ` · ${s.r.actividad.duracionMin} min` : ''}
                        </span>
                      </div>
                      {s.activa && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <input
                            type="time"
                            step={900}
                            value={s.hora}
                            onChange={(e) => ponerHoraSugerida(i, e.target.value)}
                            title={t('horario.hora', 'Hora')}
                            className="shrink-0 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums outline-none focus:border-white/30"
                          />
                          {DIAS_SEMANA.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDiaSugerida(i, d)}
                              className={`h-6 flex-1 rounded-md text-[9px] font-semibold uppercase transition ${
                                s.dias.includes(d) ? 'text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
                              }`}
                              style={s.dias.includes(d) ? { background: color } : undefined}
                            >
                              {t(`cal.plan.dia.${d}`, ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d])}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
    </div>
  )
}

/** Fallbacks en español de los plazos; el inglés vive en `dict.ts`. */
const TEXTO_PLAZO: Record<Plazo, string> = {
  sin: 'Sin plazo',
  ia: 'Que la IA lo decida',
  fija: 'Tengo fecha límite',
}

const DESC_PLAZO: Record<Plazo, string> = {
  sin: 'El plan queda como una lista de fases a tu ritmo: no ocupa el calendario. Puedes ponerle fechas después.',
  ia: 'La IA calcula cuánto tiempo pide esta meta con tus horas por semana, y te dice por qué.',
  fija: 'El plan se ajusta para caber antes de esa fecha.',
}

/** Fallbacks en español de los niveles; el inglés vive en `dict.ts`. */
const TEXTO_NIVEL: Record<NivelPartida, string> = {
  cero: 'Desde cero',
  algo: 'Algo de base',
  medio: 'Intermedio',
  avanzado: 'Avanzado',
}
