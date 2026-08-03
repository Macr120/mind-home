import { Fragment, useEffect, useState } from 'react'
import type { ObjetoCuarto } from '../data/db'
import { RECURSOS } from '../house/recursos'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'
import { pedirDestinoObjeto } from '../state/destinoObjetoStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { getTema } from '../house/temas'
import { MiniaturaModelo } from '../house/Miniatura'
import { TIPO_PIEZAS } from '../house/catalogo'
import { tieneAnimacion } from '../house/animacion'
import { plantillaObjetoPiezas } from './editor/EditorPiezas'
import { claveLS, esDemo, esDemoAutor } from '../edicion'
import { useT } from '../i18n/useT'
import { iniciarArrastre } from './arrastre'
import { Icono } from './iconos/Icono'

/** Marca en localStorage de que la biblioteca ya se sembró una vez.
 *  v6: orquídea. v7: principales ambientales. v8: principales usables. v9: luces (antorcha/farol/etc).
 *  v10: separa 'Especiales' en 'Cuadro y espejo' + 'Fuentes'. v11: la carpeta de luces pasa de
 *  'Iluminación' (colisionaba con la categoría de lámparas de RECURSOS) a 'Luces'.
 *  v13: anuncios (espectacular/Las Vegas/neón). La siembra deduplica/migra lo previo. */
const SEED_FLAG = claveLS('mh_libreria_seeded_v13')
/** Estas carpetas viven en la pestaña "Objetos especiales", no aquí. */
const CATS_ESPECIALES = ['Pistolas', 'Vehículos', 'Cuadro y espejo', 'Fuentes', 'Parque', 'Luces', 'Anuncios', 'Principales']
/** Orden manual de carpetas (drag & drop), persistido en localStorage. */
const ORDEN_CATS_KEY = 'mh_libreria_orden_categorias'

/** Orden por defecto de las carpetas: el del catálogo (primera aparición en RECURSOS). */
const ORDEN_CATALOGO = [...new Set(RECURSOS.map((r) => r.categoria))]
const ordenCat = (c: string) => {
  const i = ORDEN_CATALOGO.indexOf(c)
  return i === -1 ? 999 : i
}

