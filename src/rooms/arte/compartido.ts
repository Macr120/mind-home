import { abrirApp } from '../../core/abrirApp'
import { dibujosRepo } from '../../core/data/repository'
import * as api from '../../core/espacios/api'
import { refrescarEspacios } from '../../core/espacios/conectar'
import { nombreTipo } from '../../core/espacios/enlaces'
import type { Espacio } from '../../core/espacios/tipos'
import { tGlobal } from '../../core/i18n/useT'
import { notificar } from '../../core/notificaciones'
import { miniaturaFoto } from '../_shared/fotos'
import { LADO_MAX, LADO_MIN } from './constantes'
import type { Lienzo } from './lienzo'

/**
 * El Studio de arte por enlace: convertir un dibujo en uno compartido y recibir
 * los que otras personas comparten.
 *
 * Lo que viaja no es el PNG sino las OPERACIONES (ver `ops.ts`); el PNG por
 * capa solo es el punto de partida, que se sube como snapshot al compartir para
 * que nadie entre a un lienzo en blanco.
 */

/** Tope del PNG de una foto o de una imagen de IA que viaja como operación. */
export const TOPE_IMAGEN = 2 * 1024 * 1024

const sinTitulo = () => tGlobal('esp.sinTitulo', 'Sin título')

/** PNG blanco del tamaño pedido: el dibujo local de quien entra por el enlace. */
function lienzoBlanco(ancho: number, alto: number): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png'))
}

const lado = (v: unknown, porDefecto: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= LADO_MIN && v <= LADO_MAX ? v : porDefecto

/**
 * Crea el espacio del dibujo y sube sus capas actuales como snapshot inicial
 * (`hastaSeq: 0` — el log está vacío). Devuelve el `espacioId`.
 */
export async function compartirDibujo(id: number, lienzo: Lienzo): Promise<string> {
  const d = (await dibujosRepo.list()).find((x) => x.id === id)
  if (!d) throw new Error('Dibujo inexistente')
  const espacio = await api.crear('dibujo', d.nombre || sinTitulo(), { ancho: d.ancho, alto: d.alto })
  const capas = await lienzo.aCapas()
  const estado = {
    v: 1 as const,
    ancho: d.ancho,
    alto: d.alto,
    capas: [] as { capaId: string; nombre: string; visible: boolean; opacidad: number; ruta: string }[],
  }
  for (const c of capas) {
    const ruta = await api.subirArchivo(espacio.espacioId, `capas/${c.capaId}-0.png`, c.imagen)
    estado.capas.push({ capaId: c.capaId, nombre: c.nombre, visible: c.visible, opacidad: c.opacidad, ruta })
  }
  await api.guardarSnapshot(espacio.espacioId, estado, 0)
  await dibujosRepo.update(id, { espacioId: espacio.espacioId })
  await refrescarEspacios()
  return espacio.espacioId
}

/**
 * El dibujo local de un espacio de tipo dibujo: el que ya existe, o uno nuevo y
 * en blanco con el tamaño que dice el espacio (las capas llegan al abrirlo).
 */
export async function asegurarDibujoLocal(e: Pick<Espacio, 'espacioId' | 'titulo' | 'meta'>): Promise<number> {
  const ya = (await dibujosRepo.list()).find((d) => d.espacioId === e.espacioId)
  if (ya?.id != null) return ya.id
  const ancho = lado(e.meta.ancho, 1024)
  const alto = lado(e.meta.alto, 1024)
  const imagen = await lienzoBlanco(ancho, alto)
  const ahora = new Date().toISOString()
  return dibujosRepo.add({
    nombre: e.titulo || sinTitulo(),
    imagen,
    miniatura: await miniaturaFoto(imagen),
    ancho,
    alto,
    espacioId: e.espacioId,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
}

/** Entrar por el enlace: el dibujo queda listo y la app se abre encima de él. */
export async function aterrizarDibujo(e: Espacio): Promise<void> {
  const id = await asegurarDibujoLocal(e)
  if (abrirApp('arte', undefined, `dibujo:${id}`) !== null) return
  void notificar({
    clave: `espacio:${e.espacioId}`,
    titulo: e.titulo || sinTitulo(),
    cuerpo: tGlobal('esp.aterrizar.sinApp', 'Coloca la app {n} en tu MindHaOS para abrirlo', { n: nombreTipo('dibujo') }),
    efimero: true,
  })
}

/**
 * Sube al bucket la imagen de una operación `imagen` (foto insertada o lienzo
 * pintado por la IA). El PNG no cabe en un cambio del log: ahí solo viaja la
 * ruta. Devuelve la ruta, o `null` si pesa demasiado.
 */
export async function subirImagenOp(espacioId: string, uid: string, blob: Blob): Promise<string | null> {
  if (blob.size > TOPE_IMAGEN) return null
  return api.subirArchivo(espacioId, `img/${uid}.png`, blob)
}

/** Deja de compartir en el dispositivo: el dibujo vuelve a ser solo mío. */
export async function volverAPrivado(id: number): Promise<void> {
  await dibujosRepo.update(id, { espacioId: undefined, actualizadoEn: new Date().toISOString() })
}
