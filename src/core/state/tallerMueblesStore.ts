import { create } from 'zustand'
import type { DisenoMueble } from '../data/db'
import { getModulo, muebleNuevo, nombreDeFabrica, normalizarMueble } from '../muebles/modulos'
import type { Mm, ModuloId, Mueble } from '../muebles/tipos'

/**
 * Estado del taller de muebles: el editor de objetos a pantalla completa.
 *
 * Vive fuera del panel del editor por lo mismo que `previaPlantillaStore`: el
 * overlay se monta en la raíz de `App`, porque dentro del `<aside>` su `fixed`
 * quedaría encajonado por el stacking context del panel.
 *
 * La receta EN EDICIÓN vive aquí y NO se escribe en Dexie con cada golpe de
 * slider (ahogaría IndexedDB y el outbox del sync): se persiste al publicar. Y
 * todo mutador pasa por `normalizarMueble`, así que ningún panel puede dejar el
 * mueble en un estado imposible.
 */

export type TallerTab = 'modulo' | 'medidas' | 'estilo' | 'despiece' | 'precios'

interface TallerMueblesState {
  abierto: boolean
  /** Objeto de la casa que se reedita (null = mueble nuevo, aún sin objeto). */
  objetoId: number | null
  /** Diseño guardado que se reedita. */
  disenoId: number | null
  mueble: Mueble | null
  /** Hay cambios sin guardar (se pregunta al cerrar). */
  sucio: boolean
  pestana: TallerTab
  /** Vista con los frentes abiertos (solo el visor: el despiece no se entera). */
  abrirFrentes: boolean
  abrirNuevo: (moduloId?: ModuloId) => void
  abrirDeObjeto: (objetoId: number, mueble: Mueble) => void
  abrirDeDiseno: (d: DisenoMueble) => void
  setModulo: (id: ModuloId) => void
  setMedida: (k: 'ancho' | 'alto' | 'fondo', mm: Mm) => void
  setOpcion: (id: string, v: number | string | boolean) => void
  setParcial: (p: Partial<Mueble>) => void
  setNombre: (n: string) => void
  setPestana: (p: TallerTab) => void
  setAbrirFrentes: (v: boolean) => void
  /** Tras publicar: el mueble sigue abierto pero ya sin cambios pendientes. */
  marcarGuardado: (objetoId?: number, disenoId?: number) => void
  cerrar: () => void
}

export const useTallerMuebles = create<TallerMueblesState>((set, get) => {
  const editar = (cambio: (m: Mueble) => Mueble) => {
    const m = get().mueble
    if (!m) return
    set({ mueble: normalizarMueble(cambio(m)), sucio: true })
  }
  return {
    abierto: false,
    objetoId: null,
    disenoId: null,
    mueble: null,
    sucio: false,
    pestana: 'modulo',
    abrirFrentes: false,
    abrirNuevo: (moduloId = 'madera') =>
      set({
        abierto: true,
        objetoId: null,
        disenoId: null,
        mueble: muebleNuevo(moduloId),
        sucio: false,
        pestana: 'modulo',
      }),
    abrirDeObjeto: (objetoId, mueble) =>
      set({
        abierto: true,
        objetoId,
        disenoId: null,
        mueble: normalizarMueble(mueble),
        sucio: false,
        pestana: 'medidas',
      }),
    abrirDeDiseno: (d) =>
      set({
        abierto: true,
        objetoId: null,
        disenoId: d.id ?? null,
        mueble: normalizarMueble({ ...d.mueble, nombre: d.nombre }),
        sucio: false,
        pestana: 'medidas',
      }),
    setModulo: (id) =>
      editar((m) => {
        // Cambiar de módulo conserva medidas y acabados —lo que el usuario ya
        // ajustó— y estrena las opciones del módulo nuevo (`normalizarMueble`
        // rellena las que falten y tira las que ya no existen).
        const base = muebleNuevo(id)
        const anterior = getModulo(m.moduloId)
        // Nombre y medidas solo se heredan si el usuario los tocó: si eran los
        // de fábrica del módulo anterior, pasan a ser los del nuevo. Si no, un
        // rack nace llamándose «Armario con puertas» y midiendo 600 × 2000.
        const nombreIntacto = m.nombre === nombreDeFabrica(anterior)
        const medidasIntactas =
          m.medidas.ancho === anterior.medidas.ancho.def &&
          m.medidas.alto === anterior.medidas.alto.def &&
          m.medidas.fondo === anterior.medidas.fondo.def
        return {
          ...base,
          nombre: nombreIntacto ? base.nombre : m.nombre,
          medidas: medidasIntactas ? base.medidas : m.medidas,
          tablero: m.tablero,
          metal: m.metal,
          base: m.base,
          frentes: { ...base.frentes, tirador: m.frentes.tirador, colorFrente: m.frentes.colorFrente },
        }
      }),
    setMedida: (k, mm) => editar((m) => ({ ...m, medidas: { ...m.medidas, [k]: mm } })),
    setOpcion: (id, v) => editar((m) => ({ ...m, opciones: { ...m.opciones, [id]: v } })),
    setParcial: (p) => editar((m) => ({ ...m, ...p })),
    setNombre: (nombre) => editar((m) => ({ ...m, nombre })),
    setPestana: (pestana) => set({ pestana }),
    setAbrirFrentes: (abrirFrentes) => set({ abrirFrentes }),
    marcarGuardado: (objetoId, disenoId) =>
      set((s) => ({
        sucio: false,
        objetoId: objetoId ?? s.objetoId,
        disenoId: disenoId ?? s.disenoId,
      })),
    cerrar: () => set({ abierto: false, mueble: null, sucio: false, abrirFrentes: false }),
  }
})

/** Abre el taller a pantalla completa desde cualquier sitio (botones del editor). */
export const abrirTaller = (moduloId?: ModuloId): void =>
  useTallerMuebles.getState().abrirNuevo(moduloId)
