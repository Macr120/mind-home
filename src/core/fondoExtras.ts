/**
 * Los paneles opcionales del fondo de pantalla: hora, clima, música y recursos
 * del sistema. Qué enseña cada instalación se decide en Configuraciones ›
 * Interfaz y se guarda aquí.
 *
 * Vive en `localStorage` por la misma razón que [[el encuadre]]
 * (`fondoEncuadre.ts`): el fondo es OTRA ventana y lo único que comparte con la
 * app es el origen `app://mph`. Y esa vecindad da el canal de aviso gratis: al
 * escribir aquí desde Configuraciones, la ventana del fondo recibe el evento
 * `storage` del navegador y se repinta sola, sin IPC ni sincronía a mano.
 */

export interface ExtrasFondo {
  hora: boolean
  clima: boolean
  musica: boolean
  recursos: boolean
}

export const EXTRAS_FONDO: (keyof ExtrasFondo)[] = ['hora', 'clima', 'musica', 'recursos']

const CLAVE = 'mph.fondoExtras'

const APAGADOS: ExtrasFondo = { hora: false, clima: false, musica: false, recursos: false }

export function leerExtrasFondo(): ExtrasFondo {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? { ...APAGADOS, ...(JSON.parse(crudo) as Partial<ExtrasFondo>) } : { ...APAGADOS }
  } catch {
    return { ...APAGADOS }
  }
}

/** Enciende o apaga un panel; devuelve el estado completo resultante. */
export function alternarExtraFondo(cual: keyof ExtrasFondo): ExtrasFondo {
  const ahora = leerExtrasFondo()
  ahora[cual] = !ahora[cual]
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ahora))
  } catch {
    /* sin almacenamiento no hay memoria, pero el toggle de esta sesión vale */
  }
  return ahora
}

/** La clave, expuesta para que la ventana del fondo filtre sus eventos `storage`. */
export const CLAVE_EXTRAS_FONDO = CLAVE
