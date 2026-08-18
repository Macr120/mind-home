import { useState } from 'react'
import { rutinasRepo } from '../../data/repository'
import { appsParaEnlace } from '../../enlaceApp'
import { asignarAsistenteAApp, asistenteResponsable } from '../../gamificacion/asistentesPlantilla'
import { nombreAsistente } from '../../chat/mascotas'
import { useT } from '../../i18n/useT'
import { esMeta, rangoDe } from '../../metas'
import {
  actividadDeSugerencia,
  idActividadSugerencia,
  sugerenciasDe,
  type ObjetivoSugerido,
} from '../../objetivosSugeridos'
import { getPlantilla } from '../../registry'
import { buscarAgenda } from '../../rutinas'
import { useAsistentes } from '../../state/asistentesStore'
import { useMascota } from '../../state/mascotaStore'
import { agendarActividad } from '../HorarioActividad'
import { Icono } from '../iconos/Icono'
import { DIAS, rutinaNueva } from '../RutinasPanel'
import { vivo } from '../estilos'

/**
 * Proponerse algo en dos toques: eliges la misión de una lista ya escrita y
 * marcas los días. Nada más — ni emoji, ni color, ni frecuencia: eso es lo que
 * pide un EVENTO, y un hábito no es un evento.
 *
 * Se abre de dos maneras. Desde una app ya sabe cuál es (`plantillaId`) y ofrece
 * su catálogo; desde el calendario no, y entonces pregunta primero de qué app es
 * — o ninguna, que son las misiones personales.
 *
 * Quien lo ofrece es el asistente de la app, que es también el que lo recordará
 * después: los avisos de esa app hablan con su voz (`asistenteDeApp` en
 * `core/avisos.ts`). Tocarlo cambia de responsable.
 *
 * Lo aceptado se guarda como una fila de `rutinas`, la misma que escribe
 * cualquier actividad agendada. Por eso no hay tabla nueva, y por eso la misión
 * aparece a la vez en la app, en las Misiones de la casa y en el calendario.
 */

const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6]
/** `dias: []` significa «todos los días»: en pantalla eso son los siete marcados. */
const aPantalla = (dias?: number[]) => (dias?.length ? dias : TODOS_LOS_DIAS)
const aGuardar = (dias: number[]) => (dias.length === TODOS_LOS_DIAS.length ? [] : [...dias].sort())

/** El objetivo libre, que no sale del catálogo. */
const OTRO = '__otro__'
/** Un objetivo personal no es de ninguna app: se pinta con el color del calendario. */
const COLOR_PERSONAL = '#dc2626'

