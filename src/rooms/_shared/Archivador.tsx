import { Fragment, useMemo, useState, type Key, type ReactNode } from 'react'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Lunes de la semana de una fecha ISO: es la clave de la carpeta semanal. */
const claveSemana = (fecha: string) => fechaLocalISO(inicioSemana(deIso(fecha)))

/** Agrupa conservando el orden de entrada; devuelve las claves de mayor a menor. */
function agrupar<T>(items: T[], clave: (x: T) => string): [string, T[]][] {
  const mapa = new Map<string, T[]>()
  for (const item of items) {
    const k = clave(item)
    const grupo = mapa.get(k)
    if (grupo) grupo.push(item)
    else mapa.set(k, [item])
  }
  return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function etiquetaMes(mes: string): string {
  const nombre = deIso(`${mes}-01`).toLocaleDateString(localeActual(), { month: 'long' })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

function etiquetaSemana(lunes: string): string {
  const loc = localeActual()
  const desde = deIso(lunes).toLocaleDateString(loc, { day: 'numeric' })
  const hasta = deIso(isoMasDias(lunes, 6)).toLocaleDateString(loc, { day: 'numeric', month: 'short' })
  return `${desde} – ${hasta}`
}

/**
 * Historial en carpetas plegables: año › mes › semana › registros.
 *
 * Sustituye a las listas planas que crecían sin fin en cada cuarto. La carpeta
 * más reciente (año, mes y semana de hoy) se abre sola, así lo último queda a
 * la vista sin tener que ir abriendo tres niveles.
 */
export function Archivador<T>({
  items,
  fecha,
  clave,
  resumen,
  vacio,
  children,
}: {
  items: T[]
  /** Fecha `yyyy-mm-dd` del registro: decide en qué carpeta cae. */
  fecha: (item: T) => string
  clave: (item: T) => Key
  /** Insignia opcional de cada carpeta: total de kcal, minutos, gasto… */
  resumen?: (items: T[]) => ReactNode
  vacio?: string
  children: (item: T) => ReactNode
}) {
  const t = useT()
  const [tocadas, setTocadas] = useState<ReadonlySet<string>>(new Set())

  const arbol = useMemo(() => {
    const orden = [...items].sort((a, b) => fecha(b).localeCompare(fecha(a)))
    return agrupar(orden, (x) => fecha(x).slice(0, 4)).map(([anio, delAnio]) => ({
      anio,
      items: delAnio,
      meses: agrupar(delAnio, (x) => fecha(x).slice(0, 7)).map(([mes, delMes]) => ({
        mes,
        items: delMes,
        semanas: agrupar(delMes, (x) => claveSemana(fecha(x))).map(([lunes, deSemana]) => ({
          lunes,
          items: deSemana,
        })),
      })),
    }))
  }, [items, fecha])

  const abiertasPorDefecto = useMemo(() => {
    const anio = arbol[0]
    if (!anio) return new Set<string>()
    const mes = anio.meses[0]
    return new Set([anio.anio, mes.mes, mes.semanas[0].lunes])
  }, [arbol])

  // Sin efectos: la carpeta reciente empieza abierta y cada clic invierte su
  // estado. Así los datos que llegan tarde de la base no dejan todo cerrado.
  const abierta = (k: string) => abiertasPorDefecto.has(k) !== tocadas.has(k)
  const alternar = (k: string) =>
    setTocadas((prev) => {
      const copia = new Set(prev)
      if (copia.has(k)) copia.delete(k)
      else copia.add(k)
      return copia
    })

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-white/40">
        {vacio ?? t('carpetas.vacio', 'Aún no hay registros.')}
      </p>
    )
  }

  const semanaDeHoy = claveSemana(fechaLocalISO())

  return (
    <div className="space-y-2">
      {arbol.map((anio) => (
        <Carpeta
          key={anio.anio}
          nivel={0}
          titulo={anio.anio}
          conteo={anio.items.length}
          insignia={resumen?.(anio.items)}
          abierta={abierta(anio.anio)}
          onAlternar={() => alternar(anio.anio)}
        >
          {anio.meses.map((mes) => (
            <Carpeta
              key={mes.mes}
              nivel={1}
              titulo={etiquetaMes(mes.mes)}
              conteo={mes.items.length}
              insignia={resumen?.(mes.items)}
              abierta={abierta(mes.mes)}
              onAlternar={() => alternar(mes.mes)}
            >
              {mes.semanas.map((semana) => (
                <Carpeta
                  key={semana.lunes}
                  nivel={2}
                  titulo={
                    semana.lunes === semanaDeHoy
                      ? t('carpetas.estaSemana', 'Esta semana')
                      : etiquetaSemana(semana.lunes)
                  }
                  conteo={semana.items.length}
                  insignia={resumen?.(semana.items)}
                  abierta={abierta(semana.lunes)}
                  onAlternar={() => alternar(semana.lunes)}
                >
                  <div className="space-y-2">
                    {semana.items.map((item) => (
                      <Fragment key={clave(item)}>{children(item)}</Fragment>
                    ))}
                  </div>
                </Carpeta>
              ))}
            </Carpeta>
          ))}
        </Carpeta>
      ))}
    </div>
  )
}

