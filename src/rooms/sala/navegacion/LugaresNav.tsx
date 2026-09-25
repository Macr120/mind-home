import { useState, type ReactNode } from 'react'
import type { CategoriaLugar, LugarNav, PuntoNav, TrayectoViaje } from '../../../core/data/db'
import { VACIO, categoriasLugarRepo, lugaresNavRepo, trayectosViajeRepo } from '../../../core/data/repository'
import { useT } from '../../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../../core/state/confirmarStore'
import { useArrastre } from '../../../core/ui/comun/arrastre'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { usePrefsNavegacion, type VerEnMapa } from './preferencias'

/**
 * Lugares guardados de «Cómo llegar»: los sitios a los que vuelves, con su
 * icono. Se guardan desde el origen o el destino de la búsqueda y se usan al
 * revés —tocarlos rellena un extremo del trayecto— o desde el buscador, que
 * los ofrece antes que nada.
 *
 * Se guardan en CARPETAS («Comida», «Trabajo», «Escapadas»…) junto con los
 * trayectos guardados. Cada carpeta lleva su propio pin —icono y color—, que
 * es el de todos sus lugares en la lista, en el buscador y sobre el mapa, y dos
 * interruptores: «Pines» planta sus lugares en el mapa y «Rutas» traza sus
 * trayectos. En los datos la carpeta sigue siendo `categoriasLugar`.
 */

/** Iconos entre los que elige el usuario: del catálogo, no emojis sueltos, para que sigan el estilo de la interfaz. */
export const ICONOS_LUGAR: NombreIcono[] = [
  'pin',
  'casa',
  'maletin',
  'corazon',
  'estrella',
  'comida',
  'bebida',
  'canasta',
  'hospital',
  'deportes',
  'cultura',
  'playa',
  'hotel',
  'ciudad',
  'flor',
  'libro',
]

/** Colores del pin de una carpeta. */
export const COLORES_LUGAR = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#38bdf8', '#8b5cf6', '#ec4899']

/** Lugar sin carpeta: el teal de toda la vida. */
export const COLOR_SUELTO = '#5eead4'

const iconoValido = (n: string): NombreIcono => (ICONOS_LUGAR.includes(n as NombreIcono) ? (n as NombreIcono) : 'pin')

/** Pin de un lugar: el de su carpeta o, si no tiene, su icono suelto. */
export function pinDeLugar(l: LugarNav, categorias: CategoriaLugar[]): { icono: NombreIcono; color: string } {
  const c = l.categoriaId != null ? categorias.find((x) => x.id === l.categoriaId) : undefined
  return c ? { icono: iconoValido(c.icono), color: c.color } : { icono: iconoValido(l.icono), color: COLOR_SUELTO }
}

/**
 * Qué se ve en el mapa de una carpeta. Los pines vienen encendidos de fábrica
 * (así se veían antes de las carpetas) y las rutas apagadas: varias a la vez
 * tapan el mapa. Sin carpeta —o con una ya borrada— mandan los de «Sin carpeta».
 */
export function verDeCarpeta(c: CategoriaLugar | undefined, sueltos: VerEnMapa): VerEnMapa {
  return c ? { pines: c.verPines !== false, rutas: c.verRutas === true } : sueltos
}

interface Props {
  /** Punto que se puede guardar ahora mismo (el destino, o el origen si no hay). */
  candidato: PuntoNav | null
  onUsar: (cual: 'origen' | 'destino', p: PuntoNav) => void
  trayectos: TrayectoViaje[]
  /** Fila de un trayecto guardado (la pinta «Cómo llegar», que sabe abrirlo); `extra` va antes de borrar. */
  filaTrayecto: (tr: TrayectoViaje, extra: ReactNode) => ReactNode
  /** Encuadra el mapa sobre estos puntos (al abrir una carpeta o encender sus interruptores). */
  onEncuadrar: (puntos: [number, number][]) => void
}

