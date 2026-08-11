import { useMemo } from 'react'
import type { PuntoRuta, SesionEjercicio, SistemaUnidades } from '../../core/data/db'
import { perfilNutricionRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Icono } from '../../core/ui/iconos/Icono'
import { caloriasEstimadas, fmtRitmoMin, fmtTiempo, metricasRuta, type MetricasRuta } from './cardioStats'
import { nombreFecha } from './fecha'
import { distanciaDesdeKm, fmtRitmo, unidadDistancia } from './unidades'

const ACENTO = '#38bdf8'

/**
 * Croquis SVG de la ruta (sin mapa): trazo normalizado con inicio y fin
 * marcados. Con `marcas` (índices de puntos) pinta además dónde se completó
 * cada kilómetro, como los pines de los mapas de las apps de running.
 */
export function RutaSvg({
  puntos,
  color,
  className = '',
  marcas,
}: {
  puntos: PuntoRuta[]
  color: string
  className?: string
  /** Índices del trazo donde se cierra cada parcial (se numeran 1, 2, 3…). */
  marcas?: number[]
}) {
  if (puntos.length < 2) return null
  const W = 100
  const H = 60
  const PAD = 5
  // Corrige la deformación longitud/latitud según la latitud media
  const k = Math.cos(((puntos[0].lat + puntos[puntos.length - 1].lat) / 2) * (Math.PI / 180))
  const xs = puntos.map((p) => p.lng * k)
  const ys = puntos.map((p) => p.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const escala = Math.min(
    (W - PAD * 2) / Math.max(maxX - minX, 1e-6),
    (H - PAD * 2) / Math.max(maxY - minY, 1e-6),
  )
  const ox = (W - escala * (maxX - minX)) / 2
  const oy = (H - escala * (maxY - minY)) / 2
  const px = (i: number) => ox + (xs[i] - minX) * escala
  const py = (i: number) => oy + (maxY - ys[i]) * escala
  const linea = puntos.map((_, i) => `${px(i)},${py(i)}`).join(' ')
  const fin = puntos.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className}>
      <polyline
        points={linea}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      {marcas?.map((idx, i) =>
        idx > 0 && idx < fin ? (
          <g key={idx}>
            <circle cx={px(idx)} cy={py(idx)} r="3.2" fill="#0f1115" stroke={color} strokeWidth="1" />
            <text
              x={px(idx)}
              y={py(idx) + 1.3}
              textAnchor="middle"
              fontSize="3.4"
              fill={color}
              fontWeight="bold"
            >
              {i + 1}
            </text>
          </g>
        ) : null,
      )}
      <circle cx={px(0)} cy={py(0)} r="2.5" fill="#4ade80" />
      <circle cx={px(fin)} cy={py(fin)} r="2.5" fill="#f87171" />
    </svg>
  )
}

/**
 * Detalle de un entreno de resistencia con la ficha de estadísticas que dan las
 * apps de running: números grandes, ritmo/velocidad/desnivel, gráfica de ritmo
 * con el perfil de elevación y la tabla de parciales.
 *
 * Todo sale de lo grabado: si la sesión no tiene ruta con tiempos (las de antes
 * o las escritas a mano) se pinta solo lo que la sesión sí guarda.
 */
