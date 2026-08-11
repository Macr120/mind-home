import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { PlanMeta, Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { claveLS } from '../../edicion'
import { localeActual, useT } from '../../i18n/useT'
import {
  agendada,
  crearMeta,
  diasParaFin,
  estadoMeta,
  priorizarMeta,
  progresoDe,
  rangoDe,
  resumenAlcance,
  type EstadoMeta,
} from '../../metas'
import { useCategoriasMeta } from '../../state/categoriasMetaStore'
import { esObjetoLibreria, useDiseño } from '../../state/disenoStore'
import { CASA } from '../calendario/apps'
import { COLORES_RUTINA } from '../coloresRutina'
import { vivo } from '../estilos'
import { Icono } from '../iconos/Icono'
import { iniciarArrastre } from '../arrastre'
import {
  carpetaDeClave,
  claveDeMeta,
  nombreCorto,
  PREFIJO_CAT,
  soltarMeta,
  type CarpetaMeta,
} from './carpetas'
import { PildoraCuenta } from './CuentaRegresiva'

/** Las tres columnas, en el orden en que avanza una meta. */
const COLUMNAS: EstadoMeta[] = ['porHacer', 'enCurso', 'hecho']

const TONO_COLUMNA: Record<EstadoMeta, string> = {
  porHacer: 'border-white/10',
  enCurso: 'border-amber-400/30',
  hecho: 'border-emerald-400/30',
}

const PUNTO_COLUMNA: Record<EstadoMeta, string> = {
  porHacer: 'bg-white/25',
  enCurso: 'bg-amber-400',
  hecho: 'bg-emerald-400',
}

/** Una carpeta dentro de una columna, con las metas suyas que caen ahí. */
interface GrupoCol {
  carpeta: CarpetaMeta
  metas: Rutina[]
}

/** Cómo se ordenan las tarjetas dentro de cada columna. */
type ModoTablero = 'agrupadas' | 'importancia'
const MODOS_TABLERO: ModoTablero[] = ['agrupadas', 'importancia']
const LS_MODO = claveLS('mh.metas.tablero')
/** Orden de las carpetas dentro de las columnas, si se arrastraron. */
const LS_ORDEN_CARPETAS = claveLS('mh.metas.tablero.carpetas')

/**
 * Qué tan urgente es una meta. No hay campo de prioridad en la base y tampoco
 * hace falta inventarlo: lo que de verdad ordena una lista de metas es el plazo.
 *
 * Menor es más importante. Lo vencido va primero (ya se pasó y sigue abierto),
 * después lo que vence antes, y al final lo que no tiene fecha — eso no le pide
 * nada al calendario. A igualdad manda lo más avanzado: cerrar lo que está a un
 * paso rinde más que empezar otra cosa.
 */
function pesoImportancia(metas: Rutina[], r: Rutina): [number, number, number] {
  const dias = diasParaFin(r)
  const grupo = dias == null ? 2 : dias < 0 ? 0 : 1
  return [grupo, dias ?? 0, -progresoDe(metas, r)]
}

/**
 * El orden de la columna en modo importancia. Manda lo que el usuario haya
 * colocado a mano (`prioridad`, que se escribe al arrastrar); mientras no toque
 * nada, el plazo. Las que ya tienen prioridad van primero: en cuanto se arrastra
 * una, `priorizarMeta` renumera la columna entera, así que la mezcla solo dura
 * lo que tarda una meta nueva en aparecer.
 */
const porImportancia = (metas: Rutina[]) => (a: Rutina, b: Rutina) => {
  const pra = a.prioridad ?? Infinity
  const prb = b.prioridad ?? Infinity
  if (pra !== prb) return pra - prb
  const [ga, da, pa] = pesoImportancia(metas, a)
  const [gb, db, pb] = pesoImportancia(metas, b)
  return ga - gb || da - db || pa - pb
}

/** El orden que el usuario dejó puesto (arrastrando), o el de siempre. */
const porOrden = (a: Rutina, b: Rutina) =>
  (a.orden ?? 0) - (b.orden ?? 0) || a.creadoEn.localeCompare(b.creadoEn)

/** Último día del periodo de una meta: su «fecha de terminación». */
const finDe = (r: Rutina) => rangoDe(r)?.fin ?? ''

/**
 * Las cumplidas, de la más reciente a la más antigua. La «fecha de finalización»
 * de una meta es el último día de su periodo: no se guarda cuándo se palomeó
 * (`Rutina` no lleva ese campo), y su plazo es lo que el usuario recuerda.
 */
const porFinalizacion = (a: Rutina, b: Rutina) =>
  finDe(b).localeCompare(finDe(a)) || a.nombre.localeCompare(b.nombre)

/**
 * Las metas como tablero: Por hacer · En curso · Hecho.
 *
 * Las tarjetas se arrastran DENTRO de su columna; lo que no se puede es
 * cambiarlas de columna — la columna se deduce de lo cumplido (`estadoMeta`),
 * así que una meta avanza al palomear un paso o una sub-meta, nunca porque
 * alguien la empuje. Un tablero que se mueve a mano miente sobre el avance real.
 *
 * Dos modos:
 *  · «Agrupadas»: por carpeta. Una tarjeta solo se mueve DENTRO de su carpeta, y
 *    para mover la carpeta entera se arrastra su cabecera.
 *  · «Importancia»: una sola lista, ordenada por el plazo mientras nadie la toque.
 *    Ahí arrastrar FIJA la importancia (`Rutina.prioridad`) sin sacar la meta de
 *    su carpeta, que se lee en la propia tarjeta.
 *
 * La barra de avance vive SOLO en «En curso»: en «Por hacer» siempre estaría
 * vacía y en «Hecho», llena. Allí lo que se enseña es la fecha en que se cerró.
 */
export function TableroMetas({
  metas,
  busca,
  planPorMeta,
  onAbrirMeta,
}: {
  metas: Rutina[]
  busca: string
  planPorMeta?: Map<number, PlanMeta>
  onAbrirMeta: (r: Rutina) => void
}) {
  const t = useT()
  // Carpeta en la que se está escribiendo una meta nueva (solo en «Por hacer»).
  const [altaEn, setAltaEn] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  // Lo que va en la mano: una meta (con su columna y su carpeta) o una carpeta
  // entera. Guardar la carpeta de origen es lo que permite exigir que se suelte
  // en la suya.
  const [arrastrada, setArrastrada] = useState<{
    meta: Rutina
    columna: EstadoMeta
    carpeta: string
  } | null>(null)
  const [carpetaEnMano, setCarpetaEnMano] = useState<string | null>(null)
  const propias = useCategoriasMeta((s) => s.propias)
  // Agrupadas por carpeta o en una sola lista por urgencia. Preferencia del
  // dispositivo, como la disposición del panel: se recuerda sin pasar por la BD.
  const [modo, setModo] = useState<ModoTablero>(() =>
    localStorage.getItem(LS_MODO) === 'importancia' ? 'importancia' : 'agrupadas',
  )
  const cambiarModo = (v: ModoTablero) => {
    setModo(v)
    localStorage.setItem(LS_MODO, v)
  }
  // Orden de las carpetas si se arrastró alguna. Vive en localStorage y no en la
  // BD: es una preferencia de cómo mirar, no un dato de las metas.
  const [ordenCarpetas, setOrdenCarpetas] = useState<string[]>(() => {
    try {
      const guardado: unknown = JSON.parse(localStorage.getItem(LS_ORDEN_CARPETAS) ?? '[]')
      return Array.isArray(guardado) ? (guardado as string[]) : []
    } catch {
      return []
    }
  })
  // Las apps que el usuario tiene en su casa: son las carpetas donde puede nacer
  // una meta aunque hoy no tenga ninguna por hacer.
  const appsDeLaCasa = useDiseño(
    useShallow((s) => [
      ...new Set(
        s.objetos.filter((o) => o.plantillaId && !esObjetoLibreria(o)).map((o) => o.plantillaId as string),
      ),
    ]),
  )

  const ETIQUETA: Record<EstadoMeta, string> = {
    porHacer: t('cal.meta.estado.porHacer', 'Por hacer'),
    enCurso: t('cal.meta.estado.enCurso', 'En curso'),
    hecho: t('cal.meta.estado.hecho', 'Hecho'),
  }

  // Solo las de primer nivel: las sub-metas son el DETALLE de una meta, y en el
  // tablero llenarían las columnas con las doce fases de cada plan aceptado.
  const raices = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return metas
      .filter((m) => m.padreId == null || !metas.some((o) => o.id === m.padreId))
      .filter((m) => !q || `${m.nombre} ${m.nota ?? ''}`.toLowerCase().includes(q))
  }, [metas, busca])

  /**
   * Cómo se ordena cada columna: las dos abiertas por lo que el modo diga, y
   * «Hecho» SIEMPRE por fecha de finalización — ahí la urgencia ya no existe y
   * lo que se busca es «¿qué cerré último?».
   */
  const ordenDe = (col: EstadoMeta) =>
    col === 'hecho' ? porFinalizacion : modo === 'importancia' ? porImportancia(metas) : porOrden

  /** Agrupadas: por carpeta dentro de cada columna. */
  const porColumna = useMemo(() => {
    const mapa = new Map<EstadoMeta, Map<string, GrupoCol>>(COLUMNAS.map((c) => [c, new Map()]))
    for (const m of raices) {
      const grupos = mapa.get(estadoMeta(metas, m))!
      const clave = claveDeMeta(m)
      const grupo = grupos.get(clave) ?? { carpeta: carpetaDeClave(clave, t), metas: [] }
      grupo.metas.push(m)
      grupos.set(clave, grupo)
    }
    // El orden que dejó el usuario manda; lo que no haya tocado, por nombre. Sin
    // esto el orden dependía de la fecha de la primera meta de cada carpeta y
    // bailaba al palomear cualquier cosa.
    const sitio = (c: string) => {
      const i = ordenCarpetas.indexOf(c)
      return i === -1 ? ordenCarpetas.length : i
    }
    return new Map(
      [...mapa].map(([col, grupos]) => [
        col,
        [...grupos.values()]
          .sort(
            (a, b) =>
              sitio(a.carpeta.clave) - sitio(b.carpeta.clave) ||
              a.carpeta.nombre.localeCompare(b.carpeta.nombre),
          )
          .map((g) => ({ ...g, metas: [...g.metas].sort(ordenDe(col)) })),
      ]),
    )
    // `ordenDe` sale del modo y de `metas`, que ya están en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raices, metas, modo, ordenCarpetas, t])

  /** Importancia: una sola lista por columna, sin cabeceras de carpeta. */
  const listaPorColumna = useMemo(() => {
    const mapa = new Map<EstadoMeta, Rutina[]>(COLUMNAS.map((c) => [c, []]))
    for (const m of raices) mapa.get(estadoMeta(metas, m))!.push(m)
    return new Map([...mapa].map(([col, lista]) => [col, [...lista].sort(ordenDe(col))]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raices, metas, modo])

  /** Las carpetas donde puede nacer una meta: las apps de la casa, las categorías y el cajón. */
  const carpetasAlta = useMemo(() => {
    const claves = [...new Set([...appsDeLaCasa, ...propias.map((c) => PREFIJO_CAT + c), CASA])]
    return claves.map((c) => carpetaDeClave(c, t)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [appsDeLaCasa, propias, t])

  /**
   * Soltar una meta dentro de su columna.
   *
   * En IMPORTANCIA la columna es una lista sola: soltar coloca la meta ahí y esa
   * es su importancia a partir de entonces (`prioridad`). No cambia de carpeta —
   * la suya se lee en la propia tarjeta y sacarla de ella es cosa de la vista de
   * carpetas, donde el destino se ve entero.
   *
   * En AGRUPADAS solo se acepta dentro de su misma carpeta: ahí lo que se ordena
   * es la carpeta, y la carpeta entera se mueve arrastrando su cabecera.
   */
  const soltarEn = async (columna: EstadoMeta, antesDe?: Rutina) => {
    const mano = arrastrada
    setArrastrada(null)
    if (!mano || mano.columna !== columna) return
    if (modo === 'importancia') {
      await priorizarMeta(listaPorColumna.get(columna) ?? [], mano.meta, antesDe)
      return
    }
    if (antesDe && claveDeMeta(antesDe) !== mano.carpeta) return
    await soltarMeta(metas, mano.meta, carpetaDeClave(mano.carpeta, t), antesDe)
  }

  /** Soltar una carpeta entera: se coloca antes de aquella sobre la que cae. */
  const soltarCarpeta = (destino: string) => {
    const mueve = carpetaEnMano
    setCarpetaEnMano(null)
    if (!mueve || mueve === destino) return
    // Se parte del orden que se ve ahora mismo (con las carpetas que aún no se
    // habían tocado ya colocadas), no del guardado: si no, mover la tercera con
    // la lista vacía la mandaría al principio.
    const visibles = [
      ...new Set(COLUMNAS.flatMap((c) => (porColumna.get(c) ?? []).map((g) => g.carpeta.clave))),
    ]
    const base = [...ordenCarpetas.filter((c) => visibles.includes(c)), ...visibles.filter((c) => !ordenCarpetas.includes(c))]
    const resto = base.filter((c) => c !== mueve)
    const i = resto.indexOf(destino)
    const fila = [...resto.slice(0, i === -1 ? resto.length : i), mueve, ...resto.slice(i === -1 ? resto.length : i)]
    setOrdenCarpetas(fila)
    localStorage.setItem(LS_ORDEN_CARPETAS, JSON.stringify(fila))
  }

  const confirmarAlta = async (carpeta: CarpetaMeta) => {
    if (!nombre.trim()) return
    const color = COLORES_RUTINA[metas.length % COLORES_RUTINA.length]
    const app = carpeta.propia || carpeta.clave === CASA ? undefined : carpeta.clave
    const nueva = await crearMeta(metas, nombre, undefined, color, app)
    // `crearMeta` es del núcleo y no sabe de categorías propias: se estampa aquí.
    if (nueva?.id != null && carpeta.propia)
      await rutinasRepo.update(nueva.id, { categoriaMeta: carpeta.nombre })
    setNombre('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div data-tut="cal.metas.tablero" className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto mb-2 flex max-w-5xl justify-end">
          <div className="flex items-center rounded-lg border border-white/10 p-0.5">
            {MODOS_TABLERO.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => cambiarModo(m)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                  modo === m ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                }`}
              >
                {m === 'importancia'
                  ? t('cal.metas.tablero.importancia', 'Importancia')
                  : t('cal.metas.tablero.agrupadas', 'Agrupadas')}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl items-start gap-3 md:grid-cols-3">
          {COLUMNAS.map((col) => {
            const grupos = porColumna.get(col) ?? []
            const sueltas = listaPorColumna.get(col) ?? []
            const cuantas = sueltas.length
            // Solo en «Por hacer» se crean metas: es donde nace todo lo que no se
            // ha empezado, y en las otras dos columnas una meta recién creada
            // aparecería en otro sitio del que se pulsó.
            const conAlta = col === 'porHacer'
            return (
              <div key={col} className={`rounded-xl border bg-white/[0.02] ${TONO_COLUMNA[col]}`}>
                <div className="flex items-center gap-2 border-b border-white/5 px-2.5 py-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO_COLUMNA[col]}`} />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-white/80">
                    {ETIQUETA[col]}
                  </span>
                  <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/60">
                    {cuantas}
                  </span>
                </div>

                <div className="space-y-2 p-1.5">
                  {cuantas === 0 && !conAlta && (
                    <p className="px-1 py-2 text-center text-[11px] text-white/20">
                      {t('cal.metas.columnaVacia', 'Nada aquí.')}
                    </p>
                  )}

                  {modo === 'importancia' &&
                    sueltas.map((m) => {
                      const carpeta = carpetaDeClave(claveDeMeta(m), t)
                      return (
                        <Tarjeta
                          key={m.id}
                          metas={metas}
                          meta={m}
                          columna={col}
                          color={carpeta.color}
                          // Sin cabeceras, la carpeta va DENTRO de la tarjeta: si
                          // no, no se sabría de qué cuarto es cada una.
                          carpeta={carpeta}
                          conPlan={m.id != null && planPorMeta?.has(m.id)}
                          onAbrir={onAbrirMeta}
                          // Cualquier tarjeta de la columna vale como destino: la
                          // lista es una sola y lo que se decide aquí es el orden
                          // de importancia, no a qué carpeta pertenece.
                          arrastrada={arrastrada?.columna === col ? arrastrada.meta : null}
                          onArrastrar={(r) =>
                            setArrastrada(r ? { meta: r, columna: col, carpeta: claveDeMeta(r) } : null)
                          }
                          onSoltar={(antesDe) => void soltarEn(col, antesDe)}
                        />
                      )
                    })}

                  {modo === 'agrupadas' &&
                    grupos.map((g) => (
                      <div
                        key={g.carpeta.clave}
                        // Soltar en el hueco de la carpeta: la meta cae al final de
                        // ella, siempre que sea la suya y venga de esta columna.
                        onDragOver={(e) => {
                          if (arrastrada?.columna !== col || arrastrada.carpeta !== g.carpeta.clave) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          if (arrastrada?.columna !== col || arrastrada.carpeta !== g.carpeta.clave) return
                          e.preventDefault()
                          void soltarEn(col)
                        }}
                        className="space-y-1"
                      >
                        <CabeceraCarpeta
                          carpeta={g.carpeta}
                          cuantas={g.metas.length}
                          enMano={carpetaEnMano}
                          onArrastrar={setCarpetaEnMano}
                          onSoltar={soltarCarpeta}
                        />
                        {g.metas.map((m) => (
                          <Tarjeta
                            key={m.id}
                            metas={metas}
                            meta={m}
                            columna={col}
                            color={g.carpeta.color}
                            conPlan={m.id != null && planPorMeta?.has(m.id)}
                            onAbrir={onAbrirMeta}
                            arrastrada={
                              arrastrada?.columna === col && arrastrada.carpeta === g.carpeta.clave
                                ? arrastrada.meta
                                : null
                            }
                            onArrastrar={(r) =>
                              setArrastrada(r ? { meta: r, columna: col, carpeta: g.carpeta.clave } : null)
                            }
                            onSoltar={(antesDe) => void soltarEn(col, antesDe)}
                          />
                        ))}
                        {conAlta && (
                          <Alta
                            carpeta={g.carpeta}
                            abierta={altaEn === g.carpeta.clave}
                            nombre={nombre}
                            onNombre={setNombre}
                            onAbrir={() => setAltaEn(g.carpeta.clave)}
                            onCerrar={() => setAltaEn(null)}
                            onConfirmar={() => void confirmarAlta(g.carpeta)}
                          />
                        )}
                      </div>
                    ))}

                  {/* Agrupadas: las carpetas que hoy no tienen nada por hacer se
                      pliegan aquí, para no dejar quince cabeceras vacías en la
                      columna. En importancia no hay cabeceras, así que este es el
                      único alta y ofrece todas. */}
                  {conAlta && (
                    <OtrasCarpetas
                      soloAlta={modo === 'importancia'}
                      carpetas={
                        modo === 'importancia'
                          ? carpetasAlta
                          : carpetasAlta.filter((c) => !grupos.some((g) => g.carpeta.clave === c.clave))
                      }
                      altaEn={altaEn}
                      nombre={nombre}
                      onNombre={setNombre}
                      onAbrir={setAltaEn}
                      onCerrar={() => setAltaEn(null)}
                      onConfirmar={(c) => void confirmarAlta(c)}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** La cabecera de una carpeta: se arrastra para mover la carpeta entera. */
function CabeceraCarpeta({
  carpeta,
  cuantas,
  enMano,
  onArrastrar,
  onSoltar,
}: {
  carpeta: CarpetaMeta
  cuantas: number
  enMano: string | null
  onArrastrar: (clave: string | null) => void
  onSoltar: (destino: string) => void
}) {
  const [encima, setEncima] = useState(false)
  const puedeSoltar = !!enMano && enMano !== carpeta.clave

  return (
    <p
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        onArrastrar(carpeta.clave)
      }}
      onDragEnd={() => {
        onArrastrar(null)
        setEncima(false)
      }}
      onDragOver={(e) => {
        if (!puedeSoltar) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        if (!puedeSoltar) return
        e.preventDefault()
        e.stopPropagation()
        setEncima(false)
        onSoltar(carpeta.clave)
      }}
      className={`flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wide texto-vivo ${
        encima ? 'border-t border-emerald-400' : ''
      } ${enMano === carpeta.clave ? 'opacity-40' : ''}`}
      style={vivo(carpeta.color)}
    >
      <Icono emoji={carpeta.icon} />
      <span className="min-w-0 flex-1 truncate">{nombreCorto(carpeta)}</span>
      <span className="shrink-0 tabular-nums opacity-60">{cuantas}</span>
    </p>
  )
}

/** El «+ meta» de una carpeta y su caja de texto. */
function Alta({
  carpeta,
  abierta,
  nombre,
  onNombre,
  onAbrir,
  onCerrar,
  onConfirmar,
}: {
  carpeta: CarpetaMeta
  abierta: boolean
  nombre: string
  onNombre: (v: string) => void
  onAbrir: () => void
  onCerrar: () => void
  onConfirmar: () => void
}) {
  const t = useT()
  if (!abierta)
    return (
      <button
        type="button"
        onClick={onAbrir}
        className="rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-emerald-300/80 transition hover:bg-emerald-500/15 hover:text-emerald-200"
      >
        + {t('cal.meta.etiquetaMeta', 'meta')}
      </button>
    )
  return (
    <input
      autoFocus
      value={nombre}
      onChange={(e) => onNombre(e.target.value)}
      onBlur={() => {
        onConfirmar()
        onCerrar()
      }}
      // Enter deja la caja abierta: así se encadenan varias metas de un tirón.
      onKeyDown={(e) => {
        if (e.key === 'Enter') onConfirmar()
        else if (e.key === 'Escape') onCerrar()
      }}
      placeholder={t('cal.metaEnCarpeta', 'Meta nueva en {carpeta}…', { carpeta: nombreCorto(carpeta) })}
      className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:outline-none"
    />
  )
}

/** Crear una meta en una carpeta que todavía no aparece en la columna. */
function OtrasCarpetas({
  carpetas,
  altaEn,
  nombre,
  soloAlta,
  onNombre,
  onAbrir,
  onCerrar,
  onConfirmar,
}: {
  carpetas: CarpetaMeta[]
  altaEn: string | null
  nombre: string
  /** Es el ÚNICO alta de la columna (modo importancia): se llama «+ meta» a secas. */
  soloAlta?: boolean
  onNombre: (v: string) => void
  onAbrir: (clave: string) => void
  onCerrar: () => void
  onConfirmar: (c: CarpetaMeta) => void
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const elegida = carpetas.find((c) => c.clave === altaEn)

  if (carpetas.length === 0) return null

  if (elegida)
    return (
      <Alta
        carpeta={elegida}
        abierta
        nombre={nombre}
        onNombre={onNombre}
        onAbrir={() => onAbrir(elegida.clave)}
        onCerrar={() => {
          onCerrar()
          setAbierto(false)
        }}
        onConfirmar={() => onConfirmar(elegida)}
      />
    )

  return (
    <div className={soloAlta ? 'pt-0.5' : 'border-t border-white/5 pt-1.5'}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-emerald-300/80 transition hover:bg-emerald-500/15 hover:text-emerald-200"
      >
        + {soloAlta ? t('cal.meta.etiquetaMeta', 'meta') : t('cal.metas.enOtraCarpeta', 'meta en otra carpeta')}
      </button>
      {abierto && (
        <div className="mt-1 space-y-0.5">
          {carpetas.map((c) => (
            <button
              key={c.clave}
              type="button"
              onClick={() => onAbrir(c.clave)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white/95"
            >
              <span className="texto-vivo" style={vivo(c.color)}>
                <Icono emoji={c.icon} />
              </span>
              <span className="min-w-0 flex-1 truncate">{nombreCorto(c)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Una meta en el tablero: su nombre, su nota y —según la columna— cómo va o cuándo se cerró. */
function Tarjeta({
  metas,
  meta,
  columna,
  color,
  carpeta,
  conPlan,
  onAbrir,
  arrastrada,
  onArrastrar,
  onSoltar,
}: {
  metas: Rutina[]
  meta: Rutina
  columna: EstadoMeta
  color: string
  /** Con valor, la tarjeta enseña de qué carpeta es (no hay cabecera que lo diga). */
  carpeta?: CarpetaMeta
  conPlan?: boolean
  onAbrir: (r: Rutina) => void
  /** La tarjeta que va en la mano, si viene de ESTA columna y ESTA carpeta. */
  arrastrada?: Rutina | null
  onArrastrar: (r: Rutina | null) => void
  onSoltar: (antesDe: Rutina) => void
}) {
  const t = useT()
  const [encima, setEncima] = useState(false)
  const resumen = resumenAlcance(metas, meta)
  const avance = progresoDe(metas, meta)
  const hecho = columna === 'hecho'
  const puedeSoltar = !!arrastrada && arrastrada.id !== meta.id
  const fin = finDe(meta)

  return (
    <button
      type="button"
      onClick={() => onAbrir(meta)}
      // Se agarra la tarjeta entera: sin asa ni icono de arrastre.
      draggable
      onDragStart={(e) => {
        iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        onArrastrar(meta)
      }}
      onDragEnd={() => {
        onArrastrar(null)
        setEncima(false)
      }}
      onDragOver={(e) => {
        if (!puedeSoltar) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        if (!puedeSoltar) return
        e.preventDefault()
        e.stopPropagation()
        setEncima(false)
        onSoltar(meta)
      }}
      className={`block w-full rounded-lg border px-2 py-1.5 text-left transition hover:brightness-125 ${
        encima ? 'border-t-2 border-t-emerald-400' : ''
      } ${arrastrada?.id === meta.id ? 'opacity-40' : ''}`}
      style={{ borderColor: `${color}44`, backgroundColor: `${color}12` }}
    >
      {carpeta && (
        <p
          className="flex items-center gap-1 truncate text-[10px] font-bold uppercase tracking-wide texto-vivo"
          style={vivo(carpeta.color)}
        >
          <Icono emoji={carpeta.icon} /> {nombreCorto(carpeta)}
        </p>
      )}
      <p className={`flex items-center gap-1 text-xs text-white/85 ${hecho ? 'opacity-60' : ''}`}>
        <span className={`min-w-0 flex-1 truncate ${hecho ? 'line-through' : ''}`}>{meta.nombre}</span>
        {conPlan && (
          <span className="shrink-0 text-violet-300/80" title={t('cal.meta.tienePlan', 'Tiene un plan')}>
            <Icono nombre="brillo" />
          </span>
        )}
      </p>
      {meta.nota && <p className="truncate text-[10px] text-white/35">{meta.nota}</p>}

      {/* Cumplida: cuándo se cerró. Es lo único que se le pregunta a una meta
          hecha, y su barra estaría siempre llena. */}
      {hecho ? (
        fin && (
          <p className="mt-0.5 text-[10px] tabular-nums text-white/35">
            {new Date(fin + 'T12:00').toLocaleDateString(localeActual(), {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )
      ) : columna === 'enCurso' && resumen.total > 0 ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-black/30">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.round(avance * 100)}%`, background: color }}
            />
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-white/40">
            {resumen.hechos}/{resumen.total}
          </span>
          {agendada(meta) && <PildoraCuenta meta={meta} />}
        </div>
      ) : (
        agendada(meta) && (
          <div className="mt-1 flex justify-end">
            <PildoraCuenta meta={meta} />
          </div>
        )
      )}
    </button>
  )
}
