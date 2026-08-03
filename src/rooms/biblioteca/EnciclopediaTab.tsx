import { useMemo, useState } from 'react'
import { VACIO, conversacionesBiblioRepo, entradasBiblioRepo, temasArbolRepo } from '../../core/data/repository'
import type { EntradaBiblio, TemaArbol } from '../../core/data/db'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL, getPilar } from './constantes'
import { PILARES, todosLosTemas } from './pilares'
import { hoyISO } from './fecha'
import type { AnclaTema } from './arbol'
import { EntradaForm, type EntradaFormInicial } from './EntradaForm'
import { ImagenIA } from '../_shared/ImagenIA'

/** Prompt de la ilustración de una entrada (título + resumen, estilo editorial). */
const promptEntrada = (e: EntradaBiblio) =>
  `Ilustración editorial limpia y conceptual para una entrada de enciclopedia titulada «${e.titulo}». ` +
  `Representa: ${e.resumen.slice(0, 300)}. ` +
  'Estilo ilustración digital moderna, colores sobrios, sin texto, sin letras, sin marcas de agua.'

/** Nodo del diagrama (unifica semilla, campos, ramas, temas, dinámicos y hojas 📄). */
interface NodoDiag {
  /** Clave de expansión: 'semilla' | pilarId | rama.id | tema.id | temaId dinámico | 'ent-<id>'. */
  id: string
  icono?: string
  titulo: string
  descripcion?: string
  badgeEntradas?: number
  badgeDesbloq?: number
  esNuevo?: boolean
  /** Rama estática: nodo estructural plegable sin acciones. */
  estructural?: boolean
  /** Tema (estático o dinámico): habilita 💬 y ✓. */
  tema?: { temaId: string; pilarId: string; descripcion: string; entradaId?: number }
  /** Hoja 📄: entrada sin tema; la fila abre su detalle. */
  entradaHoja?: number
  hijos: NodoDiag[]
}

interface CtxDiag {
  expandidos: Set<string>
  toggle: (id: string) => void
  buscando: boolean
  conIA: boolean
  charlar: (tema: { temaId: string; pilarId: string; titulo: string; descripcion: string }) => void
  abrirEntrada: (id: number) => void
  t: ReturnType<typeof useT>
}

