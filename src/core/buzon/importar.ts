import { abrirAppOPlantilla } from '../abrirApp'
import { tGlobal } from '../i18n/useT'
import { useMascota } from '../state/mascotaStore'
import { actualizarMensaje, contactoDeHilo } from './cache'
import { tipoCompartible, type Paquete } from './compartibles'
import { paqueteDeMensaje } from './motor'
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
  const contacto = await contactoDeHilo(m.hiloId)
  const paquete: Paquete = { ...(await paqueteDeMensaje(m))!, deAlias: contacto?.alias }
  const r = await tipo.importar(paquete)
  if (r.cancelado) return
  await actualizarMensaje(m.uid, { guardadoEn: new Date().toISOString() })
  if (r.aviso) useMascota.getState().decir(r.aviso, { persistir: false })
  abrirContenido(c.app, r.seccion, r.dato)
}

/** Abre la app en lo guardado; si no está puesta en la casa, en su plantilla. */
export function abrirContenido(app: string, seccion?: string, dato?: string): void {
  abrirAppOPlantilla(app, seccion, dato)
}
