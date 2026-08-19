import { Icono } from '../../core/ui/iconos/Icono'
import { lazy, Suspense, useMemo, useState } from 'react'
import type { LugarViaje } from '../../core/data/db'
import { lugaresViajeRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'
import { eliminarLugar } from './datos'
import { FormularioLugar } from './FormularioLugar'
import { MapaMundi } from './MapaMundi'

// El globo arrastra three.js: solo se descarga cuando lo piden.
const Globo3D = lazy(() => import('./Globo3D'))

interface Props {
  lugares: LugarViaje[]
  onIrABitacora: (lugarId: number) => void
}

/** Submenú 1 · Mapa: mapamundi con pines de los lugares ya visitados. */
export function MapaTab({ lugares, onIrABitacora }: Props) {
  const t = useT()
  const [verEstados, setVerEstados] = useState(false)
  /** Cómo se mira el mundo: extendido o hecho esfera. */
  const [vista, setVista] = useState<'plano' | 'globo'>('plano')
  /** Tipo de pin por colocar: 1 visitado, 0 por conocer, null sin modo. */
  const [modoPin, setModoPin] = useState<0 | 1 | null>(null)
  const [nuevoPin, setNuevoPin] = useState<{ lat: number; lng: number; visitado: 0 | 1 } | null>(null)
  const [selId, setSelId] = useState<number | null>(null)
  const [editar, setEditar] = useState<LugarViaje | null>(null)
  /** Lista desplegada bajo el mapa al oprimir una tarjeta de estadística. */
  const [lista, setLista] = useState<'paises' | 'visitados' | 'pendientes' | null>(null)

  const visitados = lugares.filter((l) => l.visitado === 1)
  const pendientes = lugares.filter((l) => l.visitado === 0)

  const pines = useMemo(
    () =>
      lugares
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({
          id: l.id!,
          lat: l.lat!,
          lng: l.lng!,
          visitado: l.visitado === 1,
        })),
    [lugares],
  )

  const paisesVisitados = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const l of visitados) mapa.set(l.pais, (mapa.get(l.pais) ?? 0) + 1)
    return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [visitados])
  const sel = selId ? lugares.find((l) => l.id === selId) : null

  /** Al tocar un lugar de la lista: selecciona su pin, o abre editar si no tiene punto. */
  const abrirLugar = (l: LugarViaje) => {
    if (l.lat != null && l.lng != null) setSelId(l.id!)
    else setEditar(l)
  }

  return (
    <div className="space-y-3">
      {/* Estadísticas del viajero: oprimir despliega la lista bajo el mapa */}
      <div data-tut="sala.mapa.stats" className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            { id: 'paises', n: paisesVisitados.length, label: t('sala.mapa.paises', 'Países') },
            { id: 'visitados', n: visitados.length, label: t('sala.mapa.visitados', 'Lugares visitados') },
            { id: 'pendientes', n: pendientes.length, label: t('sala.mapa.pendientes', 'Por conocer') },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setLista((v) => (v === s.id ? null : s.id))}
            className={`rounded-xl border py-2.5 transition ${
              lista === s.id
                ? 'border-teal-400/50 bg-teal-400/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="text-xl font-bold text-teal-300">{s.n}</div>
            <div className="text-[11px] text-white/50">{s.label} {lista === s.id ? '▴' : '▾'}</div>
          </button>
        ))}
      </div>

      {/* Plano o globo: el mismo mundo con los mismos pines */}
      <PestanasCarpeta
        items={[
          { id: 'plano', icono: 'mapa', labelEs: 'Plano', clave: 'sala.mapa.vistaPlano' },
          { id: 'globo', icono: 'mundo', labelEs: 'Globo', clave: 'sala.mapa.vistaGlobo' },
        ]}
        activo={vista}
        onCambio={setVista}
        color={COLOR}
        variante="sub"
        prefijoTut="sala.mapa.vista"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            // Los pines se colocan tocando el mapa extendido; el globo solo mira.
            setVista('plano')
            setModoPin((m) => (m === 1 ? null : 1))
            setSelId(null)
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            modoPin === 1 ? 'bg-teal-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Icono nombre="ubicacion" /> {t('sala.mapa.pinVisitado', 'Pin visitado')}
        </button>
        <button
          onClick={() => {
            setVista('plano')
            setModoPin((m) => (m === 0 ? null : 0))
            setSelId(null)
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            modoPin === 0 ? 'bg-amber-500 texto-cta' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Icono nombre="brujula" /> {t('sala.mapa.pinPendiente', 'Pin por conocer')}
        </button>
        {/* Las fronteras de estados solo se dibujan en el mapa extendido. */}
        {vista === 'plano' && (
          <label className="ms-auto flex items-center gap-1.5 text-xs text-white/60">
            <input
              type="checkbox"
              checked={verEstados}
              onChange={(e) => setVerEstados(e.target.checked)}
              className="accent-teal-400"
            />
            {t('sala.mapa.estados', 'Estados')}
          </label>
        )}
      </div>

      {modoPin != null && (
        <p className="text-xs text-white/60">
          {modoPin === 1
            ? t('sala.mapa.tocaVisitado', 'Toca el mapa donde ya estuviste: el lugar se irá a tu bitácora.')
            : t('sala.mapa.tocaPendiente', 'Toca el mapa que sueñas conocer: el lugar se irá a tu itinerario.')}
        </p>
      )}

      <div data-tut="sala.mapa.mundi">
      {vista === 'globo' ? (
        <Suspense
          fallback={
            <div className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-black/30 text-sm text-white/40">
              {t('sala.mapa.cargandoGlobo', 'Armando el globo…')}
            </div>
          }
        >
          <Globo3D
            pines={pines}
            seleccionado={selId}
            onClickPin={(id) => setSelId((s) => (s === id ? null : id))}
          />
        </Suspense>
      ) : (
        <MapaMundi
          pines={pines}
          seleccionado={selId}
          resaltarPaises
          verEstados={verEstados}
          onClickPin={(id) => {
            setSelId((s) => (s === id ? null : id))
            setModoPin(null)
          }}
          onClickMapa={
            modoPin != null
              ? (lat, lng) => {
                  setNuevoPin({ lat, lng, visitado: modoPin })
                  setModoPin(null)
                }
              : undefined
          }
        />
      )}
      </div>

      <div className="flex gap-3 text-[11px] text-white/50">
        <span>
          <span className="me-1 inline-block h-2 w-2 rounded-full bg-teal-400" />
          {t('sala.mapa.leyVisitado', 'Visitado')}
        </span>
        <span>
          <span className="me-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
          {t('sala.mapa.leyPendiente', 'Por conocer')}
        </span>
      </div>

      {/* Lista desplegada bajo el mapa */}
      {lista === 'paises' && (
        <ul className="max-h-56 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
          {paisesVisitados.length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-white/40">
              {t('sala.mapa.listaVacia', 'Nada por aquí todavía.')}
            </li>
          )}
          {paisesVisitados.map(([pais, n]) => (
            <li key={pais} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span><Icono nombre="mundo" /></span>
              <span className="min-w-0 flex-1 truncate font-semibold">{pais}</span>
              <span className="text-[11px] text-white/40">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {(lista === 'visitados' || lista === 'pendientes') && (
        <ul className="max-h-56 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
          {(lista === 'visitados' ? visitados : pendientes).length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-white/40">
              {t('sala.mapa.listaVacia', 'Nada por aquí todavía.')}
            </li>
          )}
          {(lista === 'visitados' ? visitados : pendientes).map((l) => (
            <li key={l.id}>
              <button
                onClick={() => abrirLugar(l)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition hover:bg-white/5 ${
                  selId === l.id ? 'bg-teal-400/10' : ''
                }`}
              >
                <span><Icono nombre={l.visitado ? 'ubicacion' : 'brujula'} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.nombre}</span>
                  <span className="block truncate text-[11px] text-white/45">
                    {[l.ciudad, l.estado, l.pais].filter(Boolean).join(', ')}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-white/40">
                  {l.visitado ? l.fechaVisita : l.fechaPlan ? <><Icono nombre="calendario" /> {l.fechaPlan}</> : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Tarjeta del pin seleccionado */}
      {sel && (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="text-2xl"><Icono nombre={sel.visitado ? 'ubicacion' : 'brujula'} /></span>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold">{sel.nombre}</h4>
            <p className="text-xs text-white/50">
              {[sel.ciudad, sel.estado, sel.pais].filter(Boolean).join(', ')}
              {sel.fechaVisita ? ` · ${sel.fechaVisita}` : ''}
            </p>
            {sel.nota && <p className="mt-1 text-xs text-white/60">{sel.nota}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {sel.visitado === 1 ? (
                <button
                  onClick={() => onIrABitacora(sel.id!)}
                  className="rounded-lg bg-teal-600/80 px-2.5 py-1 text-xs font-semibold texto-cta hover:brightness-110"
                >
                  <Icono nombre="registros" /> {t('sala.mapa.verBitacora', 'Bitácora')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    void lugaresViajeRepo.update(sel.id!, { visitado: 1, fechaVisita: fechaLocalISO() })
                    onIrABitacora(sel.id!)
                  }}
                  className="rounded-lg bg-teal-600/80 px-2.5 py-1 text-xs font-semibold texto-cta hover:brightness-110"
                >
                  <Icono nombre="confirmar" /> {t('sala.mapa.yaVisite', 'Ya lo visité')}
                </button>
              )}
              <button
                onClick={() => setEditar(sel)}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
              >
                <Icono nombre="editar" /> {t('sala.mapa.editar', 'Editar')}
              </button>
              <button
                onClick={() => {
                  void eliminarLugar(sel.id!)
                  setSelId(null)
                }}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-red-300/80 hover:bg-white/20"
              >
                <Icono nombre="cerrar" /> {t('sala.mapa.quitar', 'Quitar')}
              </button>
            </div>
          </div>
          <button onClick={() => setSelId(null)} className="text-white/30 hover:text-white/70">
            ✕
          </button>
        </div>
      )}

      {visitados.length === 0 && (
        <p className="py-2 text-center text-sm text-white/40">
          {t('sala.mapa.vacio', 'Aún no hay pines. Toca «Poner pin» y marca tu primer lugar visitado.')}
        </p>
      )}

      {nuevoPin && (
        <FormularioLugar
          inicial={{ lat: nuevoPin.lat, lng: nuevoPin.lng, visitado: nuevoPin.visitado }}
          onCerrar={() => setNuevoPin(null)}
        />
      )}
      {editar && <FormularioLugar lugar={editar} onCerrar={() => setEditar(null)} />}
    </div>
  )
}
