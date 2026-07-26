import { Icono } from '../../core/ui/iconos/Icono'
import { useEffect, useMemo, useState } from 'react'
import type { DiaItinerario, LugarViaje } from '../../core/data/db'
import {
  diasItinerarioRepo,
  itinerariosGuardadosRepo,
  lugaresViajeRepo,
  metasRepo,
} from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { BotonCompartir } from './BotonCompartir'
import { tablaItinerario } from './itinerarioTexto'

/**
 * Crea/actualiza/borra la meta de ahorro del despacho ligada a un lugar
 * (objetivo = total presupuestado de su hoja; el "ahorrado" lo lleva el despacho).
 */
async function sincronizarMeta(lugar: LugarViaje, total: number) {
  if (!lugar.id) return
  const nombre = `✈️ ${lugar.nombre}`
  if (total > 0) {
    if (lugar.metaId) {
      const actualizadas = await metasRepo.update(lugar.metaId, { nombre, objetivo: total })
      if (actualizadas > 0) return
      // La meta ya no existe (se borró en el despacho): se vuelve a crear.
    }
    const metaId = await metasRepo.add({ nombre, objetivo: total, ahorrado: 0 })
    await lugaresViajeRepo.update(lugar.id, { metaId })
  } else if (lugar.metaId) {
    await metasRepo.remove(lugar.metaId)
    await lugaresViajeRepo.update(lugar.id, { metaId: undefined })
  }
}

const celdaCls =
  'w-full bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-white/25 focus:bg-white/10'

