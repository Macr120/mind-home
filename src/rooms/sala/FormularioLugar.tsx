import { Icono } from '../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import type { LugarViaje } from '../../core/data/db'
import { lugaresViajeRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { buscarLugares, lugarDesdeCoords, type LugarGeo } from './geocoder'
import { MapaMundi } from './MapaMundi'

interface Props {
  /** Lugar existente (edición) o ausente (alta). */
  lugar?: LugarViaje
  /** Valores prellenados al crear (p. ej. coordenadas del pin recién puesto). */
  inicial?: Partial<LugarViaje>
  onCerrar: () => void
}

/** Modal de alta/edición de un lugar: búsqueda en línea, mini-mapa y campos manuales. */
export function FormularioLugar({ lugar, inicial, onCerrar }: Props) {
  const t = useT()
  const base = lugar ?? inicial
  const [nombre, setNombre] = useState(base?.nombre ?? '')
  const [pais, setPais] = useState(base?.pais ?? '')
  const [region, setRegion] = useState(base?.estado ?? '')
  const [ciudad, setCiudad] = useState(base?.ciudad ?? '')
  const [coords, setCoords] = useState(
    base?.lat != null && base?.lng != null ? { lat: base.lat, lng: base.lng } : null,
  )
  const [visitado, setVisitado] = useState((base?.visitado ?? 0) === 1)
  const [fechaVisita, setFechaVisita] = useState(base?.fechaVisita ?? fechaLocalISO())
  const [fechaPlan, setFechaPlan] = useState(base?.fechaPlan ?? '')
  const [nota, setNota] = useState(base?.nota ?? '')

  const [consulta, setConsulta] = useState('')
  const [resultados, setResultados] = useState<LugarGeo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState(false)

  // Pin puesto a mano en el mapa: intenta deducir país/ciudad de las coordenadas.
  useEffect(() => {
    const { lat, lng } = inicial ?? {}
    if (lugar || lat == null || lng == null || inicial?.pais) return
    let activo = true
    lugarDesdeCoords(lat, lng).then((r) => {
      if (!activo || !r) return
      setNombre((v) => v || r.nombre)
      setPais((v) => v || r.pais)
      setRegion((v) => v || r.estado || '')
      setCiudad((v) => v || r.ciudad || '')
    })
    return () => {
      activo = false
    }
  }, [])

  const buscar = async () => {
    if (!consulta.trim() || buscando) return
    setBuscando(true)
    setErrorBusqueda(false)
    try {
      setResultados(await buscarLugares(consulta.trim()))
    } catch {
      setErrorBusqueda(true)
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  const elegirResultado = (r: LugarGeo) => {
    setNombre((v) => v.trim() || r.nombre)
    setPais(r.pais)
    setRegion(r.estado ?? '')
    setCiudad(r.ciudad ?? '')
    setCoords({ lat: r.lat, lng: r.lng })
    setResultados([])
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !pais.trim()) return
    const datos = {
      nombre: nombre.trim(),
      pais: pais.trim(),
      estado: region.trim() || undefined,
      ciudad: ciudad.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      visitado: (visitado ? 1 : 0) as 0 | 1,
      fechaVisita: visitado ? fechaVisita : undefined,
      fechaPlan: !visitado && fechaPlan ? fechaPlan : undefined,
      nota: nota.trim() || undefined,
    }
    if (lugar?.id) await lugaresViajeRepo.update(lugar.id, datos)
    else await lugaresViajeRepo.add({ ...datos, creadoEn: new Date().toISOString() })
    onCerrar()
  }

  const inputCls =
    'w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30'

  return (
    <div className="ui-noche fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-6 max-w-lg space-y-3 rounded-2xl border border-white/10 bg-[#171a21] p-4 text-white"
      >
        <header className="flex items-center justify-between">
          <h3 className="font-bold">
            <Icono nombre={lugar ? 'editar' : 'ubicacion'} />{' '}
            {lugar
              ? t('sala.form.editar', 'Editar lugar')
              : t('sala.form.nuevo', 'Nuevo lugar')}
          </h3>
          <button type="button" onClick={onCerrar} className="text-white/40 hover:text-white/80">
            ✕
          </button>
        </header>

        {/* Búsqueda en línea (OpenStreetMap) */}
        <div className="flex gap-2">
          <input
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void buscar()
              }
            }}
            placeholder={t('sala.form.buscar', 'Buscar lugar (ej. Kioto, Machu Picchu)…')}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => void buscar()}
            disabled={buscando}
            className="shrink-0 rounded-lg bg-teal-600 px-4 text-sm font-semibold texto-cta transition hover:brightness-110 disabled:opacity-50"
          >
            {buscando ? '…' : <Icono nombre="lupa" />}
          </button>
        </div>
        {errorBusqueda && (
          <p className="text-xs text-amber-300/80">
            {t('sala.form.errorBusqueda', 'No se pudo buscar (¿sin internet?). Llena los campos a mano y marca el punto en el mapa.')}
          </p>
        )}
        {resultados.length > 0 && (
          <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-1.5">
            {resultados.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => elegirResultado(r)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                >
                  <Icono nombre="ubicacion" /> {r.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Mini-mapa: toca para fijar el punto */}
        <MapaMundi
          pines={coords ? [{ id: -1, lat: coords.lat, lng: coords.lng, visitado }] : []}
          onClickMapa={(lat, lng) => setCoords({ lat, lng })}
        />
        <p className="text-[11px] text-white/40">
          {coords
            ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
            : t('sala.form.sinPunto', 'Toca el mapa para colocar el punto (opcional pero recomendado).')}
        </p>

        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('sala.form.nombre', 'Nombre del lugar *')} className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder={t('sala.form.pais', 'País *')} className={inputCls} />
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t('sala.form.estado', 'Estado / región')} className={inputCls} />
        </div>
        <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder={t('sala.form.ciudad', 'Ciudad')} className={inputCls} />

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={visitado} onChange={(e) => setVisitado(e.target.checked)} className="accent-teal-500" />
          {t('sala.form.visitado', 'Ya lo visité')}
        </label>
        {visitado ? (
          <input type="date" value={fechaVisita} onChange={(e) => setFechaVisita(e.target.value)} className={inputCls} />
        ) : (
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">{t('sala.form.fechaPlan', 'Fecha planeada (opcional)')}</span>
            <input
              type="date"
              value={fechaPlan}
              onChange={(e) => setFechaPlan(e.target.value)}
              className={inputCls}
            />
          </label>
        )}
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('sala.form.nota', 'Nota (qué quieres ver, tips…)')}
          rows={2}
          className={`${inputCls} resize-none`}
        />

        <div className="flex gap-2">
          <button type="button" onClick={onCerrar} className="flex-1 rounded-lg border border-white/10 bg-black/25 py-2 text-sm font-semibold text-white/70 hover:bg-black/40">
            {t('sala.form.cancelar', 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={!nombre.trim() || !pais.trim()}
            className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
          >
            {t('sala.form.guardar', 'Guardar lugar')}
          </button>
        </div>
      </form>
    </div>
  )
}
