import { useMemo, useState } from 'react'
import type { EnlaceApp, NodoPlan, PlanMeta, Rutina } from '../../data/db'
import { planesMetaRepo } from '../../data/repository'
import { isoMasDias } from '../../fechaLocal'
import { localeActual, useT } from '../../i18n/useT'
import { enlazarMeta, profundidadDe, raizDe } from '../../metas'
import {
  aceptarPlan,
  agregarNodoPlan,
  borrarNodoPlan,
  diasDePlan,
  enlazarNodoPlan,
  espejoDePlan,
  fecharNodoPlan,
  nodoFechado,
  nodoHecho,
  nodoIncoherente,
  origenDePlan,
  progresoNodo,
  progresoPlan,
  quitarFechasNodoPlan,
  rangoDeNodo,
  reanclarPlan,
  renombrarNodoPlan,
  reordenarNodoPlan,
  resumenNodo,
  resumenPlan,
  toggleNodoPlan,
} from '../../planMeta'
import { confirmar } from '../../state/confirmarStore'
import { colorDe, colorPorProfundidad } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { ChipApp, SelectorApp } from './ChipApp'
import { COLOR_PLAN } from '../../../rooms/metas/constantes'
import { VERDE } from '../../../rooms/_shared/acento'
import { BotonPeligro, BotonPrimario, BotonSecundario } from '../../../rooms/_shared/ui'

const SANGRIA = 18

/**
 * El plan leído como una hoja: cada fase y cada sub-meta con su check a la
 * izquierda, su barra de avance y su periodo. Es la vista que faltaba — el plan se
 * guardaba y solo se podía volver a ver comprimido en la columna de 19 rem del
 * cronograma, o directamente no se encontraba.
 *
 * Mientras el plan es propuesta, las palomas viven en él y sus nodos se retocan
 * aquí. Aceptado, cada nodo queda amarrado a la sub-meta real que nació de él
 * (`espejoDePlan`) y tanto los checks como las barras pasan a ser las del
 * cronograma: una sola verdad, no dos avances que se contradicen.
 *
 * Todo vive dentro del scroll, cabecera aparte: la acción («Mover a cronograma real»
 * o «Ver en el cronograma») cierra la lectura de la hoja en vez de reservarse una
 * barra fija que en una caja embebida de 384 px se come la mitad de las fases.
 */
