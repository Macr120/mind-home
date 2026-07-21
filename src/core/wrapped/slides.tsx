import type { ComponentType, ReactNode } from 'react'
import { getPlantilla } from '../registry'
import { useT } from '../i18n/useT'
import { AvatarMini } from '../ui/ProgresoPanel'
import { Icono } from '../ui/iconos/Icono'
import { vivo } from '../ui/estilos'
import { HeatmapWrapped } from './HeatmapWrapped'
import type { ResumenWrapped, TipoHito } from './resumen'

/**
 * Slides del Wrapped: deck dinámico armado por `construirSlides` según los
 * datos del periodo (los dominios sin registros se saltan solos). Todo vive
 * dentro del overlay `.ui-noche`, por eso los text-white/X son válidos.
 */

export interface PropsSlide {
  resumen: ResumenWrapped
  previo?: ResumenWrapped
}

export interface SlideDef {
  id: string
  Comp: ComponentType<PropsSlide>
}

/** Acento neutro del wrapped (heatmap y portada); los dominios usan su color de app. */
const ACENTO = '#a78bfa'

const fmtMin = (min: number): string => {
  if (min < 60) return `${min} m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} m` : `${h} h`
}

/** Número protagonista con etiqueta debajo. */
function Dato({
  valor,
  etiqueta,
  color,
}: {
  valor: ReactNode
  etiqueta: string
  color?: string
}) {
  return (
    <div className="flex max-w-40 flex-col items-center gap-1">
      <span
        className={`text-4xl font-black tracking-tight ${color ? 'texto-vivo' : 'text-white/90'}`}
        style={color ? vivo(color) : undefined}
      >
        {valor}
      </span>
      <span className="text-xs leading-snug text-white/50">{etiqueta}</span>
    </div>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-10 text-center">
      {children}
    </div>
  )
}

// ---------- Slides fijos ----------

function SlidePortada({ resumen }: PropsSlide) {
  const t = useT()
  const p = resumen.periodo
  const titulo =
    p.tipo === 'semana'
      ? t('wrapped.portada.semana', 'Tu semana en Mind Home')
      : p.tipo === 'mes'
        ? t('wrapped.portada.mes', 'Tu mes en Mind Home')
        : t('wrapped.portada.anio', 'Tu año en Mind Home')
  return (
    <Marco>
      {/* Tu personaje presenta su propio resumen (mismo avatar 3D del menú). */}
      <div className="h-44 w-44">
        <AvatarMini />
      </div>
      <p className="texto-vivo text-4xl font-black tracking-tight" style={vivo(ACENTO)}>
        {titulo}
      </p>
      <p className="text-sm text-white/55">
        {t('wrapped.portada.sub', 'Un vistazo a todo lo que registraste.')}
      </p>
    </Marco>
  )
}

function SlideActividad({ resumen }: PropsSlide) {
  const t = useT()
  return (
    <Marco>
      <p className="text-lg font-bold text-white/85">
        {t('wrapped.actividad.titulo', 'Estuviste presente')}
      </p>
      <p className="texto-vivo text-7xl font-black tracking-tight" style={vivo(ACENTO)}>
        {resumen.diasActivos}
      </p>
      <p className="text-sm text-white/60">
        {t('wrapped.diasActivos', 'de {total} días con actividad', {
          total: resumen.diasTotales,
        })}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-center gap-x-10 gap-y-6">
        <Dato valor={resumen.registrosTotales} etiqueta={t('wrapped.registros', 'registros')} />
        {resumen.mejorRacha > 1 && (
          <Dato
            valor={
              <>
                <Icono nombre="racha" /> {resumen.mejorRacha}
              </>
            }
            etiqueta={t('wrapped.mejorRacha', 'días seguidos (mejor racha)')}
          />
        )}
      </div>
    </Marco>
  )
}

