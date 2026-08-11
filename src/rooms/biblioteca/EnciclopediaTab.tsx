import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { VACIO, conversacionesBiblioRepo, entradasBiblioRepo } from '../../core/data/repository'
import type { EntradaBiblio } from '../../core/data/db'
import { iaActiva, type MensajeIA } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR, PILAR_GENERAL, getPilar } from './constantes'
import { hoyISO } from './fecha'
import type { AnclaTema } from './arbol'
import { EntradaForm, type EntradaFormInicial } from './EntradaForm'
import { ImagenIA } from '../_shared/ImagenIA'
import { MaterialEntrada } from './MaterialEntrada'
import { MoverNodoDialog, type DestinoNodo } from './MoverNodoDialog'
import { RamificarPanel } from './RamificarPanel'
import { Creditos } from '../../core/ui/Creditos'
import { OP_RAMIFICAR } from './costosIA'
import {
  borrarNodo,
  contarEntradas,
  contarSubindices,
  crearNodo,
  renombrarNodo,
  reordenarHermanos,
  ruta,
  useIndice,
  type NodoIndice,
} from './semilla'

/** Prompt de la ilustración de una entrada (título + resumen, estilo editorial). */
const promptEntrada = (e: EntradaBiblio) =>
  `Ilustración editorial limpia y conceptual para una entrada de enciclopedia titulada «${e.titulo}». ` +
  `Representa: ${e.resumen.slice(0, 300)}. ` +
  'Estilo ilustración digital moderna, colores sobrios, sin texto, sin letras, sin marcas de agua.'

/** La entrada como transcript: es lo que lee la IA para proponer ramas. */
const contextoEntrada = (e: EntradaBiblio): MensajeIA[] => [
  { rol: 'usuario', texto: e.titulo },
  { rol: 'asistente', texto: [e.resumen, ...e.puntosClave.map((p) => `- ${p}`)].join('\n') },
]

/** Nodo del diagrama (unifica semilla, campos, ramas, temas y hojas 📄). */
interface NodoDiag {
  /** Clave de expansión: 'semilla' | id del nodo | 'ent-<id>'. */
  id: string
  icono?: string
  titulo: string
  descripcion?: string
  badgeEntradas?: number
  /** Nodos que cuelgan de este, contando toda su descendencia. */
  badgeSubindices?: number
  esNuevo?: boolean
  /** Rama: se pinta distinto (título en mayúsculas), pero charla igual que un tema. */
  estructural?: boolean
  /** El nodo del índice vivo (habilita 💬, ✓ y las acciones de edición). */
  nodo?: NodoIndice
  /** Entrada colgada de este tema (botón ✓). */
  entradaTema?: number
  /** Hoja 📄: entrada sin tema; la fila abre su detalle. */
  entradaHoja?: number
  /** Hermanos de esta fila, en orden, para los ▲▼. */
  hermanos?: string[]
  hijos: NodoDiag[]
}

interface CtxDiag {
  expandidos: Set<string>
  toggle: (id: string) => void
  buscando: boolean
  conIA: boolean
  edicion: boolean
  charlar: (tema: { temaId: string; pilarId: string; titulo: string; descripcion: string }) => void
  abrirEntrada: (id: number) => void
  /** Abre el formulario con el campo y el tema de ese nodo ya puestos. */
  nuevaEntrada: (n: NodoIndice) => void
  renombrar: (n: NodoIndice) => void
  /** `null` = colgar un campo nuevo de la propia semilla. */
  agregar: (padre: NodoIndice | null) => void
  borrar: (n: NodoIndice) => void
  desplazar: (hermanos: string[], id: string, delta: number) => void
  /** Nodo al que se acaba de saltar desde una charla (se enseña y se marca). */
  resaltado: string | null
  t: ReturnType<typeof useT>
}