const leerOrdenCategorias = (): string[] => {
  try {
    const raw = localStorage.getItem(ORDEN_CATS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
const guardarOrdenCategorias = (orden: string[]) =>
  localStorage.setItem(ORDEN_CATS_KEY, JSON.stringify(orden))

const nombreObjeto = (o: ObjetoCuarto) =>
  o.nombre || (o.tipo === TIPO_PIEZAS ? 'Objeto de piezas' : 'Objeto')

/** Lo que se está arrastrando en el inventario: una carpeta o un objeto (con su carpeta actual). */
type Arrastre = { tipo: 'carpeta'; cat: string } | { tipo: 'objeto'; id: number; cat: string }

/**
 * Inventario de objetos (sub-menú Objetos): la BIBLIOTECA con TODOS los objetos
 * que existen, en carpetas plegables por categoría. Se siembra una vez con el
 * catálogo base. En cada carpeta se crea un objeto 3D nuevo (queda en esa
 * categoría); cada objeto se edita en el editor o se borra (con confirmación);
 * la carpeta se puede renombrar. Carpetas y objetos se pueden arrastrar para
 * reordenarlos (o mover un objeto a otra carpeta). "Restaurar objetos base"
 * repone los borrados.
 *
 * `soloCategorias`: si se da, solo se listan esas carpetas (pestaña "Objetos
 * especiales" — Pistolas/Vehículos); si no, se listan todas MENOS esas.
 */
export function ObjetosCatalogo({ soloCategorias }: { soloCategorias?: string[] } = {}) {
  const t = useT()
  const objetos = useDiseño((s) => s.objetos)
  const sembrarLibreriaBase = useDiseño((s) => s.sembrarLibreriaBase)
  const addObjetoLibreria = useDiseño((s) => s.addObjetoLibreria)
  const instanciarEnMapa = useDiseño((s) => s.instanciarObjetoEnMapa)
  const removeObjeto = useDiseño((s) => s.removeObjeto)
  const renombrarCategoria = useDiseño((s) => s.renombrarCategoriaLibreria)
  const reordenarLibreria = useDiseño((s) => s.reordenarLibreria)
  const setObjetoRotacion = useDiseño((s) => s.setObjetoRotacion)
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const setEditMode = useLayout((s) => s.setEditMode)
  const setTab = useEditorUi((s) => s.setTab)
  const setObjetoSel = useEditorUi((s) => s.setObjetoSel)
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set())
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [nombreTmp, setNombreTmp] = useState('')
  const [ordenCategorias, setOrdenCategorias] = useState<string[]>(leerOrdenCategorias)
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)

  // Siembra inicial (una sola vez): crea la biblioteca con el catálogo base.
  // El flag se marca ANTES de sembrar para no duplicar con el doble montaje de StrictMode.
  // Auto-reparación: si el flag quedó puesto pero la biblioteca está vacía (la
  // siembra se interrumpió a medias, p. ej. por una recarga), se reintenta.
  useEffect(() => {
    // Casa demo: su biblioteca se siembra al construirla (demo/sandbox.ts), ya
    // dentro de la foto del original. Resembrarla aquí solo la ensuciaría.
    if (esDemo() && !esDemoAutor()) return
    if (localStorage.getItem(SEED_FLAG) && objetos.some(esObjetoLibreria)) return
    localStorage.setItem(SEED_FLAG, '1')
    void sembrarLibreriaBase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sembrarLibreriaBase])

  const libreria = objetos.filter(esObjetoLibreria).filter((o) => {
    const cat = o.categoria || 'Otros'
    return soloCategorias ? soloCategorias.includes(cat) : !CATS_ESPECIALES.includes(cat)
  })

  // Instancias colocadas (mapa/cuarto) por objeto de biblioteca → sus filas hijas en el inventario.
  const instanciasPorLib = new Map<number, ObjetoCuarto[]>()
  for (const o of objetos) {
    if (o.libreriaId == null) continue
    const a = instanciasPorLib.get(o.libreriaId)
    if (a) a.push(o)
    else instanciasPorLib.set(o.libreriaId, [o])
  }

  // Agrupa por categoría (orden dentro de la carpeta = campo `orden`, estable si falta).
  const grupos = new Map<string, ObjetoCuarto[]>()
  for (const o of libreria) {
    const cat = o.categoria || 'Otros'
    const a = grupos.get(cat)
    if (a) a.push(o)
    else grupos.set(cat, [o])
  }
  for (const arr of grupos.values()) {
    arr.sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER))
  }
  // Carpetas: prioriza el orden manual (drag & drop); las nuevas caen al final (orden del catálogo).
  const categorias = [...grupos.keys()].sort((a, b) => {
    const ia = ordenCategorias.indexOf(a)
    const ib = ordenCategorias.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return ordenCat(a) - ordenCat(b) || a.localeCompare(b)
  })

  const abrirEditor = (id: number) => {
    setObjetoSel(id)
    setTab('objetos')
    setEditMode(true)
  }

  /** Coloca una copia del objeto donde el usuario elija: queda lista para arrastrarla ahí mismo. */
  const alMapa = async (o: ObjetoCuarto) => {
    if (o.id == null) return
    const destino = await pedirDestinoObjeto()
    if (!destino) return
    await instanciarEnMapa(o.id, undefined, destino)
  }

  /** Rota una instancia colocada (grados sumados a su rotación actual). */
  const rotar = (inst: ObjetoCuarto, delta: number) => {
    if (inst.id != null) void setObjetoRotacion(inst.id, (inst.rotY ?? 0) + delta)
  }

  /** Quita del mundo una instancia colocada (su fila hija desaparece). */
  const borrarInstancia = (inst: ObjetoCuarto) => {
    if (inst.id != null) void removeObjeto(inst.id)
  }

  /** Crea un objeto 3D nuevo dentro de la categoría y entra a editarlo. */
  const crearEn = async (categoria: string) => {
    const id = await addObjetoLibreria(TIPO_PIEZAS, '#f59e0b', categoria, plantillaObjetoPiezas())
    abrirEditor(id)
  }

  const borrar = async (o: ObjetoCuarto) => {
    if (o.id == null) return
    const msg = t('objetos.borrarConfirm', `¿Borrar "${nombreObjeto(o)}"? No se puede deshacer.`, {
      nombre: nombreObjeto(o),
    })
    if (!window.confirm(msg)) return
    await removeObjeto(o.id)
    setObjetoSel(null)
  }

  const restaurar = async () => {
    const msg = t(
      'objetos.restaurarConfirm',
      'Se volverán a añadir los objetos base del catálogo que hayas borrado. ¿Continuar?',
    )
    if (!window.confirm(msg)) return
    await sembrarLibreriaBase()
  }

  const togglePlegada = (cat: string) =>
    setPlegadas((s) => {
      const n = new Set(s)
      if (n.has(cat)) n.delete(cat)
      else n.add(cat)
      return n
    })

  const confirmarRenombre = async () => {
    const cat = renombrando
    const nuevo = nombreTmp.trim()
    setRenombrando(null)
    if (!cat || !nuevo || nuevo === cat) return
    await renombrarCategoria(cat, nuevo)
    setOrdenCategorias((prev) => {
      if (!prev.includes(cat)) return prev
      const next = prev.map((c) => (c === cat ? nuevo : c))
      guardarOrdenCategorias(next)
      return next
    })
  }

  /** Arrastrar una carpeta y soltarla sobre otra: la mueve justo antes de esa. */
  const moverCarpetaAntesDe = (origen: string, destino: string) => {
    if (origen === destino) return
    const base = categorias.filter((c) => c !== origen)
    const idx = base.indexOf(destino)
    const next = [...base.slice(0, idx), origen, ...base.slice(idx)]
    setOrdenCategorias(next)
    guardarOrdenCategorias(next)
  }

  /** Mueve un objeto al final de una carpeta (soltado sobre su cabecera). */
  const moverObjetoAFinDe = async (id: number, catOrigen: string, catDestino: string) => {
    if (catOrigen === catDestino) return
    const destino = (grupos.get(catDestino) ?? []).filter((o) => o.id !== id)
    const cambios = destino.map((o, i) => ({ id: o.id!, categoria: catDestino, orden: i }))
    cambios.push({ id, categoria: catDestino, orden: destino.length })
    const origen = (grupos.get(catOrigen) ?? []).filter((o) => o.id !== id)
    cambios.push(...origen.map((o, i) => ({ id: o.id!, categoria: catOrigen, orden: i })))
    await reordenarLibreria(cambios)
  }

  /** Mueve un objeto justo antes de otro (misma carpeta = reordenar; distinta = recategoriza). */
  const moverObjetoAntesDe = async (
    id: number,
    catOrigen: string,
    idDestino: number,
    catDestino: string,
  ) => {
    if (id === idDestino) return
    const base = (grupos.get(catDestino) ?? []).filter((o) => o.id !== id)
    const idx = base.findIndex((o) => o.id === idDestino)
    const insertAt = idx === -1 ? base.length : idx
    const cambios = [
      ...base.slice(0, insertAt).map((o, i) => ({ id: o.id!, categoria: catDestino, orden: i })),
      { id, categoria: catDestino, orden: insertAt },
      ...base
        .slice(insertAt)
        .map((o, i) => ({ id: o.id!, categoria: catDestino, orden: insertAt + 1 + i })),
    ]
    if (catOrigen !== catDestino) {
      const origen = (grupos.get(catOrigen) ?? []).filter((o) => o.id !== id)
      cambios.push(...origen.map((o, i) => ({ id: o.id!, categoria: catOrigen, orden: i })))
    }
    await reordenarLibreria(cambios)
  }

  const soltarEnCarpeta = (cat: string) => {
    if (arrastre?.tipo === 'carpeta') moverCarpetaAntesDe(arrastre.cat, cat)
    else if (arrastre?.tipo === 'objeto') void moverObjetoAFinDe(arrastre.id, arrastre.cat, cat)
    setArrastre(null)
    setSobre(null)
  }

  const soltarEnObjeto = (o: ObjetoCuarto, cat: string) => {
    if (arrastre?.tipo === 'objeto' && o.id != null) {
      void moverObjetoAntesDe(arrastre.id, arrastre.cat, o.id, cat)
    }
    setArrastre(null)
    setSobre(null)
  }

  return (
    <section className="flex flex-col gap-1.5">
      <p className="mb-1 px-2 text-[11px] leading-snug text-white/45">
        {t('objetos.ayuda', 'Todos los objetos que existen, por categoría. Crea los tuyos, edítalos o bórralos.')}
      </p>

      {categorias.map((cat) => {
        const objs = grupos.get(cat)!
        const abierta = !plegadas.has(cat)
        const editando = renombrando === cat
        return (
          <div
            key={cat}
            onDragOver={(e) => {
              if (!arrastre) return
              e.preventDefault()
              setSobre(`carpeta:${cat}`)
            }}
            onDragLeave={() => setSobre((s) => (s === `carpeta:${cat}` ? null : s))}
            onDrop={(e) => {
              e.preventDefault()
              soltarEnCarpeta(cat)
            }}
            className={`rounded-lg border border-white/[0.06] bg-white/[0.02] transition ${
              // Soltar un objeto dentro de la carpeta: se resalta toda la carpeta.
              arrastre?.tipo === 'objeto' && sobre === `carpeta:${cat}`
                ? 'ring-2 ring-accent/70 bg-accent/[0.06]'
                : ''
            } ${
              // Reordenar carpetas: línea de inserción sobre la carpeta destino.
              arrastre?.tipo === 'carpeta' && arrastre.cat !== cat && sobre === `carpeta:${cat}`
                ? 'shadow-[0_-3px_0_0_var(--ui-accent)]'
                : ''
            }`}
          >
            {/* Cabecera: arrastrar para reordenar + plegar + renombrar carpeta */}
            <div
              draggable={!editando}
              onDragStart={(e) => {
                iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                setArrastre({ tipo: 'carpeta', cat })
              }}
              onDragEnd={() => {
                setArrastre(null)
                setSobre(null)
              }}
              className={`flex items-center gap-1 px-2 py-1.5 ${!editando ? 'cursor-grab active:cursor-grabbing' : ''} ${
                arrastre?.tipo === 'carpeta' && arrastre.cat === cat ? 'opacity-30' : ''
              }`}
            >
              <span className="text-base leading-none"><Icono emoji="📁" /></span>
              {editando ? (
                <input
                  autoFocus
                  value={nombreTmp}
                  onChange={(e) => setNombreTmp(e.target.value)}
                  onBlur={confirmarRenombre}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmarRenombre()
                    else if (e.key === 'Escape') setRenombrando(null)
                  }}
                  className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-sm font-semibold text-white/90 focus:outline-none"
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => togglePlegada(cat)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{cat}</span>
                    <span className="shrink-0 text-[10px] font-bold text-white/40">{objs.length}</span>
                    <span className="shrink-0 text-[10px] text-white/40">{abierta ? '▾' : '▸'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenombrando(cat)
                      setNombreTmp(cat)
                    }}
                    title={t('objetos.renombrar', 'Renombrar carpeta')}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/40 transition hover:bg-white/10 hover:text-white/75"
                  >
                    <Icono nombre="editar" className="text-xs" />
                  </button>
                </>
              )}
            </div>

            {abierta && !editando && (
              <div className="space-y-1 px-2 pb-2">
                {objs.map((o) => (
                  <Fragment key={o.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation()
                      if (o.id == null) return
                      iniciarArrastre(e.currentTarget, e.dataTransfer, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                      setArrastre({ tipo: 'objeto', id: o.id, cat })
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation()
                      setArrastre(null)
                      setSobre(null)
                    }}
                    onDragOver={(e) => {
                      if (arrastre?.tipo !== 'objeto') return
                      e.preventDefault()
                      e.stopPropagation()
                      setSobre(`objeto:${o.id}`)
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation()
                      setSobre((s) => (s === `objeto:${o.id}` ? null : s))
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      soltarEnObjeto(o, cat)
                    }}
                    onClick={() => alMapa(o)}
                    onKeyDown={(e) => e.key === 'Enter' && alMapa(o)}
                    title={t('objetos.alMapa', 'Colocar en el mapa o en un cuarto')}
                    className={`flex cursor-pointer items-center gap-2 rounded-md bg-white/[0.03] p-1.5 transition hover:bg-white/[0.07] ${
                      // Línea de inserción (dónde caerá) al reordenar objetos.
                      arrastre?.tipo === 'objeto' && arrastre.id !== o.id && sobre === `objeto:${o.id}`
                        ? 'shadow-[0_-3px_0_0_#34d399]'
                        : ''
                    } ${arrastre?.tipo === 'objeto' && arrastre.id === o.id ? 'opacity-30' : ''}`}
                  >
                    <span className="relative shrink-0">
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          if (o.id != null) abrirEditor(o.id)
                        }}
                        title={t('objetos.editar', 'Editar en el editor')}
                        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-black/25 transition hover:ring-2 hover:ring-accent/60"
                      >
                        <MiniaturaModelo
                          tipo={o.tipo}
                          color={o.color}
                          tema={tema}
                          piezas={o.piezas}
                          modeloGlb={o.modeloGlb}
                          foto={o.foto}
                          texto={o.texto}
                          idObjeto={o.id}
                          className="h-8 w-8 object-contain"
                        />
                      </span>
                      {tieneAnimacion(o.animacion) && (
                        <span
                          title={t('objetos.animado', 'Objeto animado')}
                          className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                        >
                          <Icono nombre="brillo" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">
                      {nombreObjeto(o)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        borrar(o)
                      }}
                      title={t('objetos.borrar', 'Borrar objeto')}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-red-500/25"
                    >
                      <Icono nombre="basura" />
                    </button>
                  </div>

                  {/* Filas HIJAS: cada instancia colocada del objeto (rotar / editar forma / quitar). */}
                  {(instanciasPorLib.get(o.id!) ?? []).map((inst) => (
                    <div
                      key={inst.id}
                      className="ml-5 flex items-center gap-2 rounded-md border-l-2 border-accent/25 bg-white/[0.02] p-1.5"
                    >
                      <span className="relative shrink-0">
                        <span
                          onClick={() => inst.id != null && abrirEditor(inst.id)}
                          title={t('objetos.editarForma', 'Editar su forma')}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-black/25 transition hover:ring-2 hover:ring-accent/60"
                        >
                          <MiniaturaModelo
                            tipo={inst.tipo}
                            color={inst.color}
                            tema={tema}
                            piezas={inst.piezas}
                            modeloGlb={inst.modeloGlb}
                            foto={inst.foto}
                            texto={inst.texto}
                            idObjeto={inst.id}
                            className="h-7 w-7 object-contain"
                          />
                        </span>
                        {tieneAnimacion(inst.animacion) && (
                          <span
                            title={t('objetos.animado', 'Objeto animado')}
                            className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                          >
                            <Icono nombre="brillo" />
                          </span>
                        )}
                      </span>
                      <div className="flex flex-1 items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => rotar(inst, -45)}
                          title={t('objetos.rotarIzq', 'Rotar a la izquierda')}
                          className="grid h-7 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/12"
                        >
                          <Icono nombre="rotar-izq" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rotar(inst, 45)}
                          title={t('objetos.rotarDer', 'Rotar a la derecha')}
                          className="grid h-7 w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/12"
                        >
                          <Icono nombre="rotar-der" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => borrarInstancia(inst)}
                        title={t('objetos.quitarDelMapa', 'Quitar del mapa')}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-red-500/25"
                      >
                        <Icono nombre="basura" />
                      </button>
                    </div>
                  ))}
                  </Fragment>
                ))}
                <button
                  type="button"
                  onClick={() => crearEn(cat)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-1.5 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
                >
                  <Icono nombre="agregar" /> {t('objetos.agregar', 'Agregar objeto 3D')}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Restaurar los objetos base del catálogo que se hayan borrado */}
      <button
        type="button"
        onClick={restaurar}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-xs font-semibold text-white/55 transition hover:border-white/30 hover:text-white/85"
      >
        <Icono nombre="restaurar" /> {t('objetos.restaurar', 'Restaurar objetos base')}
      </button>
    </section>
  )
}
