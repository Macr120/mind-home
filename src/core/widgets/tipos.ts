/**
 * Contratos del puente app ↔ widgets nativos de Android (home screen).
 *
 * La app EMPUJA un snapshot JSON ya localizado a SharedPreferences (el widget
 * solo pinta) y el widget ENCOLA acciones con estado destino que la app aplica
 * al abrirse con la lógica real (rutinas.ts / metaDiaria.ts): Java nunca decide
 * negocio. Los mismos esquemas los parsea el lado Java (widgets/ del proyecto
 * Android), así que cualquier cambio aquí debe reflejarse allá.
 */

/** Un renglón del widget «Hoy»: rutina/evento del calendario o meta diaria de una app. */
export interface ItemHoy {
  /** 'rutina:12' | 'meta:cocina' — también identifica la acción del tap. */
  id: string
  tipo: 'rutina' | 'meta'
  titulo: string
  /** Línea secundaria (avance de la meta, etiqueta). */
  detalle?: string
  emoji?: string
  /** 'HH:mm'; vacío = sin hora. */
  hora?: string
  hecho: boolean
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
  metasHechas: number
  metasTotal: number
}

export interface SnapshotWidgets {
  version: 1
  /** hoyISO() al generarlo: el widget marca «desactualizado» si cambió el día. */
  fecha: string
  idioma: 'es' | 'en'
  /**
   * Todo texto que el widget pinta tal cual, YA localizado y compuesto aquí
   * («🔥 5», «Nivel 3»…): Java no traduce ni concatena — y así ningún emoji
   * vive en fuentes .java, donde javac en Windows puede corromperlos.
   */
  textos: Record<string, string>
  /** Renglones del día: con hora asc → sin hora → metas. */
  hoy: ItemHoy[]
  resumen: ResumenWidget
}

/** Acción encolada por un tap en el widget. FIJA estado (idempotente), no toggle. */
export interface AccionWidget {
  /** UUID puesto por el receiver: dedupe y poda de optimistas. */
  accionId: string
  /** ItemHoy.id */
  id: string
  tipo: 'rutina' | 'meta'
  /** La fecha del snapshot al momento del tap (puede ser de días atrás si la app no se abrió). */
  fecha: string
  /** Estado DESTINO. */
  hecho: boolean
  /** Epoch ms: orden de aplicación (last-write-wins por ítem). */
  ts: number
}
