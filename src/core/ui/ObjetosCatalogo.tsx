import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ObjetoCuarto } from '../data/db'
import { RECURSOS } from '../house/recursos'
import { useShallow } from 'zustand/react/shallow'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'
import { pedirDestinoObjeto } from '../state/destinoObjetoStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi } from '../state/editorUiStore'
import { getTema, type Tema } from '../house/temas'
import { MiniaturaEscena, MiniaturaModelo } from '../house/Miniatura'
import { escenaPiezaCasa } from '../house/previewPiezas'
import { CuerpoAnimal } from '../house/granja'
import { Prendas } from '../house/Prendas'
import { TIPO_PIEZAS, funcionEspecialDe } from '../house/catalogo'
import { META_ESPECIAL_PLANTILLA } from '../house/especialesPlantillaMeta'
import { TIPO_FLOTADOR, NOMBRE_FLOTADOR } from '../state/flotadorStore'
import { tieneAnimacion } from '../house/animacion'
import { plantillaObjetoPiezas } from './comun/EditorPiezas'
import { claveLS, esDemo, esDemoAutor } from '../edicion'
import { ANCLAS_AVATAR, CATEGORIAS_PRENDA, PRENDAS } from '../house/apariencia'
import { ANIMALES, useGranja } from '../state/granjaStore'
import type { TipoAnimal } from '../data/db'
import { murosLibresRepo, pisosExteriorRepo, zonasRepo, VACIO } from '../data/repository'
import { useT, type TFunc } from '../i18n/useT'
import { useArrastre } from './comun/arrastre'
import { catalogoCasa, type CuartoConstruido } from './catalogoCasa'
import { Carpeta } from './comun/Carpeta'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import {
  GRUPOS_ESPECIALES,
  GRUPOS_OBJETOS,
  GRUPO_ANIMALES,
  GRUPO_CASA,
  GRUPO_ROPA,
  CATS_ESPECIALES,
  CATS_RETIRADAS,
  grupoDeCategoria,
  grupoDeCategoriaEspecial,
} from './inventarioGrupos'

/** Marca en localStorage de que la biblioteca ya se sembró una vez.
 *  v6: orquídea. v7: principales ambientales. v8: principales usables. v9: luces (antorcha/farol/etc).
 *  v10: separa 'Especiales' en 'Cuadro y espejo' + 'Fuentes'. v11: la carpeta de luces pasa de
 *  'Iluminación' (colisionaba con la categoría de lámparas de RECURSOS) a 'Luces'.
 *  v13: anuncios (espectacular/Las Vegas/neón). v14: retira las carpetas anticuadas
 *  (Estructural, Estructural / Deco, Terreno) — ver `CATS_RETIRADAS`.
 *  La siembra deduplica/migra lo previo. */
const SEED_FLAG = claveLS('mh_libreria_seeded_v14')
/** Orden manual de carpetas (drag & drop), persistido en localStorage. */
const ORDEN_CATS_KEY = 'mh_libreria_orden_categorias'
/** Carpetas superiores plegadas (una lista por sub-pestaña). */
const GRUPOS_PLEGADOS_KEY = 'mh_libreria_grupos_plegados'

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

