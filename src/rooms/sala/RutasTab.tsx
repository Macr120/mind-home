import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useState } from 'react'
import type { LugarViaje, RutaViaje } from '../../core/data/db'
import { VACIO, rutasViajeRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { etiquetaLugar } from './datos'
import { MapaMundi } from './MapaMundi'

interface Props {
  lugares: LugarViaje[]
}

interface Borrador {
  id?: number
  nombre: string
  lugarIds: number[]
}

/** Distancia en km entre dos coordenadas (haversine). */
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(s))
}

/** Submenú 3 · Rutas: encadena lugares en un recorrido y míralo sobre el mapa. */
export function RutasTab({ lugares }: Props) {
  const t = useT()
  const rutas = rutasViajeRepo.useAll() ?? VACIO
  const [selId, setSelId] = useState<number | null>(null)
  const [borrador, setBorrador] = useState<Borrador | null>(null)

  const porId = useMemo(() => new Map(lugares.map((l) => [l.id!, l])), [lugares])
  const elegibles = lugares.filter((l) => l.lat != null && l.lng != null)

  // Paradas válidas (con coordenadas) de una lista de ids, en orden.
  const paradas = (ids: number[]) =>
    ids
      .map((id) => porId.get(id))
      .filter((l): l is LugarViaje => !!l && l.lat != null && l.lng != null)

  const distanciaTotal = (ids: number[]) => {
    const pts = paradas(ids)
    let km = 0
    for (let i = 1; i < pts.length; i++) {
      km += distKm({ lat: pts[i - 1].lat!, lng: pts[i - 1].lng! }, { lat: pts[i].lat!, lng: pts[i].lng! })
    }
    return Math.round(km)
  }

  const rutaSel = selId ? rutas.find((r) => r.id === selId) : null
  const puntosMapa = (r: RutaViaje | Borrador | null) =>
    r ? paradas(r.lugarIds).map((l) => ({ lat: l.lat!, lng: l.lng! })) : []

  const guardar = async () => {
    if (!borrador || !borrador.nombre.trim() || borrador.lugarIds.length < 2) return
    if (borrador.id) {
      await rutasViajeRepo.update(borrador.id, {
        nombre: borrador.nombre.trim(),
        lugarIds: borrador.lugarIds,
      })
      setSelId(borrador.id)
    } else {
      const id = await rutasViajeRepo.add({
        nombre: borrador.nombre.trim(),
        lugarIds: borrador.lugarIds,
        creadoEn: new Date().toISOString(),
      })
      setSelId(id)
    }
    setBorrador(null)
  }

  const mover = (i: number, delta: number) => {
    setBorrador((b) => {
      if (!b) return b
      const ids = [...b.lugarIds]
      const j = i + delta
      if (j < 0 || j >= ids.length) return b
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      return { ...b, lugarIds: ids }
    })
  }

  if (borrador) {
    const pts = puntosMapa(borrador)
    return (
      <div className="space-y-3">
        <h3 className="font-bold">
          <Icono nombre={borrador.id ? 'editar' : 'brujula'} />{' '}
          {borrador.id ? t('sala.rutas.editar', 'Editar ruta') : t('sala.rutas.nueva', 'Nueva ruta')}
        </h3>
        <input
          value={borrador.nombre}
          onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
          placeholder={t('sala.rutas.nombre', 'Nombre de la ruta (ej. Eurotrip 2027)')}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
        />

        {pts.length > 1 && <MapaMundi pines={[]} ruta={pts} />}

        {/* Paradas en orden */}
        <ol className="space-y-1.5">
          {borrador.lugarIds.map((id, i) => {
            const l = porId.get(id)
            if (!l) return null
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-black">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{etiquetaLugar(l)}</span>
                <button onClick={() => mover(i, -1)} disabled={i === 0} className="px-1 text-white/50 hover:text-white disabled:opacity-20"><Icono nombre="subir" /></button>
                <button onClick={() => mover(i, 1)} disabled={i === borrador.lugarIds.length - 1} className="px-1 text-white/50 hover:text-white disabled:opacity-20"><Icono nombre="bajar" /></button>
                <button
                  onClick={() => setBorrador({ ...borrador, lugarIds: borrador.lugarIds.filter((x) => x !== id) })}
                  className="px-1 text-white/40 hover:text-red-300"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ol>

        {/* Agregar parada */}
        <select
          value=""
          onChange={(e) => {
            const id = Number(e.target.value)
            if (id) setBorrador({ ...borrador, lugarIds: [...borrador.lugarIds, id] })
          }}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
        >
          <option value="">
            ＋ {t('sala.rutas.agregarParada', 'Agregar parada (lugares con punto en el mapa)…')}
          </option>
          {elegibles
            .filter((l) => !borrador.lugarIds.includes(l.id!))
            .map((l) => (
              <option key={l.id} value={l.id}>
                {(l.visitado ? '📍 ' : '🧭 ') + etiquetaLugar(l)}
              </option>
            ))}
        </select>
        {elegibles.length === 0 && (
          <p className="text-xs text-amber-300/80">
            {t('sala.rutas.sinElegibles', 'Ningún lugar tiene punto en el mapa todavía: agrega lugares con coordenadas primero.')}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setBorrador(null)}
            className="flex-1 rounded-lg border border-white/10 bg-black/25 py-2 text-sm font-semibold text-white/70 hover:bg-black/40"
          >
            {t('sala.rutas.cancelar', 'Cancelar')}
          </button>
          <button
            onClick={() => void guardar()}
            disabled={!borrador.nombre.trim() || borrador.lugarIds.length < 2}
            className="ui-accent-bg flex-1 rounded-lg py-2 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
          >
            {t('sala.rutas.guardar', 'Guardar ruta')}
          </button>
        </div>
        {borrador.lugarIds.length < 2 && (
          <p className="text-center text-[11px] text-white/40">
            {t('sala.rutas.min', 'Una ruta necesita al menos 2 paradas.')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div data-tut="sala.rutas" className="space-y-3">
      <button
        onClick={() => setBorrador({ nombre: '', lugarIds: [] })}
        className="ui-accent-bg w-full rounded-xl py-2.5 text-sm font-bold transition hover:brightness-110"
      >
        <Icono nombre="brujula" /> {t('sala.rutas.crear', 'Nueva ruta')}
      </button>

      {rutaSel && <MapaMundi pines={[]} ruta={puntosMapa(rutaSel)} />}

      {rutas.length === 0 && (
        <p className="py-8 text-center text-sm text-white/40">
          {t('sala.rutas.vacio', 'Sin rutas todavía. Encadena tus lugares en un recorrido.')}
        </p>
      )}

      <div className="space-y-2">
        {rutas.map((r) => {
          const pts = paradas(r.lugarIds)
          const km = distanciaTotal(r.lugarIds)
          return (
            <div
              key={r.id}
              onClick={() => setSelId((s) => (s === r.id ? null : r.id!))}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                selId === r.id ? 'border-teal-400/50 bg-teal-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <h4 className="min-w-0 flex-1 truncate font-bold"><Icono nombre="brujula" /> {r.nombre}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setBorrador({ id: r.id, nombre: r.nombre, lugarIds: r.lugarIds })
                  }}
                  className="rounded-lg bg-white/5 px-2 py-1 text-xs hover:bg-white/15"
                >
                  <Icono nombre="editar" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (r.id) void rutasViajeRepo.remove(r.id)
                    if (selId === r.id) setSelId(null)
                  }}
                  className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/40 hover:bg-white/15 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
              <p className="mt-0.5 text-[11px] text-white/45">
                {t('sala.rutas.paradas', '{n} paradas').replace('{n}', String(r.lugarIds.length))}
                {km > 0 ? ` · ≈ ${km.toLocaleString()} km` : ''}
              </p>
              {pts.length > 0 && (
                <p className="mt-1 truncate text-xs text-white/60">
                  {pts.map((l) => l.nombre).join(' → ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
