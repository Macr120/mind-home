import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { abrirApp } from '../../abrirApp'
import { getPlantilla } from '../../appContrato'
import { desenlazarNodos, editarMemoria, enlazarNodos, olvidarMemoria } from '../../data/repository'
import { conexionesDe, useGrafo, useVistaGrafo, type NodoEntidadApp } from '../../grafoApps'
import { layoutFuerzas, type Punto } from '../../grafo/layout'
import {
  ambitoDe,
  idDeRef,
  normalizar,
  refMemoria,
  tipoDeRef,
  vecindario,
  type AmbitoGrafo,
  type EnlaceNodo,
  type RefNodo,
  type TipoNodo,
} from '../../grafo/memoria'
import { useT, type TFunc } from '../../i18n/useT'
import { nombreAsistente } from '../../chat/mascotas'
import { getAsistente } from '../../state/asistentesStore'
import { Icono } from '../iconos/Icono'

/**
 * Vista de grafo estilo Obsidian, acotada a una vista del chat: Asistentes
 * (memorias y asistentes), Amigos (amigos y espacios compartidos), Lugares
 * (lugares guardados, viajes y sus categorías) o Navegador (sitios web por
 * categoría), cada una con sus vecinos directos de las apps; o «Todo». Se monta
 * en la raíz de `App` (su `fixed` no puede quedar dentro del panel del chat) y
 * se abre con `useVistaGrafo.abrir()`, opcionalmente centrada en un nodo.
 *
 * El acomodo sale de `grafo/layout.ts` (puro, determinista); aquí solo se
 * pinta en SVG y se mueve la cámara (arrastrar, rueda y pellizco).
 */

/** Nodos a partir de los cuales se recorta (Android se ahoga pintando miles). */
const MAX_NODOS = 300

const COLOR_MEMORIA = '#a78bfa'

interface NodoVista {
  ref: RefNodo
  tipo: TipoNodo
  titulo: string
  emoji?: string
  color: string
  /** Solo en las cosas de las apps. */
  cosa?: NodoEntidadApp
  /** Id local de la memoria (para editar u olvidar). */
  memoriaId?: number
}

const TIPOS: TipoNodo[] = [
  'memoria',
  'asistente',
  'amigo',
  'espacio',
  'ubicacion',
  'lugar',
  'web',
  'categoria',
  'app',
  'persona',
  'meta',
  'receta',
  'idea',
  'mapa',
  'obra',
  'hobby',
  'proyecto',
]

const AMBITOS: { id: AmbitoGrafo; clave: string; es: string }[] = [
  { id: 'asistentes', clave: 'chat.menu.asistentes', es: 'Asistentes' },
  { id: 'amigos', clave: 'chat.menu.amigos', es: 'Amigos' },
  { id: 'lugares', clave: 'chat.menu.lugares', es: 'Lugares' },
  { id: 'navegador', clave: 'chat.menu.navegador', es: 'Navegador' },
]

/** Una cosa de las apps (o de una vista) lista para pintar: su color propio o el de su app. */
function aVista(c: NodoEntidadApp): NodoVista {
  return {
    ref: c.ref,
    tipo: c.tipo,
    titulo: c.titulo,
    emoji: c.emoji,
    color: c.color ?? (c.appId ? getPlantilla(c.appId)?.color : undefined) ?? '#94a3b8',
    cosa: c,
  }
}

function nombreTipo(t: TFunc, tipo: TipoNodo): string {
  const es: Record<TipoNodo, string> = {
    memoria: 'Memorias',
    app: 'Apps',
    persona: 'Personas',
    meta: 'Metas',
    receta: 'Recetas',
    idea: 'Ideas',
    mapa: 'Mapas',
    obra: 'Obras',
    lugar: 'Lugares',
    hobby: 'Hobbies',
    proyecto: 'Proyectos',
    ejercicio: 'Ejercicios',
    asistente: 'Asistentes',
    amigo: 'Amigos',
    espacio: 'Espacios',
    ubicacion: 'Lugares guardados',
    web: 'Sitios web',
    categoria: 'Categorías',
  }
  return t(`grafo.tipo.${tipo}`, es[tipo])
}