const leerGruposPlegados = (): string[] => {
  try {
    const raw = localStorage.getItem(GRUPOS_PLEGADOS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const RECURSO_POR_ID = new Map(RECURSOS.map((r) => [r.id, r]))

/** Nombres que siembra `sembrarLibreriaBase` SIN baseId (vehículos, cuadro y
 *  espejo, fuentes, flotador, parque, luces, anuncios y principales de
 *  plantilla): tipo → nombre sembrado. Se traducen con `recursoExtra.<tipo>`. */
const NOMBRE_SEMBRADO_POR_TIPO: Record<string, string> = {
  bicicleta: 'Bicicleta',
  motocicleta: 'Motocicleta',
  automovil: 'Automóvil',
  ovni: 'Platillo OVNI',
  'cuadro-foto': 'Cuadro con foto',
  espejo: 'Espejo',
  fuente: 'Fuente clásica',
  estanque: 'Estanque con chorro',
  'cascada-pared': 'Cascada de pared',
  [TIPO_FLOTADOR]: NOMBRE_FLOTADOR,
  resbaladilla: 'Resbaladilla',
  pasamanos: 'Pasamanos',
  carrusel: 'Carrusel',
  columpio: 'Columpio',
  antorcha: 'Antorcha',
  farol: 'Farol',
  'lampara-pie': 'Lámpara de pie',
  vela: 'Vela',
  espectacular: 'Espectacular de carretera',
  'letrero-vegas': 'Letrero Las Vegas',
  'letrero-neon': 'Letrero de neón',
  ...Object.fromEntries(Object.entries(META_ESPECIAL_PLANTILLA).map(([tipo, m]) => [tipo, m.nombre])),
}

/** Nombre a mostrar de un objeto. El nombre sembrado (desde RECURSOS o desde
 *  `sembrarLibreriaBase`) se traduce SOLO si sigue intacto (mismo criterio que
 *  `campoBase` de mascotas): un nombre puesto por el usuario se respeta tal cual. */
const nombreObjeto = (t: TFunc, o: ObjetoCuarto) => {
  if (!o.nombre) {
    return o.tipo === TIPO_PIEZAS
      ? t('objetos.nombrePiezas', 'Objeto de piezas')
      : t('objetos.nombreGenerico', 'Objeto')
  }
  const base = o.baseId != null ? RECURSO_POR_ID.get(o.baseId) : undefined
  if (base && o.nombre === base.nombre) return t(`recurso.${base.id}`, o.nombre)
  return o.nombre === NOMBRE_SEMBRADO_POR_TIPO[o.tipo] ? t(`recursoExtra.${o.tipo}`, o.nombre) : o.nombre
}

/** Dónde caería lo que va en la mano: la cabecera de una carpeta u otro objeto (con su carpeta). */
type Destino = { tipo: 'carpeta'; cat: string } | { tipo: 'objeto'; id: number; cat: string }

/** Ningún cuarto ocupa nada: para niveles que aún no existen en el mapa. */
const SIN_OCUPACION: Set<string> = new Set()

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
  // Solo biblioteca + instancias colocadas de biblioteca (useShallow): con
  // `s.objetos` crudo, mover CUALQUIER mueble de la casa repintaba el inventario.
  const objetos = useDiseño(
    useShallow((s) => s.objetos.filter((o) => esObjetoLibreria(o) || o.libreriaId != null)),
  )
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
  const [gruposPlegados, setGruposPlegados] = useState<Set<string>>(() => new Set(leerGruposPlegados()))

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
    // La demo no re-siembra, así que ahí las retiradas solo se filtran al pintar.
    if (CATS_RETIRADAS.has(cat)) return false
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

  // Nivel de arriba: cada carpeta cae bajo una carpeta superior, conservando el
  // orden que acaba de calcularse. Los grupos sin ninguna carpeta no se pintan
  // (salvo los de enlace, que no tienen carpetas por definición).
  const esEspeciales = !!soloCategorias
  const definiciones = esEspeciales ? GRUPOS_ESPECIALES : GRUPOS_OBJETOS
  const catsPorGrupo = new Map<string, string[]>()
  for (const cat of categorias) {
    const g = esEspeciales
      ? grupoDeCategoriaEspecial(cat, (grupos.get(cat) ?? []).map((o) => o.tipo))
      : grupoDeCategoria(cat)
    const a = catsPorGrupo.get(g)
    if (a) a.push(cat)
    else catsPorGrupo.set(g, [cat])
  }

  // Total de piezas construidas (el badge del grupo «Casa»). Sale del mismo
  // catálogo que pinta la carpeta, así el número y la lista nunca se separan.
  const seccionesCasa = useCatalogoCasa()
  const piezasCasa = seccionesCasa.reduce(
    (n, s) => n + s.piezas.reduce((m, p) => m + p.cuantas, 0),
    0,
  )

  const alternarGrupo = (id: string) =>
    setGruposPlegados((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      localStorage.setItem(GRUPOS_PLEGADOS_KEY, JSON.stringify([...n]))
      return n
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
    const msg = t('objetos.borrarConfirm', `¿Borrar "${nombreObjeto(t, o)}"? No se puede deshacer.`, {
      nombre: nombreObjeto(t, o),
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

  /** Categoría actual de un objeto de la biblioteca (de dónde sale al arrastrarlo). */
  const catDe = (id: number) => objetos.find((o) => o.id === id)?.categoria || 'Otros'

  /**
   * El gesto compartido de la casa. Claves: `c:<categoría>` (cabecera de carpeta)
   * y `o:<id>` (objeto). El destino es lo que hay bajo el dedo: otro objeto (se
   * inserta antes de él) o una carpeta (una carpeta se coloca antes de ella; un
   * objeto cae al final de ella).
   */
  const gesto = useArrastre<Destino>(
    (e, mano) => {
      const bajo = document.elementFromPoint(e.clientX, e.clientY)
      if (mano.startsWith('o:')) {
        const id = Number(mano.slice(2))
        const obj = bajo?.closest('[data-obj]')
        if (obj) {
          const idDestino = Number(obj.getAttribute('data-obj'))
          const cat = obj.getAttribute('data-obj-cat') ?? ''
          return idDestino !== id ? { tipo: 'objeto', id: idDestino, cat } : null
        }
        const cat = bajo?.closest('[data-carpeta]')?.getAttribute('data-carpeta')
        return cat && cat !== catDe(id) ? { tipo: 'carpeta', cat } : null
      }
      const cat = bajo?.closest('[data-carpeta]')?.getAttribute('data-carpeta')
      return cat && cat !== mano.slice(2) ? { tipo: 'carpeta', cat } : null
    },
    (mano, destino) => {
      if (mano.startsWith('c:')) {
        if (destino.tipo === 'carpeta') moverCarpetaAntesDe(mano.slice(2), destino.cat)
        return
      }
      const id = Number(mano.slice(2))
      if (destino.tipo === 'carpeta') void moverObjetoAFinDe(id, catDe(id), destino.cat)
      else void moverObjetoAntesDe(id, catDe(id), destino.id, destino.cat)
    },
  )

  /** Una carpeta (categoría) con sus objetos: lo que va dentro de cada grupo. */
  const renderCategoria = (cat: string) => {
        const objs = grupos.get(cat)!
        const abierta = !plegadas.has(cat)
        const editando = renombrando === cat
        return (
          <div
            key={cat}
            data-carpeta={cat}
            className={`rounded-lg border border-white/[0.06] bg-white/[0.02] transition ${
              // Soltar un objeto dentro de la carpeta: se resalta toda la carpeta.
              gesto.enMano?.startsWith('o:') && gesto.destino?.tipo === 'carpeta' && gesto.destino.cat === cat
                ? 'ring-1 ring-accent/70 bg-accent/[0.06]'
                : ''
            } ${
              // Reordenar carpetas: línea de inserción sobre la carpeta destino.
              gesto.enMano?.startsWith('c:') && gesto.destino?.tipo === 'carpeta' && gesto.destino.cat === cat
                ? 'border-t-2 border-t-accent'
                : ''
            }`}
          >
            {/* Cabecera: arrastrar para reordenar + plegar + renombrar carpeta */}
            <div
              {...(editando ? {} : gesto.props(`c:${cat}`))}
              className={`flex items-center gap-1 px-2 py-1.5 ${!editando ? 'cursor-grab active:cursor-grabbing' : ''} ${
                gesto.enMano === `c:${cat}` ? 'opacity-40' : ''
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
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
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
                    {...(o.id != null ? gesto.props(`o:${o.id}`) : {})}
                    data-obj={o.id}
                    data-obj-cat={cat}
                    onClick={() => alMapa(o)}
                    onKeyDown={(e) => e.key === 'Enter' && alMapa(o)}
                    title={t('objetos.alMapa', 'Colocar en el mapa o en un cuarto')}
                    className={`flex cursor-grab items-center gap-2 rounded-md bg-white/[0.03] p-1.5 transition hover:bg-white/[0.07] ${
                      // Línea de inserción (dónde caerá) al reordenar objetos.
                      gesto.destino?.tipo === 'objeto' && gesto.destino.id === o.id
                        ? 'border-t-2 border-accent'
                        : ''
                    } ${gesto.enMano === `o:${o.id}` ? 'opacity-40' : ''}`}
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
                          className="pointer-events-none absolute -end-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                        >
                          <Icono nombre="brillo" />
                        </span>
                      )}
                      {(() => {
                        const funcion = funcionEspecialDe(o)
                        return (
                          funcion && (
                            <span
                              title={t(funcion.clave, funcion.texto)}
                              className="pointer-events-none absolute -start-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                            >
                              <Icono nombre="mano" />
                            </span>
                          )
                        )
                      })()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">
                      {nombreObjeto(t, o)}
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
                      className="ms-5 flex items-center gap-2 rounded-md border-s-2 border-accent/25 bg-white/[0.02] p-1.5"
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
                            className="pointer-events-none absolute -end-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                          >
                            <Icono nombre="brillo" />
                          </span>
                        )}
                        {(() => {
                          const funcion = funcionEspecialDe(inst)
                          return (
                            funcion && (
                              <span
                                title={t(funcion.clave, funcion.texto)}
                                className="pointer-events-none absolute -start-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] shadow"
                              >
                                <Icono nombre="mano" />
                              </span>
                            )
                          )
                        })()}
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
  }

  return (
    <section className="flex flex-col gap-1.5">
      <p className="mb-1 px-2 text-[11px] leading-snug text-white/45">
        {esEspeciales
          ? t('objetos.ayudaEspeciales', 'Los objetos con efecto, agrupados por lo que hacen. Ábrelos para ver sus carpetas.')
          : t('objetos.ayuda', 'Todos los objetos que existen, por categoría. Crea los tuyos, edítalos o bórralos.')}
      </p>

      {definiciones.map((g) => {
        const cats = catsPorGrupo.get(g.id) ?? []
        // Los tres grupos que no agrupan categorías: dos enlaces y el recuento
        // de la construcción. Se pintan aunque no tengan carpetas debajo.
        const propio = g.id === GRUPO_ROPA || g.id === GRUPO_ANIMALES || g.id === GRUPO_CASA
        if (cats.length === 0 && !propio) return null
        const conteo =
          g.id === GRUPO_ROPA
            ? PRENDAS.length
            : g.id === GRUPO_ANIMALES
              ? Object.keys(ANIMALES).length
              : g.id === GRUPO_CASA
                ? piezasCasa
                : cats.reduce((s, c) => s + (grupos.get(c)?.length ?? 0), 0)
        return (
          <Carpeta
            key={g.id}
            nivel={0}
            titulo={t(`inv.grupo.${g.id}`, g.nombre)}
            icono={g.icono}
            conteo={conteo}
            abierta={!gruposPlegados.has(g.id)}
            onAlternar={() => alternarGrupo(g.id)}
          >
            {g.id === GRUPO_ROPA ? (
              <CarpetaRopa tema={tema} />
            ) : g.id === GRUPO_ANIMALES ? (
              <CarpetaAnimales tema={tema} />
            ) : g.id === GRUPO_CASA ? (
              <CarpetaCasa tema={tema} />
            ) : (
              <div className="flex flex-col gap-1.5">{cats.map(renderCategoria)}</div>
            )}
          </Carpeta>
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

/**
 * Carpeta «Casa»: de qué está construida la casa y cuántas veces se repite cada
 * pieza. No son objetos que se arrastren (los muros y los pisos se pintan en el
 * editor de planos): es el recuento de lo que ya existe en el mapa.
 */
/**
 * Las secciones del catálogo de la casa, ya filtradas.
 *
 * Cada campo del layout se suscribe POR SEPARADO y la lista se arma en un
 * `useMemo`. Un selector que devolviera el array derivado crearía una referencia
 * nueva en cada lectura y `useSyncExternalStore` entraría en bucle infinito
 * («getSnapshot should be cached»): es la misma trampa que ya documenta el
 * módulo de re-renders de la escena 3D.
 */
function useCatalogoCasa() {
  const pisoTipos = useDiseño((s) => s.roomPisoTipos)
  const pisoExtTipos = useDiseño((s) => s.roomPisoExtTipos)
  const techoTipos = useDiseño((s) => s.roomTechoTipos)
  const techoFormas = useDiseño((s) => s.roomTechoFormas)
  const techoFormasCelda = useDiseño((s) => s.roomTechoFormasCelda)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const wallOverrides = useLayout((s) => s.wallOverrides)
  const edgeStyles = useLayout((s) => s.edgeStyles)
  const pinceles = useLayout((s) => s.pinceles)
  const formasCelda = useLayout((s) => s.formasCelda)
  const sinMuros = useLayout((s) => s.sinMuros)
  const conAgua = useLayout((s) => s.conAgua)
  const accesos = useLayout((s) => s.accesos)
  const murosLibres = murosLibresRepo.useAll() ?? VACIO
  const pisosExt = pisosExteriorRepo.useAll() ?? VACIO
  const zonas = zonasRepo.useAll() ?? VACIO

  const construidos = useMemo<CuartoConstruido[]>(
    () =>
      Object.keys(placed)
        .filter((id) => placed[id] && cells[id])
        .map((id) => ({
          id,
          anchor: cells[id],
          footprint: footprints[id] ?? [{ col: 0, row: 0 }],
          ocupado: ocupadoPorNivel.get(niveles[id] ?? 0) ?? SIN_OCUPACION,
          nivel: niveles[id] ?? 0,
          overrides: wallOverrides[id],
          estilos: edgeStyles[id],
          pinceles: pinceles[id],
          formasCelda: formasCelda[id],
          sinMuros: sinMuros[id],
          agua: conAgua[id],
        })),
    [placed, cells, footprints, niveles, ocupadoPorNivel, wallOverrides, edgeStyles, pinceles, formasCelda, sinMuros, conAgua],
  )

  const techos = useMemo(
    () => ({ tipos: techoTipos, formas: techoFormas, formasCelda: techoFormasCelda }),
    [techoTipos, techoFormas, techoFormasCelda],
  )

  return useMemo(
    () =>
      catalogoCasa(
        construidos,
        murosLibres,
        zonas,
        accesos,
        techos,
        pisoTipos,
        pisoExtTipos,
        pisosExt,
      ).filter((s) => s.piezas.length > 0),
    [construidos, murosLibres, zonas, accesos, techos, pisoTipos, pisoExtTipos, pisosExt],
  )
}

/**
 * Carpeta del inventario para lo que NO son objetos de la biblioteca (piezas de
 * la casa, prendas, animales): mismo marco, cabecera y plegado que las carpetas
 * de categoría de `renderCategoria`, pero sin arrastre ni renombre — estas
 * carpetas las fija el catálogo, no el usuario.
 */
function CarpetaFija({
  titulo,
  icono,
  conteo,
  nota,
  children,
}: {
  titulo: string
  /** Icono de la cabecera; sin él, la carpeta genérica. */
  icono?: NombreIcono
  conteo: number
  /** Aclara la unidad de lo que se cuenta («por tramo», «por celda»). */
  nota?: string
  children: ReactNode
}) {
  const [abierta, setAbierta] = useState(true)
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="text-base leading-none">
          {icono ? <Icono nombre={icono} /> : <Icono emoji="📁" />}
        </span>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{titulo}</span>
          {nota && <span className="shrink-0 text-[10px] text-white/25">{nota}</span>}
          <span className="shrink-0 text-[10px] font-bold text-white/40">{conteo}</span>
          <span className="shrink-0 text-[10px] text-white/40">{abierta ? '▾' : '▸'}</span>
        </button>
      </div>
      {abierta && <div className="space-y-1 px-2 pb-2">{children}</div>}
    </div>
  )
}

/**
 * Fila de una pieza dentro de una carpeta fija: la misma que la de un objeto
 * (miniatura + nombre), con la acción a la derecha o ninguna. Con `onClick` es
 * un botón; sin él, una fila de solo lectura (el recuento de la casa).
 */
function FilaPieza({
  miniatura,
  nombre,
  insignia,
  onClick,
}: {
  miniatura: ReactNode
  nombre: string
  insignia?: ReactNode
  onClick?: () => void
}) {
  const cuerpo = (
    <>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-black/25 text-[11px] text-white/50">
        {miniatura}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">{nombre}</span>
      {insignia}
    </>
  )
  const clases = 'flex w-full items-center gap-2 rounded-md bg-white/[0.03] p-1.5 text-start'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${clases} transition hover:bg-white/[0.07]`}>
      {cuerpo}
    </button>
  ) : (
    <div className={clases}>{cuerpo}</div>
  )
}

function CarpetaCasa({ tema }: { tema: Tema | null }) {
  const t = useT()
  const secciones = useCatalogoCasa()

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[11px] leading-snug text-white/45">
        {t('inv.casa.ayuda', 'De qué está hecha tu casa y cuánto hay de cada cosa. Se pintan en el editor de planos, no se arrastran.')}
      </p>
      {secciones.length === 0 ? (
        <p className="px-1 py-1 text-[11px] text-white/35">
          {t('inv.casa.vacia', 'Aún no has construido nada. Levanta un cuarto en el mapa.')}
        </p>
      ) : (
        secciones.map((s) => (
          <CarpetaFija
            key={s.id}
            titulo={t(`inv.casa.${s.id}`, s.nombre)}
            icono={s.icono}
            // El conteo de la carpeta suma las piezas repetidas, como el del grupo «Casa».
            conteo={s.piezas.reduce((n, p) => n + p.cuantas, 0)}
            // La unidad se dice cuando cambia entre carpetas: un piso interior se
            // cuenta por cuarto y el exterior por celda.
            nota={s.unidad ? t(`inv.casa.unidad.${s.id}`, s.unidad) : undefined}
          >
            {s.piezas.map((p) => (
              <FilaPieza
                key={p.id}
                nombre={t(`inv.casa.pieza.${s.id}.${p.id}`, p.nombre)}
                miniatura={
                  <>
                    {/* Miniatura 3D de la pieza real, como los muebles. El icono del
                        catálogo queda debajo: es lo que se ve mientras se rasteriza. */}
                    {p.icono ? <Icono nombre={p.icono} /> : p.emoji ? <Icono emoji={p.emoji} /> : null}
                    <MiniaturaEscena
                      clave={`casa|${s.id}|${p.id}|${p.color ?? ''}`}
                      tema={tema}
                      escena={() => escenaPiezaCasa(s.id, p.id, p.color, tema)}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </>
                }
                insignia={
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                    ×{p.cuantas}
                  </span>
                }
              />
            ))}
          </CarpetaFija>
        ))
      )}
    </div>
  )
}

/**
 * Carpeta «Ropa»: no guarda objetos colocables — la ropa se pone al personaje.
 * Lista las prendas por su parte del cuerpo y cada una lleva al guardarropa.
 */
function CarpetaRopa({ tema }: { tema: Tema | null }) {
  const t = useT()
  const setTab = useEditorUi((s) => s.setTab)
  const setEditMode = useLayout((s) => s.setEditMode)

  const alGuardarropa = () => {
    setTab('personajes')
    setEditMode(true)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[11px] leading-snug text-white/45">
        {t('inv.ropa.ayuda', 'La ropa se le pone al personaje, no se coloca en el mapa. Toca una prenda para abrir el guardarropa.')}
      </p>
      {CATEGORIAS_PRENDA.map((c) => {
        const prendas = PRENDAS.filter((p) => p.categoria === c.id)
        if (prendas.length === 0) return null
        return (
          <CarpetaFija
            key={c.id}
            titulo={t(`editor.pers.categoria.${c.id}`, c.nombre)}
            conteo={prendas.length}
          >
            {prendas.map((p) => (
              <FilaPieza
                key={p.id}
                nombre={t(`editor.pers.prenda.${p.id}`, p.nombre)}
                onClick={alGuardarropa}
                miniatura={
                  <>
                    {/* La prenda misma, con las medidas del avatar; debajo, su emoji. */}
                    <Icono emoji={p.emoji} />
                    <MiniaturaEscena
                      clave={`prenda|${p.id}|${p.color}`}
                      tema={tema}
                      escena={() => (
                        <Prendas ropa={{ [p.id]: { color: p.color } }} anclas={ANCLAS_AVATAR} />
                      )}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </>
                }
              />
            ))}
          </CarpetaFija>
        )
      })}
    </div>
  )
}

/**
 * Carpeta «Animales»: los de granja no son objetos, viven en corrales. Tocar uno
 * abre el editor de la granja con esa especie ya elegida.
 */
function CarpetaAnimales({ tema }: { tema: Tema | null }) {
  const t = useT()

  const alaGranja = (tipo: TipoAnimal) => {
    useGranja.getState().iniciar()
    useGranja.setState({ tipo, herramienta: 'animal' })
  }

  const animales = Object.entries(ANIMALES) as [TipoAnimal, { nombre: string; icon: string }][]

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[11px] leading-snug text-white/45">
        {t('inv.animales.ayuda', 'Los animales viven en los corrales de la granja. Toca uno para ir a construir su corral.')}
      </p>
      {/* Una sola carpeta: todas las especies son de granja. */}
      <CarpetaFija titulo={t('room.granja.nombre', 'Granja')} conteo={animales.length}>
        {animales.map(([tipo, def]) => (
          <FilaPieza
            key={tipo}
            nombre={t(`granja.animal.${tipo}`, def.nombre)}
            onClick={() => alaGranja(tipo)}
            miniatura={
              <>
                {/* El animal tal como se ve en su corral; debajo, su emoji. */}
                <Icono emoji={def.icon} />
                <MiniaturaEscena
                  clave={`animal|${tipo}`}
                  tema={tema}
                  escena={() => <CuerpoAnimal tipo={tipo} />}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </>
            }
          />
        ))}
      </CarpetaFija>
    </div>
  )
}
