/**
 * Sistema de tutoriales guiados: el mago presenta desde una esquina, un
 * spotlight resalta el elemento objetivo (anclado con atributos `data-tut`)
 * y una tarjeta explica cada paso. Se lanzan a mano (botón "?" de cada
 * menú/app) o desde el chat («tutorial de cocina»).
 */

import type { RegionMapa } from '../state/zonaTutStore'

/** Contexto vivo de UNA ejecución del tutorial (se crea en `iniciar`). */
export interface TutorialCtx {
  /** Datos compartidos entre pasos (p. ej. el id del dato de ejemplo creado). */
  datos: Map<string, unknown>
  /** Ejecuta `fn` una sola vez por ejecución, aunque se navegue con Atrás. */
  unaVez(clave: string, fn: () => Promise<void>): Promise<void>
  /** Registra una limpieza (borrar el dato de ejemplo por su id) que corre SIEMPRE al salir/terminar. */
  alLimpiar(fn: () => void | Promise<void>): void
}

/** Texto traducible: clave de dict.ts + español de respaldo. */
export interface TextoTut {
  clave: string
  es: string
}

export interface PasoTutorial {
  /**
   * Valor de `data-tut` del objetivo a resaltar; función si depende de un dato
   * creado durante el tour. Sin `sel`, la tarjeta acompaña al mago (sin spotlight).
   */
  sel?: string | ((ctx: TutorialCtx) => string)
  titulo?: TextoTut
  texto: TextoTut
  /** Lado preferido de la tarjeta respecto al objetivo (default: automático). */
  colocacion?: 'auto' | 'arriba' | 'abajo' | 'izquierda' | 'derecha'
  /**
   * Deja la pantalla lista ANTES de medir: cambiar pestaña (clickTut/stores) o
   * crear el dato de ejemplo (siempre dentro de `ctx.unaVez`). Corre también al
   * volver con Atrás, así que debe ser idempotente.
   */
  alEntrar?: (ctx: TutorialCtx) => void | Promise<void>
  /** `data-tut` a esperar tras `alEntrar` antes de medir (default: el propio `sel`). */
  esperar?: string
  /**
   * El CUADRANTE del mapa donde ocurre el paso: se marca sobre el terreno con
   * el color de su zona y PERSISTE mientras los pasos siguientes no lo cambien
   * (así los pasos de un editor heredan el encuadre sin declarar nada).
   * Función cuando depende del mapa construido (zonas del demo).
   */
  zona?: RegionMapa | ((ctx: TutorialCtx) => RegionMapa | null)
  /**
   * El OBJETO que se edita en este paso (una cancha, el corral, las parcelas):
   * se resalta en ÁMBAR sobre el cuadrante, y es a él a quien vuela la cámara
   * y sobre quien se abre el hueco del velo. A diferencia de `zona`, es de cada
   * paso: sin `foco` el ámbar se apaga.
   */
  foco?: RegionMapa | ((ctx: TutorialCtx) => RegionMapa | null)
}

export interface TutorialDef {
  id: string
  titulo: TextoTut
  /** Respuesta del chat a «¿cómo funciona X?» (2-4 frases). */
  resumen: TextoTut
  /** Abre la superficie donde vive el tutorial (lo usa `iniciar`, p. ej. desde el chat). */
  preparar?: () => void | Promise<void>
  pasos: PasoTutorial[]
  /**
   * Se llama al cerrarse el tour, con `true` si el usuario llegó al final. Lo inyecta
   * quien lanza el tour (p. ej. la guía de bienvenida marca su paso como hecho).
   */
  alTerminar?: (completado: boolean) => void
}