/** Fila editable de la hoja (inputs no controlados: se guarda al salir de la celda). */
function FilaDia({ fila, onPresupuesto }: { fila: DiaItinerario; onPresupuesto: () => void }) {
  const texto = (campo: keyof DiaItinerario) => (e: React.FocusEvent<HTMLInputElement>) => {
    if (fila.id) void diasItinerarioRepo.update(fila.id, { [campo]: e.target.value.trim() || undefined })
  }
  return (
    <tr className="divide-x divide-white/5">
      <td className="px-2 py-1.5 text-center text-xs font-bold text-teal-300">{fila.dia}</td>
      <td>
        <input
          type="date"
          defaultValue={fila.fecha ?? ''}
          onChange={(e) => fila.id && void diasItinerarioRepo.update(fila.id, { fecha: e.target.value || undefined })}
          className={celdaCls}
        />
      </td>
      <td><input defaultValue={fila.inicio ?? ''} onBlur={texto('inicio')} className={celdaCls} /></td>
      <td><input defaultValue={fila.destino ?? ''} onBlur={texto('destino')} className={celdaCls} /></td>
      <td><input defaultValue={fila.hospedaje ?? ''} onBlur={texto('hospedaje')} className={celdaCls} /></td>
      <td><input defaultValue={fila.actividades ?? ''} onBlur={texto('actividades')} className={celdaCls} /></td>
      <td><input defaultValue={fila.transporte ?? ''} onBlur={texto('transporte')} className={celdaCls} /></td>
      <td>
        <input
          type="number"
          min="0"
          step="any"
          defaultValue={fila.presupuesto ?? ''}
          onBlur={async (e) => {
            if (!fila.id) return
            const n = parseFloat(e.target.value)
            await diasItinerarioRepo.update(fila.id, {
              presupuesto: Number.isFinite(n) && n > 0 ? n : undefined,
            })
            onPresupuesto()
          }}
          className={`${celdaCls} text-right tabular-nums`}
        />
      </td>
      <td className="px-1 text-center">
        <button
          onClick={async () => {
            if (!fila.id) return
            await diasItinerarioRepo.remove(fila.id)
            onPresupuesto()
          }}
          className="px-1 text-white/30 transition hover:text-red-300"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

/** Hoja de cálculo del plan día a día de un lugar por conocer. */
export function HojaItinerario({ lugar }: { lugar: LugarViaje }) {
  const t = useT()
  const todasRaw = diasItinerarioRepo.useAll()
  const todas = todasRaw ?? []
  const filas = useMemo(
    () => todas.filter((f) => f.lugarId === lugar.id).sort((a, b) => a.dia - b.dia),
    [todas, lugar.id],
  )
  const total = filas.reduce((s, f) => s + (f.presupuesto ?? 0), 0)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [guardado, setGuardado] = useState(false)

  // Todo lugar nuevo arranca con su Día 1 ya creado (una sola vez, cuando se
  // confirma que de verdad no tiene ninguno — no mientras aún carga Dexie).
  useEffect(() => {
    if (todasRaw !== undefined && filas.length === 0 && lugar.id) {
      void diasItinerarioRepo.add({ lugarId: lugar.id, dia: 1 })
    }
  }, [todasRaw, filas.length, lugar.id])

  const agregarDia = async () => {
    // Con datos frescos: dos clics seguidos no deben repetir el número de día.
    const lista = (await diasItinerarioRepo.list()).filter((f) => f.lugarId === lugar.id)
    const max = lista.reduce((m, f) => Math.max(m, f.dia), 0)
    await diasItinerarioRepo.add({ lugarId: lugar.id!, dia: max + 1 })
  }

  /** Recalcula el total con datos frescos y actualiza la meta del despacho. */
  const actualizarMeta = async () => {
    const frescas = (await diasItinerarioRepo.list()).filter((f) => f.lugarId === lugar.id)
    const tot = frescas.reduce((s, f) => s + (f.presupuesto ?? 0), 0)
    await sincronizarMeta(lugar, tot)
  }

  const contexto = [lugar.ciudad, lugar.estado, lugar.pais].filter(Boolean).join(', ')
  const tabla = useMemo(() => tablaItinerario(lugar.nombre, contexto, filas, total), [lugar.nombre, contexto, filas, total])

  /** Archiva una copia congelada del plan en "Itinerarios guardados": sobrevive aunque se borre el lugar o el plan. */
  const guardarComoItinerario = async () => {
    await itinerariosGuardadosRepo.add({
      nombre: lugar.nombre,
      contexto: contexto || undefined,
      filas: filas.map((f) => ({
        dia: f.dia,
        fecha: f.fecha,
        inicio: f.inicio,
        destino: f.destino,
        hospedaje: f.hospedaje,
        actividades: f.actividades,
        transporte: f.transporte,
        presupuesto: f.presupuesto,
      })),
      creadoEn: new Date().toISOString(),
    })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  /** Borra todas las filas del plan (no el lugar) y su meta de ahorro. */
  const borrarPlan = async () => {
    for (const f of filas) if (f.id) await diasItinerarioRepo.remove(f.id)
    await sincronizarMeta(lugar, 0)
    setConfirmarBorrar(false)
  }

  const COLUMNAS = [
    t('sala.hoja.dia', 'Día'),
    t('sala.hoja.fecha', 'Fecha'),
    t('sala.hoja.inicio', 'Inicio'),
    t('sala.hoja.destino', 'Destino'),
    t('sala.hoja.hospedaje', 'Hospedaje'),
    t('sala.hoja.actividades', 'Actividades'),
    t('sala.hoja.transporte', 'Transporte'),
    t('sala.hoja.presupuesto', 'Presupuesto'),
  ]

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="divide-x divide-white/5 border-b border-white/10 bg-white/5 text-left text-[10px] uppercase tracking-wider text-white/45">
              {COLUMNAS.map((c, i) => (
                <th key={i} className={`px-2 py-1.5 font-semibold ${i === 0 ? 'w-10 text-center' : ''} ${i === 7 ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filas.map((f) => (
              <FilaDia key={f.id} fila={f} onPresupuesto={() => void actualizarMeta()} />
            ))}
          </tbody>
          {filas.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/5 text-xs font-bold">
                <td colSpan={7} className="px-2 py-1.5 text-right text-white/60">
                  {t('sala.hoja.total', 'Total')}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-teal-300">
                  ${total.toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => void agregarDia()}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold texto-cta transition hover:brightness-110"
        >
          <Icono nombre="agregar" /> {t('sala.hoja.agregarDia', 'Día')}
        </button>
        {filas.length > 0 && (
          <>
            <BotonCompartir titulo={`✈️ ${lugar.nombre}`} texto={tabla} />
            <button
              onClick={() => void guardarComoItinerario()}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/15"
            >
              <Icono nombre={guardado ? 'confirmar' : 'guardar'} />{' '}
              {guardado ? t('sala.hoja.guardado', 'Guardado') : t('sala.hoja.guardar', 'Guardar')}
            </button>
          </>
        )}
        {filas.length > 0 &&
          (confirmarBorrar ? (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="text-white/50">{t('sala.hoja.confirmarBorrar', '¿Borrar todo el plan?')}</span>
              <button
                onClick={() => void borrarPlan()}
                className="rounded-lg bg-red-500/20 px-2 py-1 font-semibold text-red-300 hover:bg-red-500/40"
              >
                {t('sala.hoja.si', 'Sí')}
              </button>
              <button
                onClick={() => setConfirmarBorrar(false)}
                className="rounded-lg bg-white/5 px-2 py-1 text-white/60 hover:bg-white/15"
              >
                {t('sala.hoja.no', 'No')}
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmarBorrar(true)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/15 hover:text-red-300"
            >
              <Icono nombre="basura" /> {t('sala.hoja.borrarPlan', 'Borrar plan')}
            </button>
          ))}
        <p className="w-full text-[10px] leading-tight text-white/35">
          {t('sala.hoja.sync', 'Los días con fecha aparecen en el calendario de la casa y el total se vuelve una meta de ahorro en el despacho. El plan se conserva aunque ya visites el lugar; solo desaparece si lo borras.')}
        </p>
      </div>
    </div>
  )
}