/** Fila + hijos recursivos con líneas conectoras (border-l + stub horizontal). */
function NodoDiagrama({ nodo, raiz, ctx }: { nodo: NodoDiag; raiz?: boolean; ctx: CtxDiag }) {
  const abierto = ctx.buscando || ctx.expandidos.has(nodo.id)
  const tieneHijos = nodo.hijos.length > 0
  const marcado = ctx.resaltado === nodo.id
  const refFila = useRef<HTMLDivElement>(null)

  // Al llegar desde un enlace de la charla, la fila se enseña sola.
  useEffect(() => {
    if (marcado) refFila.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [marcado])
  const stub = raiz
    ? ''
    : 'before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:bg-white/15'

  const btnEdit =
    'shrink-0 rounded px-1.5 py-1 text-[11px] text-white/35 transition hover:bg-white/10 hover:text-white/80'

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
          {/* Cuánto índice cuelga de aquí. Se ve SIEMPRE, aunque no haya ni una
              entrada: es otra cosa que cuánto has escrito. */}
          {nodo.badgeSubindices != null && (
            <span
              className="shrink-0 text-[9px] text-white/45"
              title={ctx.t('biblioteca.enc.nSubindices', '{n} subíndices aquí debajo', {
                n: String(nodo.badgeSubindices),
              })}
            >
              <Icono nombre="rama" /> {nodo.badgeSubindices}
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

      {/* Crear ramas nuevas colgando de la propia Semilla. */}
      {ctx.edicion && nodo.id === 'semilla' && (
        <button
          type="button"
          onClick={() => ctx.agregar(null)}
          className={btnEdit}
          title={ctx.t('biblioteca.enc.nuevoCampo', 'Nuevo campo')}
          aria-label={ctx.t('biblioteca.enc.nuevoCampo', 'Nuevo campo')}
        >
          <Icono nombre="agregar" />
        </button>
      )}

      {/* Acciones de edición: solo con el modo encendido, para no meter ruido. */}
      {ctx.edicion && nodo.nodo && (
        <>
          {nodo.hermanos && nodo.hermanos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => ctx.desplazar(nodo.hermanos!, nodo.nodo!.id, -1)}
                className={btnEdit}
                title={ctx.t('biblioteca.enc.subir', 'Subir')}
                aria-label={ctx.t('biblioteca.enc.subir', 'Subir')}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => ctx.desplazar(nodo.hermanos!, nodo.nodo!.id, 1)}
                className={btnEdit}
                title={ctx.t('biblioteca.enc.bajar', 'Bajar')}
                aria-label={ctx.t('biblioteca.enc.bajar', 'Bajar')}
              >
                ▼
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => ctx.agregar(nodo.nodo!)}
            className={btnEdit}
            title={ctx.t('biblioteca.enc.agregarHijo', 'Añadir algo dentro')}
            aria-label={ctx.t('biblioteca.enc.agregarHijo', 'Añadir algo dentro')}
          >
            <Icono nombre="agregar" />
          </button>
          <button
            type="button"
            onClick={() => ctx.renombrar(nodo.nodo!)}
            className={btnEdit}
            title={ctx.t('biblioteca.enc.renombrar', 'Renombrar')}
            aria-label={ctx.t('biblioteca.enc.renombrar', 'Renombrar')}
          >
            <Icono nombre="editar" />
          </button>
          <button
            type="button"
            onClick={() => ctx.borrar(nodo.nodo!)}
            className={btnEdit}
            title={ctx.t('biblioteca.enc.borrarNodo', 'Borrar')}
            aria-label={ctx.t('biblioteca.enc.borrarNodo', 'Borrar')}
          >
            <Icono nombre="basura" />
          </button>
        </>
      )}

      {/* Escribir una entrada aquí mismo, con el campo y el tema ya puestos.
          Solo fuera del modo edición: ahí ese + crea ramas, no entradas. */}
      {!ctx.edicion && nodo.nodo && (
        <button
          type="button"
          onClick={() => ctx.nuevaEntrada(nodo.nodo!)}
          className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/90"
          title={ctx.t('biblioteca.enc.entradaAqui', 'Escribir una entrada aquí')}
          aria-label={ctx.t('biblioteca.enc.entradaAqui', 'Escribir una entrada aquí')}
        >
          <Icono nombre="agregar" />
        </button>
      )}
      {!ctx.edicion && nodo.entradaTema != null && (
        <button
          type="button"
          onClick={() => ctx.abrirEntrada(nodo.entradaTema!)}
          className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs text-emerald-300 transition hover:bg-white/10"
          title={ctx.t('biblioteca.enc.verEntrada', 'Ver la entrada de este tema')}
        >
          <Icono nombre="confirmar" />
        </button>
      )}
      {!ctx.edicion && nodo.nodo && nodo.id !== 'semilla' && (
        <button
          type="button"
          onClick={() =>
            ctx.charlar({
              temaId: nodo.nodo!.id,
              pilarId: nodo.nodo!.pilarId,
              titulo: nodo.titulo,
              descripcion: nodo.nodo!.descripcion,
            })
          }
          disabled={!ctx.conIA}
          className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10 disabled:opacity-35"
          title={ctx.t('biblioteca.enc.charlarTema', 'Charlar sobre esto con el Sabio')}
        >
          <Icono nombre="chat" />
        </button>
      )}
    </>
  )

  const marca = marcado ? 'ring-2 ring-white/60' : ''

  return (
    <div ref={refFila}>
      {nodo.entradaHoja != null ? (
        <button
          type="button"
          onClick={() => ctx.abrirEntrada(nodo.entradaHoja!)}
          className={`relative flex w-full items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5 text-left transition hover:bg-black/30 ${stub} ${marca}`}
        >
          {contenido}
        </button>
      ) : (
        <div
          className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
            nodo.estructural ? 'ui-panel-2' : 'bg-black/20'
          } ${stub} ${marca}`}
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
 * temas → subtemas. Las charlas se archivan en su lugar correcto, el árbol
 * crece cuando TÚ ramificas (panel 🌿 de la charla) y con el modo ✏️ lo haces
 * tuyo: ramas nuevas a cualquier altura —incluso colgando de la Semilla—,
 * renombrar, reordenar y borrar. Fuera del modo edición, el + de cada fila
 * escribe una entrada ahí mismo, con su campo y su tema ya puestos.
 */
export function EnciclopediaTab({
  onConversar,
  onAbrirCharla,
  foco,
  onFocoUsado,
}: {
  onConversar: (texto: string, ancla?: AnclaTema) => void
  onAbrirCharla: (id: number) => void
  /** A qué se llega desde una charla: un nodo del árbol o una entrada. */
  foco?: { nodoId?: string; entradaId?: number } | null
  onFocoUsado?: () => void
}) {
  const t = useT()
  const entradas = entradasBiblioRepo.useAll() ?? VACIO
  const charlas = conversacionesBiblioRepo.useAll() ?? VACIO
  const ix = useIndice()
  const [entradaId, setEntradaId] = useState<number | null>(null)
  const [form, setForm] = useState<{ inicial: EntradaFormInicial; entradaId?: number } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [edicion, setEdicion] = useState(false)
  const [moviendo, setMoviendo] = useState<EntradaBiblio | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['semilla']))
  const [ramificando, setRamificando] = useState<EntradaBiblio | null>(null)

  const hoy = hoyISO()

  // Llegada desde una charla: el foco NO se copia a estado (eso encadenaría
  // renders), se deriva. Manda mientras el usuario no toque nada; en cuanto
  // navega, `onFocoUsado` lo apaga y vuelve a mandar su propio estado.
  const entradaVista = foco?.entradaId ?? entradaId
  const resaltado = foco?.nodoId ?? null
  const expandidosVista = useMemo(() => {
    if (!foco?.nodoId) return expandidos
    const s = new Set(expandidos).add('semilla')
    for (const n of ruta(ix, foco.nodoId)) s.add(n.id)
    return s
  }, [expandidos, foco, ix])

  /** Cualquier navegación propia suelta el foco que llegó de la charla. */
  const soltarFoco = () => onFocoUsado?.()

  // Memos separados: el índice llega de Dexie, los conteos son una pasada sobre
  // las entradas y el diagrama solo arma la vista. Antes era un único useMemo
  // con un filter por campo (O(campos × entradas)).
  const conteos = useMemo(() => contarEntradas(ix, entradas), [ix, entradas])
  const subindices = useMemo(() => contarSubindices(ix), [ix])

  const campos = useMemo<NodoDiag[]>(() => {
    const entradaPorTema = new Map<string, EntradaBiblio>()
    for (const e of entradas) if (e.temaId) entradaPorTema.set(e.temaId, e)

    const aDiag = (n: NodoIndice, hermanos: string[]): NodoDiag => ({
      id: n.id,
      titulo: n.titulo,
      descripcion: n.descripcion || undefined,
      esNuevo: n.creadoEn?.slice(0, 10) === hoy,
      estructural: n.nivel === 'rama',
      nodo: n,
      badgeEntradas: conteos.total.get(n.id) || undefined,
      badgeSubindices: subindices.get(n.id) || undefined,
      entradaTema: entradaPorTema.get(n.id)?.id,
      hermanos,
      hijos: n.hijos.map((h) => aDiag(h, n.hijos.map((x) => x.id))),
    })

    // Entradas de un campo sin tema resoluble: se pintan como hojas 📄 al
    // final. Nunca se pierden.
    const hojasDe = (pilarId: string): NodoDiag[] =>
      entradas
        .filter((e) => e.pilarId === pilarId && (!e.temaId || !ix.porId.has(e.temaId)))
        .map((e) => ({ id: `ent-${e.id}`, icono: '📄', titulo: e.titulo, entradaHoja: e.id, hijos: [] }))

    const lista: NodoDiag[] = ix.campos.map((campo) => {
      const idsHijos = campo.hijos.map((x) => x.id)
      return {
        id: campo.id,
        icono: campo.icono,
        titulo: campo.titulo,
        nodo: campo,
        badgeEntradas: conteos.total.get(campo.id) || undefined,
        badgeSubindices: subindices.get(campo.id) || undefined,
        hermanos: ix.campos.map((c) => c.id),
        hijos: [...campo.hijos.map((h) => aDiag(h, idsHijos)), ...hojasDe(campo.id)],
      }
    })

    // El comodín «General» solo aparece si tiene algo: ahí caen las charlas sin
    // clasificar y las entradas cuyo campo se borró.
    const sueltas = hojasDe(PILAR_GENERAL.id)
    if (sueltas.length > 0) {
      lista.push({
        id: PILAR_GENERAL.id,
        icono: PILAR_GENERAL.icon,
        titulo: PILAR_GENERAL.titulo,
        badgeEntradas: sueltas.length,
        hijos: sueltas,
      })
    }
    return lista
  }, [ix, entradas, conteos, subindices, hoy])

  // ----- Búsqueda: poda el árbol conservando el subárbol de lo que casa -----
  // `useDeferredValue`: la poda reconstruye el árbol entero, y con el índice
  // completo hacerlo en cada tecla se nota.
  const q = useDeferredValue(busqueda).trim().toLowerCase()
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
    expandidos: expandidosVista,
    toggle: (id) => {
      soltarFoco()
      setExpandidos((prev) => {
        const s = new Set(expandidosVista.size > prev.size ? expandidosVista : prev)
        if (s.has(id)) s.delete(id)
        else s.add(id)
        return s
      })
    },
    buscando: q !== '',
    conIA: iaActiva(),
    edicion,
    charlar: (tema) =>
      onConversar(
        t('biblioteca.enc.promptTema', 'Cuéntame sobre {tema}. {desc}', {
          tema: tema.titulo,
          desc: tema.descripcion,
        }),
        { temaId: tema.temaId, pilarId: tema.pilarId },
      ),
    abrirEntrada: (id) => {
      soltarFoco()
      setEntradaId(id)
    },
    // En un campo la entrada nace sin tema; en una rama o un tema, colgada de él.
    nuevaEntrada: (n) =>
      setForm({
        inicial: {
          titulo: '',
          resumen: '',
          puntosClave: [],
          pilarId: n.pilarId,
          temaId: n.nivel === 'campo' ? undefined : n.id,
        },
      }),
    renombrar: async (n) => {
      const titulo = await pedirTexto({
        titulo: t('biblioteca.enc.renombrar', 'Renombrar'),
        valor: n.titulo,
        textoOk: t('biblioteca.ent.guardar', 'Guardar'),
      })
      if (titulo) await renombrarNodo(ix, n.id, { titulo: titulo.trim() })
    },
    // Sin padre se cuelga de la SEMILLA: un campo nuevo al lado de los de
    // fábrica. Bajo un campo nace una rama; más adentro, un tema.
    agregar: async (padre) => {
      const titulo = await pedirTexto({
        titulo: !padre
          ? t('biblioteca.enc.nuevoCampo', 'Nuevo campo')
          : padre.nivel === 'campo'
            ? t('biblioteca.enc.nuevaRama', 'Nueva rama')
            : t('biblioteca.enc.nuevoTema', 'Nuevo tema'),
        mensaje: padre
          ? t('biblioteca.enc.dentroDe', 'Dentro de «{padre}»', { padre: padre.titulo })
          : t('biblioteca.enc.nuevoCampoMsg', 'Un campo propio del conocimiento, al lado de los de fábrica.'),
        textoOk: t('biblioteca.enc.crear', 'Crear'),
      })
      if (!titulo?.trim()) return
      await crearNodo({
        nivel: !padre ? 'campo' : padre.nivel === 'campo' ? 'rama' : 'tema',
        pilarId: padre?.pilarId ?? '',
        padreId: padre?.id ?? null,
        titulo: titulo.trim(),
        ...(padre ? {} : { icono: '📚' }),
      })
      setExpandidos((prev) => new Set(prev).add(padre?.id ?? 'semilla'))
    },
    borrar: async (n) => {
      const ok = await confirmar({
        titulo: t('biblioteca.enc.borrarTit', '¿Borrar «{n}»?', { n: n.titulo }),
        mensaje:
          n.hijos.length > 0
            ? t(
                'biblioteca.enc.borrarMsgHijos',
                'Se va con todo lo que cuelga de él. Tus entradas NO se borran: quedan sueltas en su campo.',
              )
            : t('biblioteca.enc.borrarMsg', 'Tus entradas NO se borran: quedan sueltas en su campo.'),
        textoOk: t('biblioteca.charla.siBorrar', 'Borrar'),
        peligro: true,
      })
      if (ok) await borrarNodo(ix, n.id)
    },
    desplazar: async (hermanos, id, delta) => {
      const i = hermanos.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= hermanos.length) return
      const orden = [...hermanos]
      ;[orden[i], orden[j]] = [orden[j], orden[i]]
      await reordenarHermanos(ix, orden)
    },
    resaltado,
    t,
  }

  const modal = form && (
    <EntradaForm inicial={form.inicial} entradaId={form.entradaId} onCerrar={() => setForm(null)} />
  )

  const dialogoMover = moviendo && (
    <MoverNodoDialog
      ix={ix}
      titulo={t('biblioteca.enc.moverEntradaA', 'Mover «{n}» a…', { n: moviendo.titulo })}
      onElegir={async (destino: DestinoNodo) => {
        if (moviendo.id != null) {
          await entradasBiblioRepo.update(moviendo.id, {
            pilarId: destino.pilarId,
            temaId: destino.temaId ?? undefined,
          })
        }
        setMoviendo(null)
      }}
      onCerrar={() => setMoviendo(null)}
    />
  )

  // ----- Vista: detalle de una entrada -----
  const entrada = entradaVista != null ? entradas.find((e) => e.id === entradaVista) : undefined
  if (entrada) {
    const pilar = getPilar(entrada.pilarId)
    const tituloTema = entrada.temaId ? ix.porId.get(entrada.temaId)?.titulo : undefined
    // De dónde cuelgan las ramas nuevas: su tema o, si quedó suelta, su campo.
    const nodoDeEntrada =
      (entrada.temaId ? ix.porId.get(entrada.temaId) : undefined) ?? ix.porId.get(entrada.pilarId)
    const charlaOrigen =
      entrada.conversacionId != null ? charlas.find((c) => c.id === entrada.conversacionId) : undefined
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            soltarFoco()
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
              {/* Ramificar vive aquí y ya no en la charla: las ramas nuevas
                  nacen de lo que quedó ESCRITO sobre el tema. */}
              <button
                type="button"
                onClick={() => setRamificando(entrada)}
                disabled={!iaActiva() || !nodoDeEntrada}
                className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-35"
                title={
                  nodoDeEntrada
                    ? t('biblioteca.ent.ramificarTip', 'Ramificar: subtemas nuevos bajo «{n}»', {
                        n: nodoDeEntrada.titulo,
                      })
                    : t('biblioteca.ent.ramificarSinNodo', 'La entrada aún no tiene lugar en el árbol')
                }
                aria-label={t('biblioteca.ent.ramificar', 'Ramificar')}
              >
                <Icono nombre="rama" />
              </button>
              <Creditos op={OP_RAMIFICAR} />
              <button
                type="button"
                onClick={() => setMoviendo(entrada)}
                className="rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                title={t('biblioteca.ent.mover', 'Mover a otro tema')}
                aria-label={t('biblioteca.ent.mover', 'Mover a otro tema')}
              >
                <Icono nombre="mover" />
              </button>
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
                    soltarFoco()
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

          {entrada.id != null && (
            <MaterialEntrada
              entradaId={entrada.id}
              contexto={{
                titulo: entrada.titulo,
                texto: [entrada.resumen, ...entrada.puntosClave.map((p) => `- ${p}`)].join('\n'),
              }}
            />
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
        {dialogoMover}
        {ramificando && nodoDeEntrada && (
          <RamificarPanel
            conversacionId={ramificando.conversacionId}
            ancla={{
              temaId: nodoDeEntrada.id,
              pilarId: nodoDeEntrada.pilarId,
              titulo: nodoDeEntrada.titulo,
            }}
            mensajes={contextoEntrada(ramificando)}
            onCerrar={() => setRamificando(null)}
            onCharlaNueva={(ancla, borrador) => {
              setRamificando(null)
              onConversar(borrador, ancla)
            }}
          />
        )}
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
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/45">
          {edicion
            ? t('biblioteca.enc.edicionDesc', 'Haz tuyo el índice: con el + de cada fila añades ramas a cualquier altura, incluso colgando de la Semilla. También renombras, reordenas y borras.')
            : t('biblioteca.enc.arbolDesc', 'Todo tu conocimiento en un árbol: cada charla se archiva en su lugar y crece cuando tú la ramificas.')}
        </p>
        <button
          type="button"
          onClick={() => setEdicion((x) => !x)}
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            edicion ? 'text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          style={edicion ? { background: COLOR } : undefined}
          title={t('biblioteca.enc.modoEdicion', 'Editar el índice')}
          aria-label={t('biblioteca.enc.modoEdicion', 'Editar el índice')}
        >
          <Icono nombre="editar" />
        </button>
        {!edicion && (
          <button
            type="button"
            onClick={() => setForm({ inicial: { titulo: '', resumen: '', puntosClave: [], pilarId: PILAR_GENERAL.id } })}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black"
            style={{ background: COLOR }}
          >
            <Icono nombre="agregar" /> {t('biblioteca.ent.nueva', 'Nueva entrada')}
          </button>
        )}
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
      {dialogoMover}
    </div>
  )
}