export function AnadirObjetivo({
  plantillaId: appFija,
  color: colorFijo,
  onCerrar,
  onNuevaChecklist,
}: {
  /** La app de la que se abrió; sin ella se pregunta cuál (calendario). */
  plantillaId?: string
  color?: string
  onCerrar: () => void
  /** El camino largo (varios pasos), que sigue viviendo en el editor de rutinas. */
  onNuevaChecklist?: () => void
}) {
  const t = useT()
  const rutinas = rutinasRepo.useAll()
  const lista = useAsistentes((s) => s.lista)
  const guardarAsistente = useAsistentes((s) => s.guardar)
  const activoId = useMascota((s) => s.mascota)

  /** La app elegida en la hoja, cuando no vino dada. `''` = objetivo personal. */
  const [appElegida, setAppElegida] = useState<string | null>(null)
  const plantillaId = appFija ?? appElegida ?? null
  const plantilla = plantillaId ? getPlantilla(plantillaId) : undefined
  const color = colorFijo ?? plantilla?.color ?? COLOR_PERSONAL

  const [elegido, setElegido] = useState<string | null>(null)
  const [dias, setDias] = useState<number[]>(TODOS_LOS_DIAS)
  const [cantidad, setCantidad] = useState(0)
  const [hora, setHora] = useState('')
  const [texto, setTexto] = useState('')
  const [metaId, setMetaId] = useState<number | null>(null)
  const [cambiando, setCambiando] = useState(false)

  const asistente = asistenteResponsable(lista, plantillaId ?? '', activoId)

  // Las metas vivas a las que puede servir el objetivo: las de su app, o las que
  // no son de ninguna cuando el objetivo es personal.
  const metas = (rutinas ?? []).filter(
    (r) => esMeta(r) && !r.completada && (plantillaId ? r.plantillaId === plantillaId : !r.plantillaId),
  )
  const meta = metas.find((m) => m.id === metaId)

  /**
   * El periodo que la meta le impone al objetivo, si de verdad tiene uno. Una meta
   * de UN día no es un periodo, es un hito con fecha: heredarlo encerraría un
   * hábito diario en esa única fecha y el objetivo desaparecería de la lista al
   * instante de crearlo.
   */
  const rango = meta ? rangoDe(meta) : null
  const periodoMeta = rango && rango.ini !== rango.fin ? rango : null

  /**
   * Lo que esta app sugiere y AÚN NO tienes puesto. Un objetivo ya elegido deja
   * de ser una sugerencia: seguir listándolo llena la hoja de cosas que no se
   * pueden hacer y esconde las que sí. Para quitar uno se va a su fila del
   * calendario, que es donde vive de verdad.
   */
  const disponibles = (id: string) =>
    sugerenciasDe(id).filter((s) => !buscarAgenda(rutinas, idActividadSugerencia(id, s.id)))

  const abrir = (s: ObjetivoSugerido) => {
    setElegido(s.id)
    setDias(aPantalla(s.dias))
    setCantidad(s.cantidad?.valor ?? 0)
    setHora('')
    setMetaId(null)
  }

  const abrirOtro = () => {
    setElegido(OTRO)
    setDias(TODOS_LOS_DIAS)
    setCantidad(0)
    setHora('')
    setTexto('')
    setMetaId(null)
  }

  /**
   * Lo que ata el objetivo a la meta elegida: el mismo trato que «Mientras dure,
   * pídeme» del cronograma. El `ritmo` son los días marcados —pedir tres por
   * semana con cinco marcados cerraría la meta antes de tiempo— y el bloque se
   * acota al periodo de la meta, si lo tiene.
   */
  const ataduraMeta = () => {
    if (!meta?.id) return {}
    return {
      deMetaId: meta.id,
      ritmo: { veces: Math.max(1, aGuardar(dias).length || TODOS_LOS_DIAS.length), porPeriodo: 'semana' as const },
      ...(periodoMeta ? { fechaInicio: periodoMeta.ini, fechaFin: periodoMeta.fin } : {}),
    }
  }

  const toggleDia = (i: number) =>
    setDias((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()))

  const anadir = async (s: ObjetivoSugerido) => {
    if (!plantillaId) return
    const actividad = actividadDeSugerencia(plantillaId, s, { cantidad, hora })
    await agendarActividad(actividad, {
      dias: aGuardar(dias),
      repeticion: 'indefinido',
      // Sin hora no hay a qué hora sonar: de eso se encarga el aviso del día que
      // da el asistente (`avisarObjetivos`).
      ...(hora ? { avisar: true } : { hora: '', horaFin: undefined, avisar: false }),
      ...ataduraMeta(),
    })
    setElegido(null)
  }

  const anadirOtro = async () => {
    const nombre = texto.trim()
    if (!nombre) return
    await rutinasRepo.add(
      rutinaNueva({
        plantillaId: plantillaId || undefined,
        nombre,
        emoji: plantilla?.icon ?? '✅',
        color: plantilla?.color ?? COLOR_PERSONAL,
        dias: aGuardar(dias),
        hora,
        avisar: !!hora,
        ...ataduraMeta(),
      }),
    )
    setElegido(null)
    setTexto('')
  }

  /** Los días, la cantidad y la hora: todo lo que se pregunta de un objetivo. */
  const formulario = (s: ObjetivoSugerido | null, onAceptar: () => void, listo: boolean) => (
    <div className="mt-1.5 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
          {t('objetivos.nuevo.dias', '¿Qué días?')}
        </p>
        <div className="flex gap-1">
          {DIAS.map((d, i) => {
            const activo = dias.includes(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDia(i)}
                className={`h-7 flex-1 rounded-md border text-[11px] font-bold transition ${
                  activo
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/40'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {s?.cantidad && (
        <label className="flex items-center gap-2 text-[11px] font-semibold text-white/50">
          {t('objetivos.nuevo.cantidad', '¿Cuánto?')}
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs tabular-nums text-white outline-none focus:border-white/30"
          />
          <span className="text-white/40">{s.cantidad.unidad}</span>
        </label>
      )}

      {/* A qué meta sirve. Sin metas en la app no se pregunta: un desplegable con
          una sola opción vacía es una pregunta sin respuesta posible. */}
      {metas.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-white/50">
            {t('objetivos.nuevo.meta', '¿Para qué meta?')}
            <select
              value={metaId ?? ''}
              onChange={(e) => setMetaId(e.target.value ? Number(e.target.value) : null)}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-white/30"
            >
              <option value="">{t('objetivos.nuevo.sinMeta', 'Ninguna (suelto)')}</option>
              {metas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} {m.nombre}
                </option>
              ))}
            </select>
          </label>
          {/* Que se vea ANTES de aceptar: un objetivo acotado a un periodo futuro
              no aparece hoy, y sin decirlo parece que no se guardó. */}
          {periodoMeta && (
            <p className="mt-1 text-[10px] text-white/40">
              {t('objetivos.nuevo.mientrasDure', 'Solo del {ini} al {fin}, mientras dure la meta.', {
                ini: periodoMeta.ini,
                fin: periodoMeta.fin,
              })}
            </p>
          )}
        </div>
      )}

      {/* La hora es opcional a propósito: es lo que separa un hábito de una alarma. */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-white/50">
          {t('objetivos.nuevo.hora', '¿A una hora?')}
        </span>
        <input
          type="time"
          step={900}
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs tabular-nums text-white outline-none focus:border-white/30"
        />
        {hora && (
          <button
            type="button"
            onClick={() => setHora('')}
            className="rounded-md px-1.5 py-1 text-[11px] text-white/40 transition hover:text-white/80"
          >
            {t('objetivos.nuevo.sinHora', 'Sin hora')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!listo || dias.length === 0}
          onClick={onAceptar}
          className="rounded-lg px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
          style={{ background: color }}
        >
          {t('objetivos.nuevo.anadir', 'Añadir')}
        </button>
        <button
          type="button"
          onClick={() => setElegido(null)}
          className="rounded-lg px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          {t('objetivos.nuevo.cancelar', 'Cancelar')}
        </button>
        {dias.length === 0 && (
          <span className="text-[10px] text-amber-300/80">
            {t('objetivos.nuevo.faltanDias', 'Marca al menos un día.')}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="ui-panel-glass ui-pop max-h-[85vh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quién te lo va a recordar: la cara de la app, no un formulario anónimo.
            Y es de los TUYOS: tocarla cambia quién se hace cargo de esta app. */}
        <div className="mb-2 flex items-start gap-2">
          <button
            type="button"
            onClick={() => setCambiando((v) => !v)}
            title={t('objetivos.nuevo.cambiar', 'Cambiar de asistente')}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20"
          >
            <Icono emoji={asistente?.emoji ?? '✨'} />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setCambiando((v) => !v)}
              className="texto-vivo block max-w-full truncate text-start text-sm font-bold"
              style={vivo(color)}
            >
              {asistente ? nombreAsistente(t, asistente) : t('objetivos.nuevo.nadie', 'Sin asistente')}
              <span className="ms-1 text-[10px] font-normal text-white/40">
                {cambiando ? '▾' : '▸'}
              </span>
            </button>
            {/* Sin app elegida todavía, la pregunta es otra: de qué es el objetivo. */}
            <p className="truncate text-[11px] text-white/50">
              {plantillaId === null
                ? t('objetivos.nuevo.deQueApp', '¿De qué es la misión?')
                : plantilla
                  ? t('objetivos.nuevo.responsable', 'Yo te recuerdo lo de aquí. ¿Qué te propones?')
                  : t('objetivos.nuevo.personal', 'Misión personal, de ninguna app.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title={t('hoy.cerrar', 'Cerrar')}
            className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs transition hover:bg-white/20"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        {/* Vuelta atrás: solo cuando la app se eligió aquí, no cuando vino dada. */}
        {!appFija && appElegida !== null && (
          <button
            type="button"
            onClick={() => {
              setAppElegida(null)
              setElegido(null)
            }}
            className="mb-1.5 flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold text-white/50 transition hover:text-white/85"
          >
            <Icono nombre="volver" />
            {plantilla ? (
              <>
                <Icono emoji={plantilla.icon} />{' '}
                {t(`room.${plantilla.id}.nombre`, plantilla.nombre).split(' · ')[0]}
              </>
            ) : (
              t('objetivos.nuevo.personales', 'Personales')
            )}
          </button>
        )}

        {/* Elegir aquí escribe el MISMO ajuste que «Asignar apps» de su ficha: el
            responsable de la app es uno solo, para los avisos y para todo. */}
        {cambiando && plantillaId && (
          <div className="mb-2 space-y-0.5 rounded-lg border border-white/10 bg-black/20 p-1.5">
            {lista.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  void asignarAsistenteAApp(lista, plantillaId, a.id, guardarAsistente)
                  setCambiando(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-xs transition hover:bg-white/10 ${
                  a.id === asistente?.id ? 'text-white' : 'text-white/60'
                }`}
              >
                <Icono emoji={a.emoji} />
                <span className="min-w-0 flex-1 truncate font-semibold">{nombreAsistente(t, a)}</span>
                {a.id === asistente?.id && (
                  <span className="shrink-0 text-emerald-400">
                    <Icono nombre="confirmar" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Paso 0 (solo desde el calendario): de qué app es. Las apps de la casa,
            más los objetivos personales, que no son de ninguna. */}
        {plantillaId === null ? (
          <div className="space-y-0.5">
            {/* Fuera las que ni traen catálogo ni son un hábito (el cuarto Metas):
                entrar ahí solo ofrecería el objetivo libre, que ya está abajo en
                «Personales». Una app propia del usuario sí entra: no trae catálogo
                todavía, pero proponerse algo en ella tiene todo el sentido. */}
            {appsParaEnlace()
              .filter((p) => sugerenciasDe(p.id).length > 0 || !p.sinMetaDiaria)
              .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAppElegida(p.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-start transition hover:bg-white/5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/85">
                  <Icono emoji={p.icon} /> {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
                </span>
                {/* Lo que QUEDA por proponerse, no el tamaño del catálogo: el
                    número tiene que decir cuánto vas a encontrar al entrar. */}
                {disponibles(p.id).length > 0 && (
                  <span className="shrink-0 text-[10px] tabular-nums text-white/30">
                    {disponibles(p.id).length}
                  </span>
                )}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setAppElegida('')}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-start text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white/85"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLOR_PERSONAL }} />
              <span className="flex-1">{t('objetivos.nuevo.personales', 'Personales')}</span>
            </button>
          </div>
        ) : (
        <div className="space-y-0.5">
          {plantillaId &&
            disponibles(plantillaId).map((s) => {
              const abierto = elegido === s.id
              return (
                <div key={s.id}>
                  <button
                    type="button"
                    onClick={() => (abierto ? setElegido(null) : abrir(s))}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-start transition hover:bg-white/5"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/25 text-[10px] text-transparent">
                      <Icono nombre="confirmar" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/85">
                      <Icono emoji={s.emoji ?? plantilla?.icon ?? '✅'} /> {t(s.clave, s.etiquetaEs)}
                    </span>
                    <span className="shrink-0 text-[10px] text-white/30">
                      {t('objetivos.nuevo.poner', '＋')}
                    </span>
                  </button>
                  {abierto && formulario(s, () => void anadir(s), true)}
                </div>
              )
            })}

          {/* Todo el catálogo puesto: queda el objetivo libre, que no se agota. */}
          {plantillaId && disponibles(plantillaId).length === 0 && sugerenciasDe(plantillaId).length > 0 && (
            <p className="px-2 py-1.5 text-[11px] text-white/40">
              {t('objetivos.nuevo.todos', 'Ya te propusiste todo lo de esta app.')}
            </p>
          )}

          {/* Lo que el catálogo no trae. Mismo formulario: días y ya. */}
          <div>
            <button
              type="button"
              onClick={() => (elegido === OTRO ? setElegido(null) : abrirOtro())}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-start text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white/85"
            >
              <span className="size-5 shrink-0" />
              <span className="flex-1">
                <Icono nombre="agregar" /> {t('objetivos.nuevo.otro', 'Otra misión…')}
              </span>
            </button>
            {elegido === OTRO && (
              <>
                <input
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={t('objetivos.nuevo.otroPlaceholder', '¿Qué te propones?')}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
                {formulario(null, () => void anadirOtro(), texto.trim().length > 0)}
              </>
            )}
          </div>
        </div>
        )}

        {onNuevaChecklist && (
        <button
          type="button"
          onClick={onNuevaChecklist}
          className="mt-2 w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-white/40 transition hover:bg-white/5 hover:text-white/70"
        >
          {t('objetivos.nuevo.checklist', '¿Necesitas varios pasos? Nueva checklist')}
        </button>
        )}
      </div>
    </div>
  )
}
