import { confirmarDuplicado, type ItemCompartible, type Paquete } from '../../core/buzon/compartibles'
import { archivosGenericos } from '../../core/buzon/exportar'
import { normalizar } from '../../core/chat/dispatcher'
import type { DietaGuardada, MomentoComida, Receta } from '../../core/data/db'
import { dietasGuardadasRepo, recetasRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { miniaturaFoto } from '../_shared/fotos'

/**
 * Lo que la cocina manda por el buzón: recetas (con su foto) y dietas (con sus
 * recetas embebidas). Una receta es autocontenida —ingredientes y pasos son
 * texto— así que viaja entera y el receptor la crea como suya.
 */

/** Una receta sin identidad ni binarios: lo que viaja en el JSON. */
interface RecetaDatos {
  nombre: string
  emoji: string
  porciones: number
  minutos: number
  etiquetas: string[]
  carpeta?: string
  momentos?: MomentoComida[]
  ingredientes: string[]
  pasos: string[]
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

interface DietaDatos {
  nombre: string
  descripcion: string
  calorias?: number
  proteinas?: number
  carbohidratos?: number
  grasas?: number
  recetas: RecetaDatos[]
}

function datosDe(r: Receta): RecetaDatos {
  return {
    nombre: r.nombre,
    emoji: r.emoji,
    porciones: r.porciones,
    minutos: r.minutos,
    etiquetas: r.etiquetas ?? [],
    ...(r.carpeta ? { carpeta: r.carpeta } : {}),
    ...(r.momentos?.length ? { momentos: r.momentos } : {}),
    ingredientes: r.ingredientes ?? [],
    pasos: r.pasos ?? [],
    calorias: r.calorias ?? 0,
    proteinas: r.proteinas ?? 0,
    carbohidratos: r.carbohidratos ?? 0,
    grasas: r.grasas ?? 0,
  }
}

const resumenReceta = (r: RecetaDatos) =>
  [
    tGlobal('cocina.rec.porciones', `${r.porciones} porciones`, { n: String(r.porciones) }),
    r.minutos > 0 ? `${r.minutos} min` : '',
  ]
    .filter(Boolean)
    .join(' · ')

export async function empaquetarReceta(r: Receta): Promise<Paquete> {
  const datos = datosDe(r)
  const blobs: Record<string, Blob> = {}
  if (r.foto) {
    blobs.foto = r.foto
    blobs.miniatura = await miniaturaFoto(r.foto)
  }
  return { app: 'cocina', tipo: 'receta', version: 1, nombre: r.nombre, resumen: resumenReceta(datos), emoji: r.emoji, datos, blobs }
}

export async function listarRecetas(): Promise<ItemCompartible[]> {
  return (await recetasRepo.list())
    .filter((r) => r.id != null)
    .map((r) => ({ clave: `receta:${r.id}`, nombre: `${r.emoji} ${r.nombre}`, detalle: resumenReceta(datosDe(r)) }))
}

export async function empaquetarRecetaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const r = (await recetasRepo.list()).find((x) => x.id === id)
  return r ? empaquetarReceta(r) : null
}

const esTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Valida la forma mínima de lo recibido (viene de otra instalación, quizá más nueva). */
function recetaValida(d: unknown): d is RecetaDatos {
  const r = d as Partial<RecetaDatos> | null
  return !!r && typeof r.nombre === 'string' && esTextos(r.ingredientes) && esTextos(r.pasos)
}

/** Crea la receta en la casa del receptor; devuelve su id (o el de una existente si eligió no duplicar). */
async function guardarReceta(d: RecetaDatos, foto: Blob | undefined, deAlias?: string, preguntar = true): Promise<number | null> {
  const existente = (await recetasRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre))
  if (existente?.id != null && preguntar && !(await confirmarDuplicado(d.nombre))) return null
  const etiquetas = [...(d.etiquetas ?? [])]
  if (deAlias && !etiquetas.includes(`@${deAlias}`)) etiquetas.push(`@${deAlias}`)
  return (await recetasRepo.add({
    nombre: d.nombre,
    emoji: d.emoji || '🍽️',
    porciones: Number(d.porciones) || 1,
    minutos: Number(d.minutos) || 0,
    etiquetas,
    ...(d.carpeta ? { carpeta: d.carpeta } : {}),
    ...(d.momentos?.length ? { momentos: d.momentos } : {}),
    ingredientes: d.ingredientes,
    pasos: d.pasos,
    calorias: Number(d.calorias) || 0,
    proteinas: Number(d.proteinas) || 0,
    carbohidratos: Number(d.carbohidratos) || 0,
    grasas: Number(d.grasas) || 0,
    fuente: 'manual',
    creadaEn: new Date().toISOString(),
    ...(foto ? { foto } : {}),
  })) as number
}