function SlideTopApp({ resumen }: PropsSlide) {
  const t = useT()
  const top3 = resumen.porApp.slice(0, 3)
  const max = top3[0]?.registros || 1
  const pl0 = getPlantilla(top3[0]?.plantillaId ?? '')
  return (
    <Marco>
      <p className="text-lg font-bold text-white/85">
        {t('wrapped.topApp.titulo', 'Tu cuarto estrella')}
      </p>
      {pl0 && (
        <>
          <span
            className="grid h-24 w-24 place-items-center rounded-3xl text-6xl"
            style={{ background: `${pl0.color}33` }}
          >
            <Icono emoji={pl0.icon} />
          </span>
          <p className="texto-vivo text-3xl font-black" style={vivo(pl0.color)}>
            {pl0.nombre}
          </p>
        </>
      )}
      <div className="flex w-full max-w-sm flex-col gap-2">
        {top3.map((a) => {
          const pl = getPlantilla(a.plantillaId)
          if (!pl) return null
          return (
            <div key={a.plantillaId} className="flex items-center gap-2 text-left">
              <span className="w-6 shrink-0 text-center text-base">
                <Icono emoji={pl.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-white/80">{pl.nombre}</span>
                  <span className="text-[11px] text-white/50">
                    {t('wrapped.topApp.n', '{n} registros', { n: a.registros })}
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(a.registros / max) * 100}%`, background: pl.color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Marco>
  )
}

// ---------- Slides de dominio ----------

function SlideApp({
  plantillaId,
  titulo,
  datos,
}: {
  plantillaId: string
  titulo: string
  datos: { valor: string | number; etiqueta: string }[]
}) {
  const pl = getPlantilla(plantillaId)
  return (
    <Marco>
      <span
        className="grid h-20 w-20 place-items-center rounded-3xl text-5xl"
        style={{ background: `${pl?.color ?? ACENTO}33` }}
      >
        <Icono emoji={pl?.icon ?? ''} />
      </span>
      <p className="text-lg font-bold text-white/85">{titulo}</p>
      <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-6">
        {datos.map((d, i) => (
          <Dato key={i} valor={d.valor} etiqueta={d.etiqueta} color={i === 0 ? pl?.color : undefined} />
        ))}
      </div>
    </Marco>
  )
}

function SlideEjercicio({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.ejercicio
  if (!d) return null
  const datos = [
    { valor: fmtMin(d.minutos), etiqueta: t('wrapped.ej.min', 'de ejercicio') },
    { valor: d.sesiones, etiqueta: t('wrapped.ej.sesiones', 'sesiones') },
  ]
  if (d.km > 0) datos.push({ valor: `${d.km} km`, etiqueta: t('wrapped.ej.km', 'recorridos') })
  if (d.volumenKg > 0)
    datos.push({
      valor: d.volumenKg.toLocaleString(),
      etiqueta: t('wrapped.ej.kg', 'kg levantados'),
    })
  return <SlideApp plantillaId="ejercicio" titulo={t('wrapped.ej.titulo', 'Moviste el cuerpo')} datos={datos} />
}

function SlideCalma({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.calma
  if (!d) return null
  const datos = [
    { valor: fmtMin(d.minutos), etiqueta: t('wrapped.calma.min', 'de calma') },
    { valor: d.sesiones, etiqueta: t('wrapped.calma.sesiones', 'sesiones') },
  ]
  if (d.gratitudes > 0)
    datos.push({ valor: d.gratitudes, etiqueta: t('wrapped.calma.gratitud', 'días de gratitud') })
  if (d.deltaAnimo != null && d.deltaAnimo !== 0)
    datos.push({
      valor: `${d.deltaAnimo > 0 ? '+' : ''}${d.deltaAnimo}`,
      etiqueta: t('wrapped.calma.animo', 'de ánimo tras cada sesión'),
    })
  return <SlideApp plantillaId="jardin" titulo={t('wrapped.calma.titulo', 'Encontraste calma')} datos={datos} />
}

function SlideEstudio({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.estudio
  if (!d) return null
  return (
    <SlideApp
      plantillaId="biblioteca"
      titulo={t('wrapped.estudio.titulo', 'Alimentaste la mente')}
      datos={[
        { valor: fmtMin(d.minutos), etiqueta: t('wrapped.estudio.min', 'de estudio') },
        { valor: d.sesiones, etiqueta: t('wrapped.estudio.sesiones', 'sesiones') },
      ]}
    />
  )
}

function SlideIdiomas({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.idiomas
  if (!d) return null
  const datos: { valor: string | number; etiqueta: string }[] = [
    { valor: d.repasos, etiqueta: t('wrapped.idiomas.repasos', 'repasos') },
  ]
  if (d.repasos > 0)
    datos.push({
      valor: `${Math.round((d.aciertos / d.repasos) * 100)}%`,
      etiqueta: t('wrapped.idiomas.aciertos', 'de aciertos'),
    })
  return <SlideApp plantillaId="idiomas" titulo={t('wrapped.idiomas.titulo', 'Practicaste idiomas')} datos={datos} />
}

function SlideHobbies({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.hobbies
  if (!d) return null
  const datos = [
    { valor: fmtMin(d.minutos), etiqueta: t('wrapped.hobbies.min', 'de práctica') },
    { valor: d.sesiones, etiqueta: t('wrapped.hobbies.sesiones', 'sesiones') },
  ]
  if (d.top)
    datos.push({
      valor: `${d.top.emoji} ${d.top.nombre}`,
      etiqueta: t('wrapped.hobbies.top', 'tu hobby estrella ({min})', { min: fmtMin(d.top.minutos) }),
    })
  return <SlideApp plantillaId="hobbies" titulo={t('wrapped.hobbies.titulo', 'Le diste a tus hobbies')} datos={datos} />
}

function SlideSueno({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.sueno
  if (!d) return null
  return (
    <SlideApp
      plantillaId="descanso"
      titulo={t('wrapped.sueno.titulo', 'Así descansaste')}
      datos={[
        { valor: `${d.horasProm} h`, etiqueta: t('wrapped.sueno.horas', 'de sueño promedio') },
        { valor: d.noches, etiqueta: t('wrapped.sueno.noches', 'noches registradas') },
        { valor: `${d.calidadProm} ★`, etiqueta: t('wrapped.sueno.calidad', 'calidad promedio') },
      ]}
    />
  )
}

function SlideCocina({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.cocina
  if (!d) return null
  const datos: { valor: string | number; etiqueta: string }[] = []
  if (d.comidas > 0)
    datos.push({ valor: d.comidas, etiqueta: t('wrapped.cocina.comidas', 'comidas registradas') })
  if (d.aguaLitros > 0)
    datos.push({ valor: `${d.aguaLitros} L`, etiqueta: t('wrapped.cocina.agua', 'de agua') })
  if (d.pesoDelta != null)
    datos.push({
      valor: `${d.pesoDelta > 0 ? '+' : ''}${d.pesoDelta} kg`,
      etiqueta: t('wrapped.cocina.peso', 'de cambio de peso'),
    })
  return <SlideApp plantillaId="cocina" titulo={t('wrapped.cocina.titulo', 'En la cocina')} datos={datos} />
}

function SlideFinanzas({ resumen }: PropsSlide) {
  const t = useT()
  const d = resumen.dominios.finanzas
  if (!d) return null
  const datos = [
    { valor: `$${d.ingresos.toLocaleString()}`, etiqueta: t('wrapped.fin.ingresos', 'de ingresos') },
    { valor: `$${d.gastos.toLocaleString()}`, etiqueta: t('wrapped.fin.gastos', 'de gastos') },
  ]
  if (d.topCategoriaGasto)
    datos.push({
      valor: d.topCategoriaGasto,
      etiqueta: t('wrapped.fin.topCategoria', 'donde más gastaste'),
    })
  return <SlideApp plantillaId="despacho" titulo={t('wrapped.fin.titulo', 'Tus cuentas')} datos={datos} />
}

// ---------- Heatmap, hitos, comparativa y cierre ----------

function SlideHeatmap({ resumen }: PropsSlide) {
  const t = useT()
  return (
    <Marco>
      <p className="text-lg font-bold text-white/85">
        {t('wrapped.heatmap.titulo', 'Tu mapa de constancia')}
      </p>
      <div className="w-full max-w-xl">
        <HeatmapWrapped
          porDia={resumen.actividadPorDia}
          periodo={resumen.periodo}
          color={ACENTO}
        />
      </div>
      <p className="text-xs text-white/45">
        {t('wrapped.heatmap.pie', 'Cada celda es un día; más color, más registros.')}
      </p>
    </Marco>
  )
}

const HITOS_META: Record<TipoHito, { emoji: string; clave: string; es: string }> = {
  lugares: { emoji: '📍', clave: 'wrapped.hito.lugares', es: '{n} lugares visitados' },
  recuerdosViaje: { emoji: '📸', clave: 'wrapped.hito.recuerdos', es: '{n} recuerdos de viaje' },
  peliculas: { emoji: '🎬', clave: 'wrapped.hito.peliculas', es: '{n} películas' },
  series: { emoji: '📺', clave: 'wrapped.hito.series', es: '{n} series' },
  libros: { emoji: '📚', clave: 'wrapped.hito.libros', es: '{n} libros' },
  videojuegos: { emoji: '🎮', clave: 'wrapped.hito.videojuegos', es: '{n} videojuegos' },
  anecdotas: { emoji: '📖', clave: 'wrapped.hito.anecdotas', es: '{n} anécdotas guardadas' },
  proyectosTerminados: { emoji: '🏁', clave: 'wrapped.hito.proyectos', es: '{n} proyectos terminados' },
  mantenimientos: { emoji: '🔧', clave: 'wrapped.hito.mantenimientos', es: '{n} mantenimientos' },
  rutinasCompletadas: { emoji: '✅', clave: 'wrapped.hito.rutinas', es: '{n} días de rutina cumplidos' },
}

function SlideHitos({ resumen }: PropsSlide) {
  const t = useT()
  return (
    <Marco>
      <span className="text-5xl">
        <Icono nombre="trofeo" />
      </span>
      <p className="text-lg font-bold text-white/85">{t('wrapped.hitos.titulo', 'Tus hitos')}</p>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
        {resumen.hitos.map((h) => {
          const m = HITOS_META[h.tipo]
          return (
            <span
              key={h.tipo}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85"
            >
              <Icono emoji={m.emoji} /> {t(m.clave, m.es, { n: h.n })}
            </span>
          )
        })}
      </div>
    </Marco>
  )
}

function FilaComparativa({
  etiqueta,
  antes,
  ahora,
  fmt = (n) => String(n),
}: {
  etiqueta: string
  antes: number
  ahora: number
  fmt?: (n: number) => string
}) {
  const pct = antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null
  const sube = ahora > antes
  const igual = ahora === antes
  return (
    <div className="flex items-center gap-3 text-left">
      <span className="min-w-0 flex-1 truncate text-sm text-white/70">{etiqueta}</span>
      <span className="text-xs text-white/40">{fmt(antes)} →</span>
      <span className="text-sm font-bold text-white/90">{fmt(ahora)}</span>
      <span
        className={`w-14 text-right text-xs font-bold ${
          igual ? 'text-white/40' : sube ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {igual ? '=' : `${sube ? '▲' : '▼'}${pct != null ? ` ${Math.abs(pct)}%` : ''}`}
      </span>
    </div>
  )
}

function SlideComparativa({ resumen, previo }: PropsSlide) {
  const t = useT()
  if (!previo) return null
  const ej = resumen.dominios.ejercicio?.minutos ?? 0
  const ejPrev = previo.dominios.ejercicio?.minutos ?? 0
  const calma = resumen.dominios.calma?.minutos ?? 0
  const calmaPrev = previo.dominios.calma?.minutos ?? 0
  return (
    <Marco>
      <p className="text-lg font-bold text-white/85">
        {t('wrapped.comparativa.titulo', 'Contra el periodo anterior')}
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <FilaComparativa
          etiqueta={t('wrapped.comparativa.dias', 'Días activos')}
          antes={previo.diasActivos}
          ahora={resumen.diasActivos}
        />
        <FilaComparativa
          etiqueta={t('wrapped.registros.mayus', 'Registros')}
          antes={previo.registrosTotales}
          ahora={resumen.registrosTotales}
        />
        {(ej > 0 || ejPrev > 0) && (
          <FilaComparativa
            etiqueta={t('wrapped.comparativa.ejercicio', 'Ejercicio')}
            antes={ejPrev}
            ahora={ej}
            fmt={fmtMin}
          />
        )}
        {(calma > 0 || calmaPrev > 0) && (
          <FilaComparativa
            etiqueta={t('wrapped.comparativa.calma', 'Calma')}
            antes={calmaPrev}
            ahora={calma}
            fmt={fmtMin}
          />
        )}
      </div>
    </Marco>
  )
}

function SlideCierre({ resumen }: PropsSlide) {
  const t = useT()
  const ratio = resumen.diasTotales ? resumen.diasActivos / resumen.diasTotales : 0
  const frase =
    ratio >= 0.8
      ? t('wrapped.cierre.top', '¡Imparable! Estuviste casi todos los días.')
      : ratio >= 0.5
        ? t('wrapped.cierre.bien', 'Buen ritmo: más de la mitad de los días.')
        : t('wrapped.cierre.animo', 'Cada día registrado cuenta. Sigue así.')
  return (
    <Marco>
      <span className="text-5xl">
        <Icono nombre="fiesta" />
      </span>
      <p className="texto-vivo text-5xl font-black tracking-tight" style={vivo(ACENTO)}>
        +{resumen.xpGanado.toLocaleString()} XP
      </p>
      <p className="text-sm text-white/70">{frase}</p>
      <p className="text-xs text-white/40">
        {t('wrapped.cierre.nav', 'Usa ‹ › y el selector de arriba para ver otros periodos.')}
      </p>
    </Marco>
  )
}

function SlideVacio({ resumen }: PropsSlide) {
  const t = useT()
  return (
    <Marco>
      <span className="text-5xl">
        <Icono nombre="brillo" />
      </span>
      <p className="text-sm leading-relaxed text-white/60">
        {t(
          'wrapped.vacio',
          'Sin registros en este periodo. Los resúmenes se arman solos con lo que registres en tus apps.',
        )}
      </p>
      <p className="text-xs text-white/40">{resumen.periodo.desde}</p>
    </Marco>
  )
}

// ---------- Constructor del deck ----------

/** Dominio → app dueña (para ordenar los slides por actividad real). */
const DOMINIOS: [keyof ResumenWrapped['dominios'], string, ComponentType<PropsSlide>][] = [
  ['ejercicio', 'ejercicio', SlideEjercicio],
  ['calma', 'jardin', SlideCalma],
  ['estudio', 'biblioteca', SlideEstudio],
  ['idiomas', 'idiomas', SlideIdiomas],
  ['hobbies', 'hobbies', SlideHobbies],
  ['sueno', 'descanso', SlideSueno],
  ['cocina', 'cocina', SlideCocina],
  ['finanzas', 'despacho', SlideFinanzas],
]

export function construirSlides(resumen: ResumenWrapped, previo?: ResumenWrapped): SlideDef[] {
  if (resumen.registrosTotales === 0)
    return [
      { id: 'portada', Comp: SlidePortada },
      { id: 'vacio', Comp: SlideVacio },
    ]

  const defs: SlideDef[] = [
    { id: 'portada', Comp: SlidePortada },
    { id: 'actividad', Comp: SlideActividad },
  ]
  if (resumen.porApp.length > 0) defs.push({ id: 'topApp', Comp: SlideTopApp })

  const orden = new Map(resumen.porApp.map((a, i) => [a.plantillaId, i]))
  DOMINIOS.filter(([clave]) => resumen.dominios[clave] != null)
    .sort((a, b) => (orden.get(a[1]) ?? 99) - (orden.get(b[1]) ?? 99))
    .slice(0, 4)
    .forEach(([clave, , Comp]) => defs.push({ id: `dominio:${clave}`, Comp }))

  if (resumen.diasActivos > 0) defs.push({ id: 'heatmap', Comp: SlideHeatmap })
  if (resumen.hitos.length > 0) defs.push({ id: 'hitos', Comp: SlideHitos })
  if (previo && previo.registrosTotales > 0)
    defs.push({ id: 'comparativa', Comp: SlideComparativa })
  defs.push({ id: 'cierre', Comp: SlideCierre })
  return defs
}
