import { Fragment, useEffect, useMemo, useRef, useState, type Key, type ReactNode } from 'react'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { useArrastre } from '../../core/ui/comun/arrastre'
import { Carpeta } from '../../core/ui/comun/Carpeta'

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
  abrirEn,
  claseLista,
  children,
}: {
  items: T[]
  /** Fecha `yyyy-mm-dd` del registro: decide en qué carpeta cae. */
  fecha: (item: T) => string
  clave: (item: T) => Key
  /** Insignia opcional de cada carpeta: total de kcal, minutos, gasto… */
  resumen?: (items: T[]) => ReactNode
  vacio?: string
  /** Día `yyyy-mm-dd` elegido fuera (un calendario): abre sus carpetas, lo
   *  destaca y lo trae a la vista. */
  abrirEn?: string
  /** Clase del contenedor de los registros (lista apilada por defecto). */
  claseLista?: string
  children: (item: T) => ReactNode
}) {
  const t = useT()
  const [tocadas, setTocadas] = useState<ReadonlySet<string>>(new Set())
  const [ultimoSalto, setUltimoSalto] = useState(abrirEn)
  const refSalto = useRef<HTMLDivElement>(null)

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

  /** Las tres carpetas (año, mes y semana) donde cae el día elegido fuera. */
  const delSalto = useMemo(
    () => (abrirEn ? new Set([abrirEn.slice(0, 4), abrirEn.slice(0, 7), claveSemana(abrirEn)]) : new Set<string>()),
    [abrirEn],
  )

  // Un día recién elegido manda: se olvidan los toques previos de sus carpetas
  // para que ninguna quede cerrada por un clic viejo.
  if (abrirEn !== ultimoSalto) {
    setUltimoSalto(abrirEn)
    if (abrirEn) setTocadas((prev) => new Set([...prev].filter((k) => !delSalto.has(k))))
  }

  // El primer registro del día elegido: es el que se trae a la vista.
  const itemSalto = abrirEn ? items.find((x) => fecha(x) === abrirEn) : undefined
  const claveSalto = itemSalto === undefined ? undefined : clave(itemSalto)

  useEffect(() => {
    if (abrirEn) refSalto.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [abrirEn])

  // Sin efectos: la carpeta reciente empieza abierta y cada clic invierte su
  // estado. Así los datos que llegan tarde de la base no dejan todo cerrado.
  const abierta = (k: string) => (abiertasPorDefecto.has(k) || delSalto.has(k)) !== tocadas.has(k)
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
                  <div className={claseLista ?? 'space-y-2'}>
                    {semana.items.map((item) =>
                      abrirEn ? (
                        <div
                          key={clave(item)}
                          ref={clave(item) === claveSalto ? refSalto : undefined}
                          className={
                            fecha(item) === abrirEn ? 'rounded-xl ring-2 ring-white/40 transition' : undefined
                          }
                        >
                          {children(item)}
                        </div>
                      ) : (
                        <Fragment key={clave(item)}>{children(item)}</Fragment>
                      ),
                    )}
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
 *
 * Con `orden` las carpetas listadas ahí van primero y en ese orden; las demás caen
 * detrás por cantidad, como siempre. Y con `onReordenar` las cabeceras se pueden
 * arrastrar para cambiarlo.
 */
export function CarpetasPorEtiqueta<T>({
  items,
  etiqueta,
  clave,
  sinEtiqueta,
  orden,
  onReordenar,
  claseLista,
  children,
}: {
  items: T[]
  /** Texto por el que se agrupa; vacío cae en la carpeta `sinEtiqueta`. */
  etiqueta: (item: T) => string
  clave: (item: T) => Key
  sinEtiqueta: string
  /** Títulos en el orden manual guardado; los que falten van detrás. */
  orden?: string[]
  /** Si se define, las carpetas se arrastran y esto recibe el orden completo. */
  onReordenar?: (titulos: string[]) => void
  /** Clase del contenedor de los registros (lista apilada por defecto). */
  claseLista?: string
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
    const lista = [...mapa.values()].sort(
      (a, b) => b.items.length - a.items.length || a.titulo.localeCompare(b.titulo),
    )
    if (!orden?.length) return lista
    // El orden guardado manda; lo que no esté en él va detrás, conservando el
    // orden por cantidad. Los ausentes se numeran a partir de `orden.length` en
    // vez de mandarlos al infinito: con dos infinitos la resta da NaN y un
    // comparador que devuelve NaN deja el `sort` en manos del azar.
    const puesto = new Map(orden.map((titulo, i) => [titulo.toLocaleLowerCase(), i]))
    return lista
      .map((g, i) => ({ g, k: puesto.get(g.titulo.toLocaleLowerCase()) ?? orden.length + i }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.g)
  }, [items, etiqueta, sinEtiqueta, orden])

  const abierta = (k: string) => (grupos[0]?.titulo === k) !== tocadas.has(k)

  /** Suelta la carpeta arrastrada justo antes de `destino`. */
  const soltar = (arrastrada: string, destino: string) => {
    if (!onReordenar || arrastrada === destino) return
    const titulos = grupos.map((g) => g.titulo).filter((x) => x !== arrastrada)
    const at = titulos.indexOf(destino)
    titulos.splice(at < 0 ? titulos.length : at, 0, arrastrada)
    onReordenar(titulos)
  }

  // El gesto compartido de la casa: pulsación larga (o mover con el ratón)
  // levanta la carpeta entera y cae justo antes de aquella sobre la que se suelta.
  const arrastre = useArrastre<string>((e, mano) => {
    const cab = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-carpeta]')
    const destino = cab?.getAttribute('data-carpeta')
    return destino && destino !== mano ? destino : null
  }, soltar)

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
          gesto={onReordenar ? arrastre.props(grupo.titulo) : undefined}
          claveArrastre={onReordenar ? grupo.titulo : undefined}
          enMano={arrastre.enMano === grupo.titulo}
          marcada={arrastre.destino === grupo.titulo}
          onAlternar={() =>
            setTocadas((prev) => {
              const copia = new Set(prev)
              if (copia.has(grupo.titulo)) copia.delete(grupo.titulo)
              else copia.add(grupo.titulo)
              return copia
            })
          }
        >
          <div className={claseLista ?? 'space-y-2'}>
            {grupo.items.map((item) => (
              <Fragment key={clave(item)}>{children(item)}</Fragment>
            ))}
          </div>
        </Carpeta>
      ))}
    </div>
  )
}

