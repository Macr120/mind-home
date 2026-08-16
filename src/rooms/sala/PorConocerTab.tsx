import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useState } from 'react'
import type { LugarViaje } from '../../core/data/db'
import { lugaresViajeRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'
import { FormularioLugar } from './FormularioLugar'
import { HojaItinerario } from './HojaItinerario'
import { ItinerariosGuardadosTab } from './ItinerariosGuardadosTab'

type Agrupar = 'pais' | 'estado' | 'ciudad' | 'fecha'
type Vista = 'activos' | 'guardados'

interface Props {
  lugares: LugarViaje[]
}

/** "agosto 2026" a partir de "2026-08". */
function mesLargo(aaaaMm: string) {
  return new Date(`${aaaaMm}-15T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/** Submenú 2 · Itinerario: lugares por conocer, cada uno con su plan día a día, + itinerarios guardados. */
export function PorConocerTab({ lugares }: Props) {
  const t = useT()
  const [vista, setVista] = useState<Vista>('activos')
  const [agrupar, setAgrupar] = useState<Agrupar>('pais')
  const [filtro, setFiltro] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [editar, setEditar] = useState<LugarViaje | null>(null)
  /** Lugares con el plan día a día colapsado a mano (por defecto todos abiertos). */
  const [colapsados, setColapsados] = useState<Set<number>>(new Set())
  /** Lugar a punto de marcarse visitado, esperando confirmación. */
  const [confirmarVisita, setConfirmarVisita] = useState<LugarViaje | null>(null)

  const OPCIONES: { id: Agrupar; label: string }[] = [
    { id: 'pais', label: t('sala.pc.paises', 'Países') },
    { id: 'estado', label: t('sala.pc.estados', 'Estados') },
    { id: 'ciudad', label: t('sala.pc.ciudades', 'Ciudades') },
    { id: 'fecha', label: t('sala.pc.fechas', 'Fecha') },
  ]

  const pendientes = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return lugares.filter(
      (l) =>
        l.visitado === 0 &&
        (!q ||
          [l.nombre, l.pais, l.estado, l.ciudad, l.nota]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))),
    )
  }, [lugares, filtro])

  const grupos = useMemo(() => {
    const sinDato = t('sala.pc.sinDato', 'Sin especificar')
    const mapa = new Map<string, { label: string; items: LugarViaje[] }>()
    for (const l of pendientes) {
      let clave: string
      let label: string
      if (agrupar === 'fecha') {
        clave = l.fechaPlan ? l.fechaPlan.slice(0, 7) : '9999-99'
        label = l.fechaPlan ? mesLargo(clave) : t('sala.pc.sinFecha', 'Sin fecha')
      } else if (agrupar === 'pais') {
        clave = label = l.pais
      } else if (agrupar === 'estado') {
        clave = label = `${l.estado ?? sinDato} · ${l.pais}`
      } else {
        clave = label = `${l.ciudad ?? sinDato} · ${l.pais}`
      }
      const g = mapa.get(clave) ?? { label, items: [] }
      g.items.push(l)
      mapa.set(clave, g)
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([clave, g]) => ({
        clave,
        label: g.label,
        items: g.items.sort((a, b) =>
          agrupar === 'fecha'
            ? (a.fechaPlan ?? '9999').localeCompare(b.fechaPlan ?? '9999')
            : a.nombre.localeCompare(b.nombre),
        ),
      }))
  }, [pendientes, agrupar, t])

  const marcarVisitado = async (l: LugarViaje) => {
    if (!l.id) return
    await lugaresViajeRepo.update(l.id, { visitado: 1, fechaVisita: fechaLocalISO() })
    setConfirmarVisita(null)
  }

  const togglePlan = (id: number) =>
    setColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const chipCls = (activo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${
      activo ? 'bg-teal-600 texto-cta' : 'bg-white/5 text-white/60 hover:bg-white/10'
    }`

  const btnFila = (activo: boolean) =>
    `rounded-lg px-2 py-1 text-xs font-semibold transition ${
      activo ? 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/40' : 'bg-white/5 hover:bg-white/15'
    }`

  return (
    <div data-tut="sala.porConocer" className="space-y-3">
      {/* Itinerarios activos vs. guardados a mano */}
      <PestanasCarpeta
        items={[
          { id: 'activos', labelEs: 'Itinerarios', clave: 'sala.pc.vistaItinerarios' },
          { id: 'guardados', labelEs: 'Itinerarios guardados', clave: 'sala.pc.vistaGuardados' },
        ]}
        activo={vista}
        onCambio={setVista}
        color={COLOR}
        variante="sub"
        nivel={2}
      />

      {vista === 'guardados' ? (
        <ItinerariosGuardadosTab />
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={t('sala.pc.buscar', 'Buscar en tu lista…')}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
            <button
              onClick={() => setNuevo(true)}
              className="ui-accent-bg shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition hover:brightness-110"
            >
              <Icono nombre="agregar" /> {t('sala.pc.agregar', 'Lugar')}
            </button>
          </div>

          {/* Agrupación */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/40">{t('sala.pc.ordenarPor', 'Ordenar por')}</span>
            {OPCIONES.map((o) => (
              <button key={o.id} onClick={() => setAgrupar(o.id)} className={chipCls(agrupar === o.id)}>
                {o.label}
              </button>
            ))}
            <span className="ms-auto text-[11px] text-white/40">
              {pendientes.length === 1
                ? t('sala.pc.countUno', '1 lugar')
                : t('sala.pc.count', '{n} lugares').replace('{n}', String(pendientes.length))}
            </span>
          </div>

          {pendientes.length === 0 && (
            <p className="py-8 text-center text-sm text-white/40">
              {t('sala.pc.vacio', 'Tu itinerario está vacío. Agrega los lugares que sueñas conocer.')}
            </p>
          )}

          {grupos.map((g) => (
            <section key={g.clave} className="rounded-xl border border-white/10 bg-white/5">
              <header className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h3 className="text-sm font-bold capitalize">{g.label}</h3>
                <span className="text-[11px] text-white/40">{g.items.length}</span>
              </header>
              <ul className="divide-y divide-white/5">
                {g.items.map((l) => (
                  <li key={l.id} className="space-y-2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg"><Icono nombre={l.lat != null ? 'brujula' : 'brillo'} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{l.nombre}</p>
                        <p className="truncate text-[11px] text-white/45">
                          {[l.ciudad, l.estado, agrupar !== 'pais' ? undefined : l.pais]
                            .filter(Boolean)
                            .join(', ') || l.pais}
                          {l.nota ? ` — ${l.nota}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditar(l)}
                        className="rounded-lg bg-white/5 px-2 py-1 text-xs hover:bg-white/15"
                      >
                        <Icono nombre="editar" />
                      </button>
                      <button
                        onClick={() => l.id && togglePlan(l.id)}
                        title={t('sala.pc.plan', 'Plan día a día')}
                        className={btnFila(!colapsados.has(l.id!))}
                      >
                        {colapsados.has(l.id!) ? '▾' : '▴'}
                      </button>
                    </div>
                    {!colapsados.has(l.id!) && <HojaItinerario lugar={l} />}
                    {/* Esquina inferior derecha: marcar visitado pide confirmación. */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setConfirmarVisita(l)}
                        title={t('sala.pc.visitado', 'Ya lo visité')}
                        className="rounded-lg bg-teal-600/20 px-2.5 py-1 text-xs font-semibold text-teal-300 hover:bg-teal-600/40"
                      >
                        ✓ {t('sala.pc.visitado', 'Ya lo visité')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {nuevo && <FormularioLugar inicial={{ visitado: 0 }} onCerrar={() => setNuevo(false)} />}
      {editar && <FormularioLugar lugar={editar} onCerrar={() => setEditar(null)} />}

      {confirmarVisita && (
        <div
          className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmarVisita(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#171a21] p-5 text-center text-white"
          >
            <p className="text-3xl"><Icono nombre="fiesta" /></p>
            <div>
              <h3 className="font-bold">{t('sala.pc.confirmarTitulo', '¿Ya completaste este viaje?')}</h3>
              <p className="mt-1 text-sm text-white/60">
                {t('sala.pc.confirmarDesc', '{lugar} se moverá a tu bitácora de recuerdos.').replace(
                  '{lugar}',
                  confirmarVisita.nombre,
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmarVisita(null)}
                className="flex-1 rounded-lg border border-white/10 bg-black/25 py-2 text-sm font-semibold text-white/70 hover:bg-black/40"
              >
                {t('sala.pc.confirmarNo', 'Todavía no')}
              </button>
              <button
                onClick={() => void marcarVisitado(confirmarVisita)}
                className="ui-accent-bg flex-1 rounded-lg py-2 text-sm font-bold transition hover:brightness-110"
              >
                {t('sala.pc.confirmarSi', 'Sí, lo visité')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
