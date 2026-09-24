import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { normalizar } from '../../core/chat/dispatcher'
import type { MediaArchivo, ResumenMedia, TipoMedia } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { getTipoMedia, TIPOS_MEDIA } from './constantes'

/**
 * Lo que Entretenimiento manda por el buzón: una obra del archivo (película,
 * serie, libro o videojuego) como recomendación. Llega a la otra casa «por
 * ver»: la calificación es de quien la manda, y su reseña viaja firmada.
 */

interface ObraDatos {
  tipo: TipoMedia
  titulo: string
  genero: string
  autor?: string
  calificacion: number
  resena: string
  resumen?: ResumenMedia
  portada?: string
}

const etiquetaTipo = (tipo: TipoMedia) => tGlobal(`entre.tipo.${tipo}`, getTipoMedia(tipo).label)

const resumenObra = (d: { tipo: TipoMedia; autor?: string; calificacion: number }) =>
  [etiquetaTipo(d.tipo), d.autor, d.calificacion > 0 ? '★'.repeat(d.calificacion) : ''].filter(Boolean).join(' · ')

export async function empaquetarObra(m: MediaArchivo): Promise<Paquete> {
  const datos: ObraDatos = {
    tipo: m.tipo,
    titulo: m.titulo,
    genero: m.genero,
    ...(m.autor ? { autor: m.autor } : {}),
    calificacion: m.calificacion,
    resena: m.resena,
    ...(m.resumen ? { resumen: m.resumen } : {}),
    ...(m.portada ? { portada: m.portada } : {}),
  }
  return {
    app: 'entretenimiento',
    tipo: 'obra',
    version: 1,
    nombre: m.titulo,
    resumen: resumenObra(m),
    emoji: getTipoMedia(m.tipo).icon,
    datos,
    // `foto` es la clave que el buzón toma como vista previa de la tarjeta.
    ...(m.portadaFoto ? { blobs: { foto: m.portadaFoto } } : {}),
  }
}

export async function listarObras(): Promise<ItemCompartible[]> {
  return (await mediaArchivoRepo.list())
    .filter((m) => m.id != null)
    .map((m) => ({ clave: `obra:${m.id}`, nombre: m.titulo, detalle: resumenObra(m), miniatura: m.portadaFoto }))
}

export async function empaquetarObraPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const m = (await mediaArchivoRepo.list()).find((x) => x.id === id)
  return m ? empaquetarObra(m) : null
}

export async function importarObra(p: Paquete): Promise<{ seccion?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<ObraDatos> | null
  if (!d || typeof d.titulo !== 'string' || !TIPOS_MEDIA.some((x) => x.id === d.tipo)) throw new Error('Obra inválida')
  const tipo = d.tipo as TipoMedia
  const existe = (await mediaArchivoRepo.list()).some((x) => x.tipo === tipo && normalizar(x.titulo) === normalizar(d.titulo!))
  if (existe && !(await confirmarDuplicado(d.titulo))) return { cancelado: true }
  const resena = typeof d.resena === 'string' ? d.resena.trim() : ''
  await mediaArchivoRepo.add({
    tipo,
    titulo: d.titulo,
    genero: typeof d.genero === 'string' ? d.genero : '',
    fecha: fechaLocalISO(),
    // Para quien la recibe es una recomendación: aún no la ha visto ni la ha puntuado.
    estado: 'pendiente',
    calificacion: 0,
    resena: resena && p.deAlias ? `@${p.deAlias}: ${resena}` : resena,
    ...(typeof d.autor === 'string' ? { autor: d.autor } : {}),
    ...(d.resumen && typeof d.resumen === 'object' ? { resumen: d.resumen } : {}),
    ...(typeof d.portada === 'string' ? { portada: d.portada } : {}),
    ...(p.blobs?.foto ? { portadaFoto: p.blobs.foto } : {}),
    creadoEn: new Date().toISOString(),
  })
  return { seccion: 'archivo' }
}
