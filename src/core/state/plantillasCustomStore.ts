import { create } from 'zustand'
import { createElement, lazy, type ComponentType } from 'react'
import { db, type ItemPlantilla, type PlantillaCustom } from '../data/db'
import { sumarContadorPlantilla } from '../data/repository'
import {
  registrarPlantillasCustom,
  vLista,
  vNumero,
  vTexto,
  type EsquemaCaptura,
  type Plantilla,
} from '../registry'
import { fechaLocalISO } from '../fechaLocal'
import { useDiseño } from './disenoStore'

/**
 * Plantillas personalizadas: apps que el usuario arma combinando bloques
 * (notas, checklist, contador, enlaces). La definición vive en
 * `db.plantillasCustom`; este store la espeja y publica al registry la versión
 * sintetizada (componente genérico + esquemas de captura) para que las custom
 * se comporten como una app más del catálogo.
 */

// lazy rompe el ciclo store ↔ app genérica; los puntos de render ya tienen <Suspense>.
const Generica = lazy(() => import('../../rooms/_shared/PlantillaGenericaApp'))

// Identidad estable del componente App por plantilla (evita remounts al re-publicar).
const appsCache = new Map<string, ComponentType>()
function appDe(id: string): ComponentType {
  let App = appsCache.get(id)
  if (!App) {
    App = () => createElement(Generica, { plantillaId: id })
    appsCache.set(id, App)
  }
  return App
}

/** Fila única de un bloque nota/contador (si ya existe). */
function filaUnica(plantillaId: string, bloqueId: string): Promise<ItemPlantilla | undefined> {
  return db.itemsPlantilla.where('[plantillaId+bloqueId]').equals([plantillaId, bloqueId]).first()
}

