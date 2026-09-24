import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { Hobby, ProyectoHobby } from '../../core/data/db'
import { hobbiesRepo, proyectosHobbyRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'

/**
 * Lo que Hobbies manda por el buzón: un proyecto (su nota, su estado y sus fotos)
 * junto con el hobby al que pertenece. En la otra casa el proyecto se cuelga del
 * hobby del mismo nombre si ya lo practica; si no, el hobby se crea. Las sesiones
 * de práctica son de quien las hizo y no viajan.
 */

interface ProyectoDatos {
  hobby: { nombre: string; emoji: string; color: string }
  nombre: string
  estado: ProyectoHobby['estado']
  nota?: string
  terminadoEn?: string
  /** Claves de los blobs de sus fotos, en orden. */
  fotos: string[]
}

const detalleProyecto = (h: Hobby | undefined, fotos: number) =>
  [h ? `${h.emoji} ${h.nombre}` : '', fotos ? tGlobal('buzon.proyecto.fotos', '{n} fotos', { n: String(fotos) }) : '']
    .filter(Boolean)
    .join(' · ')

export async function empaquetarProyecto(p: ProyectoHobby): Promise<Paquete | null> {
  const hobby = (await hobbiesRepo.list()).find((h) => h.id === p.hobbyId)
  if (!hobby) return null
  // La primera foto va como `foto`: es la clave que el buzón toma como vista previa.
  const claves = (p.imagenes ?? []).map((_, i) => (i === 0 ? 'foto' : `foto${i + 1}`))
  const datos: ProyectoDatos = {
    hobby: { nombre: hobby.nombre, emoji: hobby.emoji, color: hobby.color },
    nombre: p.nombre,
    estado: p.estado,
    ...(p.nota ? { nota: p.nota } : {}),
    ...(p.terminadoEn ? { terminadoEn: p.terminadoEn } : {}),
    fotos: claves,
  }
  return {
    app: 'hobbies',
    tipo: 'proyecto',
    version: 1,
    nombre: p.nombre,
    resumen: detalleProyecto(hobby, claves.length),
    emoji: hobby.emoji,
    datos,
    ...(claves.length ? { blobs: Object.fromEntries(claves.map((k, i) => [k, p.imagenes![i]])) } : {}),
  }
}

export async function listarProyectos(): Promise<ItemCompartible[]> {
  const [hobbies, proyectos] = await Promise.all([hobbiesRepo.list(), proyectosHobbyRepo.list()])
  return proyectos
    .filter((p) => p.id != null)
    .map((p) => ({
      clave: `proyecto:${p.id}`,
      nombre: p.nombre,
      detalle: detalleProyecto(
        hobbies.find((h) => h.id === p.hobbyId),
        p.imagenes?.length ?? 0,
      ),
      miniatura: p.imagenes?.[0],
    }))
}

export async function empaquetarProyectoPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const p = (await proyectosHobbyRepo.list()).find((x) => x.id === id)
  return p ? empaquetarProyecto(p) : null
}

export async function importarProyecto(p: Paquete): Promise<{ dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<ProyectoDatos> | null
  if (!d?.hobby || typeof d.hobby.nombre !== 'string' || typeof d.nombre !== 'string') throw new Error('Proyecto inválido')

  let hobbyId = (await hobbiesRepo.list()).find((h) => normalizar(h.nombre) === normalizar(d.hobby!.nombre))?.id
  if (hobbyId == null) {
    hobbyId = (await hobbiesRepo.add({
      nombre: d.hobby.nombre,
      emoji: d.hobby.emoji,
      color: d.hobby.color,
      creadoEn: new Date().toISOString(),
    })) as number
  } else {
    const existe = (await proyectosHobbyRepo.list()).some((x) => x.hobbyId === hobbyId && normalizar(x.nombre) === normalizar(d.nombre!))
    if (existe && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  }

  const imagenes = (Array.isArray(d.fotos) ? d.fotos : []).map((k) => p.blobs?.[k]).filter((b): b is Blob => !!b)
  const id = (await proyectosHobbyRepo.add({
    hobbyId,
    nombre: d.nombre,
    estado: d.estado === 'terminado' ? 'terminado' : 'en-curso',
    ...(typeof d.nota === 'string' ? { nota: d.nota } : {}),
    ...(d.estado === 'terminado' && typeof d.terminadoEn === 'string' ? { terminadoEn: d.terminadoEn } : {}),
    ...(imagenes.length ? { imagenes } : {}),
    creadoEn: new Date().toISOString(),
  })) as number
  return { dato: `proyecto:${hobbyId}:${id}` }
}