/** Fila + hijos recursivos con líneas conectoras (border-l + stub horizontal). */
function NodoDiagrama({ nodo, raiz, ctx }: { nodo: NodoDiag; raiz?: boolean; ctx: CtxDiag }) {
  const abierto = ctx.buscando || ctx.expandidos.has(nodo.id)
  const tieneHijos = nodo.hijos.length > 0
  const stub = raiz
    ? ''
    : 'before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:bg-white/15'

  const contenido = (
    <>
      {tieneHijos ? (
        <button
          type="button"
          onClick={() => ctx.toggle(nodo.id)}
          className="w-4 shrink-0 text-center text-xs text-white/40 transition hover:text-white/80"
          title={ctx.t('biblioteca.enc.subtemas', '{n} subtemas', { n: String(nodo.hijos.length) })}
        >
          {abierto ? '▾' : '▸'}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {nodo.icono && (
        <span className="shrink-0 text-base leading-none">
          <Icono emoji={nodo.icono} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`flex items-center gap-1.5 ${
            nodo.id === 'semilla'
              ? 'text-sm font-semibold text-white/90'
              : nodo.estructural
                ? 'text-[10px] font-semibold uppercase tracking-wide text-white/45'
                : 'text-xs text-white/80'
          }`}
        >
          <span className="truncate">{nodo.titulo}</span>
          {nodo.esNuevo && (
            <span
              className="shrink-0 rounded-full px-1.5 py-px text-[8px] font-bold text-black"
              style={{ background: COLOR }}
            >
              <Icono nombre="brillo" /> {ctx.t('biblioteca.enc.nuevo', 'nuevo')}
            </span>
          )}
          {nodo.badgeDesbloq != null && (
            <span
              className="shrink-0 text-[9px] text-white/45"
              title={ctx.t('biblioteca.enc.temasDesbloq', '{n} temas desbloqueados', { n: String(nodo.badgeDesbloq) })}
            >
              <Icono nombre="brillo" /> {nodo.badgeDesbloq}
            </span>
          )}
          {nodo.badgeEntradas != null && (
            <span
              className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold text-black"
              style={{ background: COLOR }}
              title={ctx.t('biblioteca.enc.nEntradas', '{n} entradas', { n: String(nodo.badgeEntradas) })}
            >
              {nodo.badgeEntradas}
            </span>
          )}
        </span>
        {nodo.descripcion && (
          <span className="block truncate text-[10px] text-white/35">{nodo.descripcion}</span>
        )}
      </span>
      {nodo.tema && nodo.tema.entradaId != null && (
        <button
          type="button"
          onClick={() => ctx.abrirEntrada(nodo.tema!.entradaId!)}
          className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs text-emerald-300 transition hover:bg-white/10"
          title={ctx.t('biblioteca.enc.verEntrada', 'Ver la entrada de este tema')}
        >
          <Icono nombre="confirmar" />
        </button>
      )}
      {nodo.tema && (
        <button
          type="button"
          onClick={() =>
            ctx.charlar({
              temaId: nodo.tema!.temaId,
              pilarId: nodo.tema!.pilarId,
              titulo: nodo.titulo,
              descripcion: nodo.tema!.descripcion,
            })
          }
          disabled={!ctx.conIA}
          className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10 disabled:opacity-35"
          title={ctx.t('biblioteca.enc.charlarTema', 'Charlar sobre este tema con el Sabio')}
        >
          <Icono nombre="chat" />
        </button>
      )}
    </>
  )

  return (
    <div>
      {nodo.entradaHoja != null ? (
        <button
          type="button"
          onClick={() => ctx.abrirEntrada(nodo.entradaHoja!)}
          className={`relative flex w-full items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5 text-left transition hover:bg-black/30 ${stub}`}
        >
          {contenido}
        </button>
      ) : (
        <div
          className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
            nodo.estructural ? 'ui-panel-2' : 'bg-black/20'
          } ${stub}`}
        >
          {contenido}
        </div>
      )}
      {abierto && tieneHijos && (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/15 pl-3">
          {nodo.hijos.map((h) => (
            <NodoDiagrama key={h.id} nodo={h} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * La enciclopedia como diagrama de árbol global: 🌱 Semilla → campos → ramas →
 * temas → subtemas desbloqueados. Las charlas se archivan en su lugar correcto
 * y el árbol crece cuando TÚ ramificas (panel 🌿 de la charla).
 */
export function EnciclopediaTab({
  onConversar,
  onAbrirCharla,
}: {
  onConversar: (texto: string, ancla?: AnclaTema) => void
  onAbrirCharla: (id: number) => void
}) {
  const t = useT()
  const entradas = entradasBiblioRepo.useAll() ?? VACIO
  const charlas = conversacionesBiblioRepo.useAll() ?? VACIO
  const nodos = temasArbolRepo.useAll() ?? VACIO
  const [entradaId, setEntradaId] = useState<number | null>(null)
  const [form, setForm] = useState<{ inicial: EntradaFormInicial; entradaId?: number } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['semilla']))

  const hoy = hoyISO()

  // ----- Modelo del diagrama (campos con todo su subárbol) -----
  const campos = useMemo<NodoDiag[]>(() => {
    const entradaPorTema = new Map<string, EntradaBiblio>()
    for (const e of entradas) if (e.temaId) entradaPorTema.set(e.temaId, e)

    const idsEstaticos = new Set(todosLosTemas().map((x) => x.id))
    const idsDinamicos = new Set(nodos.map((n) => n.temaId))
    const hijosDe = new Map<string, TemaArbol[]>()
    const raicesPorPilar = new Map<string, TemaArbol[]>()
    for (const n of nodos) {
      // Huérfanos (padre irresoluble) se adoptan como hijos directos del campo.
      if (n.padreId && (idsEstaticos.has(n.padreId) || idsDinamicos.has(n.padreId))) {
        const lista = hijosDe.get(n.padreId) ?? []
        lista.push(n)
        hijosDe.set(n.padreId, lista)
      } else {
        const lista = raicesPorPilar.get(n.pilarId) ?? []
        lista.push(n)
        raicesPorPilar.set(n.pilarId, lista)
      }
    }

    const nodoDinamico = (n: TemaArbol): NodoDiag => ({
      id: n.temaId,
      titulo: n.titulo,
      descripcion: n.descripcion || undefined,
      esNuevo: n.creadoEn.slice(0, 10) === hoy,
      tema: {
        temaId: n.temaId,
        pilarId: n.pilarId,
        descripcion: n.descripcion,
        entradaId: entradaPorTema.get(n.temaId)?.id,
      },
      hijos: (hijosDe.get(n.temaId) ?? []).map(nodoDinamico),
    })

    const campoDiag = (pilarId: string, icono: string, titulo: string, ramas: (typeof PILARES)[number]['ramas']): NodoDiag => {
      const entradasCampo = entradas.filter((e) => e.pilarId === pilarId)
      const sueltas = entradasCampo.filter(
        (e) => !e.temaId || (!idsEstaticos.has(e.temaId) && !idsDinamicos.has(e.temaId)),
      )
      const desbloq = nodos.filter((n) => n.pilarId === pilarId).length
      const ramasDiag: NodoDiag[] = ramas.map((rama) => ({
        id: rama.id,
        titulo: rama.titulo,
        estructural: true,
        hijos: rama.temas.map((tema) => ({
          id: tema.id,
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          tema: {
            temaId: tema.id,
            pilarId,
            descripcion: tema.descripcion,
            entradaId: entradaPorTema.get(tema.id)?.id,
          },
          hijos: (hijosDe.get(tema.id) ?? []).map(nodoDinamico),
        })),
      }))
      const libres = (raicesPorPilar.get(pilarId) ?? []).map(nodoDinamico)
      const hojas: NodoDiag[] = sueltas.map((e) => ({
        id: `ent-${e.id}`,
        icono: '📄',
        titulo: e.titulo,
        entradaHoja: e.id,
        hijos: [],
      }))
      return {
        id: pilarId,
        icono,
        titulo,
        badgeEntradas: entradasCampo.length || undefined,
        badgeDesbloq: desbloq || undefined,
        hijos: [...ramasDiag, ...libres, ...hojas],
      }
    }

    const lista = PILARES.map((p) => campoDiag(p.id, p.icon, p.titulo, p.ramas))
    const general = campoDiag(PILAR_GENERAL.id, PILAR_GENERAL.icon, PILAR_GENERAL.titulo, [])
    if (general.hijos.length || general.badgeEntradas) lista.push(general)
    return lista
  }, [entradas, nodos, hoy])

  // ----- Búsqueda: poda el árbol conservando el subárbol de lo que casa -----
  const q = busqueda.trim().toLowerCase()
  const camposVisibles = useMemo(() => {
    if (!q) return campos
    const podar = (n: NodoDiag): NodoDiag | null => {
      const coincide =
        n.titulo.toLowerCase().includes(q) || (n.descripcion ?? '').toLowerCase().includes(q)
      if (coincide) return n
      const hijos = n.hijos.map(podar).filter((x): x is NodoDiag => x != null)
      return hijos.length ? { ...n, hijos } : null
    }
    return campos.map(podar).filter((x): x is NodoDiag => x != null)
  }, [campos, q])

  const ctx: CtxDiag = {
    expandidos,
    toggle: (id) =>
      setExpandidos((prev) => {
        const s = new Set(prev)
        if (s.has(id)) s.delete(id)
        else s.add(id)
        return s
      }),
    buscando: q !== '',
    conIA: iaActiva(),
    charlar: (tema) =>
      onConversar(
        t('biblioteca.enc.promptTema', 'Cuéntame sobre {tema}. {desc}', {
          tema: tema.titulo,
          desc: tema.descripcion,
        }),
        { temaId: tema.temaId, pilarId: tema.pilarId },
      ),
    abrirEntrada: (id) => setEntradaId(id),
    t,
  }

  const modal = form && (
    <EntradaForm inicial={form.inicial} entradaId={form.entradaId} onCerrar={() => setForm(null)} />
  )

  // ----- Vista: detalle de una entrada -----
  const entrada = entradaId != null ? entradas.find((e) => e.id === entradaId) : undefined
  if (entrada) {
    const pilar = getPilar(entrada.pilarId)
    const temaEstatico = todosLosTemas().find((x) => x.id === entrada.temaId)
    const tituloTema = temaEstatico?.titulo ?? nodos.find((n) => n.temaId === entrada.temaId)?.titulo
    const charlaOrigen =
      entrada.conversacionId != null ? charlas.find((c) => c.id === entrada.conversacionId) : undefined
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setEntradaId(null)
            setBorrando(false)
          }}
          className="text-xs text-white/50 transition hover:text-white/80"
        >
          ← {t('biblioteca.tab.enciclopedia', 'Enciclopedia')}
        </button>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white/95">{entrada.titulo}</h3>
              <p className="mt-0.5 text-[11px] text-white/45">
                <Icono emoji={pilar.icon} /> {pilar.titulo}
                {tituloTema && ` · ${tituloTema}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    inicial: {
                      titulo: entrada.titulo,
                      resumen: entrada.resumen,
                      puntosClave: entrada.puntosClave,
                      pilarId: entrada.pilarId,
                      temaId: entrada.temaId,
                    },
                    entradaId: entrada.id,
                  })
                }
                className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
              >
                <Icono nombre="editar" /> {t('biblioteca.ent.editarBtn', 'Editar')}
              </button>
              <button
                type="button"
                onClick={() => setBorrando(true)}
                className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/10"
                title={t('biblioteca.ent.borrar', 'Borrar entrada')}
              >
                <Icono nombre="basura" />
              </button>
            </div>
          </div>

          {borrando && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs">
              <span className="text-rose-200/90">
                {t('biblioteca.ent.confirmarBorrar', '¿Borrar esta entrada? La charla origen no se toca.')}
              </span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (entrada.id != null) await entradasBiblioRepo.remove(entrada.id)
                    setBorrando(false)
                    setEntradaId(null)
                  }}
                  className="font-semibold text-rose-300 hover:text-rose-200"
                >
                  {t('biblioteca.charla.siBorrar', 'Borrar')}
                </button>
                <button type="button" onClick={() => setBorrando(false)} className="text-white/50 hover:text-white/80">
                  {t('biblioteca.ent.cancelar', 'Cancelar')}
                </button>
              </span>
            </div>
          )}

          <ImagenIA
            imagen={entrada.imagen}
            prompt={promptEntrada(entrada)}
            onCambiar={async (imagen) => {
              if (entrada.id != null) await entradasBiblioRepo.update(entrada.id, { imagen })
            }}
          />

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{entrada.resumen}</p>

          {entrada.puntosClave.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">
                {t('biblioteca.ent.puntosTitulo', 'Puntos clave')}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
                {entrada.puntosClave.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
            {charlaOrigen ? (
              <button
                type="button"
                onClick={() => charlaOrigen.id != null && onAbrirCharla(charlaOrigen.id)}
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
              >
                <Icono nombre="chat" /> {t('biblioteca.ent.verCharla', 'Ver charla origen')}
              </button>
            ) : (
              <span />
            )}
            <span className="text-[10px] text-white/30">
              {new Date(entrada.actualizadoEn).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        {modal}
      </div>
    )
  }

  // ----- Vista: el diagrama -----
  const semilla: NodoDiag = {
    id: 'semilla',
    icono: '🌱',
    titulo: t('biblioteca.enc.semilla', 'Semilla'),
    descripcion: t('biblioteca.enc.sub', '{n} entradas en {c} campos', {
      n: String(entradas.length),
      c: String(new Set(entradas.map((e) => e.pilarId)).size),
    }),
    hijos: camposVisibles,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-relaxed text-white/45">
          {t('biblioteca.enc.arbolDesc', 'Todo tu conocimiento en un árbol: cada charla se archiva en su lugar y crece cuando tú la ramificas.')}
        </p>
        <button
          type="button"
          onClick={() => setForm({ inicial: { titulo: '', resumen: '', puntosClave: [], pilarId: PILAR_GENERAL.id } })}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
          style={{ background: COLOR }}
        >
          <Icono nombre="agregar" /> {t('biblioteca.ent.nueva', 'Nueva entrada')}
        </button>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={t('biblioteca.enc.buscarTema', 'Buscar tema…')}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-white/30"
      />

      <div className="rounded-xl border border-white/10 bg-white/5 p-3" data-tut="biblioteca.enc.arbol">
        {q && camposVisibles.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-white/35">
            {t('biblioteca.enc.sinResultados', 'Nada en el árbol coincide con tu búsqueda.')}
          </p>
        ) : (
          <NodoDiagrama nodo={semilla} raiz ctx={ctx} />
        )}
      </div>
      {modal}
    </div>
  )
}