export function HojaPlan({
  plan,
  metas,
  onVolver,
  volverA,
  onVerEnCronograma,
  onVerMeta,
  etiqueta,
}: {
  plan: PlanMeta
  metas: Rutina[]
  onVolver: () => void
  /** A dónde devuelve el ‹ (a las metas o a los planes, según de dónde se entró). */
  volverA?: string
  onVerEnCronograma: () => void
  /** Abre la hoja de la meta: aquí solo se toca el plan, no sus fechas ni su nota. */
  onVerMeta?: (r: Rutina) => void
  /** «Jardín · Plan 1»: de quién es y qué número hace. Sin ella, el nombre guardado. */
  etiqueta?: string
}) {
  const t = useT()
  const [verMaterial, setVerMaterial] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // El alta de fases vive aquí, en la hoja, y no en un diálogo: escribir un plan es
  // encadenar fases, y un pop-up por cada una es un clic de más y el foco perdido.
  const [agregandoFase, setAgregandoFase] = useState(false)
  const [nombreFase, setNombreFase] = useState('')
  // El arrastre de la lista: qué nodo va en la mano y sobre qué fila cae.
  const [arrastrado, setArrastrado] = useState<number | null>(null)
  const [destino, setDestino] = useState<{ id: number; dentro: boolean } | null>(null)

  const espejo = useMemo(() => espejoDePlan(plan, metas), [plan, metas])
  const aceptado = !!plan.aceptadoEn
  // Sin un solo nodo fechado el plan no toca el calendario: no hay arranque que
  // enseñar ni duración que contar, y lo que se ve es «Sin plazo».
  const dias = diasDePlan(plan.nodos)
  const fases = plan.nodos.filter((n) => n.padre === undefined)
  const avance = progresoPlan(plan, espejo, metas)
  const resumen = resumenPlan(plan, espejo, metas)
  const material = plan.material ?? []
  const origen = metas.find((m) => m.id === plan.metaId)

  const locale = localeActual()
  const fechaCorta = (iso: string) =>
    new Date(iso + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  /**
   * El origen se resuelve contra la BD, no contra `metas`: esta lista viene filtrada
   * a una app o al filtro del calendario, y `aceptarPlan` necesita el árbol entero
   * para renumerar hermanas y calcular color y profundidad.
   */
  const aceptar = async () => {
    if (aceptado || ocupado) return
    setOcupado(true)
    try {
      const { metas: vivas, origen: real } = await origenDePlan(plan)
      if (!real) {
        setAviso(t('cal.plan.origenPerdido', 'La meta de este plan ya no existe.'))
        return
      }
      const ok = await confirmar({
        titulo: t(
          'cal.plan.aceptarConfirma',
          '¿Agregar las {n} sub-metas de «{plan}» a «{meta}»? Las que ya tiene se conservan.',
          { n: plan.nodos.length, plan: etiqueta ?? plan.nombre, meta: real.nombre },
        ),
        textoOk: t('cal.plan.aceptar', 'Mover a cronograma real'),
      })
      if (!ok) return
      const colorPrincipal = colorDe(raizDe(vivas, real))
      const base = profundidadDe(vivas, real)
      const creadas = await aceptarPlan(vivas, plan, real, (p) =>
        colorPorProfundidad(colorPrincipal, base + p + 1),
      )
      setAviso(
        t('cal.plan.aceptadoResumen', 'Listo: {n} sub-metas dentro de «{meta}».', {
          n: creadas,
          meta: real.nombre,
        }),
      )
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Reordenar arrastrando: se suelta sobre la mitad de arriba de una fila para
   * quedar delante de ella, o sobre la mitad de abajo de una FASE para colgarse
   * dentro. Los tres gestos viven en el asa porque ella captura el puntero.
   */
  const iniciarArrastre = (id: number, e: React.PointerEvent) => {
    if (aceptado) return
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el gesto sigue igual; ver `capturarPointer` en BarraMeta.
    }
    setArrastrado(id)
  }

  const moverArrastre = (e: React.PointerEvent) => {
    if (arrastrado == null) return
    const fila = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-nodo]')
    const id = fila ? Number(fila.getAttribute('data-nodo')) : NaN
    if (!fila || Number.isNaN(id) || id === arrastrado) {
      setDestino(null)
      return
    }
    const caja = fila.getBoundingClientRect()
    const esFase = fila.getAttribute('data-fase') === '1'
    setDestino({ id, dentro: esFase && e.clientY > caja.top + caja.height / 2 })
  }

  const soltarArrastre = () => {
    if (arrastrado != null && destino) void reordenarNodoPlan(plan, arrastrado, destino.id, destino.dentro)
    setArrastrado(null)
    setDestino(null)
  }

  const crearFase = () => {
    if (nombreFase.trim()) void agregarNodoPlan(plan, undefined, nombreFase)
    setNombreFase('')
  }

  const borrarPlan = async () => {
    if (plan.id == null) return
    const ok = await confirmar({
      titulo: t('cal.plan.borrar', '¿Borrar este plan?'),
      mensaje: etiqueta ?? plan.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    await planesMetaRepo.remove(plan.id)
    onVolver()
  }

  return (
    <div className="space-y-3">
      {/* Cabecera: qué plan es, cuándo arranca y cómo va — en dos renglones, que en
          una caja embebida de 384 px cada uno se paga en fases que no se ven. */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-tut="cal.plan.volver"
            onClick={onVolver}
            className="ui-presion shrink-0 rounded-lg px-1.5 py-0.5 text-2xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
          >
            ‹ {volverA ?? t('cal.meta.volverMetas', 'Volver a las metas')}
          </button>
          {/* La meta manda en el título; de qué plan es, en pequeño encima. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xs font-bold uppercase tracking-wider text-plan/80">
              <Icono nombre="brillo" /> {etiqueta ?? plan.nombre}
            </p>
            <p className="truncate text-sm font-semibold text-white/90">{origen?.nombre ?? plan.nombre}</p>
          </div>
          {/* Lo de la meta (fechas, nota, color, sub-metas propias) se toca en SU
              hoja: aquí solo vive el plan. */}
          {origen && onVerMeta && (
            <button
              type="button"
              data-tut="cal.plan.verMeta"
              onClick={() => onVerMeta(origen)}
              className="ui-presion shrink-0 rounded-lg px-1.5 py-0.5 text-2xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/85"
            >
              {t('cal.meta.verMeta', 'Ver la meta')}
            </button>
          )}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${
              aceptado
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-plan/15 text-plan'
            }`}
          >
            {aceptado
              ? t('cal.plan.estado.aceptado', 'En tu cronograma')
              : t('cal.plan.estado.propuesta', 'Propuesta')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dias === 0 ? (
            <>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-2xs font-semibold text-white/60">
                {t('cal.plan.sinPlazo', 'Sin plazo')}
              </span>
              <span className="text-2xs text-white/30">
                {t('cal.plan.fases', '{n} fases', { n: fases.length })}
              </span>
            </>
          ) : (
            <>
              {/* Los días del plan son relativos: cambiar el arranque lo corre entero sin
                  volver a llamar a la IA. */}
              <span className="text-2xs text-white/35">{t('cal.plan.arranque', 'Arranca')}</span>
              <input
                type="date"
                value={plan.inicioISO}
                onChange={(e) => void reanclarPlan(plan, e.target.value)}
                title={t('cal.plan.reanclar', 'Cambia el arranque: el plan entero se corre, sin volver a llamar a la IA')}
                className="w-[120px] shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-0.5 text-2xs tabular-nums text-white/70 focus:border-accent/60 focus:outline-none"
              />
              <span className="text-2xs text-white/30">
                {t('cal.plan.duracion', '{n} días', { n: dias })} ·{' '}
                {t('cal.plan.fases', '{n} fases', { n: fases.length })}
              </span>
            </>
          )}

          {/* El avance comparte renglón con el arranque, y dónde viven las palomas se
              dice al posarse encima: era un párrafo entero para una frase que solo se
              lee la primera vez. */}
          <div data-tut="cal.plan.hoja.avance" className="flex min-w-[8rem] flex-1 items-center gap-2">
            <div
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
              title={
                aceptado
                  ? t('cal.plan.avisoEspejo', 'Palomeas la sub-meta real: el avance es el de tu cronograma.')
                  : t('cal.plan.avisoPropio', 'Todavía es una propuesta: lo que palomees vive en la hoja.')
              }
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${Math.round(avance * 100)}%`, background: aceptado ? VERDE : COLOR_PLAN }}
              />
            </div>
            <span className="shrink-0 text-2xs font-semibold tabular-nums text-white/60">
              {Math.round(avance * 100)}%
            </span>
            <span className="shrink-0 text-2xs tabular-nums text-white/35">
              {resumen.hechos}/{resumen.total}
            </span>
          </div>
        </div>
      </div>

      {/* Cuerpo: la hoja en sí */}
      <div data-tut="cal.plan.hoja.fases" className="space-y-2">
        {plan.resumen && (
          <div className="rounded-xl bg-black/20 px-3 py-2">
            <p className="mb-1 text-2xs uppercase tracking-wide text-white/35">
              {t('cal.plan.resumenIA', 'Lo que propone la IA')}
            </p>
            <p className="text-xs leading-relaxed text-white/60">{plan.resumen}</p>
          </div>
        )}

        {fases.map((f) => (
          <FilaHoja
            key={f.id}
            plan={plan}
            nodo={f}
            profundidad={0}
            metas={metas}
            espejo={espejo}
            fechaCorta={fechaCorta}
            arrastrado={arrastrado}
            destino={destino}
            onArrastrar={iniciarArrastre}
            onMoverArrastre={moverArrastre}
            onSoltarArrastre={soltarArrastre}
          />
        ))}

        {plan.nodos.length === 0 && (
          <p className="py-6 text-center text-xs text-white/30">
            {aceptado
              ? t('cal.plan.sinNodos', 'Este plan se quedó sin fases.')
              : t('cal.plan.sinNodosEditable', 'Todavía no tiene fases: escribe la primera y cuélgale sus sub-metas.')}
          </p>
        )}

        {/* El alta de fases: sin esto un plan hecho a mano nacía vacío y se quedaba
            así — el botón de la fila solo cuelga sub-metas DE una fase. */}
        {!aceptado &&
          (agregandoFase ? (
            <input
              autoFocus
              value={nombreFase}
              onChange={(e) => setNombreFase(e.target.value)}
              onBlur={() => {
                crearFase()
                setAgregandoFase(false)
              }}
              // Enter deja la caja abierta: así se encadenan varias fases de un tirón.
              onKeyDown={(e) => {
                if (e.key === 'Enter') crearFase()
                else if (e.key === 'Escape') setAgregandoFase(false)
              }}
              placeholder={t('cal.plan.nuevaFase', 'Nombre de la fase…')}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs text-white/90 placeholder:text-white/25 focus:border-accent/60 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAgregandoFase(true)}
              className="ui-presion w-full rounded-lg border border-dashed border-white/15 py-1.5 text-2xs font-semibold text-white/45 transition hover:border-white/30 hover:text-white/80"
            >
              <Icono nombre="agregar" /> {t('cal.plan.agregarFase', 'Agregar fase')}
            </button>
          ))}

        {/* El material del plan sigue consultable incluso después de aceptarlo: el
            plan no se borra, se marca. */}
        {material.length > 0 && (
          <div className="space-y-1 pt-2">
            <button
              type="button"
              onClick={() => setVerMaterial((v) => !v)}
              className="ui-presion text-2xs font-semibold text-white/45 transition hover:text-white/80"
            >
              {verMaterial ? '▾' : '▸'} {t('cal.plan.material.n', 'Material del plan ({n})', { n: material.length })}
            </button>
            {verMaterial &&
              material.map((m) => (
                <div key={m.nombre} className="rounded-lg bg-black/20 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 text-xs font-semibold text-white/85">{m.nombre}</span>
                    {m.rutina && <span className="shrink-0 text-2xs text-white/35">{m.rutina}</span>}
                  </div>
                  {m.motivo && <p className="mt-0.5 text-2xs leading-relaxed text-white/45">{m.motivo}</p>}
                </div>
              ))}
          </div>
        )}

        {/* La acción del plan cierra la hoja, dentro del scroll y del ancho de las
            fases: es el último paso de leerla, no una barra que ocupe sitio todo el
            rato. */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {aviso && <p className="min-w-0 flex-1 text-2xs text-emerald-300/90">{aviso}</p>}
          {aceptado ? (
            <BotonSecundario
              // Solo existe en la hoja de un plan ACEPTADO: el tour lo usa para
              // saber que ya montó la hoja correcta (`cal.plan.hoja.avance` está en
              // las dos y resolvería sobre la que todavía sigue en pantalla).
              data-tut="cal.plan.hoja.verCronograma"
              onClick={onVerEnCronograma}
              pequeno
            >
              <Icono nombre="calendario" /> {t('cal.plan.verCronograma', 'Ver en el cronograma')}
            </BotonSecundario>
          ) : !origen ? (
            <>
              <p className="min-w-0 flex-1 text-2xs text-amber-200/80">
                {t('cal.plan.origenPerdido', 'La meta de este plan ya no existe.')}
              </p>
              <BotonPeligro onClick={() => void borrarPlan()} pequeno>
                {t('cal.plan.borrarEste', 'Borrar el plan')}
              </BotonPeligro>
            </>
          ) : (
            <>
              <BotonSecundario
                // Ancla propia (NO `verCronograma`): esa solo existe en la hoja de
                // un plan ACEPTADO y los tours la usan como discriminador.
                data-tut="cal.plan.hoja.verEje"
                onClick={onVerEnCronograma}
                pequeno
              >
                <Icono nombre="calendario" /> {t('cal.plan.verCronograma', 'Ver en el cronograma')}
              </BotonSecundario>
              <BotonPrimario
                // Espejo de `verCronograma`: solo existe mientras el plan es propuesta.
                data-tut="cal.plan.hoja.aceptar"
                onClick={() => void aceptar()}
                disabled={ocupado}
                color={VERDE}
                pequeno
              >
                <Icono nombre="hecho" /> {t('cal.plan.aceptar', 'Mover a cronograma real')}
              </BotonPrimario>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Una fase o sub-meta de la hoja: check, nombre, periodo, fracción y, si tiene
 * hijas, su barra. Recursiva — es la hoja completa, no la columna comprimida del
 * eje (eso es `FilaPlanNodo`, que además no lleva ni check ni barra).
 */
function FilaHoja({
  plan,
  nodo,
  profundidad,
  metas,
  espejo,
  fechaCorta,
  arrastrado,
  destino,
  onArrastrar,
  onMoverArrastre,
  onSoltarArrastre,
}: {
  plan: PlanMeta
  nodo: NodoPlan
  profundidad: number
  metas: Rutina[]
  espejo: Map<number, Rutina>
  fechaCorta: (iso: string) => string
  arrastrado: number | null
  destino: { id: number; dentro: boolean } | null
  onArrastrar: (id: number, e: React.PointerEvent) => void
  onMoverArrastre: (e: React.PointerEvent) => void
  onSoltarArrastre: () => void
}) {
  const t = useT()
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(nodo.nombre)
  const [fechas, setFechas] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [nombreHijo, setNombreHijo] = useState('')
  const [enlazando, setEnlazando] = useState(false)

  // En el orden del plan, que es el que se arrastra; las fechas no mandan aquí.
  const hijos = plan.nodos.filter((n) => n.padre === nodo.id)
  const hecho = nodoHecho(plan, nodo, espejo, metas)
  const avance = progresoNodo(plan, nodo, espejo, metas)
  const resumen = resumenNodo(plan, nodo, espejo, metas)
  const rango = rangoDeNodo(plan, nodo)
  const incoherente = nodoIncoherente(plan, nodo)
  // Editable solo mientras es propuesta: aceptado, lo que se retoca son las
  // sub-metas reales, en el cronograma.
  const editable = !plan.aceptadoEn
  const enMano = arrastrado === nodo.id
  const cae = destino?.id === nodo.id ? destino : null
  // El chip de app es lo ÚNICO que se sigue tocando con el plan aceptado: entonces
  // se escribe en la sub-meta real, que es la que va a llevar el paso al día a día.
  // Con espejo manda ELLA aunque no tenga chip (misma regla que `progresoNodo`): si
  // no, quitarlo aquí resucitaría el que el nodo guarda de cuando era propuesta.
  const real = espejo.get(nodo.id)
  const enlace = real ? real.enlaceApp : nodo.enlaceApp

  const guardarNombre = () => {
    setEditando(false)
    if (nombre.trim() && nombre.trim() !== nodo.nombre) void renombrarNodoPlan(plan, nodo.id, nombre)
  }

  const crearHijo = () => {
    if (nombreHijo.trim()) void agregarNodoPlan(plan, nodo.id, nombreHijo)
    setNombreHijo('')
  }

  const ponerEnlace = (e: EnlaceApp | undefined) => {
    if (real) void enlazarMeta(real, e)
    else void enlazarNodoPlan(plan, nodo.id, e)
    setEnlazando(false)
  }

  const borrar = async () => {
    const ok = await confirmar({
      titulo: t('cal.plan.borrarNodo', '¿Quitar esta fase del plan y todo lo que cuelga de ella?'),
      mensaje: nodo.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await borrarNodoPlan(plan, nodo.id)
  }

  return (
    <div style={{ marginLeft: profundidad * SANGRIA }}>
      <div
        data-nodo={nodo.id}
        data-fase={profundidad === 0 ? '1' : '0'}
        className={`group rounded-lg px-2.5 py-1.5 transition ${
          profundidad === 0 ? 'bg-white/[0.06]' : 'bg-black/20'
        } ${enMano ? 'opacity-40' : ''} ${
          // Dónde va a caer lo que se arrastra: encima de esta fila, o dentro de ella.
          cae?.dentro ? 'ring-2 ring-plan/70' : cae ? 'border-t-2 border-plan' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {editable && (
            <span
              onPointerDown={(e) => onArrastrar(nodo.id, e)}
              onPointerMove={onMoverArrastre}
              onPointerUp={onSoltarArrastre}
              onPointerCancel={onSoltarArrastre}
              title={t('cal.plan.arrastrar', 'Arrastra para reordenar o colgar de otra fase')}
              className="shrink-0 cursor-grab touch-none text-2xs text-white/20 transition hover:text-white/60 active:cursor-grabbing"
            >
              <Icono nombre="mover" />
            </span>
          )}
          <button
            type="button"
            data-tut="cal.plan.hoja.check"
            onClick={() => void toggleNodoPlan(plan, nodo, espejo)}
            title={t('cal.marcarHecho', 'Marcar como hecho')}
            className={`ui-presion grid h-4 w-4 shrink-0 place-items-center rounded-lg border text-2xs transition ${
              hecho
                ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                : 'border-white/25 hover:border-white/50'
            }`}
          >
            {hecho ? '✓' : ''}
          </button>

          {editable && editando ? (
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={guardarNombre}
              onKeyDown={(e) => e.key === 'Enter' && guardarNombre()}
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-1.5 py-0.5 text-xs text-white/90 outline-none"
            />
          ) : (
            <span
              className={`min-w-0 flex-1 truncate ${
                profundidad === 0 ? 'text-sm font-semibold text-white/90' : 'text-xs text-white/75'
              } ${hecho ? 'line-through opacity-50' : ''}`}
            >
              {nodo.nombre}
            </span>
          )}

          {/* Dónde se registra este paso: un toque abre esa app. Se quita desde el
              propio chip, así no hace falta volver a abrir el selector. */}
          {enlace && <ChipApp enlace={enlace} onQuitar={() => ponerEnlace(undefined)} />}

          {incoherente && (
            <span
              title={t('cal.plan.incoherente', 'Se sale del periodo de su fase')}
              className="shrink-0 text-2xs text-amber-400"
            >
              <Icono nombre="alerta" />
            </span>
          )}
          {rango ? (
            <span className="shrink-0 text-2xs tabular-nums text-white/30">
              {fechaCorta(rango.ini)} – {fechaCorta(rango.fin)}
            </span>
          ) : (
            <span className="shrink-0 text-2xs text-white/20">{t('cal.plan.sinFecha', 'Sin fecha')}</span>
          )}
          {resumen.total > 0 && (
            <span
              className="shrink-0 text-2xs tabular-nums text-white/35"
              title={t('cal.meta.alcance', 'Pasos y sub-metas completados')}
            >
              {resumen.hechos}/{resumen.total}
            </span>
          )}

          {/* Enlazar sigue vivo con el plan aceptado (escribe en la sub-meta real):
              es justo entonces cuando el paso se empieza a hacer de verdad. */}
          {(editable || real) && !editando && (
            <button
              type="button"
              onClick={() => setEnlazando((v) => !v)}
              title={t('cal.enlace.poner', 'Enlazar con la app donde se registra')}
              className={`ui-presion hidden shrink-0 px-0.5 text-2xs transition hover:text-white/80 group-hover:block ${
                enlazando ? 'text-accent' : 'text-white/30'
              }`}
            >
              <Icono nombre="vincular" />
            </button>
          )}

          {editable && !editando && (
            <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                type="button"
                onClick={() => {
                  setNombre(nodo.nombre)
                  setEditando(true)
                }}
                title={t('cal.plan.renombrar', 'Renombrar')}
                className="ui-presion px-0.5 text-2xs text-white/30 transition hover:text-white/80"
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => setFechas((v) => !v)}
                title={t('cal.plan.fechasNodo', 'Poner o cambiar fechas')}
                className={`ui-presion px-0.5 text-2xs transition hover:text-white/80 ${
                  rango ? 'text-white/30' : 'text-plan/60'
                }`}
              >
                <Icono nombre="calendario" />
              </button>
              {profundidad === 0 && (
                <button
                  type="button"
                  onClick={() => setAgregando((v) => !v)}
                  title={t('cal.plan.agregarNodo', 'Agregar sub-meta a la fase')}
                  className={`ui-presion px-0.5 text-2xs transition hover:text-white/80 ${
                    agregando ? 'text-accent' : 'text-white/30'
                  }`}
                >
                  <Icono nombre="agregar" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void borrar()}
                title={t('rutinas.borrar', 'Borrar')}
                className="ui-presion px-0.5 text-2xs text-white/30 transition hover:text-red-400"
              >
                <Icono nombre="basura" />
              </button>
            </span>
          )}
        </div>

        {/* La barra solo donde dice algo: un nodo hoja ya lo cuenta todo su check. */}
        {hijos.length > 0 && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.round(avance * 100)}%`,
                background: plan.aceptadoEn ? VERDE : COLOR_PLAN,
              }}
            />
          </div>
        )}

        {enlazando && (
          <div className="mt-1">
            <SelectorApp onElegir={ponerEnlace} onCerrar={() => setEnlazando(false)} />
          </div>
        )}

        {/* Teclear las fechas, para quien no quiera arrastrarlas en el eje. Un nodo
            sin fechar arranca con los dos huecos vacíos: elegir el inicio le da ese
            mismo día, y el segundo input lo estira. */}
        {editable && fechas && (
          <div className="mt-1 flex items-center gap-1">
            <input
              type="date"
              value={rango?.ini ?? ''}
              onChange={(e) => {
                if (!e.target.value) return
                // Mover el inicio corre el nodo entero conservando su duración.
                const dias = nodoFechado(nodo) ? nodo.fin - nodo.ini : 0
                void fecharNodoPlan(plan, nodo.id, e.target.value, isoMasDias(e.target.value, dias))
              }}
              title={t('cal.plan.nodoIni', 'Empieza')}
              className="w-[110px] shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-0.5 text-2xs tabular-nums text-white/60 focus:border-accent/60 focus:outline-none"
            />
            <span className="text-2xs text-white/30">→</span>
            <input
              type="date"
              value={rango?.fin ?? ''}
              min={rango?.ini}
              disabled={!rango}
              onChange={(e) => {
                if (e.target.value && rango) void fecharNodoPlan(plan, nodo.id, rango.ini, e.target.value)
              }}
              title={t('cal.plan.nodoFin', 'Termina')}
              className="w-[110px] shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-0.5 text-2xs tabular-nums text-white/60 focus:border-accent/60 focus:outline-none disabled:opacity-40"
            />
            {rango && (
              <button
                type="button"
                onClick={() => void quitarFechasNodoPlan(plan, nodo.id)}
                title={t('cal.plan.quitarFechas', 'Quitarle las fechas')}
                className="ui-presion px-0.5 text-2xs text-white/30 transition hover:text-white/80"
              >
                <Icono nombre="quitar" />
              </button>
            )}
          </div>
        )}
      </div>

      {agregando && (
        <div style={{ marginLeft: SANGRIA }} className="mt-1">
          <input
            autoFocus
            value={nombreHijo}
            onChange={(e) => setNombreHijo(e.target.value)}
            onBlur={() => {
              crearHijo()
              setAgregando(false)
            }}
            // Enter deja la caja abierta: así se encadenan varias hermanas de un tirón.
            onKeyDown={(e) => {
              if (e.key === 'Enter') crearHijo()
              else if (e.key === 'Escape') setAgregando(false)
            }}
            placeholder={t('cal.plan.nuevoNodo', 'Sub-meta…')}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:border-accent/60 focus:outline-none"
          />
        </div>
      )}

      <div className="mt-1 space-y-1">
        {hijos.map((h) => (
          <FilaHoja
            key={h.id}
            plan={plan}
            nodo={h}
            profundidad={profundidad + 1}
            metas={metas}
            espejo={espejo}
            fechaCorta={fechaCorta}
            arrastrado={arrastrado}
            destino={destino}
            onArrastrar={onArrastrar}
            onMoverArrastre={onMoverArrastre}
            onSoltarArrastre={onSoltarArrastre}
          />
        ))}
      </div>
    </div>
  )
}