export function LugaresNav({ candidato, onUsar, trayectos, filaTrayecto, onEncuadrar }: Props) {
  const t = useT()
  const lugares = lugaresNavRepo.useAll() ?? VACIO
  const categorias = categoriasLugarRepo.useAll() ?? VACIO
  const [editando, setEditando] = useState<number | null>(null)
  const [catEditando, setCatEditando] = useState<number | null>(null)
  /** Carpetas plegadas (por id; «Sin carpeta» es la clave 0). De fábrica, todas abiertas. */
  const [plegadas, setPlegadas] = useState<Set<number>>(() => new Set())
  // La última carpeta escogida pone el pin del botón del menú del chat.
  const setCategoria = usePrefsNavegacion((s) => s.setCategoria)
  const sueltos = usePrefsNavegacion((s) => s.sueltos)
  const setSueltos = usePrefsNavegacion((s) => s.setSueltos)
  const usar = (cual: 'origen' | 'destino', l: LugarNav) => {
    setCategoria(l.categoriaId)
    onUsar(cual, { nombre: l.nombre, lat: l.lat, lng: l.lng })
  }

  /**
   * Arrastrar un lugar (`l:<id>`) o un trayecto (`t:<id>`) a otra carpeta. El
   * destino es la carpeta bajo el dedo (`data-carpeta`, «Sin carpeta» = 0),
   * esté abierta o plegada.
   */
  const gesto = useArrastre<number>(
    (e) => {
      const v = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-carpeta]')?.getAttribute('data-carpeta')
      return v == null ? null : Number(v)
    },
    (mano, destino) => {
      const id = Number(mano.slice(2))
      const categoriaId = destino || undefined
      if (mano.startsWith('l:')) void lugaresNavRepo.update(id, { categoriaId })
      else void trayectosViajeRepo.update(id, { categoriaId })
      setCategoria(categoriaId)
    },
  )

  const guardar = async () => {
    if (!candidato) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.guardarLugar', 'Guardar lugar'),
      mensaje: t('sala.nav.guardarLugarMensaje', 'Ponle un nombre corto: saldrá al escribir en el buscador.'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: candidato.nombre,
    })
    if (!nombre) return
    await lugaresNavRepo.add({
      nombre,
      icono: 'pin',
      lat: candidato.lat,
      lng: candidato.lng,
      creadoEn: new Date().toISOString(),
    })
  }

  const borrar = async (l: LugarNav) => {
    if (l.id == null) return
    const ok = await confirmar({
      titulo: t('sala.nav.borrarLugar', '¿Borrar este lugar guardado?'),
      mensaje: l.nombre,
      textoOk: t('sala.nav.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await lugaresNavRepo.remove(l.id)
  }

  const nuevaCarpeta = async () => {
    const nombre = await pedirTexto({
      titulo: t('sala.nav.nuevaCarpeta', 'Nueva carpeta'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
    })
    if (!nombre) return
    // El color va rotando para que dos carpetas seguidas no nazcan iguales.
    const id = await categoriasLugarRepo.add({
      nombre,
      icono: 'pin',
      color: COLORES_LUGAR[categorias.length % COLORES_LUGAR.length],
      creadoEn: new Date().toISOString(),
    })
    setCatEditando(id)
  }

  const renombrarCarpeta = async (c: CategoriaLugar) => {
    if (c.id == null) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.renombrarLugar', 'Cambiar el nombre'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: c.nombre,
    })
    if (nombre) await categoriasLugarRepo.update(c.id, { nombre })
  }

  const borrarCarpeta = async (c: CategoriaLugar) => {
    if (c.id == null) return
    const ok = await confirmar({
      titulo: t('sala.nav.borrarCarpeta', '¿Borrar esta carpeta?'),
      mensaje: t('sala.nav.borrarCarpetaMensaje', 'Sus lugares y trayectos se quedan, sin carpeta.'),
      textoOk: t('sala.nav.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    // Primero lo que cuelga de ella: si se cayera a medias, mejor sin carpeta que apuntando a una que ya no existe.
    for (const l of lugares) {
      if (l.categoriaId === c.id && l.id != null) await lugaresNavRepo.update(l.id, { categoriaId: undefined })
    }
    for (const tr of trayectos) {
      if (tr.categoriaId === c.id && tr.id != null) await trayectosViajeRepo.update(tr.id, { categoriaId: undefined })
    }
    await categoriasLugarRepo.remove(c.id)
    setCatEditando(null)
  }

  const existe = (id: number | undefined) => id != null && categorias.some((c) => c.id === id)

  /** Cada carpeta con sus lugares y trayectos; al final «Sin carpeta» (también lo de una carpeta ya borrada). */
  const grupos: { cat: CategoriaLugar | null; lista: LugarNav[]; rutas: TrayectoViaje[] }[] = [
    ...categorias.map((c) => ({
      cat: c,
      lista: lugares.filter((l) => l.categoriaId === c.id),
      rutas: trayectos.filter((tr) => tr.categoriaId === c.id),
    })),
    { cat: null, lista: lugares.filter((l) => !existe(l.categoriaId)), rutas: trayectos.filter((tr) => !existe(tr.categoriaId)) },
  ]

  const asignar = (l: LugarNav, categoriaId: number | undefined) => {
    if (l.id != null) void lugaresNavRepo.update(l.id, { categoriaId })
    setCategoria(categoriaId)
  }

  const puntosDe = (g: (typeof grupos)[number]): [number, number][] => [
    ...g.lista.map((l): [number, number] => [l.lat, l.lng]),
    ...g.rutas.flatMap((tr): [number, number][] => [
      [tr.origen.lat, tr.origen.lng],
      [tr.destino.lat, tr.destino.lng],
    ]),
  ]

  const cambiarVer = (g: (typeof grupos)[number], campo: keyof VerEnMapa, valor: boolean) => {
    if (g.cat?.id != null) void categoriasLugarRepo.update(g.cat.id, campo === 'pines' ? { verPines: valor } : { verRutas: valor })
    else setSueltos({ ...sueltos, [campo]: valor })
    // Al encender, el mapa va a donde está lo que se acaba de plantar.
    if (valor) onEncuadrar(puntosDe(g))
  }

  const alternarPlegada = (g: (typeof grupos)[number]) => {
    const clave = g.cat?.id ?? 0
    const abrir = plegadas.has(clave)
    setPlegadas((s) => {
      const n = new Set(s)
      if (abrir) n.delete(clave)
      else n.add(clave)
      return n
    })
    if (!abrir) return
    if (g.cat) setCategoria(g.cat.id)
    // Abrir la carpeta la enseña en el mapa: planta sus pines si estaban apagados y la encuadra.
    const ver = verDeCarpeta(g.cat ?? undefined, sueltos)
    if (g.lista.length && !ver.pines) cambiarVer(g, 'pines', true)
    else onEncuadrar(puntosDe(g))
  }

  const hayAlgo = lugares.length > 0 || trayectos.length > 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h4 className="flex-1 text-xs font-bold uppercase tracking-wide text-white/50">
          <Icono nombre="pin" /> {t('sala.nav.lugares', 'Lugares guardados')}
        </h4>
        {candidato && (
          <button
            type="button"
            onClick={() => void guardar()}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10"
          >
            <Icono nombre="agregar" /> {t('sala.nav.guardarLugar', 'Guardar lugar')}
          </button>
        )}
        <button
          type="button"
          onClick={() => void nuevaCarpeta()}
          className="rounded-lg border border-dashed border-white/20 px-2 py-1 text-[11px] font-semibold text-white/50 hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="carpeta" /> {t('sala.nav.nuevaCarpeta', 'Nueva carpeta')}
        </button>
      </div>

      {!hayAlgo && categorias.length === 0 && (
        <p className="text-xs text-white/40">
          {t('sala.nav.lugaresVacio', 'Guarda los sitios a los que vuelves: casa, trabajo, el gimnasio.')}
        </p>
      )}

      {grupos.map((g) => {
        const clave = g.cat?.id ?? 0
        // «Sin carpeta» solo aparece si tiene algo; una carpeta vacía sí, para poder llenarla.
        if (!g.cat && g.lista.length === 0 && g.rutas.length === 0 && !gesto.enMano) return null
        const abierta = !plegadas.has(clave)
        const color = g.cat?.color ?? COLOR_SUELTO
        const ver = verDeCarpeta(g.cat ?? undefined, sueltos)
        return (
          <div
            key={clave}
            data-carpeta={clave}
            className={`overflow-hidden rounded-xl border transition ${
              gesto.enMano && gesto.destino === clave ? 'ring-2 ring-accent/70' : ''
            }`}
            style={{ borderColor: `${color}40`, background: `${color}0d` }}
          >
            {/* Cabecera: plegar/abrir, el pin de la carpeta y sus dos interruptores del mapa. */}
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <button
                type="button"
                onClick={() => alternarPlegada(g)}
                aria-expanded={abierta}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
                title={abierta ? t('sala.nav.plegarCarpeta', 'Cerrar la carpeta') : t('sala.nav.abrirCarpeta', 'Abrir la carpeta y verla en el mapa')}
              >
                <span className="text-[10px] text-white/40">
                  <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
                </span>
                <span style={{ color }}>
                  <Icono nombre={g.cat ? iconoValido(g.cat.icono) : 'carpeta'} />
                </span>
                <span className="truncate text-xs font-bold" style={{ color: g.cat ? color : undefined }}>
                  {g.cat ? g.cat.nombre : t('sala.nav.sinCarpeta', 'Sin carpeta')}
                </span>
                <span className="shrink-0 text-[10px] text-white/35">{g.lista.length + g.rutas.length}</span>
              </button>
              <InterruptorMapa
                etiqueta={t('sala.nav.pines', 'Pines')}
                icono="pin"
                activo={ver.pines}
                color={color}
                onCambio={(v) => cambiarVer(g, 'pines', v)}
              />
              <InterruptorMapa
                etiqueta={t('sala.nav.rutas', 'Rutas')}
                icono="navegar"
                activo={ver.rutas}
                color={color}
                onCambio={(v) => cambiarVer(g, 'rutas', v)}
              />
              {g.cat && (
                <button
                  type="button"
                  onClick={() => setCatEditando((v) => (v === g.cat?.id ? null : (g.cat?.id ?? null)))}
                  aria-pressed={catEditando === g.cat.id}
                  title={t('sala.nav.editarCarpeta', 'Editar la carpeta')}
                  aria-label={t('sala.nav.editarCarpeta', 'Editar la carpeta')}
                  className="rounded-md p-1 text-white/40 hover:text-white"
                >
                  <Icono nombre="ajustes" />
                </button>
              )}
            </div>

            {g.cat && catEditando === g.cat.id && <EditorCarpeta c={g.cat} onRenombrar={renombrarCarpeta} onBorrar={borrarCarpeta} />}

            {abierta && (
              <div className="space-y-1.5 px-2 pb-2">
                {g.lista.length === 0 && g.rutas.length === 0 && (
                  <p className="px-0.5 text-[11px] text-white/40">
                    {t('sala.nav.carpetaVacia', 'Vacía. Mete aquí lugares (con su pin) o trayectos guardados.')}
                  </p>
                )}
                {g.lista.map((l) => {
                  const pin = pinDeLugar(l, categorias)
                  return (
                    <div
                      key={l.id}
                      className={`rounded-lg border border-white/10 bg-white/5 ${gesto.enMano === `l:${l.id}` ? 'opacity-40' : ''}`}
                    >
                      {/* Se arrastra por la fila (no por el editor, que tiene un campo de texto). */}
                      <div {...gesto.props(`l:${l.id}`)} className="flex cursor-grab items-center gap-2 px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() => setEditando((v) => (v === l.id ? null : (l.id ?? null)))}
                          title={t('sala.nav.moverCarpeta', 'Carpeta e icono')}
                          aria-label={t('sala.nav.moverCarpeta', 'Carpeta e icono')}
                          className="rounded-md p-1 hover:bg-white/10"
                          style={{ color: pin.color }}
                        >
                          <Icono nombre={pin.icono} />
                        </button>
                        <button
                          type="button"
                          onClick={() => usar('destino', l)}
                          className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-accent"
                          title={t('sala.nav.comoDestino', 'Ir hasta aquí')}
                        >
                          {l.nombre}
                        </button>
                        <button
                          type="button"
                          onClick={() => usar('origen', l)}
                          title={t('sala.nav.comoOrigen', 'Salir de aquí')}
                          aria-label={t('sala.nav.comoOrigen', 'Salir de aquí')}
                          className="rounded-md p-1 text-white/40 hover:text-emerald-300"
                        >
                          <Icono nombre="ubicacion" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando((v) => (v === l.id ? null : (l.id ?? null)))}
                          aria-pressed={editando === l.id}
                          title={t('sala.nav.editarLugar', 'Editar el lugar')}
                          aria-label={t('sala.nav.editarLugar', 'Editar el lugar')}
                          className="rounded-md p-1 text-white/40 hover:text-white"
                        >
                          <Icono nombre="editar" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void borrar(l)}
                          title={t('sala.nav.borrar', 'Borrar')}
                          aria-label={t('sala.nav.borrar', 'Borrar')}
                          className="rounded-md p-1 text-white/40 hover:text-red-300"
                        >
                          <Icono nombre="cerrar" />
                        </button>
                      </div>

                      {editando === l.id && (
                        <div className="space-y-1.5 border-t border-white/10 px-2 py-1.5">
                          {/* El nombre se guarda al salir del campo o con Intro. */}
                          <input
                            key={l.nombre}
                            defaultValue={l.nombre}
                            aria-label={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                            onBlur={(e) => {
                              const nombre = e.target.value.trim()
                              if (nombre && nombre !== l.nombre && l.id != null) void lugaresNavRepo.update(l.id, { nombre })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-white/30"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                            <Icono nombre="carpeta" /> {t('sala.nav.carpeta', 'Carpeta')}
                          </p>
                          {/* Con carpeta el pin lo pone ella; sin carpeta, el icono es del lugar. */}
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => asignar(l, undefined)}
                              aria-pressed={!existe(l.categoriaId)}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                                !existe(l.categoriaId) ? 'border-white/40 text-white' : 'border-white/15 text-white/50 hover:text-white/80'
                              }`}
                            >
                              {t('sala.nav.sinCarpeta', 'Sin carpeta')}
                            </button>
                            {categorias.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => asignar(l, c.id)}
                                aria-pressed={l.categoriaId === c.id}
                                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition hover:brightness-125"
                                style={{
                                  borderColor: l.categoriaId === c.id ? c.color : `${c.color}44`,
                                  background: l.categoriaId === c.id ? `${c.color}33` : 'transparent',
                                  color: c.color,
                                }}
                              >
                                <Icono nombre={iconoValido(c.icono)} /> {c.nombre}
                              </button>
                            ))}
                          </div>
                          {!existe(l.categoriaId) && (
                            <div className="flex flex-wrap gap-1">
                              {ICONOS_LUGAR.map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => {
                                    if (l.id != null) void lugaresNavRepo.update(l.id, { icono: n })
                                    setEditando(null)
                                  }}
                                  aria-pressed={iconoValido(l.icono) === n}
                                  className={`rounded-md p-1.5 text-sm transition ${
                                    iconoValido(l.icono) === n ? 'ui-accent-bg' : 'text-white/60 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <Icono nombre={n} />
                                </button>
                              ))}
                            </div>
                          )}
                          {candidato && (candidato.lat !== l.lat || candidato.lng !== l.lng) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (l.id != null) void lugaresNavRepo.update(l.id, { lat: candidato.lat, lng: candidato.lng })
                              }}
                              className="flex w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-start text-[11px] text-white/70 hover:bg-white/10"
                            >
                              <Icono nombre="ubicacion" />
                              <span className="min-w-0 flex-1 truncate">
                                {t('sala.nav.moverUbicacion', 'Mover su ubicación a «{p}»', { p: candidato.nombre })}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {g.rutas.map((tr) => (
                  <div key={`tr-${tr.id}`} {...gesto.props(`t:${tr.id}`)} className={gesto.enMano === `t:${tr.id}` ? 'opacity-40' : ''}>
                    {filaTrayecto(
                      tr,
                      <select
                        value={existe(tr.categoriaId) ? String(tr.categoriaId) : ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (tr.id == null) return
                          const id = Number(e.target.value) || undefined
                          void trayectosViajeRepo.update(tr.id, { categoriaId: id })
                          setCategoria(id)
                        }}
                        aria-label={t('sala.nav.carpeta', 'Carpeta')}
                        title={t('sala.nav.carpeta', 'Carpeta')}
                        className="max-w-24 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1 py-0.5 text-[11px] text-white/70 outline-none"
                      >
                        <option value="">{t('sala.nav.sinCarpeta', 'Sin carpeta')}</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>,
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Pastilla de un interruptor del mapa en la cabecera de una carpeta: icono + palanca (la etiqueta va en el título, para caber en la columna angosta). */
function InterruptorMapa({
  etiqueta,
  icono,
  activo,
  color,
  onCambio,
}: {
  etiqueta: string
  icono: NombreIcono
  activo: boolean
  color: string
  onCambio: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={() => onCambio(!activo)}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition ${
        activo ? 'text-white' : 'border-white/10 text-white/40 hover:text-white/70'
      }`}
      style={activo ? { borderColor: `${color}99`, background: `${color}26` } : undefined}
    >
      <Icono nombre={icono} />
      <span
        aria-hidden
        className="relative h-3 w-5 rounded-full transition"
        style={{ background: activo ? color : 'rgba(255,255,255,.15)' }}
      >
        <span className={`absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all ${activo ? 'start-2.5' : 'start-0.5'}`} />
      </span>
    </button>
  )
}

/** Pin (icono y color), nombre y borrado de una carpeta. */
function EditorCarpeta({
  c,
  onRenombrar,
  onBorrar,
}: {
  c: CategoriaLugar
  onRenombrar: (c: CategoriaLugar) => Promise<void>
  onBorrar: (c: CategoriaLugar) => Promise<void>
}) {
  const t = useT()
  return (
    <div className="mx-2 mb-2 space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="flex flex-wrap gap-1">
        {ICONOS_LUGAR.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => c.id != null && void categoriasLugarRepo.update(c.id, { icono: n })}
            aria-pressed={iconoValido(c.icono) === n}
            className={`rounded-md p-1.5 text-sm transition ${
              iconoValido(c.icono) === n ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            style={iconoValido(c.icono) === n ? { color: c.color } : undefined}
          >
            <Icono nombre={n} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLORES_LUGAR.map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => c.id != null && void categoriasLugarRepo.update(c.id, { color: col })}
            aria-pressed={c.color === col}
            aria-label={col}
            className={`h-5 w-5 rounded-full border transition ${c.color === col ? 'border-white' : 'border-white/20 hover:border-white/60'}`}
            style={{ background: col }}
          />
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => void onRenombrar(c)}
          title={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
          aria-label={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
          className="rounded-md p-1 text-white/40 hover:text-white"
        >
          <Icono nombre="editar" />
        </button>
        <button
          type="button"
          onClick={() => void onBorrar(c)}
          title={t('sala.nav.borrar', 'Borrar')}
          aria-label={t('sala.nav.borrar', 'Borrar')}
          className="rounded-md p-1 text-white/40 hover:text-red-300"
        >
          <Icono nombre="basura" />
        </button>
      </div>
    </div>
  )
}