/** Un esquema de captura por bloque: el asistente guarda en la plantilla vía chat. */
function esquemasDe(def: PlantillaCustom): EsquemaCaptura[] {
  const lista = def.bloques.map((b): EsquemaCaptura | null => {
    switch (b.tipo) {
      case 'checklist':
        return {
          id: `checklist-${b.id}`,
          descripcion: `Agrega pendientes a la lista "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            {
              campo: 'items',
              tipo: 'lista',
              descripcion: 'Pendientes a agregar, uno por elemento.',
              requerido: true,
            },
          ],
          guardar: async (v) => {
            const ahora = new Date().toISOString()
            for (const texto of vLista(v.items)) {
              await db.itemsPlantilla.add({
                plantillaId: def.id,
                bloqueId: b.id,
                texto,
                hecho: false,
                creadoEn: ahora,
              })
            }
          },
        }
      case 'contador':
        return {
          id: `contador-${b.id}`,
          descripcion: `Suma al contador "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            {
              campo: 'cantidad',
              tipo: 'numero',
              descripcion: 'Cuánto sumar (negativo para restar); 1 si no se menciona.',
            },
          ],
          guardar: (v) => sumarContadorPlantilla(def.id, b.id, vNumero(v.cantidad, 1)),
        }
      case 'enlaces':
        return {
          id: `enlace-${b.id}`,
          descripcion: `Guarda un enlace en "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            { campo: 'titulo', tipo: 'texto', descripcion: 'Nombre corto del enlace.' },
            {
              campo: 'url',
              tipo: 'texto',
              descripcion: 'URL completa (https://…).',
              requerido: true,
            },
          ],
          guardar: async (v) => {
            const url = vTexto(v.url)
            if (!url) return
            await db.itemsPlantilla.add({
              plantillaId: def.id,
              bloqueId: b.id,
              texto: vTexto(v.titulo, url),
              url,
              creadoEn: new Date().toISOString(),
            })
          },
        }
      case 'lista':
        return {
          id: `lista-${b.id}`,
          descripcion: `Agrega elementos a la lista "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            {
              campo: 'items',
              tipo: 'lista',
              descripcion: 'Elementos a agregar, uno por elemento.',
              requerido: true,
            },
          ],
          guardar: async (v) => {
            const ahora = new Date().toISOString()
            for (const texto of vLista(v.items)) {
              await db.itemsPlantilla.add({ plantillaId: def.id, bloqueId: b.id, texto, creadoEn: ahora })
            }
          },
        }
      case 'valoracion':
        return {
          id: `valoracion-${b.id}`,
          descripcion: `Fija la valoración (1 a 5) de "${b.titulo}" en la app ${def.nombre}.`,
          campos: [
            { campo: 'valor', tipo: 'numero', descripcion: 'Estrellas de 1 a 5.', requerido: true },
          ],
          guardar: async (v) => {
            const n = Math.max(1, Math.min(5, Math.round(vNumero(v.valor, 0))))
            if (n < 1) return
            const fila = await filaUnica(def.id, b.id)
            if (fila?.id != null) await db.itemsPlantilla.update(fila.id, { valor: n })
            else
              await db.itemsPlantilla.add({
                plantillaId: def.id,
                bloqueId: b.id,
                valor: n,
                creadoEn: new Date().toISOString(),
              })
          },
        }
      case 'bitacora':
        return {
          id: `bitacora-${b.id}`,
          descripcion: `Agrega una entrada fechada a la bitácora "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            {
              campo: 'texto',
              tipo: 'texto',
              descripcion: 'La entrada a registrar, tal cual la dijo el usuario.',
              requerido: true,
            },
          ],
          guardar: async (v) => {
            const texto = vTexto(v.texto)
            if (!texto) return
            await db.itemsPlantilla.add({
              plantillaId: def.id,
              bloqueId: b.id,
              texto,
              creadoEn: new Date().toISOString(),
            })
          },
        }
      case 'progreso':
        return {
          id: `progreso-${b.id}`,
          descripcion: `Registra una medición de "${b.titulo}" en la app ${def.nombre}${
            b.unidad ? ` (en ${b.unidad})` : ''
          }.`,
          campos: [{ campo: 'valor', tipo: 'numero', descripcion: 'El valor medido.', requerido: true }],
          guardar: async (v) => {
            if (v.valor == null || v.valor === '') return
            await db.itemsPlantilla.add({
              plantillaId: def.id,
              bloqueId: b.id,
              valor: vNumero(v.valor, 0),
              creadoEn: new Date().toISOString(),
            })
          },
        }
      case 'habito':
        return {
          id: `habito-${b.id}`,
          descripcion: `Marca como hecho HOY el hábito "${b.titulo}" de la app ${def.nombre}.`,
          campos: [],
          guardar: async () => {
            const hoy = fechaLocalISO()
            const existe = await db.itemsPlantilla
              .where('[plantillaId+bloqueId]')
              .equals([def.id, b.id])
              .filter((i) => i.texto === hoy)
              .first()
            if (!existe)
              await db.itemsPlantilla.add({
                plantillaId: def.id,
                bloqueId: b.id,
                texto: hoy,
                creadoEn: new Date().toISOString(),
              })
          },
        }
      case 'sesiones':
        return {
          id: `sesiones-${b.id}`,
          descripcion: `Registra una sesión (en minutos) de "${b.titulo}" en la app ${def.nombre}.`,
          campos: [
            { campo: 'minutos', tipo: 'numero', descripcion: 'Duración en minutos.', requerido: true },
            { campo: 'nota', tipo: 'texto', descripcion: 'Nota corta de la sesión (opcional).' },
          ],
          guardar: async (v) => {
            const n = vNumero(v.minutos, 0)
            if (n <= 0) return
            await db.itemsPlantilla.add({
              plantillaId: def.id,
              bloqueId: b.id,
              valor: n,
              texto: vTexto(v.nota) || undefined,
              creadoEn: new Date().toISOString(),
            })
          },
        }
      case 'cuenta':
      case 'galeria':
        return null
      default: // notas
        return {
          id: `nota-${b.id}`,
          descripcion: `Anota texto en "${b.titulo}" de la app ${def.nombre}.`,
          campos: [
            {
              campo: 'texto',
              tipo: 'texto',
              descripcion: 'La nota a guardar, tal cual la dijo el usuario.',
              requerido: true,
            },
          ],
          guardar: async (v) => {
            const texto = vTexto(v.texto)
            if (!texto) return
            const fila = await filaUnica(def.id, b.id)
            if (fila?.id != null) {
              await db.itemsPlantilla.update(fila.id, {
                texto: fila.texto ? `${fila.texto}\n${texto}` : texto,
              })
            } else {
              await db.itemsPlantilla.add({
                plantillaId: def.id,
                bloqueId: b.id,
                texto,
                creadoEn: new Date().toISOString(),
              })
            }
          },
        }
    }
  })
  return lista.filter((e): e is EsquemaCaptura => e !== null)
}

/** Sintetiza la Plantilla del registry a partir de la definición guardada. */
function aPlantilla(def: PlantillaCustom): Plantilla {
  return {
    id: def.id,
    nombre: def.nombre,
    icon: def.icon,
    categoria: 'complemento',
    color: def.color,
    App: appDe(def.id),
    esquemas: esquemasDe(def),
  }
}

/** Publica el catálogo custom al registry (getPlantilla / plantillasTodas). */
function publicar(lista: PlantillaCustom[]) {
  registrarPlantillasCustom(
    lista.map(aPlantilla),
    Object.fromEntries(
      lista.map((d) => [d.id, `Plantilla personal: ${d.bloques.map((b) => b.titulo).join(', ')}.`]),
    ),
  )
}

interface PlantillasCustomState {
  lista: PlantillaCustom[]
  /** Crea o actualiza una plantilla (estado al instante, disco después). */
  guardar: (p: PlantillaCustom) => Promise<void>
  /** Borra la plantilla con sus datos y la desasigna de los objetos que la usan. */
  eliminar: (id: string) => Promise<void>
}

export const usePlantillasCustom = create<PlantillasCustomState>((set, get) => ({
  lista: [],
  guardar: async (p) => {
    set((s) => ({
      lista: s.lista.some((x) => x.id === p.id)
        ? s.lista.map((x) => (x.id === p.id ? p : x))
        : [...s.lista, p],
    }))
    publicar(get().lista)
    await db.plantillasCustom.put(p)
    // Al editar la estructura se borran los datos de los bloques quitados.
    const vivos = new Set(p.bloques.map((b) => b.id))
    await db.itemsPlantilla
      .where('plantillaId')
      .equals(p.id)
      .filter((i) => !vivos.has(i.bloqueId))
      .delete()
  },
  eliminar: async (id) => {
    // Desasigna los objetos que la usan (el cuarto queda sin app, no se borra).
    const { objetos, setObjetoPlantilla } = useDiseño.getState()
    for (const o of objetos) {
      if (o.plantillaId === id && o.id != null) await setObjetoPlantilla(o.id, null)
    }
    set((s) => ({ lista: s.lista.filter((x) => x.id !== id) }))
    publicar(get().lista)
    appsCache.delete(id)
    await db.itemsPlantilla.where('plantillaId').equals(id).delete()
    await db.plantillasCustom.delete(id)
    // La saca de su carpeta del catálogo (import dinámico: evita ciclo de módulos).
    const { useGruposPlantilla } = await import('./gruposPlantillaStore')
    await useGruposPlantilla.getState().quitar(id)
  },
}))

/** Carga las plantillas guardadas al arrancar. */
db.plantillasCustom
  .toArray()
  .then((rows) => {
    if (rows.length > 0) {
      usePlantillasCustom.setState({ lista: rows })
      publicar(rows)
    }
  })
  .catch(() => {})
