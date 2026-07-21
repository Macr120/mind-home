import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import {
  agendada,
  borrarMetaConDescendencia,
  crearMeta,
  duracionMin,
  hijasDe,
  ponerHorario,
  ponerPeriodo,
  progresoPasos,
  puedeSoltarEn,
  quitarHorario,
  quitarPeriodo,
  raizDe,
  resumenAlcance,
  toggleMeta,
  vencida,
} from '../../metas'
import { iniciarArrastre } from '../arrastre'
import { colorDe, colorPorProfundidad, COLORES_RUTINA } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { PasosMeta } from './PasosMeta'

/** Sangría por nivel: el anidamiento se lee de un vistazo sin ocupar mucho ancho. */
const SANGRIA = 14

const CLASE_CAMPO =
  'rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] tabular-nums text-white/70 focus:outline-none'

/**
 * UNA meta de la lista: su fila y, debajo, lo que despliegue (detalle, pasos, nota).
 * NO pinta sus sub-metas — la lista viene ya aplanada de `filasVisibles`, para que
 * el árbol y el cronograma compartan filas y queden alineados.
 *
 * La fila cabe en una línea a propósito: antes llevaba siete botones más dos
 * inputs de fecha en un segundo renglón, así que cada meta medía tres o cuatro
 * líneas y un cronograma de diez metas no cabía en la pantalla. Lo que se usa
 * siempre (plegar, palomear, el nombre, agregar, borrar) se queda; lo demás vive
 * en el desplegable de detalle.
 */