/**
 * Mismas carpetas, pero agrupadas por una etiqueta de texto (género, categoría…)
 * en vez de por fecha. Un solo nivel: la carpeta con más registros abre sola.
 */
export function CarpetasPorEtiqueta<T>({
  items,
  etiqueta,
  clave,
  sinEtiqueta,
  children,
}: {
  items: T[]
  /** Texto por el que se agrupa; vacío cae en la carpeta `sinEtiqueta`. */
  etiqueta: (item: T) => string
  clave: (item: T) => Key
  sinEtiqueta: string
  children: (item: T) => ReactNode
}) {
  const t = useT()
  const [tocadas, setTocadas] = useState<ReadonlySet<string>>(new Set())

  // Se agrupa sin distinguir mayúsculas ni acentos sueltos («Terror» = «terror»)
  // y se muestra la primera forma que escribió el usuario.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { titulo: string; items: T[] }>()
    for (const item of items) {
      const texto = etiqueta(item).trim()
      const k = texto.toLocaleLowerCase()
      const grupo = mapa.get(k)
      if (grupo) grupo.items.push(item)
      else mapa.set(k, { titulo: texto || sinEtiqueta, items: [item] })
    }
    return [...mapa.values()].sort((a, b) => b.items.length - a.items.length || a.titulo.localeCompare(b.titulo))
  }, [items, etiqueta, sinEtiqueta])

  const abierta = (k: string) => (grupos[0]?.titulo === k) !== tocadas.has(k)

  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-white/40">{t('carpetas.vacio', 'Aún no hay registros.')}</p>
  }

  return (
    <div className="space-y-2">
      {grupos.map((grupo) => (
        <Carpeta
          key={grupo.titulo}
          nivel={0}
          titulo={grupo.titulo}
          conteo={grupo.items.length}
          abierta={abierta(grupo.titulo)}
          onAlternar={() =>
            setTocadas((prev) => {
              const copia = new Set(prev)
              if (copia.has(grupo.titulo)) copia.delete(grupo.titulo)
              else copia.add(grupo.titulo)
              return copia
            })
          }
        >
          <div className="space-y-2">
            {grupo.items.map((item) => (
              <Fragment key={clave(item)}>{children(item)}</Fragment>
            ))}
          </div>
        </Carpeta>
      ))}
    </div>
  )
}

const ESTILO_TITULO = [
  'text-sm font-bold',
  'text-sm font-semibold text-white/80',
  'text-xs font-semibold text-white/60',
]

function Carpeta({
  nivel,
  titulo,
  conteo,
  insignia,
  abierta,
  onAlternar,
  children,
}: {
  nivel: 0 | 1 | 2
  titulo: string
  conteo: number
  insignia?: ReactNode
  abierta: boolean
  onAlternar: () => void
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className={nivel === 0 ? 'rounded-xl border border-white/10 bg-white/5' : ''}>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5"
      >
        <span className="text-xs text-white/40">
          <Icono nombre={abierta ? 'subir' : 'bajar'} />
        </span>
        <span className={ESTILO_TITULO[nivel]}>{titulo}</span>
        {insignia != null && <span className="text-xs text-white/45">{insignia}</span>}
        <span
          className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50"
          title={
            conteo === 1
              ? t('carpetas.nRegistro', '1 registro')
              : t('carpetas.nRegistros', '{n} registros', { n: conteo })
          }
        >
          {conteo}
        </span>
      </button>
      {abierta && <div className="space-y-1.5 pb-2 pl-3 pr-1.5">{children}</div>}
    </div>
  )
}
