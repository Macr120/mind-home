/** Lo que hace una orden del hilo (ver `ordenesHilo.ts`). Se carga bajo demanda. */
import { COLORES_RUTINA } from '../ui/coloresRutina'
import { EMOJIS } from '../ui/iconos/catalogo'
import type { TFunc } from '../i18n/useT'
import { normalizarOrden } from '../navegador/ordenes'
import * as apiEspacios from '../espacios/api'
import { espaciosCache } from '../espacios/cache'
import { crearCalendario } from '../espacios/calendario'
import { refrescarEspacios } from '../espacios/conectar'
import { nombreTipo } from '../espacios/enlaces'
import { ICONO_TIPO } from '../espacios/tipos'
import { tipoCompartible, type ItemCompartible } from './compartibles'
import { enviar } from './motor'
import { TIPOS_COLABORAR, TIPOS_ENVIAR, type OrdenHilo } from './ordenesHilo'
import type { Contacto } from './tipos'

/** Exacto, luego por el principio, luego contenido. */
function buscar<T>(lista: T[], nombre: (x: T) => string, q: string): T | undefined {
  const ns = lista.map((x) => [x, normalizarOrden(nombre(x))] as const)
  return (
    ns.find(([, n]) => n === q)?.[0] ??
    ns.find(([, n]) => n.startsWith(q))?.[0] ??
    ns.find(([, n]) => n.includes(q))?.[0]
  )
}

const listaCorta = (nombres: string[]) => nombres.slice(0, 6).map((n) => `«${n}»`).join(', ')

export { mensajeErrorEspacio } from '../espacios/api'

export interface ResultadoOrdenHilo {
  respuesta: string
  /** «enviar» a secas: el ChatBox abre el selector de contenido. */
  abrirSelector?: boolean
}

export async function ejecutarOrdenHilo(o: OrdenHilo, contacto: Contacto, t: TFunc): Promise<ResultadoOrdenHilo> {
  const a = contacto.alias
  const hiloId = contacto.hiloId
  if (!hiloId) return { respuesta: t('partida.jugar.sinHilo', 'Ese contacto aún no tiene chat') }
  return o.accion === 'enviar' ? enviarContenido(o, hiloId, a, t) : colaborar(o, contacto, hiloId, t)
}

async function enviarContenido(o: OrdenHilo, hiloId: string, a: string, t: TFunc): Promise<ResultadoOrdenHilo> {
  if (!o.tipo) return { respuesta: t('buzon.orden.elige', 'Elige qué enviarle a @{a}', { a }), abrirSelector: true }
  const [app, tipo] = TIPOS_ENVIAR[o.tipo]
  const def = tipoCompartible(app, tipo)
  if (!def) return { respuesta: t('buzon.contenido.noSoportado', 'Esta versión no puede abrir este contenido') }
  const k = def.etiqueta(t)
  const items: ItemCompartible[] = await def.listar()
  if (!items.length) return { respuesta: t('buzon.orden.vacio', 'No tienes nada de tipo «{k}» para enviar', { k }) }
  const item = o.nombre ? buscar(items, (x) => x.nombre, o.nombre) : items.length === 1 ? items[0] : undefined
  if (!item) {
    const lista = listaCorta(items.map((x) => x.nombre))
    return {
      respuesta: o.nombre
        ? t('buzon.orden.noEncontre', 'No encontré «{n}» (tipo «{k}»). Tienes: {lista}', { n: o.nombreOriginal, k, lista })
        : t('buzon.orden.cual', '¿Cuál? Escribe «enviar {tipo} <nombre>». Tienes: {lista}', { tipo: o.tipo, lista }),
    }
  }
  const paquete = await def.empaquetar(item.clave)
  if (!paquete) return { respuesta: t('buzon.orden.noEmpaqueta', 'No pude preparar «{n}» para enviarlo', { n: item.nombre }) }
  await enviar(hiloId, { texto: '', paquete })
  return { respuesta: t('buzon.orden.enviado', 'Le envié «{n}» a @{a}', { n: item.nombre, a }) }
}

async function colaborar(o: OrdenHilo, contacto: Contacto, hiloId: string, t: TFunc): Promise<ResultadoOrdenHilo> {
  const a = contacto.alias
  const tipo = TIPOS_COLABORAR[o.tipo]
  const k = nombreTipo(tipo)
  // Solo el dueño puede invitar: se busca entre los espacios que abrí yo.
  const mios = (await espaciosCache()).filter((e) => e.tipo === tipo && e.rol === 'dueno')
  let esp = o.nombre ? buscar(mios, (e) => e.titulo, o.nombre) : mios.length === 1 ? mios[0] : undefined
  if (!esp && tipo === 'calendario' && o.nombreOriginal) {
    esp = await crearCalendario(o.nombreOriginal.slice(0, 80), COLORES_RUTINA[1])
    await refrescarEspacios()
  }
  if (!esp) {
    if (!o.nombre && mios.length > 1) {
      return {
        respuesta: t('buzon.orden.cualEspacio', '¿Cuál? Escribe «colaborar {tipo} <nombre>». Compartes: {lista}', {
          tipo: o.tipo,
          lista: listaCorta(mios.map((e) => e.titulo)),
        }),
      }
    }
    return {
      respuesta: t(
        'buzon.orden.sinEspacio',
        'Aún no compartes ese {k}. Ábrelo en su app, pulsa «Compartir» y vuelve a escribir la orden',
        { k },
      ),
    }
  }
  await apiEspacios.invitar(esp.espacioId, contacto.contactoId, 'editor')
  // La tarjeta en su chat, como la deja el panel de compartir.
  await enviar(hiloId, {
    texto: '',
    paquete: {
      app: 'espacio',
      tipo: esp.tipo,
      version: 1,
      nombre: esp.titulo,
      emoji: EMOJIS[ICONO_TIPO[esp.tipo]],
      datos: { espacioId: esp.espacioId, tipo: esp.tipo, titulo: esp.titulo, rol: 'editor' },
    },
  })
  return { respuesta: t('buzon.orden.invitado', 'Invité a @{a} a editar «{n}» contigo', { a, n: esp.titulo }) }
}