export default function GrafoMemoria() {
  const t = useT()
  const foco = useVistaGrafo((s) => s.foco)
  const ambitoInicial = useVistaGrafo((s) => s.ambito)
  const cerrar = useVistaGrafo((s) => s.cerrar)
  const { memorias, entidades, enlaces, cargando } = useGrafo()
  // `null` = todo. El overlay se monta de nuevo en cada apertura: arranca en el ámbito pedido.
  const [ambito, setAmbito] = useState<AmbitoGrafo | null>(ambitoInicial)
  const [seleccion, setSeleccion] = useState<RefNodo | null>(foco)
  const [soloVecinos, setSoloVecinos] = useState(foco !== null)
  const [busqueda, setBusqueda] = useState('')
  const [ocultos, setOcultos] = useState<Set<TipoNodo>>(new Set())
  const asistenteInicial = useVistaGrafo((s) => s.asistente)
  const [asistente, setAsistente] = useState(asistenteInicial ?? '')

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [cerrar])

  // Los nodos del ámbito (o, en «Todo», los de cualquier vista) y sus vecinos
  // directos: así una memoria que nombra un lugar sale en el grafo de Lugares.
  const { todos, aristas, baseVacia } = useMemo(() => {
    const universo = new Map<RefNodo, NodoVista>()
    for (const m of memorias) {
      if (!m.vigente || !m.uid || (asistente && m.asistenteId && m.asistenteId !== asistente)) continue
      const ref = refMemoria(m.uid)
      universo.set(ref, { ref, tipo: 'memoria', titulo: m.hecho, color: COLOR_MEMORIA, memoriaId: m.id })
    }
    for (const c of entidades) {
      if (asistente && c.tipo === 'asistente' && c.ref !== `asistente:${asistente}`) continue
      universo.set(c.ref, aVista(c))
    }
    for (const e of enlaces) {
      for (const ref of [e.desde, e.hacia]) {
        if (tipoDeRef(ref) !== 'app' || universo.has(ref)) continue
        const p = getPlantilla(idDeRef(ref))
        if (p) universo.set(ref, { ref, tipo: 'app', titulo: p.nombre.split(' · ')[0] ?? p.nombre, emoji: p.icon, color: p.color })
      }
    }
    const base = new Set([...universo.keys()].filter((r) => (ambito ? ambitoDe(r) === ambito : ambitoDe(r) !== null)))
    const dentro = new Set(base)
    for (const e of enlaces) {
      if (!universo.has(e.desde) || !universo.has(e.hacia)) continue
      if (base.has(e.desde)) dentro.add(e.hacia)
      if (base.has(e.hacia)) dentro.add(e.desde)
    }
    const mapa = new Map<RefNodo, NodoVista>()
    for (const r of dentro) {
      const n = universo.get(r)
      if (n) mapa.set(r, n)
    }
    return {
      todos: mapa,
      aristas: enlaces.filter((e) => mapa.has(e.desde) && mapa.has(e.hacia)),
      baseVacia: base.size === 0,
    }
  }, [memorias, entidades, enlaces, asistente, ambito])

  // «Conectar con…» ofrece cualquier memoria o cosa de las apps, no solo lo que ya se ve.
  const candidatos = useMemo(
    (): NodoVista[] => [
      ...memorias.flatMap((m): NodoVista[] =>
        m.vigente && m.uid
          ? [{ ref: refMemoria(m.uid), tipo: 'memoria', titulo: m.hecho, color: COLOR_MEMORIA, memoriaId: m.id }]
          : [],
      ),
      ...entidades.map(aVista),
    ],
    [memorias, entidades],
  )

  const tiposPresentes = useMemo(() => TIPOS.filter((tp) => [...todos.values()].some((n) => n.tipo === tp)), [todos])
  const asistentesConMemoria = useMemo(
    // El del chat que abrió el grafo sale aunque aún no recuerde nada: si no, el filtro no se ve.
    () => [...new Set([...(asistenteInicial ? [asistenteInicial] : []), ...memorias.flatMap((m) => (m.vigente && m.asistenteId ? [m.asistenteId] : []))])],
    [memorias, asistenteInicial],
  )

  // Lo que se ve: sin los tipos ocultos, «solo vecinos» y el tope de nodos.
  const { nodos, visibles, recortado } = useMemo(() => {
    let refs = [...todos.keys()].filter((r) => !ocultos.has(tipoDeRef(r)) || r === seleccion)
    let dentro = new Set(refs)
    let visibles = aristas.filter((e) => dentro.has(e.desde) && dentro.has(e.hacia))
    if (soloVecinos && seleccion && todos.has(seleccion)) {
      const cerca = vecindario(seleccion, visibles, 2)
      refs = refs.filter((r) => cerca.has(r))
    }
    let recortado = false
    if (refs.length > MAX_NODOS) {
      const grado = new Map<RefNodo, number>()
      for (const e of visibles) {
        grado.set(e.desde, (grado.get(e.desde) ?? 0) + 1)
        grado.set(e.hacia, (grado.get(e.hacia) ?? 0) + 1)
      }
      refs = refs.sort((a, b) => (grado.get(b) ?? 0) - (grado.get(a) ?? 0)).slice(0, MAX_NODOS)
      recortado = true
    }
    dentro = new Set(refs)
    visibles = visibles.filter((e) => dentro.has(e.desde) && dentro.has(e.hacia))
    return { nodos: refs.flatMap((r) => todos.get(r) ?? []), visibles, recortado }
  }, [todos, aristas, ocultos, soloVecinos, seleccion])

  const grado = useMemo(() => {
    const g = new Map<RefNodo, number>()
    for (const e of visibles) {
      g.set(e.desde, (g.get(e.desde) ?? 0) + 1)
      g.set(e.hacia, (g.get(e.hacia) ?? 0) + 1)
    }
    return g
  }, [visibles])

  // El acomodo solo cambia si cambian los nodos o los enlaces que se ven.
  const firma = `${nodos.map((n) => n.ref).join('|')}#${visibles.map((e) => `${e.desde}>${e.hacia}`).join('|')}`
  const posiciones = useMemo(
    () => layoutFuerzas(nodos.map((n) => n.ref), visibles.map((e) => [e.desde, e.hacia] as const)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la firma resume nodos y enlaces
    [firma],
  )

  const coincide = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return null
    return new Set(nodos.filter((n) => normalizar(n.titulo).includes(q)).map((n) => n.ref))
  }, [busqueda, nodos])

  const vecinosSel = useMemo(
    () => (seleccion ? new Set(conexionesDe(seleccion, visibles).map((c) => c.ref)) : null),
    [seleccion, visibles],
  )

  const nodoSel = seleccion ? todos.get(seleccion) ?? null : null

  return (
    <div className="ui-app fixed inset-0 z-50 flex flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 md:px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/20 text-base">
          <Icono nombre="nodos" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{t('grafo.titulo', 'Grafo de memoria')}</p>
          <p className="text-[10px] tabular-nums text-white/40">
            {t('grafo.resumen', '{m} memorias · {n} nodos · {e} enlaces', {
              m: nodos.filter((n) => n.tipo === 'memoria').length,
              n: nodos.length,
              e: visibles.length,
            })}
          </p>
        </div>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            const primero = coincide && nodos.find((n) => coincide.has(n.ref))
            if (e.key === 'Enter' && primero) setSeleccion(primero.ref)
          }}
          placeholder={t('grafo.buscar', 'Buscar…')}
          aria-label={t('grafo.buscar', 'Buscar…')}
          className="order-last w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none transition focus:border-accent/60 md:order-none md:w-48"
        />
        <button
          type="button"
          onClick={cerrar}
          className="ui-boton grid h-9 w-9 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20"
          title={t('grafo.cerrar', 'Cerrar')}
          aria-label={t('grafo.cerrar', 'Cerrar')}
        >
          <Icono nombre="cerrar" />
        </button>
      </header>

      {/* Ámbito: la vista del chat cuyo grafo se ve, o todo junto. */}
      <div
        role="tablist"
        aria-label={t('grafo.ambito', 'Qué grafo ver')}
        className="sin-deslizador flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-1.5 md:px-4"
      >
        {[...AMBITOS, null].map((a) => {
          const activo = ambito === (a?.id ?? null)
          return (
            <button
              key={a?.id ?? 'todo'}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => {
                setAmbito(a?.id ?? null)
                setOcultos(new Set())
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activo ? 'bg-accent text-accent-ink' : 'text-white/55 hover:bg-white/10 hover:text-white/85'
              }`}
            >
              {a ? t(a.clave, a.es) : t('grafo.todo', 'Todo')}
            </button>
          )
        })}
      </div>

      {/* Filtros: tipos, asistente y «solo vecinos». */}
      <div className="sin-deslizador flex gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-1.5 md:px-4">
        {tiposPresentes.map((tp) => {
          const activo = !ocultos.has(tp)
          return (
            <button
              key={tp}
              type="button"
              onClick={() =>
                setOcultos((s) => {
                  const n = new Set(s)
                  if (activo) n.add(tp)
                  else n.delete(tp)
                  return n
                })
              }
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
                activo ? 'bg-white/15 text-white/85' : 'bg-white/5 text-white/35 line-through'
              }`}
            >
              {nombreTipo(t, tp)}
            </button>
          )
        })}
        {asistentesConMemoria.length > 1 && (
          <select
            value={asistente}
            onChange={(e) => setAsistente(e.target.value)}
            aria-label={t('grafo.asistente', 'Asistente')}
            className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[11px] outline-none"
          >
            <option value="">{t('grafo.todos', 'Todos los asistentes')}</option>
            {asistentesConMemoria.map((id) => (
              <option key={id} value={id}>
                {nombreAsistente(t, getAsistente(id))}
              </option>
            ))}
          </select>
        )}
        {seleccion && (
          <button
            type="button"
            onClick={() => setSoloVecinos((v) => !v)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
              soloVecinos ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('grafo.soloVecinos', 'Solo vecinos')}
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1">
          {baseVacia && !cargando ? (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/45">
              {ambito === 'asistentes'
                ? t('grafo.vacio', 'Aún no hay memorias. Dile a tu asistente «recuerda que…» y aquí verás cómo se conectan con tus apps.')
                : t('grafo.vacioAmbito', 'Aún no hay nada que conectar aquí.')}
            </p>
          ) : (
            <Lienzo
              nodos={nodos}
              aristas={visibles}
              posiciones={posiciones}
              grado={grado}
              seleccion={seleccion}
              vecinosSel={vecinosSel}
              coincide={coincide}
              onElegir={setSeleccion}
            />
          )}
          {recortado && (
            <p className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/70">
              {t('grafo.recortado', 'Se muestran los {n} nodos con más conexiones. Filtra para ver el resto.', { n: MAX_NODOS })}
            </p>
          )}
        </div>
        {nodoSel && (
          <PanelNodo
            key={nodoSel.ref}
            nodo={nodoSel}
            todos={todos}
            candidatos={candidatos}
            enlaces={aristas}
            onElegir={setSeleccion}
            onCerrar={() => setSeleccion(null)}
            onSalir={cerrar}
          />
        )}
      </div>
    </div>
  )
}

