import { useEffect } from 'react'
import type { CategoriaTitular, EdicionDiario } from '../../core/data/db'
import { mensajesChatRepo } from '../../core/data/repository'
import { useAsistentes } from '../../core/state/asistentesStore'
import type { Asistente } from '../../core/chat/mascotas'
import { conversarIA, iaActiva } from '../../core/chat/ia'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useAjustes } from '../../core/state/ajustesStore'
import { tGlobal } from '../../core/i18n/useT'
import { edicionDesactualizada, obtenerEdicion } from './edicion'
import { CATEGORIAS, TIPOS_EFEMERIDE } from './constantes'

/**
 * Reparto del diario por asistentes: cada programación asigna a un asistente
 * uno o más feeds (categorías y/o efemérides) y una hora (fija o aleatoria).
 * Un reloj global (useDiarioProgramado, montado en App) revisa cada minuto:
 * recarga la edición al cambiar el día y entrega los mensajes que ya tocan.
 */

export type SeccionReparto = CategoriaTitular | 'efemerides'

export interface Programacion {
  id: string
  asistenteId: string
  secciones: SeccionReparto[]
  modo: 'hora' | 'aleatoria'
  /** HH:mm (solo modo 'hora'). */
  hora?: string
}

interface EntregaDia {
  horaObjetivo: string
  modo: 'hora' | 'aleatoria'
  entregadoEn?: string
}

interface EstadoDia {
  fecha: string
  entregas: Record<string, EntregaDia>
}

const LS_PROGRAMACIONES = 'mh-diario-programaciones'
const LS_ESTADO = 'mh-diario-reparto-estado'

export function getProgramaciones(): Programacion[] {
  try {
    const raw = localStorage.getItem(LS_PROGRAMACIONES)
    return raw ? (JSON.parse(raw) as Programacion[]) : []
  } catch {
    return []
  }
}

export function setProgramaciones(progs: Programacion[]) {
  localStorage.setItem(LS_PROGRAMACIONES, JSON.stringify(progs))
}

function leerEstado(): EstadoDia | null {
  try {
    const raw = localStorage.getItem(LS_ESTADO)
    return raw ? (JSON.parse(raw) as EstadoDia) : null
  } catch {
    return null
  }
}