export function EstadisticasCardio({
  sesion,
  unidades,
}: {
  sesion: SesionEjercicio
  unidades?: SistemaUnidades
}) {
  const t = useT()
  const perfilNutricion = perfilNutricionRepo.useAll()
  const m = useMemo(() => metricasRuta(sesion.ruta, unidades), [sesion.ruta, unidades])

  const km = sesion.distanciaKm ?? 0
  const min = sesion.duracionMin
  const u = unidadDistancia(unidades)
  const velMedia = min > 0 ? distanciaDesdeKm(km, unidades) / (min / 60) : 0
  const calorias = caloriasEstimadas(km, min, perfilNutricion?.[0]?.pesoKg)

  return (
    <div className="space-y-3">
      {sesion.ruta && sesion.ruta.length > 1 && (
        <RutaSvg
          puntos={sesion.ruta}
          color={ACENTO}
          className="h-44 w-full rounded-xl bg-black/30"
          marcas={m?.parciales.map((p) => p.indice)}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        <Grande valor={km > 0 ? String(distanciaDesdeKm(km, unidades).toFixed(2)) : '—'} label={`${t('ejercicio.det.distancia', 'Distancia')} (${u})`} />
        <Grande valor={fmtTiempo(min * 60)} label={t('ejercicio.det.duracion', 'Duración')} />
        <Grande valor={String(calorias)} label={t('ejercicio.det.calorias', 'Calorías')} />
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
        <Fila
          icono="cronometro"
          label={t('ejercicio.det.ritmoMedio', 'Ritmo medio')}
          valor={km > 0 ? fmtRitmo(min, km, unidades) : '—'}
        />
        <Fila
          icono="movimientos"
          label={t('ejercicio.det.velMedia', 'Velocidad media')}
          valor={velMedia > 0 ? `${velMedia.toFixed(1)} ${u}/h` : '—'}
        />
        {m?.conTiempo && m.velMax > 0 && (
          <Fila
            icono="movimientos"
            label={t('ejercicio.det.velMax', 'Velocidad máxima')}
            valor={`${m.velMax.toFixed(1)} ${u}/h`}
          />
        )}
        {sesion.ppmProm ? (
          <Fila
            icono="corazon"
            label={t('ejercicio.det.fcMedia', 'FC media')}
            valor={`${sesion.ppmProm} ppm${
              sesion.ppmMax ? ` · ${t('ejercicio.det.max', 'máx')} ${sesion.ppmMax}` : ''
            }`}
          />
        ) : null}
        {m?.conAltitud && (
          <Fila
            icono="paisaje"
            label={t('ejercicio.det.desnivel', 'Desnivel')}
            valor={`+${m.subidaM} m · −${m.bajadaM} m`}
          />
        )}
        {sesion.rpe ? (
          <Fila icono="energia" label={t('ejercicio.rpe', 'RPE')} valor={String(sesion.rpe)} />
        ) : null}
      </div>

      <p className="text-[10px] text-white/35">
        {t('ejercicio.det.estimadas', 'Las calorías son una estimación a partir de tu peso, la distancia y el tiempo.')}
      </p>

      {m && m.serie.length > 1 && <GraficaRitmo metricas={m} unidad={u} />}

      {m && m.parciales.length > 0 && <TablaParciales parciales={m.parciales} unidad={u} />}

      {!m?.conTiempo && (
        <p className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/40">
          {t(
            'ejercicio.det.sinDatos',
            'Esta sesión no tiene trazo GPS con tiempos, así que no hay ritmo por tramo ni parciales. Grábala con «Entrenar en vivo» para verlos.',
          )}
        </p>
      )}

      {sesion.nota && <p className="text-xs text-white/60">{sesion.nota}</p>}
    </div>
  )
}

/** Gráfica de ritmo por distancia con el perfil de elevación de fondo. */
function GraficaRitmo({ metricas, unidad }: { metricas: MetricasRuta; unidad: string }) {
  const t = useT()
  const W = 300
  const H = 100
  const PAD = 6
  const { serie, dist, conAltitud } = metricas
  const ritmos = serie.map((p) => p.ritmo)
  const rMin = Math.min(...ritmos)
  const rMax = Math.max(...ritmos)
  const rango = rMax - rMin || 1
  const x = (d: number) => PAD + (d / (dist || 1)) * (W - PAD * 2)
  // Eje invertido: el ritmo más bajo (más rápido) va arriba.
  const y = (r: number) => PAD + ((r - rMin) / rango) * (H - PAD * 2)
  const linea = serie.map((p) => `${x(p.dist)},${y(p.ritmo)}`).join(' ')

  const alts = conAltitud ? serie.map((p) => p.altM ?? 0) : []
  const aMin = alts.length ? Math.min(...alts) : 0
  const aMax = alts.length ? Math.max(...alts) : 0
  const aRango = aMax - aMin || 1
  const yAlt = (a: number) => H - ((a - aMin) / aRango) * (H * 0.3)
  const areaAlt = conAltitud
    ? `${serie.map((p) => `${x(p.dist)},${yAlt(p.altM ?? 0)}`).join(' ')} ${x(dist)},${H} ${x(0)},${H}`
    : ''

  const enteros = Math.floor(dist)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <p className="text-xs font-semibold text-white/70">
        <Icono nombre="tendencia" /> {t('ejercicio.det.grafRitmo', 'Ritmo')}{' '}
        <span className="font-normal text-white/40">min/{unidad}</span>
      </p>
      <div className="flex justify-between text-[9px] text-white/35">
        <span>
          {t('ejercicio.det.masRapido', 'más rápido')} {fmtRitmoMin(rMin)}
        </span>
        <span>
          {t('ejercicio.det.masLento', 'más lento')} {fmtRitmoMin(rMax)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {conAltitud && <polygon points={areaAlt} fill="#4ade80" opacity="0.18" />}
        {Array.from({ length: enteros }, (_, i) => i + 1).map((n) => (
          <line
            key={n}
            x1={x(n)}
            y1={0}
            x2={x(n)}
            y2={H}
            stroke="#ffffff"
            strokeOpacity="0.12"
            strokeWidth="0.5"
          />
        ))}
        <polyline
          points={linea}
          fill="none"
          stroke={ACENTO}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between text-[9px] text-white/35">
        <span>0</span>
        <span>
          {dist.toFixed(2)} {unidad}
        </span>
      </div>
    </div>
  )
}

/** Parciales por kilómetro (o milla): tiempo, barra de ritmo y desnivel. */
function TablaParciales({
  parciales,
  unidad,
}: {
  parciales: { n: number; dist: number; segundos: number; ritmo: number; subidaM: number; bajadaM: number }[]
  unidad: string
}) {
  const t = useT()
  // Solo los parciales completos compiten por el mejor/peor: el último es más corto.
  const completos = parciales.filter((p) => p.dist > 0.95)
  const mejor = completos.length > 1 ? Math.min(...completos.map((p) => p.ritmo)) : -1
  const peor = completos.length > 1 ? Math.max(...completos.map((p) => p.ritmo)) : -1
  const maxRitmo = Math.max(...parciales.map((p) => p.ritmo))
  const conDesnivel = parciales.some((p) => p.subidaM > 0 || p.bajadaM > 0)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <p className="mb-2 text-xs font-semibold text-white/70">
        <Icono nombre="lista" /> {t('ejercicio.det.parciales', 'Parciales')}{' '}
        <span className="font-normal text-white/40">({unidad})</span>
      </p>
      <div className="space-y-1">
        {parciales.map((p) => {
          const esMejor = p.ritmo === mejor && p.dist > 0.95
          const esPeor = p.ritmo === peor && p.dist > 0.95 && mejor !== peor
          return (
            <div key={p.n} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 tabular-nums text-white/50">
                {p.dist > 0.95 ? p.n : p.dist.toFixed(2)}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-black/25">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(12, (p.ritmo / maxRitmo) * 100)}%`,
                    background: esMejor ? '#4ade80' : esPeor ? '#f8717155' : `${ACENTO}55`,
                  }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center font-semibold tabular-nums text-white/90">
                  {fmtRitmoMin(p.ritmo)}
                </span>
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums text-white/45">
                {fmtTiempo(p.segundos)}
              </span>
              {conDesnivel && (
                <span className="w-14 shrink-0 text-right tabular-nums text-white/35">
                  +{p.subidaM} −{p.bajadaM}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Grande({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-2.5 text-center">
      <p className="text-xl font-black tabular-nums text-white/90">{valor}</p>
      <p className="text-[9px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  )
}

function Fila({ icono, label, valor }: { icono: NombreIcono; label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="text-white/60">
        <Icono nombre={icono} /> {label}
      </span>
      <span className="font-bold tabular-nums text-white/90">{valor}</span>
    </div>
  )
}

/** Las estadísticas a pantalla completa, para abrirlas desde el historial. */
export function DialogoEstadisticas({
  sesion,
  unidades,
  onCerrar,
}: {
  sesion: SesionEjercicio
  unidades?: SistemaUnidades
  onCerrar: () => void
}) {
  const t = useT()
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="ui-panel ui-pop w-full max-w-md rounded-2xl border border-white/10 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{sesion.titulo}</p>
            <p className="text-xs capitalize text-white/40">{nombreFecha(sesion.fecha)}</p>
          </div>
          <button type="button" onClick={onCerrar} className="text-white/30 hover:text-white/70">
            ×
          </button>
        </div>
        <EstadisticasCardio sesion={sesion} unidades={unidades} />
        <button
          type="button"
          onClick={onCerrar}
          className="mt-3 w-full rounded-xl bg-white/10 py-2.5 font-bold text-white/80"
        >
          {t('ejercicio.det.cerrar', 'Cerrar')}
        </button>
      </div>
    </div>
  )
}