/** El SVG con la cámara: arrastrar mueve, rueda y pellizco acercan. */
function Lienzo({
  nodos,
  aristas,
  posiciones,
  grado,
  seleccion,
  vecinosSel,
  coincide,
  onElegir,
}: {
  nodos: NodoVista[]
  aristas: EnlaceNodo[]
  posiciones: Map<string, Punto>
  grado: Map<RefNodo, number>
  seleccion: RefNodo | null
  vecinosSel: Set<RefNodo> | null
  coincide: Set<RefNodo> | null
  onElegir: (r: RefNodo | null) => void
}) {
  const t = useT()
  const caja = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  // Cámara: centro en coordenadas del grafo y píxeles por unidad.
  const [cam, setCam] = useState({ cx: 0, cy: 0, k: 1 })
  // Los gestos leen la cámara vigente sin esperar al render (se sincroniza tras pintar).
  const camRef = useRef(cam)
  useLayoutEffect(() => {
    camRef.current = cam
  })

  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setTam({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const encajar = () => {
    const c = camaraQueEncaja(nodos, posiciones, tam)
    if (c) setCam(c)
  }

  // Encaja al abrir y cada vez que cambia lo que se ve (filtros, vecinos) o el
  // tamaño: ajuste de estado durante el render, sin efecto de por medio.
  const [encajadoPara, setEncajadoPara] = useState<{ p: Map<string, Punto>; w: number; h: number } | null>(null)
  if (tam.w && tam.h && (encajadoPara?.p !== posiciones || encajadoPara.w !== tam.w || encajadoPara.h !== tam.h)) {
    setEncajadoPara({ p: posiciones, w: tam.w, h: tam.h })
    const c = camaraQueEncaja(nodos, posiciones, tam)
    if (c) setCam(c)
  }

  const aMundo = (clientX: number, clientY: number, c = camRef.current) => {
    const r = svg.current?.getBoundingClientRect()
    const x = clientX - (r?.left ?? 0) - tam.w / 2
    const y = clientY - (r?.top ?? 0) - tam.h / 2
    return { x: c.cx + x / c.k, y: c.cy + y / c.k }
  }

  // Zoom hacia el punto: lo que está bajo el cursor se queda bajo el cursor.
  const zoomHacia = (clientX: number, clientY: number, k: number, base = camRef.current) => {
    const kk = Math.min(6, Math.max(0.15, k))
    const antes = aMundo(clientX, clientY, base)
    const r = svg.current?.getBoundingClientRect()
    const x = clientX - (r?.left ?? 0) - tam.w / 2
    const y = clientY - (r?.top ?? 0) - tam.h / 2
    setCam({ cx: antes.x - x / kk, cy: antes.y - y / kk, k: kk })
  }

  // La rueda necesita un listener NO pasivo para frenar el scroll de la página.
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const alRodar = (e: WheelEvent) => {
      e.preventDefault()
      zoomHacia(e.clientX, e.clientY, camRef.current.k * Math.exp(-e.deltaY * 0.0015))
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    return () => el.removeEventListener('wheel', alRodar)
  })

  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const gesto = useRef<{ x: number; y: number; cam: typeof cam; dist: number; movido: boolean } | null>(null)

  const distancia = () => {
    const [a, b] = [...punteros.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const alBajar = (e: PointerEvent<SVGSVGElement>) => {
    // Los nodos manejan su propio clic: capturar aquí se lo comería.
    if ((e.target as Element).closest('[data-nodo]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    gesto.current = { x: e.clientX, y: e.clientY, cam: camRef.current, dist: distancia(), movido: false }
  }

  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    if (!punteros.current.has(e.pointerId) || !gesto.current) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesto.current
    if (punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()]
      if (a && b && g.dist > 0) zoomHacia((a.x + b.x) / 2, (a.y + b.y) / 2, (g.cam.k * distancia()) / g.dist, g.cam)
      g.movido = true
      return
    }
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.abs(dx) + Math.abs(dy) > 4) g.movido = true
    setCam({ ...g.cam, cx: g.cam.cx - dx / g.cam.k, cy: g.cam.cy - dy / g.cam.k })
  }

  const alSoltar = (e: PointerEvent<SVGSVGElement>) => {
    if (!punteros.current.delete(e.pointerId)) return
    const g = gesto.current
    if (punteros.current.size === 0) {
      // Un toque sin arrastre en el fondo suelta la selección.
      if (g && !g.movido) onElegir(null)
      gesto.current = null
    } else {
      // Queda un dedo: el gesto sigue desde aquí como arrastre.
      const [q] = [...punteros.current.values()]
      if (q) gesto.current = { x: q.x, y: q.y, cam: camRef.current, dist: 0, movido: true }
    }
  }

  const radio = (n: NodoVista) =>
    (n.tipo === 'app' ? 11 : n.tipo === 'memoria' ? 6 : 7) + Math.min(8, Math.sqrt(grado.get(n.ref) ?? 0) * 1.5)
  const atenuado = (r: RefNodo) =>
    (coincide !== null && !coincide.has(r)) || (seleccion !== null && r !== seleccion && !vecinosSel?.has(r))
  // Las cosas y las apps llevan nombre corto: siempre se rotulan. Las memorias
  // (frases largas) solo al acercarse, al elegirlas o al buscarlas.
  const conEtiqueta = (n: NodoVista) =>
    n.tipo !== 'memoria' || n.ref === seleccion || vecinosSel?.has(n.ref) || coincide?.has(n.ref) || cam.k >= 1.3
  const corto = (s: string) => (s.length > 28 ? `${s.slice(0, 27)}…` : s)

  return (
    <div ref={caja} className="absolute inset-0">
      <svg
        ref={svg}
        width={tam.w}
        height={tam.h}
        className="block touch-none select-none text-white"
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        <g transform={`translate(${tam.w / 2} ${tam.h / 2}) scale(${cam.k}) translate(${-cam.cx} ${-cam.cy})`}>
          {aristas.map((e) => {
            const a = posiciones.get(e.desde)
            const b = posiciones.get(e.hacia)
            if (!a || !b) return null
            const activa = seleccion !== null && (e.desde === seleccion || e.hacia === seleccion)
            return (
              <line
                key={`${e.desde}>${e.hacia}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                strokeOpacity={activa ? 0.6 : seleccion ? 0.06 : 0.18}
                strokeWidth={(activa ? 1.6 : 1) / cam.k}
                strokeDasharray={e.manual ? `${4 / cam.k} ${3 / cam.k}` : undefined}
              />
            )
          })}
          {nodos.map((n) => {
            const p = posiciones.get(n.ref)
            if (!p) return null
            const r = radio(n)
            const tenue = atenuado(n.ref)
            return (
              <g
                key={n.ref}
                data-nodo
                transform={`translate(${p.x} ${p.y})`}
                opacity={tenue ? 0.25 : 1}
                onClick={() => onElegir(n.ref)}
                className="cursor-pointer"
              >
                <circle
                  r={r}
                  fill={n.color}
                  fillOpacity={n.tipo === 'memoria' ? 0.9 : 0.75}
                  stroke="currentColor"
                  strokeOpacity={n.ref === seleccion ? 0.95 : 0}
                  strokeWidth={2 / cam.k}
                />
                {n.tipo === 'app' && n.emoji && (
                  <text textAnchor="middle" dominantBaseline="central" fontSize={r * 1.1}>
                    {n.emoji}
                  </text>
                )}
                {conEtiqueta(n) && (
                  <text
                    y={r + 11 / cam.k}
                    textAnchor="middle"
                    fontSize={11 / cam.k}
                    fill="currentColor"
                    fillOpacity={n.ref === seleccion ? 0.95 : 0.7}
                    style={{ paintOrder: 'stroke' }}
                    stroke="var(--ui-bg, #0f1115)"
                    strokeWidth={3 / cam.k}
                  >
                    {corto(n.titulo)}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <button
        type="button"
        onClick={encajar}
        className="ui-boton absolute bottom-3 end-3 grid h-9 w-9 place-items-center rounded-lg bg-white/10 backdrop-blur transition hover:bg-white/20"
        title={t('grafo.encajar', 'Encajar')}
        aria-label={t('grafo.encajar', 'Encajar')}
      >
        <Icono nombre="centrar" />
      </button>
    </div>
  )
}

/** La cámara que deja todos los nodos a la vista, con margen. */
function camaraQueEncaja(
  nodos: NodoVista[],
  posiciones: Map<string, Punto>,
  tam: { w: number; h: number },
): { cx: number; cy: number; k: number } | null {
  if (!tam.w || !tam.h || nodos.length === 0) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const n of nodos) {
    const p = posiciones.get(n.ref)
    if (!p) continue
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  if (!Number.isFinite(x0)) return null
  const margen = 60
  const k = Math.min(tam.w / (x1 - x0 + margen * 2), tam.h / (y1 - y0 + margen * 2), 2.5)
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: Number.isFinite(k) && k > 0 ? k : 1 }
}

/** Detalle del nodo elegido: editar, conectar y abrir en su app. */
function PanelNodo({
  nodo,
  todos,
  candidatos,
  enlaces,
  onElegir,
  onCerrar,
  onSalir,
}: {
  nodo: NodoVista
  todos: Map<RefNodo, NodoVista>
  candidatos: NodoVista[]
  enlaces: EnlaceNodo[]
  onElegir: (r: RefNodo) => void
  onCerrar: () => void
  /** Cierra el grafo entero (tras saltar a una app). */
  onSalir: () => void
}) {
  const t = useT()
  const [texto, setTexto] = useState(nodo.titulo)
  const [conectando, setConectando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const conexiones = conexionesDe(nodo.ref, enlaces)
  const yaConectadas = new Set(conexiones.map((c) => c.ref))

  const candidatas = useMemo(() => {
    if (conectando === null) return []
    const q = normalizar(conectando.trim())
    return candidatos
      .filter((n) => n.ref !== nodo.ref && !yaConectadas.has(n.ref))
      .filter((n) => !q || normalizar(n.titulo).includes(q))
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `yaConectadas` sale de `enlaces`
  }, [conectando, candidatos, nodo.ref, enlaces])

  const cosa = nodo.cosa
  const appId = nodo.tipo === 'app' ? idDeRef(nodo.ref) : cosa?.appId
  const abrir = () => {
    if (cosa?.abrir) {
      cosa.abrir()
      onSalir()
    } else if (appId) {
      if (abrirApp(appId, cosa?.seccion, cosa?.dato)) onSalir()
      else setAviso(t('grafo.sinApp', 'Coloca esa app en tu MindHaOS para abrirla desde aquí.'))
    }
  }

  const guardarTexto = () => {
    if (nodo.memoriaId != null && texto.trim() && texto.trim() !== nodo.titulo) void editarMemoria(nodo.memoriaId, texto)
  }

  return (
    <aside className="max-h-[45%] shrink-0 overflow-y-auto border-t border-white/10 p-3 md:max-h-none md:w-80 md:border-s md:border-t-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: nodo.color }} />
        <span className="text-[10px] uppercase tracking-wide text-white/45">{nombreTipo(t, nodo.tipo)}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          aria-label={t('grafo.cerrar', 'Cerrar')}
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      {nodo.memoriaId != null ? (
        <textarea
          value={texto}
          rows={3}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={guardarTexto}
          aria-label={t('chat.memorias.editar', 'Editar memoria')}
          className="mb-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none transition focus:border-accent/60"
        />
      ) : (
        <p className="mb-1 break-words text-sm font-semibold text-white/90">
          {nodo.emoji && <Icono emoji={nodo.emoji} />} {nodo.titulo}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {nodo.memoriaId != null ? (
          <button
            type="button"
            onClick={() => {
              if (nodo.memoriaId != null) void olvidarMemoria(nodo.memoriaId)
              onCerrar()
            }}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-red-300/90 transition hover:bg-red-500/20"
          >
            <Icono nombre="basura" /> {t('chat.olvidar', 'Olvidar')}
          </button>
        ) : (
          (cosa?.abrir || appId) && (
            <button
              type="button"
              onClick={abrir}
              className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink transition hover:brightness-110"
            >
              {cosa?.abrir ? t('grafo.abrir', 'Abrir') : t('grafo.abrirApp', 'Abrir en la app')}
            </button>
          )
        )}
        {nodo.tipo !== 'app' && (
          <button
            type="button"
            onClick={() => setConectando(conectando === null ? '' : null)}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/75 transition hover:bg-white/10"
          >
            <Icono nombre="vincular" /> {t('grafo.conectar', 'Conectar con…')}
          </button>
        )}
      </div>
      {aviso && (
        <p className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200/90">
          {aviso}
        </p>
      )}

      {conectando !== null && (
        <div className="mb-3 space-y-1">
          <input
            autoFocus
            value={conectando}
            onChange={(e) => setConectando(e.target.value)}
            placeholder={t('grafo.conectarBuscar', 'Busca una memoria, persona, receta…')}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none transition focus:border-accent/60"
          />
          {candidatas.map((n) => (
            <button
              key={n.ref}
              type="button"
              onClick={() => {
                void enlazarNodos(nodo.ref, n.ref)
                setConectando(null)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start text-xs text-white/75 transition hover:bg-white/10"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.color }} />
              <span className="min-w-0 flex-1 truncate">{n.titulo}</span>
              <span className="shrink-0 text-[10px] text-white/35">{nombreTipo(t, n.tipo)}</span>
            </button>
          ))}
          {candidatas.length === 0 && (
            <p className="px-2 text-[11px] text-white/35">{t('grafo.sinCandidatas', 'Nada que coincida.')}</p>
          )}
        </div>
      )}

      <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">
        {t('grafo.conectadoCon', 'Conectado con')} ({conexiones.length})
      </p>
      <ul className="space-y-0.5">
        {conexiones.map(({ ref, manual }) => {
          const otro = todos.get(ref)
          if (!otro) return null
          return (
            <li key={ref} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onElegir(ref)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-start text-xs text-white/75 transition hover:bg-white/10"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: otro.color }} />
                <span className="min-w-0 flex-1 truncate">{otro.titulo}</span>
              </button>
              {manual && (
                <button
                  type="button"
                  onClick={() => void desenlazarNodos(nodo.ref, ref)}
                  className="shrink-0 rounded px-1 text-[11px] text-white/25 transition hover:text-white/70"
                  title={t('grafo.desconectar', 'Quitar la conexión')}
                  aria-label={t('grafo.desconectar', 'Quitar la conexión')}
                >
                  <Icono nombre="cerrar" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