/** Hora aleatoria del día en la ventana 09:00–21:00. */
function horaAleatoria(): string {
  const min = 9 * 60 + Math.floor(Math.random() * 12 * 60)
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/**
 * Estado de entregas del día alineado con las programaciones: en día nuevo se
 * regenera (la aleatoria sortea hora nueva); las ya entregadas no se repiten.
 */
export function estadoReparto(): EstadoDia {
  const hoy = fechaLocalISO()
  const previo = leerEstado()
  const estado: EstadoDia = previo?.fecha === hoy ? previo : { fecha: hoy, entregas: {} }
  const progs = getProgramaciones()

  for (const p of progs) {
    const previa = estado.entregas[p.id]
    if (previa?.entregadoEn) continue
    estado.entregas[p.id] = {
      modo: p.modo,
      horaObjetivo:
        p.modo === 'hora'
          ? (p.hora ?? '08:00')
          : previa?.modo === 'aleatoria'
            ? previa.horaObjetivo
            : horaAleatoria(),
    }
  }
  for (const id of Object.keys(estado.entregas)) {
    if (!progs.some((p) => p.id === id)) delete estado.entregas[id]
  }
  localStorage.setItem(LS_ESTADO, JSON.stringify(estado))
  return estado
}

function horaAhora(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Contenido en líneas de las secciones elegidas (para el mensaje del asistente). */
function contenidoSecciones(edicion: EdicionDiario, secciones: SeccionReparto[]): string {
  const partes: string[] = []
  for (const s of secciones) {
    if (s === 'efemerides') {
      for (const e of edicion.efemerides) {
        const tipo = TIPOS_EFEMERIDE.find((t) => t.id === e.tipo)
        const extra = [e.subtitulo, e.anio].filter(Boolean).join(', ')
        partes.push(`${tipo?.emoji ?? '📌'} ${tipo?.label ?? e.tipo}: ${e.titulo}${extra ? ` (${extra})` : ''}`)
      }
    } else {
      const cat = CATEGORIAS.find((c) => c.id === s)
      for (const t of edicion.titulares.filter((n) => n.categoria === s).slice(0, 2)) {
        partes.push(`${cat?.emoji ?? '📰'} ${cat?.label ?? s}: ${t.titulo}`)
      }
    }
  }
  return partes.join('\n')
}

/** Redacta el mensaje en la voz del asistente (plantilla fija si no hay IA o falla). */
async function redactarMensaje(asistente: Asistente, contenido: string): Promise<string> {
  const plantilla = `${tGlobal('diario.reparto.plantillaTitulo', '🗞️ ¡Tu diario de hoy!')}\n${contenido}`
  if (!iaActiva()) return plantilla
  try {
    // Entrega autónoma (sin mensaje del usuario del que inferir idioma): se indica explícito.
    const idioma = useAjustes.getState().idioma === 'en' ? 'inglés' : 'español'
    const system = `Eres ${asistente.nombre}. ${asistente.personalidad} Entregas al usuario su diario de hoy en UN solo mensaje de chat breve (máximo 120 palabras) y en ${idioma}: saluda en tu estilo y presenta cada punto en su propia línea conservando su emoji. No inventes datos ni agregues noticias que no estén en la lista.`
    const r = await conversarIA(
      system,
      [{ rol: 'usuario', texto: `Contenido del diario de hoy:\n${contenido}` }],
      700,
    )
    return r.trim() || plantilla
  } catch {
    return plantilla
  }
}

let repartiendo = false

/** Entrega las programaciones cuya hora ya pasó y siguen pendientes hoy. */
async function repartirSiToca(): Promise<void> {
  if (repartiendo) return
  const progs = getProgramaciones().filter((p) => p.asistenteId && p.secciones.length)
  if (!progs.length) return

  const estado = estadoReparto()
  const ahora = horaAhora()
  const pendientes = progs.filter((p) => {
    const e = estado.entregas[p.id]
    return e && !e.entregadoEn && e.horaObjetivo <= ahora
  })
  if (!pendientes.length) return

  repartiendo = true
  try {
    let edicion: EdicionDiario
    try {
      edicion = await obtenerEdicion()
    } catch {
      return // sin red: se reintenta en el próximo tick
    }
    const lista = useAsistentes.getState().lista
    for (const p of pendientes) {
      const asistente = lista.find((a) => a.id === p.asistenteId)
      if (!asistente) continue
      const contenido = contenidoSecciones(edicion, p.secciones)
      const texto = contenido
        ? await redactarMensaje(asistente, contenido)
        : tGlobal('diario.reparto.sinContenido', '🗞️ Hoy no hubo contenido en tus secciones del diario.')
      await mensajesChatRepo.add({
        asistenteId: p.asistenteId,
        rol: 'asistente',
        texto,
        creado: new Date().toISOString(),
      })
      estado.entregas[p.id].entregadoEn = new Date().toISOString()
      localStorage.setItem(LS_ESTADO, JSON.stringify(estado))
    }
  } finally {
    repartiendo = false
  }
}

/**
 * Reloj del diario (montar una vez en App): al abrir y cada minuto hace el
 * rollover de medianoche (feed nuevo, borra el de ayer) y entrega el reparto.
 */
export function useDiarioProgramado() {
  useEffect(() => {
    const tick = () => {
      void (async () => {
        if (await edicionDesactualizada()) {
          try {
            await obtenerEdicion()
          } catch {
            /* sin red: se reintenta en el próximo tick */
          }
        }
        await repartirSiToca()
      })()
    }
    tick()
    const intervalo = window.setInterval(tick, 60_000)
    return () => window.clearInterval(intervalo)
  }, [])
}
