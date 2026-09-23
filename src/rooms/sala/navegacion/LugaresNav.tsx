import { useState } from 'react'
import type { CategoriaLugar, LugarNav, PuntoNav } from '../../../core/data/db'
import { VACIO, categoriasLugarRepo, lugaresNavRepo } from '../../../core/data/repository'
import { useT } from '../../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../../core/state/confirmarStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { usePrefsNavegacion } from './preferencias'

/**
 * Lugares guardados de «Cómo llegar»: los sitios a los que vuelves, con su
 * icono. Se guardan desde el origen o el destino de la búsqueda y se usan al
 * revés —tocarlos rellena un extremo del trayecto— o desde el buscador, que
 * los ofrece antes que nada.
 *
 * Se agrupan en CATEGORÍAS («Comida», «Trabajo», «Escapadas»…) y cada una lleva
 * su propio pin —icono y color—, que es el que se ve en la lista, en el
 * buscador y sobre el mapa. Un lugar sin categoría conserva su icono suelto.
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

/** Colores del pin de una categoría. */
export const COLORES_LUGAR = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#38bdf8', '#8b5cf6', '#ec4899']

/** Lugar sin categoría: el teal de toda la vida. */
const COLOR_SUELTO = '#5eead4'

const iconoValido = (n: string): NombreIcono => (ICONOS_LUGAR.includes(n as NombreIcono) ? (n as NombreIcono) : 'pin')

/** Pin de un lugar: el de su categoría o, si no tiene, su icono suelto. */
export function pinDeLugar(l: LugarNav, categorias: CategoriaLugar[]): { icono: NombreIcono; color: string } {
  const c = l.categoriaId != null ? categorias.find((x) => x.id === l.categoriaId) : undefined
  return c ? { icono: iconoValido(c.icono), color: c.color } : { icono: iconoValido(l.icono), color: COLOR_SUELTO }
}

interface Props {
  /** Punto que se puede guardar ahora mismo (el destino, o el origen si no hay). */
  candidato: PuntoNav | null
  onUsar: (cual: 'origen' | 'destino', p: PuntoNav) => void
}

