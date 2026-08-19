import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { confirmar } from '../../state/confirmarStore'
import { useT } from '../../i18n/useT'
import {
  agendada,
  borrarMetaConDescendencia,
  crearMeta,
  hijasDe,
  progresoPasos,
  raizDe,
  resumenAlcance,
  toggleMeta,
  vencida,
} from '../../metas'
import type { PropsArrastre } from '../comun/arrastre'
import { colorDe, colorPorProfundidad } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { PildoraCuenta } from './CuentaRegresiva'
import { DetalleMeta } from './DetalleMeta'

/** Sangría por nivel: el anidamiento se lee de un vistazo sin ocupar mucho ancho. */
const SANGRIA = 14

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
  gesto,
  enMano,
  encima,
  onPlanIA,
  edicion = false,
}: {
  metas: Rutina[]
  meta: Rutina
  profundidad: number
  abierta: boolean
  onPlegar: (abierta: boolean) => void
  metaArmada: Rutina | null
  onArmar: (r: Rutina) => void
  /** El gesto de arrastre compartido; sin él esta fila no se reordena. */
  gesto?: PropsArrastre
  /** Va en la mano: se atenúa como hueco. */
  enMano?: boolean
  /** Lo arrastrado caería aquí: antes de la fila o dentro de ella. */
  encima?: 'antes' | 'dentro' | null
  /** Sin valor = la IA está apagada: el ✨ no se dibuja. */
  onPlanIA?: (r: Rutina) => void
  /**
   * Mandos a la vista. Apagado (lo normal) la fila es solo lo que se lee de un
   * vistazo —nombre y plazo—; encendido salen la palomita, «+ sub-meta», el
   * detalle y el borrar. Lo gobierna el botón ✏️ del eje.
   */
  edicion?: boolean
}) {
  const t = useT()
  const [renombrando, setRenombrando] = useState(false)
  const [nombreTmp, setNombreTmp] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [nombreHija, setNombreHija] = useState('')
  const [detalle, setDetalle] = useState(false)

  const hijas = hijasDe(metas, meta.id)
  const pasos = progresoPasos(meta)
  const armada = metaArmada?.id === meta.id
  const resumen = resumenAlcance(metas, meta)
  const tarde = vencida(meta, new Date().toISOString().slice(0, 10), metas)
  // Terminada por su palomita o porque ya no le queda nada dentro: entonces la
  // cuenta regresiva sobra. `resumen` ya está contado para el marcador de la fila.
  const cumplida = !!meta.completada || (resumen.total > 0 && resumen.hechos === resumen.total)
  // "submeta" en el primer nivel, "subsubmeta" en el segundo, y así — un "sub" más
  // por cada nivel de profundidad, para que el botón diga en qué escalón está.
  const etiquetaHija = t('cal.meta.prefijoSub', 'sub').repeat(profundidad + 1) + t('cal.meta.sufijoMeta', 'meta')

  const confirmarRenombre = () => {
    const n = nombreTmp.trim()
    if (n && meta.id != null) void rutinasRepo.update(meta.id, { nombre: n })
    setRenombrando(false)
  }

  const confirmarHija = () => {
    if (!nombreHija.trim()) return
    const colorPrincipal = colorDe(raizDe(metas, meta))
    void crearMeta(metas, nombreHija, meta, colorPorProfundidad(colorPrincipal, profundidad + 1))
    setNombreHija('')
    onPlegar(true) // la recién nacida no puede quedar escondida
  }

  const borrar = async () => {
    if (meta.id == null) return
    const ok = await confirmar({
      titulo: hijas.length
        ? t('cal.meta.borrarConHijas', '¿Borrar esta meta y todas sus sub-metas?')
        : t('cal.meta.borrar', '¿Borrar esta meta?'),
      mensaje: meta.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await borrarMetaConDescendencia(meta.id)
  }

  // Qué haría soltar aquí lo que se arrastra —antes de la fila (hermanas) o
  // dentro de ella— lo decide el gesto compartido en `Cronograma` y llega ya
  // resuelto en `encima`.
  return (
    <div>
      <div
        // Mientras se renombra el gesto se suelta: teclear no debe arrastrar.
        {...(gesto && !renombrando ? gesto : {})}
        data-rama={meta.id != null ? String(meta.id) : undefined}
        style={{ ...(gesto && !renombrando ? gesto.style : {}), paddingLeft: profundidad * SANGRIA }}
        className={`flex items-center gap-1 rounded-lg px-1 py-0.5 transition ${gesto ? 'cursor-grab' : ''} ${
          encima === 'dentro' ? 'bg-accent/20 ring-1 ring-accent/70' : ''
        } ${encima === 'antes' ? 'border-t-2 border-accent' : ''} ${
          armada ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' : 'hover:bg-white/5'
        } ${enMano ? 'opacity-40' : ''}`}
      >
        <button
          type="button"
          onClick={() => onPlegar(!abierta)}
          disabled={hijas.length === 0}
          title={abierta ? t('cal.meta.plegar', 'Plegar') : t('cal.meta.desplegar', 'Desplegar')}
          className="ui-presion w-2.5 shrink-0 text-[9px] text-white/30 transition hover:text-white/70 disabled:opacity-0"
        >
          {abierta ? '▾' : '▸'}
        </button>

        {edicion && (
          <button
            type="button"
            onClick={() => void toggleMeta(meta)}
            title={t('cal.marcarHecho', 'Marcar como hecho')}
            className={`ui-presion grid h-4 w-4 shrink-0 place-items-center rounded-lg border text-[10px] transition ${
              meta.completada
                ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                : 'border-white/25 hover:border-white/50'
            }`}
          >
            {meta.completada ? '✓' : ''}
          </button>
        )}

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
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 focus:border-accent/60 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onArmar(meta)}
            // Renombrar es editar: sin el modo puesto, un doble clic de más no
            // debe abrir el input encima de lo que se está leyendo.
            onDoubleClick={
              edicion
                ? () => {
                    setNombreTmp(meta.nombre)
                    setRenombrando(true)
                  }
                : undefined
            }
            title={
              edicion
                ? t('cal.meta.armarORenombrar', 'Clic: trazarla en el calendario · Doble clic: renombrar')
                : t('cal.meta.armar', 'Trazarla en el calendario')
            }
            className="ui-presion flex min-w-0 flex-1 items-center gap-1.5 text-start text-xs text-white/85"
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
            {/* Mientras quede algo que hacer, lo que falta (o lo que se pasó). */}
            {!cumplida && <PildoraCuenta meta={meta} />}
          </button>
        )}

        {/* Pasos + sub-metas completos, contra el total que hace falta para el alcance completo. */}
        {edicion && resumen.total > 0 && (
          <span
            className="shrink-0 text-[10px] tabular-nums text-white/35"
            title={t('cal.meta.alcance', 'Pasos y sub-metas completados')}
          >
            {resumen.hechos}/{resumen.total}
          </span>
        )}

        {edicion && (
          <>
            <button
              type="button"
              onClick={() => setAgregando((v) => !v)}
              title={t('cal.meta.agregarHija', 'Agregar una sub-meta')}
              className={`ui-presion shrink-0 px-1 text-[10px] font-medium transition ${
                agregando ? 'text-accent' : 'text-white/30 hover:text-white/70'
              }`}
            >
              + {etiquetaHija}
            </button>
            <button
              type="button"
              onClick={() => setDetalle((v) => !v)}
              title={t('cal.meta.detalle', 'Fechas, pasos y nota')}
              className={`ui-presion shrink-0 px-0.5 text-[10px] transition ${
                detalle || meta.nota || pasos.total > 0 ? 'text-sky-400' : 'text-white/30 hover:text-white/70'
              }`}
            >
              <Icono nombre="lista" />
            </button>
            <button
              type="button"
              onClick={() => void borrar()}
              title={t('rutinas.borrar', 'Borrar')}
              className="ui-presion shrink-0 px-0.5 text-white/30 transition hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </>
        )}
      </div>

      {/* Los dos cuelgan del modo, no solo de su botón: apagar la edición con uno
          abierto los dejaría sueltos bajo una fila que ya no los ofrece. */}
      {edicion && detalle && (
        <DetalleMeta meta={meta} sangria={(profundidad + 1) * SANGRIA} onPlanIA={onPlanIA} />
      )}

      {edicion && agregando && (
        <div style={{ paddingLeft: (profundidad + 1) * SANGRIA }} className="py-0.5 pe-1">
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
            className="w-full rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:border-accent/60 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
