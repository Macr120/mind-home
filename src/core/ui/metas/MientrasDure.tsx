import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { fechaLocalISO } from '../../fechaLocal'
import { useT } from '../../i18n/useT'
import { avanceRitmo, objetivosDiaDe } from '../../metaDiaria'
import { agendada } from '../../metas'
import { getPlantilla, type RutinaSugerible } from '../../registry'
import { agendarActividad } from '../HorarioActividad'
import { Icono } from '../iconos/Icono'
import { DIAS } from '../RutinasPanel'

/**
 * Lo que una meta le pide a tus días mientras está viva. Es la pieza que amarra el
 * cronograma con lo que pasa dentro de las apps: aquí una meta deja de ser una
 * barra en un eje y se convierte en pasos que aparecen cada día en su cuarto.
 *
 * Dos formas, porque hay dos clases de exigencia:
 * - **Subir el listón** de un objetivo que la app ya mide («2.5 L de agua»). Vive
 *   en `Rutina.objetivosDia` y lo resuelve el núcleo al leer el objetivo del día,
 *   así que se tacha solo con el registro real como cualquier otro.
 * - **Repetir una actividad** ciertos días («correr los L/X/V»). Eso ya sabía
 *   hacerlo la app: se agenda su MISMO bloque de calendario, marcado con
 *   `deMetaId` y `ritmo` para poder contar después cuántos días van.
 *
 * Sin fechas no se pinta nada: sin periodo no hay «mientras dure» que valga.
 */
export function MientrasDure({ meta }: { meta: Rutina }) {
  const t = useT()
  const plantilla = meta.plantillaId ? getPlantilla(meta.plantillaId) : undefined
  const objetivos = useMemo(() => (meta.plantillaId ? objetivosDiaDe(meta.plantillaId) : []), [meta.plantillaId])
  const todas = rutinasRepo.useAll()
  const bloques = (todas ?? []).filter((r) => r.deMetaId === meta.id)

  const [sugeribles, setSugeribles] = useState<RutinaSugerible[]>([])

  useEffect(() => {
    void plantilla?.rutinasPlan?.(meta.ambitoId).then(setSugeribles)
  }, [plantilla, meta.ambitoId])

  // El cronograma solo sabe de pasos y sub-metas: los días de ritmo se cuentan
  // aquí. Por `useLiveQuery` y no por un efecto: lo que mueve este número son las
  // EJECUCIONES, y un efecto atado a las rutinas no se entera de que registraste.
  const avance = useLiveQuery(() => avanceRitmo(meta), [meta.id, meta.fechaInicio, meta.fechaFin])

  if (!plantilla || !agendada(meta)) return null

  const puestos = meta.objetivosDia ?? []
  const libres = objetivos.filter((o) => !puestos.some((p) => p.clave === o.clave))

  const ponerObjetivo = async (clave: string) => {
    const o = objetivos.find((x) => x.clave === clave)
    if (!o || meta.id == null) return
    // Nace con el objetivo que la app pide hoy: subirlo es un paso aparte, y así
    // el número del campo nunca arranca en un 0 que apagaría el objetivo.
    const hoy = await o.del(fechaLocalISO())
    await rutinasRepo.update(meta.id, {
      objetivosDia: [...puestos, { clave, valor: Math.max(1, hoy.objetivo) }],
    })
  }

  const cambiarObjetivo = (clave: string, valor: number) => {
    if (meta.id == null) return
    void rutinasRepo.update(meta.id, {
      objetivosDia: puestos.map((p) => (p.clave === clave ? { ...p, valor } : p)),
    })
  }

  const quitarObjetivo = (clave: string) => {
    if (meta.id == null) return
    const resto = puestos.filter((p) => p.clave !== clave)
    void rutinasRepo.update(meta.id, { objetivosDia: resto.length > 0 ? resto : undefined })
  }

  // El bloque nace acotado al periodo de la meta y sin aviso: la meta pide el
  // hábito, no que suene una alarma que nadie pidió.
  const ponerRitmo = async (actividadId: string) => {
    const s = sugeribles.find((x) => x.actividad.actividadId === actividadId)
    if (!s || meta.id == null) return
    await agendarActividad(s.actividad, {
      deMetaId: meta.id,
      ritmo: { veces: 3, porPeriodo: 'semana' },
      dias: [1, 3, 5],
      repeticion: 'semanal',
      fechaInicio: meta.fechaInicio,
      fechaFin: meta.fechaFin,
      avisar: false,
    })
  }

  const cambiarDias = (r: Rutina, dia: number) => {
    if (r.id == null) return
    const dias = r.dias.includes(dia) ? r.dias.filter((d) => d !== dia) : [...r.dias, dia].sort()
    void rutinasRepo.update(r.id, {
      dias,
      // El ritmo son los días marcados: pedir «3 por semana» y tener 5 marcados
      // haría que la meta se cerrara antes de tiempo.
      ritmo: { veces: Math.max(1, dias.length), porPeriodo: 'semana' },
    })
  }

  return (
    <div className="space-y-1 rounded-lg border border-white/10 bg-black/20 p-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-white/35">
        {t('cal.meta.mientrasDure', 'Mientras dure, pídeme')}
      </p>

      {puestos.map((p) => {
        const o = objetivos.find((x) => x.clave === p.clave)
        return (
          <div key={p.clave} className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">
              {t(p.clave, o?.etiquetaEs ?? p.clave)}
            </span>
            <input
              type="number"
              min={1}
              value={p.valor}
              onChange={(e) => cambiarObjetivo(p.clave, Math.max(1, Number(e.target.value)))}
              className="w-14 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] tabular-nums text-white/70 focus:outline-none"
            />
            <span className="w-8 shrink-0 text-[9px] text-white/30">{o?.unidad ?? ''}</span>
            <button
              type="button"
              onClick={() => quitarObjetivo(p.clave)}
              title={t('rutinas.borrar', 'Borrar')}
              className="px-1 text-[10px] text-white/25 transition hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </div>
        )
      })}

      {bloques.map((b) => (
        <div key={b.id} className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">
              {b.emoji} {b.nombre}
            </span>
            {avance && (
              <span className="shrink-0 text-[9px] tabular-nums text-white/35">
                {t('cal.meta.diasRitmo', '{hechos}/{pedidos} días', {
                  hechos: avance.hechos,
                  pedidos: avance.pedidos,
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => b.id != null && void rutinasRepo.remove(b.id)}
              title={t('rutinas.borrar', 'Borrar')}
              className="px-1 text-[10px] text-white/25 transition hover:text-red-400"
            >
              <Icono nombre="basura" />
            </button>
          </div>
          <div className="flex gap-0.5">
            {DIAS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => cambiarDias(b, i)}
                className={`h-5 flex-1 rounded border text-[9px] font-bold transition ${
                  b.dias.includes(i)
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/40'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-1">
        {libres.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && void ponerObjetivo(e.target.value)}
            className="rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] text-white/60 focus:outline-none"
          >
            <option value="">+ {t('cal.meta.unObjetivo', 'un objetivo del día')}</option>
            {libres.map((o) => (
              <option key={o.clave} value={o.clave}>
                {t(o.clave, o.etiquetaEs)}
              </option>
            ))}
          </select>
        )}
        {sugeribles.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && void ponerRitmo(e.target.value)}
            className="rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[10px] text-white/60 focus:outline-none"
          >
            <option value="">+ {t('cal.meta.unaActividad', 'una actividad cada semana')}</option>
            {sugeribles.map((s) => (
              <option key={s.actividad.actividadId} value={s.actividad.actividadId}>
                {s.actividad.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