export function FilaMeta({
  metas,
  meta,
  profundidad,
  abierta,
  onPlegar,
  metaArmada,
  onArmar,
  arrastrada,
  onArrastrar,
  onSoltar,
  onPlanIA,
  sinArrastre,
}: {
  metas: Rutina[]
  meta: Rutina
  profundidad: number
  abierta: boolean
  onPlegar: (abierta: boolean) => void
  metaArmada: Rutina | null
  onArmar: (r: Rutina) => void
  arrastrada: Rutina | null
  onArrastrar: (r: Rutina | null) => void
  onSoltar: (destino: Rutina) => void
  /** Sin valor = la IA está apagada: el ✨ no se dibuja. */
  onPlanIA?: (r: Rutina) => void
  /** Cronograma embebido en una app: reordenar el árbol se hace en el calendario. */
  sinArrastre?: boolean
}) {
  const t = useT()
  const [renombrando, setRenombrando] = useState(false)
  const [nombreTmp, setNombreTmp] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [nombreHija, setNombreHija] = useState('')
  const [detalle, setDetalle] = useState(false)
  const [notaAbierta, setNotaAbierta] = useState(false)
  const [encima, setEncima] = useState(false)

  const hijas = hijasDe(metas, meta.id)
  const pasos = progresoPasos(meta)
  const armada = metaArmada?.id === meta.id
  const resumen = resumenAlcance(metas, meta)
  const tarde = vencida(meta, new Date().toISOString().slice(0, 10))
  // "submeta" en el primer nivel, "subsubmeta" en el segundo, y así — un "sub" más
  // por cada nivel de profundidad, para que el botón diga en qué escalón está.
  const etiquetaHija = t('cal.meta.prefijoSub', 'sub').repeat(profundidad + 1) + t('cal.meta.sufijoMeta', 'meta')

  const confirmarRenombre = () => {
    const n = nombreTmp.trim()
    if (n && meta.id != null) void rutinasRepo.update(meta.id, { nombre: n })
    setRenombrando(false)
  }

  const guardarNota = (texto: string) => {
    if (meta.id != null) void rutinasRepo.update(meta.id, { nota: texto.trim() || undefined })
  }

  const confirmarHija = () => {
    if (!nombreHija.trim()) return
    const colorPrincipal = colorDe(raizDe(metas, meta))
    void crearMeta(metas, nombreHija, meta, colorPorProfundidad(colorPrincipal, profundidad + 1))
    setNombreHija('')
    onPlegar(true) // la recién nacida no puede quedar escondida
  }

  const borrar = () => {
    if (meta.id == null) return
    const msg = hijas.length
      ? t('cal.meta.borrarConHijas', '¿Borrar esta meta y todas sus sub-metas?')
      : t('cal.meta.borrar', '¿Borrar esta meta?')
    if (!window.confirm(msg)) return
    void borrarMetaConDescendencia(metas, meta.id)
  }

  /**
   * Qué haría soltar aquí lo que se arrastra. Sin peldaños, meter una meta dentro
   * de otra vale casi siempre: solo el ciclo es imposible. Ordenar entre hermanas
   * (soltar ANTES de una fila) se reserva a las que ya comparten madre — si no,
   * "antes de" y "dentro de" competirían por el mismo gesto en cada fila.
   */
  const modoSoltar: 'dentro' | 'antes' | null = !arrastrada
    ? null
    : arrastrada.padreId === meta.padreId && arrastrada.id !== meta.id
      ? 'antes'
      : puedeSoltarEn(metas, arrastrada, meta)
        ? 'dentro'
        : null

  return (
    <div>
      <div
        style={{ paddingLeft: profundidad * SANGRIA }}
        draggable={!renombrando && !sinArrastre}
        onDragStart={(e) => {
          iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
          onArrastrar(meta)
        }}
        onDragEnd={() => {
          onArrastrar(null)
          setEncima(false)
        }}
        // La fila vive dentro de la caja de la lista, que también acepta soltar: sin
        // cortar la propagación se ejecutarían los dos y ganaría el de la lista.
        onDragOver={(e) => {
          if (!modoSoltar) return
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          setEncima(true)
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          if (!modoSoltar) return
          e.preventDefault()
          e.stopPropagation()
          setEncima(false)
          onSoltar(meta)
        }}
        className={`flex items-center gap-1 rounded-lg px-1 py-0.5 transition ${
          encima && modoSoltar === 'dentro' ? 'bg-emerald-500/20 ring-1 ring-emerald-400/70' : ''
        } ${encima && modoSoltar === 'antes' ? 'border-t-2 border-emerald-400' : ''} ${
          armada ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' : 'hover:bg-white/5'
        } ${arrastrada?.id === meta.id ? 'opacity-40' : ''}`}
      >
        <button
          type="button"
          onClick={() => onPlegar(!abierta)}
          disabled={hijas.length === 0}
          title={abierta ? t('cal.meta.plegar', 'Plegar') : t('cal.meta.desplegar', 'Desplegar')}
          className="w-2.5 shrink-0 text-[9px] text-white/30 transition hover:text-white/70 disabled:opacity-0"
        >
          {abierta ? '▾' : '▸'}
        </button>

        <button
          type="button"
          onClick={() => void toggleMeta(meta)}
          title={t('cal.marcarHecho', 'Marcar como hecho')}
          className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] transition ${
            meta.completada
              ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
              : 'border-white/25 hover:border-white/50'
          }`}
        >
          {meta.completada ? '✓' : ''}
        </button>

        {renombrando ? (
          <input
            autoFocus
            value={nombreTmp}
            onChange={(e) => setNombreTmp(e.target.value)}
            onBlur={confirmarRenombre}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarRenombre()
              else if (e.key === 'Escape') setRenombrando(false)
            }}
            className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onArmar(meta)}
            onDoubleClick={() => {
              setNombreTmp(meta.nombre)
              setRenombrando(true)
            }}
            title={t('cal.meta.armarORenombrar', 'Clic: trazarla en el calendario · Doble clic: renombrar')}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs text-white/85"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: colorDe(meta) }}
              title={t('cal.meta.colorDe', 'Color de esta meta')}
            />
            <span className={`min-w-0 flex-1 truncate ${meta.completada ? 'line-through opacity-50' : ''}`}>
              <Icono emoji={meta.emoji} /> {meta.nombre}
            </span>
            {/* Sin fecha no hay barra en el eje: se dice aquí, o la meta parece rota. */}
            {!agendada(meta) && (
              <span className="shrink-0 text-[9px] text-white/25">{t('cal.meta.sinFecha', 'sin fecha')}</span>
            )}
            {tarde && <span className="shrink-0 text-[9px] text-red-400/80">{t('cal.meta.tarde', 'vencida')}</span>}
          </button>
        )}

        {/* Pasos + sub-metas completos, contra el total que hace falta para el alcance completo. */}
        {resumen.total > 0 && (
          <span
            className="shrink-0 text-[10px] tabular-nums text-white/35"
            title={t('cal.meta.alcance', 'Pasos y sub-metas completados')}
          >
            {resumen.hechos}/{resumen.total}
          </span>
        )}

        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          title={t('cal.meta.agregarHija', 'Agregar una sub-meta')}
          className={`shrink-0 px-1 text-[10px] font-medium transition ${
            agregando ? 'text-emerald-400' : 'text-white/30 hover:text-white/70'
          }`}
        >
          + {etiquetaHija}
        </button>
        <button
          type="button"
          onClick={() => setDetalle((v) => !v)}
          title={t('cal.meta.detalle', 'Fechas, pasos y nota')}
          className={`shrink-0 px-0.5 text-[10px] transition ${
            detalle || meta.nota || pasos.total > 0 ? 'text-sky-400' : 'text-white/30 hover:text-white/70'
          }`}
        >
          <Icono nombre="lista" />
        </button>
        <button
          type="button"
          onClick={borrar}
          title={t('rutinas.borrar', 'Borrar')}
          className="shrink-0 px-0.5 text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {detalle && (
        <div style={{ paddingLeft: (profundidad + 1) * SANGRIA }} className="space-y-1 py-1 pr-1">
          {/*
            Las fechas se ponen trazando sobre el eje; estos campos son para la
            fecha exacta que a golpe de ratón no sale (o para quitarla). El fin no
            se puede elegir sin inicio: sería un periodo que empieza en ninguna parte.
          */}
          <div className="flex flex-wrap items-center gap-1">
            <input
              type="date"
              value={meta.fechaInicio ?? ''}
              onChange={(e) => void ponerPeriodo(meta, e.target.value, meta.fechaFin ?? e.target.value)}
              title={t('cal.meta.desde', 'Empieza')}
              className={CLASE_CAMPO}
            />
            <input
              type="date"
              value={meta.fechaFin ?? meta.fechaInicio ?? ''}
              disabled={!meta.fechaInicio}
              onChange={(e) => void ponerPeriodo(meta, meta.fechaInicio ?? e.target.value, e.target.value)}
              title={t('cal.meta.hasta', 'Termina')}
              className={`${CLASE_CAMPO} disabled:opacity-30`}
            />
            {agendada(meta) && (
              <button
                type="button"
                onClick={() => void quitarPeriodo(meta)}
                title={t('cal.meta.quitarFechas', 'Quitar las fechas (vuelve a la lista)')}
                className="px-1 text-[10px] text-white/30 transition hover:text-red-400"
              >
                <Icono nombre="basura" />
              </button>
            )}
            {/* El ✨ vive junto a las fechas: aquí es donde ya se decide el "cuándo". */}
            {onPlanIA && (
              <button
                type="button"
                onClick={() => onPlanIA(meta)}
                title={t('cal.plan.ia', 'Planear con IA')}
                className="ml-auto shrink-0 rounded-full border border-violet-400/50 bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200 transition hover:bg-violet-500/35 hover:text-violet-100"
              >
                <Icono nombre="brillo" />
              </button>
            )}
          </div>

          {/* La hora es opcional: con ella la meta ocupa su franja en Día/Semana. */}
          {agendada(meta) && (
            <div className="flex flex-wrap items-center gap-1">
              {meta.hora ? (
                <>
                  <input
                    type="time"
                    value={meta.hora}
                    onChange={(e) => meta.id != null && void ponerHorario(meta.id, e.target.value, duracionMin(meta))}
                    title={t('cal.meta.hora', 'Hora')}
                    className={CLASE_CAMPO}
                  />
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={duracionMin(meta)}
                    onChange={(e) => meta.id != null && void ponerHorario(meta.id, meta.hora!, Number(e.target.value))}
                    title={t('cal.meta.duracion', 'Duración en minutos')}
                    className={`w-11 ${CLASE_CAMPO}`}
                  />
                  <span className="text-[9px] text-white/30">{t('cal.meta.min', 'min')}</span>
                  <button
                    type="button"
                    onClick={() => meta.id != null && void quitarHorario(meta.id)}
                    className="px-1 text-[9px] text-white/30 transition hover:text-white/70"
                  >
                    {t('cal.meta.todoElDia', 'Todo el día')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => meta.id != null && void ponerHorario(meta.id, '08:00', 60)}
                  className="px-1 text-[10px] text-white/35 transition hover:text-white/80"
                >
                  + {t('cal.meta.ponerHora', 'Poner hora')}
                </button>
              )}
            </div>
          )}

          {/* Con nota ya escrita se ve directo; sin ella, un botón la revela (igual
              que "+ paso"/"+ meta") en vez de ocupar sitio siempre. */}
          {meta.nota || notaAbierta ? (
            <input
              autoFocus={notaAbierta && !meta.nota}
              defaultValue={meta.nota ?? ''}
              onBlur={(e) => {
                guardarNota(e.target.value)
                setNotaAbierta(false)
              }}
              // Enter guarda por su cuenta: delegar en blur() falla si el input perdió el foco.
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardarNota(e.currentTarget.value)
                else if (e.key === 'Escape') setNotaAbierta(false)
              }}
              placeholder={t('cal.notaPlaceholder', 'Nota (opcional)')}
              className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[10px] text-white/80 placeholder:text-white/25 focus:outline-none"
            />
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNotaAbierta(true)}
                className="px-1 text-[10px] text-white/35 transition hover:text-white/80"
              >
                + {t('cal.meta.etiquetaNota', 'nota')}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {COLORES_RUTINA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => meta.id != null && void rutinasRepo.update(meta.id, { color: c })}
                title={c}
                style={{ backgroundColor: c }}
                className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
                  colorDe(meta) === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                }`}
              />
            ))}
          </div>

          <PasosMeta meta={meta} sangria={SANGRIA} />
        </div>
      )}

      {agregando && (
        <div style={{ paddingLeft: (profundidad + 1) * SANGRIA }} className="py-0.5 pr-1">
          <input
            autoFocus
            value={nombreHija}
            onChange={(e) => setNombreHija(e.target.value)}
            onBlur={() => {
              confirmarHija()
              setAgregando(false)
            }}
            // Enter deja la caja abierta: así se encadenan varias hermanas de un tirón.
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarHija()
              else if (e.key === 'Escape') setAgregando(false)
            }}
            placeholder={t('cal.meta.nuevaHija', 'Sub-meta…')}
            className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
