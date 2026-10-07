import { create } from 'zustand'
import type { MotivoReporte } from '../buzon/api'
import { obtenerSupabase } from '../cuenta/supabase'
import { esDemo } from '../edicion'
import { tGlobal as t } from '../i18n/useT'
import { elegir, pedirTexto } from '../state/confirmarStore'

/**
 * Reportar una respuesta de la IA (Apple 1.1: el contenido generado se tiene
 * que poder denunciar donde se ve). Los pasos calcan `buzon/reportar.ts`
 * —motivo y detalle opcional— y van a la RPC `ia_reportar` con el prompt y la
 * respuesta como evidencia (el hilo solo vive en IndexedDB). Hecho el reporte,
 * la burbuja se oculta EN ESTE DISPOSITIVO: la lista de ids va en localStorage
 * porque es una preferencia de pantalla, no un dato del cuarto.
 */

const LS_OCULTAS = 'mh.ia.ocultas'
/** Tope de ids recordados: los más viejos se olvidan (sus hilos ya se habrán borrado). */
const MAX_OCULTAS = 500

function leerOcultas(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS_OCULTAS) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []
  } catch {
    return []
  }
}

export const useRespuestasOcultas = create<{ ids: number[]; ocultar: (id: number) => void }>((set) => ({
  ids: leerOcultas(),
  ocultar: (id) =>
    set((s) => {
      const ids = [...s.ids.filter((x) => x !== id), id].slice(-MAX_OCULTAS)
      try {
        localStorage.setItem(LS_OCULTAS, JSON.stringify(ids))
      } catch {
        // Sin almacenamiento la burbuja se oculta solo hasta recargar.
      }
      return { ids }
    }),
}))

export interface RespuestaIa {
  id: number
  asistenteId: string
  /** Lo que el usuario escribió justo antes (el «prompt» de esa respuesta). */
  prompt: string
  respuesta: string
  imagen?: Blob
  creado: string
}

/**
 * Pide motivo y detalle y manda el reporte. Devuelve true si quedó hecho (y la
 * respuesta oculta); false si el usuario se echó atrás. Lanza si el servidor
 * falla, para que quien llama lo diga.
 */
export async function reportarRespuestaIa(r: RespuestaIa): Promise<boolean> {
  const motivo = (await elegir({
    titulo: t('chat.reportar.titulo', 'Reportar esta respuesta'),
    mensaje: t('chat.reportar.pregunta', '¿Qué tiene de malo? Lo revisamos en menos de 24 horas y la respuesta se ocultará de tu chat.'),
    opciones: [
      { valor: 'odio', texto: t('buzon.reportar.odio', 'Odio o discriminación') },
      { valor: 'sexual', texto: t('buzon.reportar.sexual', 'Contenido sexual') },
      { valor: 'violencia', texto: t('buzon.reportar.violencia', 'Violencia') },
      { valor: 'acoso', texto: t('buzon.reportar.acoso', 'Acoso o amenazas') },
      { valor: 'otro', texto: t('chat.reportar.otro', 'Falso, peligroso u otra cosa') },
    ],
  })) as MotivoReporte | null
  if (!motivo) return false
  const detalle =
    (await pedirTexto({
      titulo: t('buzon.reportar.detalle', 'Cuéntanos más (opcional)'),
      textoOk: t('buzon.reportar.enviar', 'Enviar reporte'),
    })) ?? ''

  // Sin servidor (demo o versión sin backend) no hay a quién avisar: solo se oculta.
  const sb = esDemo() ? null : await obtenerSupabase()
  if (sb) {
    const { data, error } = await sb.rpc('ia_reportar', {
      p_motivo: motivo,
      p_detalle: detalle.slice(0, 500),
      p_evidencia: {
        asistente: r.asistenteId,
        prompt: r.prompt.slice(0, 4000),
        respuesta: r.respuesta.slice(0, 8000),
        // Los bytes no viajan: la imagen solo vive en este dispositivo.
        ...(r.imagen ? { imagen: `${r.imagen.type || 'imagen'} · ${r.imagen.size} B` } : {}),
        creado: r.creado,
      },
    })
    if (error) throw new Error(error.message)
    const d = data as { error?: unknown } | null
    // Sin sesión (claves propias, sin cuenta) tampoco hay a quién: se oculta igual.
    if (d && typeof d === 'object' && typeof d.error === 'string' && d.error !== 'sin-sesion') throw new Error(d.error)
  }
  useRespuestasOcultas.getState().ocultar(r.id)
  return true
}
