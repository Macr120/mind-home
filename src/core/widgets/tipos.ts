/**
 * Contratos del puente app ↔ widgets nativos de la pantalla de inicio, comunes
 * a Android y iOS.
 *
 * La app EMPUJA un snapshot JSON ya localizado a SharedPreferences (el widget
 * solo pinta) y el widget ENCOLA acciones con estado destino que la app aplica
 * al abrirse con la lógica real (core/hoy.ts): Java nunca decide negocio. Los
 * mismos esquemas los parsean el lado Java (`widgets/` del proyecto Android) y
 * el lado Swift (`ios/App/Compartido/WidgetsCompartido.swift`), así que
 * cualquier cambio aquí debe reflejarse en LOS DOS.
 */
import type { Idioma } from '../i18n/idiomas'
import type { OrigenPaso } from '../hoy'

/** Un renglón del widget «Misiones»: un `PasoHoy` de cualquier app de la casa. */
export interface ItemHoy {
  /** El `PasoHoy.id` («obj:cocina|clave», «rut:12|0», «meta:34»): con él se
   *  reencuentra el paso al aplicar la acción, así que no puede componerse aquí. */
  id: string
  tipo: OrigenPaso
  titulo: string
  /** Línea secundaria: el cuarto del que sale y su avance o su meta. */
  detalle?: string
  emoji?: string
  /** 'HH:mm'; vacío = sin hora. */
  hora?: string
  hecho: boolean
  /** Ya se pasó de su hora y sigue pendiente: el widget lo pinta en ámbar. */
  urgente?: boolean
}

export interface ResumenWidget {
  racha: number
  nivel: number
  xp: number
  /** Emoji de EMOJI_HUMOR. */
  humor: string
  sisifo: { altura: number; rango: number; estrellas: number } | null
  proximo: { titulo: string; hora: string } | null
  efemeride: { titulo: string; anio?: string; texto: string } | null
  misionesHechas: number
  misionesTotal: number
}

export interface SnapshotWidgets {
  version: 1
  /** hoyISO() al generarlo: el widget marca «desactualizado» si cambió el día. */
  fecha: string
  idioma: Idioma
  /**
   * Todo texto que el widget pinta tal cual, YA localizado y compuesto aquí
   * («🔥 5», «Nivel 3»…): Java no traduce ni concatena — y así ningún emoji
   * vive en fuentes .java, donde javac en Windows puede corromperlos.
   */
  textos: Record<string, string>
  /** Las misiones del día: lo pendiente primero (lo atrasado arriba), lo hecho al final. */
  hoy: ItemHoy[]
  resumen: ResumenWidget
}

/** Acción encolada por un tap en el widget. FIJA estado (idempotente), no toggle. */
export interface AccionWidget {
  /** UUID puesto por el receiver: dedupe y poda de optimistas. */
  accionId: string
  /** ItemHoy.id */
  id: string
  tipo: OrigenPaso
  /** La fecha del snapshot al momento del tap (puede ser de días atrás si la app no se abrió). */
  fecha: string
  /** Estado DESTINO. */
  hecho: boolean
  /** Epoch ms: orden de aplicación (last-write-wins por ítem). */
  ts: number
}
