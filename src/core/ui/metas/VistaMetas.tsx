import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { PlanMeta, Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { crearMeta, descendientes, progresoDe } from '../../metas'
import { claveCategoria, useCategoriasMeta } from '../../state/categoriasMetaStore'
import { esObjetoLibreria, useDiseño } from '../../state/disenoStore'
import { CASA } from '../calendario/apps'
import { COLORES_RUTINA } from '../coloresRutina'
import { confirmar } from '../../state/confirmarStore'
import { vivo } from '../estilos'
import { Icono } from '../iconos/Icono'
import { useArrastre, type PropsArrastre } from '../comun/arrastre'
import { carpetaDeClave, claveDeMeta, PREFIJO_CAT, soltarMeta, type CarpetaMeta } from './carpetas'
import { FilaMetaCard } from './FilaMetaCard'

/** Dónde caería la meta que va en la mano: antes de una fila o al final de un grupo. */
interface DestinoMeta {
  grupo: string
  antesDe?: Rutina
}

/** Una carpeta con las metas que le tocan. */
interface GrupoMetas extends CarpetaMeta {
  metas: Rutina[]
}

/**
 * El panel de Metas: todas las metas agrupadas, sin el eje de tiempo.
 *
 * Es el escalón que faltaba antes de Planes. La lista de la izquierda del
 * cronograma sirve para trazar sobre el eje, pero mezcla todo en una columna de
 * 19 rem; aquí caben el icono de la app, el avance del grupo y el estado de cada
 * meta.
 *
 * Se agrupa por APP y no por la categoría de la plantilla (cuerpo/mente/…):
 * 'complemento' se lleva 13 de las 21 apps, así que agrupar por ahí sería un
 * cajón de sastre — el mismo razonamiento que ya documenta `apps.ts` para el
 * filtro del calendario. Encima de eso van las categorías propias del usuario,
 * que mandan sobre la app.
 *
 * Cada carpeta lleva el COLOR de su app (borde, fondo y cabecera): con doce
 * grupos en dos columnas, un punto de 8 px no distinguía nada.
 *
 * Solo se pintan las metas de primer nivel. Las sub-metas viven en la hoja que
 * abre el clic: un plan aceptado son doce, y desplegadas aquí la carpeta dejaba
 * de poder leerse de un vistazo.
 */
export function VistaMetas({
  metas,
  busca,
  dosColumnas,
  planPorMeta,
  onAbrirMeta,
  ambito,
  ambitoId,
  ejemplo,
}: {
  metas: Rutina[]
  /** El buscador vive en la barra del conmutador: esta vista no tiene cabecera propia. */
  busca: string
  /** Grupos lado a lado en pantallas anchas, en vez de una sola columna. */
  dosColumnas: boolean
  /** El plan ya generado de cada meta, si tiene: su fila lo señala. */
  planPorMeta?: Map<number, PlanMeta>
  /** Abre la hoja de la meta (o la de su plan): es TODO lo que hace un clic aquí. */
  onAbrirMeta: (r: Rutina) => void
  /** Embebido en una app: una sola lista, sin agrupar ni categorías. */
  ambito?: string
  ambitoId?: string
  ejemplo?: string
}) {
  const t = useT()
  const [gruposPlegados, setGruposPlegados] = useState<Set<string>>(new Set())
  const [agregandoEn, setAgregandoEn] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const propias = useCategoriasMeta((s) => s.propias)
  const quitarCategoria = useCategoriasMeta((s) => s.quitar)
  // Las apps que el usuario tiene en su casa: sus carpetas salen aunque estén
  // vacías, para que se vea DÓNDE se puede poner una meta sin tener que crearla
  // primero. `useShallow` porque el selector devuelve un array nuevo cada vez.
  const appsDeLaCasa = useDiseño(
    useShallow((s) => [
      ...new Set(
        s.objetos
          .filter((o) => o.plantillaId && !esObjetoLibreria(o))
          .map((o) => o.plantillaId as string),
      ),
    ]),
  )

  const grupos = useMemo((): GrupoMetas[] => {
    // Embebido en una app: la vista YA está filtrada a lo suyo, agrupar sobraría.
    if (ambito) return [{ clave: ambito, nombre: '', icon: '', color: '', propia: false, metas }]

    const porClave = new Map<string, Rutina[]>()
    for (const m of metas) {
      const clave = claveDeMeta(m)
      porClave.set(clave, [...(porClave.get(clave) ?? []), m])
    }
    // Carpetas que se enseñan aunque estén vacías: las apps de la casa (así se ve
    // dónde cabe una meta antes de tener ninguna), las categorías recién creadas y
    // el cajón de la casa, que es donde caen las metas que no son de ninguna app.
    for (const id of appsDeLaCasa) if (!porClave.has(id)) porClave.set(id, [])
    for (const c of propias) if (!porClave.has(PREFIJO_CAT + c)) porClave.set(PREFIJO_CAT + c, [])
    if (!porClave.has(CASA)) porClave.set(CASA, [])

    const apps: GrupoMetas[] = []
    const cats: GrupoMetas[] = []
    let casa: GrupoMetas | null = null
    for (const [clave, lista] of porClave) {
      const grupo = { ...carpetaDeClave(clave, t), metas: lista }
      if (grupo.propia) cats.push(grupo)
      else if (clave === CASA) casa = grupo
      else apps.push(grupo)
    }
    const porNombre = (a: GrupoMetas, b: GrupoMetas) => a.nombre.localeCompare(b.nombre)
    // Apps, luego lo que el usuario inventó, y la casa al final: es el cajón de
    // lo que no pertenece a nada.
    return [...apps.sort(porNombre), ...cats.sort(porNombre), ...(casa ? [casa] : [])]
  }, [metas, propias, appsDeLaCasa, ambito, t])

  const borrarCategoria = async (g: GrupoMetas) => {
    const ok = await confirmar({
      titulo: t('cal.metas.categoria.borrar', '¿Quitar esta categoría?'),
      mensaje:
        g.metas.length > 0
          ? t('cal.metas.categoria.borrarConMetas', 'Sus {n} metas se quedan, sin categoría.', {
              n: g.metas.length,
            })
          : g.nombre,
      textoOk: t('ui.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    quitarCategoria(g.nombre)
    await Promise.all(
      g.metas.map((m) => (m.id != null ? rutinasRepo.update(m.id, { categoriaMeta: undefined }) : null)),
    )
  }

  /** Alta dentro de una sección: la meta nace ya perteneciendo a ella. */
  const confirmarAlta = async (g: GrupoMetas) => {
    if (!nombre.trim()) return
    const color = COLORES_RUTINA[g.metas.length % COLORES_RUTINA.length]
    const app = g.propia || g.clave === CASA ? undefined : g.clave
    const nueva = await crearMeta(metas, nombre, undefined, color, ambito ?? app, ambitoId)
    // `crearMeta` es del núcleo y no sabe de categorías propias: se estampa aquí.
    if (nueva?.id != null && g.propia) await rutinasRepo.update(nueva.id, { categoriaMeta: g.nombre })
    setNombre('')
  }

  // El arrastre no tiene asa: se agarra la fila. El gesto (compartido con toda
  // la casa) mira qué hay bajo el dedo: otra fila (la meta cae ANTES de ella,
  // aunque sea de otra carpeta) o la caja de un grupo (cae al final de él).
  // Embebido en una app (`ambito`) no se arrastra: la lista viene re-enraizada
  // y reordenarla escribiría un padre falso, desgajando la rama.
  const arr = useArrastre<DestinoMeta>(
    (e, mano) => {
      if (ambito) return null
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      const fila = bajo?.closest('[data-meta-fila]')
      if (fila) {
        const id = fila.getAttribute('data-meta-fila')
        const grupo = fila.getAttribute('data-grupo')
        if (!id || id === mano || !grupo) return null
        const antesDe = metas.find((m) => String(m.id) === id)
        return antesDe ? { grupo, antesDe } : null
      }
      const grupo = bajo?.closest('[data-zona-grupo]')?.getAttribute('data-zona-grupo')
      return grupo ? { grupo } : null
    },
    (mano, destino) => {
      const mueve = metas.find((m) => String(m.id) === mano)
      const g = grupos.find((x) => x.clave === destino.grupo)
      if (mueve && g) void soltarMeta(metas, mueve, g, destino.antesDe)
    },
  )

  const plegarGrupo = (clave: string) =>
    setGruposPlegados((p) => {
      const s = new Set(p)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })

  // Solo en el cronograma embebido de una app: en el panel general las carpetas
  // vacías ya dicen cada una lo suyo, y un aviso encima sobraría.
  const vacio = !!ambito && grupos.every((g) => g.metas.length === 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div data-tut="cal.metas.lista" className="min-h-0 flex-1 overflow-y-auto p-3">
        {vacio && (
          <p className="py-6 text-center text-xs text-white/30">
            {t('cal.cron.vacio', 'Todavía no hay metas.')}
          </p>
        )}
        {/* `items-start` para que un grupo corto no se estire al alto del de al lado. */}
        <div
          className={
            dosColumnas ? 'grid items-start gap-3 md:grid-cols-2' : 'mx-auto max-w-2xl space-y-3'
          }
        >
          {grupos.map((g) => (
            <SeccionMetas
              key={g.clave}
              grupo={g}
              anonima={!!ambito}
              plegada={gruposPlegados.has(g.clave)}
              onPlegarGrupo={() => plegarGrupo(g.clave)}
              onBorrarCategoria={() => void borrarCategoria(g)}
              busca={busca}
              planPorMeta={planPorMeta}
              onAbrirMeta={onAbrirMeta}
              agregando={agregandoEn === g.clave}
              onAgregar={() => setAgregandoEn(g.clave)}
              onCerrarAlta={() => setAgregandoEn(null)}
              nombre={nombre}
              onNombre={setNombre}
              onConfirmarAlta={() => void confirmarAlta(g)}
              ejemplo={ejemplo}
              // El arrastre solo en el panel general (ver el comentario del gesto).
              gestoDe={ambito ? undefined : (m) => arr.props(String(m.id))}
              enManoId={arr.enMano}
              destino={arr.destino}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * ¿La meta pasa el buscador? Cuenta también lo que lleva dentro: buscar
 * «termodinámica» tiene que encontrar la meta que la esconde en una sub-meta,
 * ahora que las sub-metas no se pintan aquí.
 */
function coincide(metas: Rutina[], m: Rutina, q: string): boolean {
  const texto = (r: Rutina) => `${r.nombre} ${r.nota ?? ''}`.toLowerCase()
  if (texto(m).includes(q)) return true
  return (m.id != null ? descendientes(metas, m.id) : []).some((h) => texto(h).includes(q))
}

/** Un grupo: su cabecera con avance y, debajo, sus metas de primer nivel. */
function SeccionMetas({
  grupo,
  anonima,
  plegada,
  onPlegarGrupo,
  onBorrarCategoria,
  busca,
  planPorMeta,
  onAbrirMeta,
  agregando,
  onAgregar,
  onCerrarAlta,
  nombre,
  onNombre,
  onConfirmarAlta,
  ejemplo,
  gestoDe,
  enManoId,
  destino,
}: {
  grupo: GrupoMetas
  /** Embebido en una app: sin cabecera, la sección es toda la vista. */
  anonima: boolean
  plegada: boolean
  onPlegarGrupo: () => void
  onBorrarCategoria: () => void
  busca: string
  planPorMeta?: Map<number, PlanMeta>
  onAbrirMeta: (r: Rutina) => void
  agregando: boolean
  onAgregar: () => void
  onCerrarAlta: () => void
  nombre: string
  onNombre: (v: string) => void
  onConfirmarAlta: () => void
  ejemplo?: string
  /** El gesto de arrastre de cada fila; sin él, esta sección no reordena. */
  gestoDe?: (m: Rutina) => PropsArrastre
  enManoId?: string | null
  destino?: DestinoMeta | null
}) {
  const t = useT()
  // Las de primer nivel: las que no tienen madre, o cuya madre no está en este
  // grupo (la lista puede venir filtrada por app o por el filtro del calendario).
  // El orden es el mismo que usa `hijasDe` en el resto de la app: lo que el
  // usuario colocó (`orden`) y, a igualdad, la más vieja primero.
  const raices = useMemo(
    () =>
      grupo.metas
        .filter((m) => m.padreId == null || !grupo.metas.some((o) => o.id === m.padreId))
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.creadoEn.localeCompare(b.creadoEn)),
    [grupo.metas],
  )
  const q = busca.trim().toLowerCase()
  const filas = useMemo(
    () => (q ? raices.filter((m) => coincide(grupo.metas, m, q)) : raices),
    [raices, grupo.metas, q],
  )
  const avance = raices.length
    ? raices.reduce((s, m) => s + progresoDe(grupo.metas, m), 0) / raices.length
    : 0
  const hechas = raices.filter((m) => progresoDe(grupo.metas, m) === 1).length

  // Buscando, un grupo sin resultados estorba; sin filtro sí se enseña vacío
  // (es donde está su botón de «+ meta»).
  if (q && filas.length === 0) return null

  const alta = (
    <div className="ps-1 pe-1 pt-0.5">
      {agregando ? (
        <input
          autoFocus
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          onBlur={() => {
            onConfirmarAlta()
            onCerrarAlta()
          }}
          // Enter deja la caja abierta: así se encadenan varias metas de un tirón.
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirmarAlta()
            else if (e.key === 'Escape') onCerrarAlta()
          }}
          placeholder={
            ejemplo
              ? t('cal.meta.ejemplo', 'Ej.: {ejemplo}', { ejemplo })
              : t('cal.metaPlaceholder', 'Agregar una meta…')
          }
          className="w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-xs text-white/90 placeholder:text-white/25 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onAgregar}
          className="rounded px-1.5 py-0.5 text-[11px] font-bold leading-none text-emerald-300/90 transition hover:bg-emerald-500/15 hover:text-emerald-200"
        >
          + {t('cal.meta.etiquetaMeta', 'meta')}
        </button>
      )}
    </div>
  )

  const lista = filas.map((m) => (
    <FilaMetaCard
      key={m.id}
      metas={grupo.metas}
      meta={m}
      // El número es su sitio en la CARPETA, no en el resultado de la búsqueda.
      indice={raices.indexOf(m) + 1}
      color={grupo.color || '#94a3b8'}
      conPlan={m.id != null && planPorMeta?.has(m.id)}
      onAbrir={onAbrirMeta}
      gesto={gestoDe?.(m)}
      grupoClave={grupo.clave}
      enMano={enManoId === String(m.id)}
      encima={destino?.antesDe?.id === m.id}
    />
  ))

  /** La carpeta entera acepta soltar (cae al final): la valida el gesto. */
  const encima = !!destino && destino.grupo === grupo.clave && !destino.antesDe
  const zonaSoltar = gestoDe ? { 'data-zona-grupo': grupo.clave } : {}

  if (anonima)
    return (
      <div className="space-y-1">
        {lista}
        {alta}
      </div>
    )

  return (
    <div
      data-tut="cal.metas.grupo"
      {...zonaSoltar}
      className={`overflow-hidden rounded-xl border ${encima ? 'ring-1 ring-accent/70' : ''}`}
      // El color de la app tiñe la carpeta entera: es lo que la distingue de un
      // vistazo entre doce. Los textos van en `texto-vivo` para que el modo claro
      // siga siendo legible (ver index.css).
      style={{ borderColor: `${grupo.color}44`, backgroundColor: `${grupo.color}0d` }}
    >
      <div className="flex items-center gap-2 px-2.5 py-2" style={{ backgroundColor: `${grupo.color}1f` }}>
        <button
          type="button"
          onClick={onPlegarGrupo}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
        >
          <span className="w-2 shrink-0 text-[9px] text-white/40">{plegada ? '▸' : '▾'}</span>
          <span
            className="min-w-0 flex-1 truncate text-xs font-bold texto-vivo"
            style={vivo(grupo.color)}
          >
            <Icono emoji={grupo.icon} /> {grupo.nombre}
          </span>
        </button>
        {raices.length > 0 && (
          <>
            <div className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-black/25 sm:block">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(avance * 100)}%`, background: grupo.color }}
              />
            </div>
            <span
              className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/70"
              title={t('cal.metas.grupoAvance', 'Metas completas de este grupo')}
            >
              {hechas}/{raices.length}
            </span>
          </>
        )}
        {grupo.propia && (
          <button
            type="button"
            onClick={onBorrarCategoria}
            title={t('cal.metas.categoria.borrar', '¿Quitar esta categoría?')}
            className="shrink-0 px-0.5 text-[10px] text-white/30 transition hover:text-red-400"
          >
            <Icono nombre="basura" />
          </button>
        )}
      </div>

      {!plegada && (
        <div className="space-y-1 border-t border-white/5 px-1.5 pb-2 pt-1.5">
          {lista}
          {filas.length === 0 && (
            <p className="px-1 py-1 text-[11px] text-white/25">
              {t('cal.metas.grupoVacio', 'Sin metas todavía.')}
            </p>
          )}
          {alta}
        </div>
      )}
    </div>
  )
}

/** Las categorías propias que ya existen: las de las metas más las creadas vacías. */
export function categoriasDisponibles(metas: Rutina[], propias: string[]): string[] {
  const vistas = new Map<string, string>()
  for (const m of metas) {
    const c = m.categoriaMeta?.trim()
    if (c) vistas.set(claveCategoria(c), c)
  }
  for (const c of propias) if (!vistas.has(claveCategoria(c))) vistas.set(claveCategoria(c), c)
  return [...vistas.values()].sort((a, b) => a.localeCompare(b))
}
