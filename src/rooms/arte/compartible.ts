import { extension, nombreArchivo } from '../../core/buzon/exportar'
import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { Dibujo } from '../../core/data/db'
import { dibujosRepo } from '../../core/data/repository'
import { miniaturaFoto } from '../_shared/fotos'

/**
 * Los dibujos que el Studio de arte manda por el buzón: la composición final
 * aplanada (`imagen`, siempre al día) y su miniatura. Las capas no viajan: al
 * receptor le llega un dibujo plano, que la app migra perezosamente al abrirlo.
 */

interface DibujoDatos {
  nombre: string
  ancho: number
  alto: number
}

export async function empaquetarDibujo(d: Dibujo): Promise<Paquete> {
  const datos: DibujoDatos = { nombre: d.nombre, ancho: d.ancho, alto: d.alto }
  return {
    app: 'arte',
    tipo: 'dibujo',
    version: 1,
    nombre: d.nombre,
    resumen: `${d.ancho}×${d.alto}`,
    datos,
    blobs: { imagen: d.imagen, miniatura: d.miniatura ?? (await miniaturaFoto(d.imagen)) },
  }
}

export async function listarDibujos(): Promise<ItemCompartible[]> {
  return (await dibujosRepo.list())
    .filter((d) => d.id != null)
    .map((d) => ({ clave: `dibujo:${d.id}`, nombre: d.nombre, detalle: `${d.ancho}×${d.alto}`, miniatura: d.miniatura }))
}

export async function empaquetarDibujoPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const d = (await dibujosRepo.list()).find((x) => x.id === id)
  return d ? empaquetarDibujo(d) : null
}

export async function importarDibujo(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<DibujoDatos> | null
  const imagen = p.blobs?.imagen
  if (!d || typeof d.nombre !== 'string' || !imagen) throw new Error('Dibujo inválido')
  const existente = (await dibujosRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  const ahora = new Date().toISOString()
  const id = (await dibujosRepo.add({
    nombre: d.nombre,
    imagen,
    miniatura: p.blobs?.miniatura ?? (await miniaturaFoto(imagen)),
    ancho: Number(d.ancho) || 1024,
    alto: Number(d.alto) || 1024,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })) as number
  return { seccion: 'galeria', dato: String(id) }
}

/** Fuera de la app: la imagen del dibujo, tal cual. */
export async function exportarDibujo(p: Paquete): Promise<File[]> {
  const img = p.blobs?.imagen
  return img ? [new File([img], `${nombreArchivo(p.nombre)}.${extension(img.type)}`, { type: img.type })] : []
}