export function LugaresNav({ candidato, onUsar }: Props) {
  const t = useT()
  const lugares = lugaresNavRepo.useAll() ?? VACIO
  const categorias = categoriasLugarRepo.useAll() ?? VACIO
  const [editando, setEditando] = useState<number | null>(null)
  const [catEditando, setCatEditando] = useState<number | null>(null)
  // La última categoría escogida pone el pin del botón del menú del chat.
  const setCategoria = usePrefsNavegacion((s) => s.setCategoria)
  const usar = (cual: 'origen' | 'destino', l: LugarNav) => {
    setCategoria(l.categoriaId)
    onUsar(cual, { nombre: l.nombre, lat: l.lat, lng: l.lng })
  }

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

  const renombrar = async (l: LugarNav) => {
    if (l.id == null) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.renombrarLugar', 'Cambiar el nombre'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: l.nombre,
    })
    if (nombre) await lugaresNavRepo.update(l.id, { nombre })
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

  const nuevaCategoria = async () => {
    const nombre = await pedirTexto({
      titulo: t('sala.nav.nuevaCategoria', 'Nueva categoría'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
    })
    if (!nombre) return
    // El color va rotando para que dos categorías seguidas no nazcan iguales.
    const id = await categoriasLugarRepo.add({
      nombre,
      icono: 'pin',
      color: COLORES_LUGAR[categorias.length % COLORES_LUGAR.length],
      creadoEn: new Date().toISOString(),
    })
    setCatEditando(id)
  }

  const renombrarCategoria = async (c: CategoriaLugar) => {
    if (c.id == null) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.renombrarLugar', 'Cambiar el nombre'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: c.nombre,
    })
    if (nombre) await categoriasLugarRepo.update(c.id, { nombre })
  }

  const borrarCategoria = async (c: CategoriaLugar) => {
    if (c.id == null) return
    const ok = await confirmar({
      titulo: t('sala.nav.borrarCategoria', '¿Borrar esta categoría?'),
      mensaje: t('sala.nav.borrarCategoriaMensaje', 'Los lugares se quedan; solo pierden la categoría.'),
      textoOk: t('sala.nav.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    // Primero los lugares: si se cayera a medias, mejor sin categoría que apuntando a una que ya no existe.
    for (const l of lugares) {
      if (l.categoriaId === c.id && l.id != null) await lugaresNavRepo.update(l.id, { categoriaId: undefined })
    }
    await categoriasLugarRepo.remove(c.id)
    setCatEditando(null)
  }

  /** Los lugares por categoría, y al final los sueltos (o los de una categoría ya borrada). */
  const grupos: { cat: CategoriaLugar | null; lista: LugarNav[] }[] = [
    ...categorias.map((c) => ({ cat: c, lista: lugares.filter((l) => l.categoriaId === c.id) })),
    { cat: null, lista: lugares.filter((l) => !categorias.some((c) => c.id === l.categoriaId)) },
  ].filter((g) => g.lista.length > 0)

  const asignar = (l: LugarNav, categoriaId: number | undefined) => {
    if (l.id != null) void lugaresNavRepo.update(l.id, { categoriaId })
    setCategoria(categoriaId)
  }

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
      </div>

      {/* Categorías: tocar una abre su pin (icono y color), el nombre y el borrado. */}
      <div className="flex flex-wrap items-center gap-1">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCatEditando((v) => (v === c.id ? null : (c.id ?? null)))
              setCategoria(c.id)
            }}
            aria-pressed={catEditando === c.id}
            title={t('sala.nav.editarCategoria', 'Editar la categoría')}
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition hover:brightness-125"
            style={{ borderColor: `${c.color}66`, background: `${c.color}1f`, color: c.color }}
          >
            <Icono nombre={iconoValido(c.icono)} /> {c.nombre}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void nuevaCategoria()}
          className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[11px] font-semibold text-white/50 hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="agregar" /> {t('sala.nav.nuevaCategoria', 'Nueva categoría')}
        </button>
      </div>

      {categorias.map(
        (c) =>
          catEditando === c.id && (
            <div key={`edit-${c.id}`} className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
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
                    className={`h-5 w-5 rounded-full border transition ${
                      c.color === col ? 'border-white' : 'border-white/20 hover:border-white/60'
                    }`}
                    style={{ background: col }}
                  />
                ))}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => void renombrarCategoria(c)}
                  title={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                  aria-label={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                  className="rounded-md p-1 text-white/40 hover:text-white"
                >
                  <Icono nombre="editar" />
                </button>
                <button
                  type="button"
                  onClick={() => void borrarCategoria(c)}
                  title={t('sala.nav.borrar', 'Borrar')}
                  aria-label={t('sala.nav.borrar', 'Borrar')}
                  className="rounded-md p-1 text-white/40 hover:text-red-300"
                >
                  <Icono nombre="basura" />
                </button>
              </div>
            </div>
          ),
      )}

      {lugares.length === 0 ? (
        <p className="text-xs text-white/40">
          {t('sala.nav.lugaresVacio', 'Guarda los sitios a los que vuelves: casa, trabajo, el gimnasio.')}
        </p>
      ) : (
        grupos.map((g) => (
          <div key={g.cat?.id ?? 'sueltos'} className="space-y-1.5">
            {/* El título del grupo solo tiene sentido cuando hay categorías que separar. */}
            {categorias.length > 0 && (
              <p
                className="flex items-center gap-1 px-0.5 pt-1 text-[11px] font-bold uppercase tracking-wide"
                style={{ color: g.cat ? g.cat.color : 'rgba(255,255,255,.35)' }}
              >
                {g.cat ? (
                  <>
                    <Icono nombre={iconoValido(g.cat.icono)} /> {g.cat.nombre}
                  </>
                ) : (
                  t('sala.nav.sinCategoria', 'Sin categoría')
                )}
              </p>
            )}
            {g.lista.map((l) => {
              const pin = pinDeLugar(l, categorias)
              return (
                <div key={l.id} className="rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setEditando((v) => (v === l.id ? null : (l.id ?? null)))}
                      title={t('sala.nav.cambiarIcono', 'Cambiar el icono')}
                      aria-label={t('sala.nav.cambiarIcono', 'Cambiar el icono')}
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
                      onClick={() => void renombrar(l)}
                      title={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                      aria-label={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
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
                      {/* Con categoría el pin lo pone ella; sin categoría, el icono es del lugar. */}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => asignar(l, undefined)}
                          aria-pressed={l.categoriaId == null}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                            l.categoriaId == null
                              ? 'border-white/40 text-white'
                              : 'border-white/15 text-white/50 hover:text-white/80'
                          }`}
                        >
                          {t('sala.nav.sinCategoria', 'Sin categoría')}
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
                      {l.categoriaId == null && (
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
