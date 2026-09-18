import { abrirApp } from '../abrirApp'
import { tGlobal } from '../i18n/useT'
import { useMascota } from '../state/mascotaStore'
import { usePreviaPlantilla } from '../state/previaPlantillaStore'
import { descargarAdjunto } from './api'
import { actualizarMensaje, contactoDeHilo } from './cache'
import { tipoCompartible, type Paquete } from './compartibles'
import { clavePrevia } from './motor'
import { ErrorBuzon, type MensajeBuzon } from './tipos'

/**
 * «Guardar en <app>»: descarga los blobs del paquete, se lo entrega al
 * proveedor del cuarto (que lo crea como suyo) y navega a lo guardado.
 */
export async function importarContenido(m: MensajeBuzon): Promise<void> {
  const c = m.contenido
  if (!c) return
  const tipo = tipoCompartible(c.app, c.tipo)
  if (!tipo) throw new ErrorBuzon('servidor', tGlobal('buzon.contenido.noSoportado', 'Esta versión no puede abrir este contenido'))
  const previa = clavePrevia(c)
  const blobs: Record<string, Blob> = {}
  for (const [k, a] of Object.entries(c.blobs ?? {})) {
    blobs[k] = k === previa && m.blob ? m.blob : await descargarAdjunto(a)
  }
  const contacto = await contactoDeHilo(m.hiloId)
  const paquete: Paquete = {
    app: c.app,
    tipo: c.tipo,
    version: 1,
    nombre: c.nombre,
    resumen: c.resumen,
    emoji: c.emoji,
    datos: c.datos,
    blobs,
    deAlias: contacto?.alias,
  }
  const r = await tipo.importar(paquete)
  if (r.cancelado) return
  await actualizarMensaje(m.uid, { guardadoEn: new Date().toISOString() })
  if (r.aviso) useMascota.getState().decir(r.aviso, { persistir: false })
  abrirContenido(c.app, r.seccion, r.dato)
}

/** Abre la app en lo guardado; si no está puesta en la casa, ofrece instalarla. */
export function abrirContenido(app: string, seccion?: string, dato?: string): void {
  if (!abrirApp(app, seccion, dato)) usePreviaPlantilla.getState().abrir(app)
}