export async function importarReceta(p: Paquete): Promise<{ seccion?: string; dato?: string; cancelado?: boolean }> {
  if (!recetaValida(p.datos)) throw new Error('Receta inválida')
  const id = await guardarReceta(p.datos, p.blobs?.foto, p.deAlias)
  if (id == null) return { cancelado: true }
  return { seccion: 'recetas', dato: String(id) }
}

// ─── dietas ──────────────────────────────────────────────────────────────────

export async function empaquetarDieta(d: DietaGuardada, recetas: Receta[]): Promise<Paquete> {
  const propias = recetas.filter((r) => r.id != null && d.recetaIds.includes(r.id))
  const datos: DietaDatos = {
    nombre: d.nombre,
    descripcion: d.descripcion ?? '',
    ...(d.calorias != null ? { calorias: d.calorias } : {}),
    ...(d.proteinas != null ? { proteinas: d.proteinas } : {}),
    ...(d.carbohidratos != null ? { carbohidratos: d.carbohidratos } : {}),
    ...(d.grasas != null ? { grasas: d.grasas } : {}),
    recetas: propias.map(datosDe),
  }
  const blobs: Record<string, Blob> = {}
  if (d.foto) blobs.foto = d.foto
  propias.forEach((r, i) => {
    if (r.foto) blobs[`receta-${i}`] = r.foto
  })
  const previa = d.foto ?? propias.find((r) => r.foto)?.foto
  if (previa) blobs.miniatura = await miniaturaFoto(previa)
  return {
    app: 'cocina',
    tipo: 'dieta',
    version: 1,
    nombre: d.nombre,
    resumen: tGlobal('buzon.dieta.recetas', '{n} recetas', { n: propias.length }),
    datos,
    blobs,
  }
}

export async function listarDietas(): Promise<ItemCompartible[]> {
  return (await dietasGuardadasRepo.list())
    .filter((d) => d.id != null)
    .map((d) => ({ clave: `dieta:${d.id}`, nombre: d.nombre, detalle: tGlobal('buzon.dieta.recetas', '{n} recetas', { n: d.recetaIds.length }) }))
}

export async function empaquetarDietaPorClave(clave: string): Promise<Paquete | null> {
  const id = Number(clave.split(':')[1])
  const d = (await dietasGuardadasRepo.list()).find((x) => x.id === id)
  return d ? empaquetarDieta(d, await recetasRepo.list()) : null
}

export async function importarDieta(p: Paquete): Promise<{ seccion?: string; cancelado?: boolean }> {
  const d = p.datos as Partial<DietaDatos> | null
  if (!d || typeof d.nombre !== 'string' || !Array.isArray(d.recetas)) throw new Error('Dieta inválida')
  const existente = (await dietasGuardadasRepo.list()).find((x) => normalizar(x.nombre) === normalizar(d.nombre!))
  if (existente && !(await confirmarDuplicado(d.nombre))) return { cancelado: true }
  // Las recetas de la dieta: si ya hay una con ese nombre se reutiliza (sin preguntar por cada una).
  const recetaIds: number[] = []
  for (let i = 0; i < d.recetas.length; i++) {
    const r = d.recetas[i]
    if (!recetaValida(r)) continue
    const previa = (await recetasRepo.list()).find((x) => normalizar(x.nombre) === normalizar(r.nombre))
    const id = previa?.id ?? (await guardarReceta(r, p.blobs?.[`receta-${i}`], p.deAlias, false))
    if (id != null) recetaIds.push(id)
  }
  await dietasGuardadasRepo.add({
    nombre: d.nombre,
    descripcion: typeof d.descripcion === 'string' ? d.descripcion : '',
    ...(d.calorias != null ? { calorias: Number(d.calorias) } : {}),
    ...(d.proteinas != null ? { proteinas: Number(d.proteinas) } : {}),
    ...(d.carbohidratos != null ? { carbohidratos: Number(d.carbohidratos) } : {}),
    ...(d.grasas != null ? { grasas: Number(d.grasas) } : {}),
    recetaIds,
    creadoEn: new Date().toISOString(),
    ...(p.blobs?.foto ? { foto: p.blobs.foto } : {}),
  })
  return { seccion: 'dietas' }
}

/** Fuera de la app: la receta en texto (ingredientes y pasos) y su foto. */
export async function exportarReceta(p: Paquete): Promise<File[]> {
  const r = p.datos as RecetaDatos
  const texto = [
    `${r.emoji ?? ''} ${r.nombre}`.trim(),
    p.resumen ?? '',
    '',
    tGlobal('cocina.rec.ingredientes', 'Ingredientes'),
    ...(r.ingredientes ?? []).map((x) => `- ${x}`),
    '',
    tGlobal('cocina.rec.pasos', 'Preparación'),
    ...(r.pasos ?? []).map((x, i) => `${i + 1}. ${x}`),
  ].join('\n')
  return archivosGenericos(p, texto)
}
