/**
 * Los paneles opcionales del fondo de pantalla: hora, clima, música y recursos
 * del sistema. Cuáles se enseñan —y EN QUÉ SITIO— se decide en Configuraciones
 * › Interfaz y se guarda aquí.
 *
 * Vive en `localStorage` por la misma razón que [[el encuadre]]
 * (`fondoEncuadre.ts`): el fondo es OTRA ventana y lo único que comparte con la
 * app es el origen `app://mph`. Y esa vecindad da el canal de aviso gratis: al
 * escribir aquí desde Configuraciones, la ventana del fondo recibe el evento
 * `storage` del navegador y se repinta sola, sin IPC ni sincronía a mano.
 */

export type PanelFondo = 'hora' | 'clima' | 'musica' | 'recursos' | 'misiones'

/**
 * Los ocho sitios del borde: las cuatro esquinas y la mitad de cada lado. El
 * centro no es uno de ellos a propósito — ahí está la casa, que es lo que se
 * ha venido a ver.
 */
export type SitioFondo =
  | 'arribaIzq'
  | 'arriba'
  | 'arribaDer'
  | 'izq'
  | 'der'
  | 'abajoIzq'
  | 'abajo'
  | 'abajoDer'

export interface ExtrasFondo {
  hora: boolean
  clima: boolean
  musica: boolean
  recursos: boolean
  misiones: boolean
  sitios: Record<PanelFondo, SitioFondo>
}

export const EXTRAS_FONDO: PanelFondo[] = ['hora', 'clima', 'musica', 'recursos', 'misiones']

export const SITIOS_FONDO: SitioFondo[] = [
  'arribaIzq',
  'arriba',
  'arribaDer',
  'izq',
  'der',
  'abajoIzq',
  'abajo',
  'abajoDer',
]

const CLAVE = 'mph.fondoExtras'

// Todos arriba a la izquierda, que es la única esquina que existía antes de
// poder moverlos: quien ya tuviera paneles no ve nada saltar de sitio al
// actualizar.
const SITIOS_INICIALES: Record<PanelFondo, SitioFondo> = {
  hora: 'arribaIzq',
  clima: 'arribaIzq',
  musica: 'arribaIzq',
  recursos: 'arribaIzq',
  // El de misiones nace a la derecha: es el más alto de todos y arriba a la
  // izquierda taparía al reloj, que es donde caen los demás por herencia.
  misiones: 'arribaDer',
}

const APAGADOS: ExtrasFondo = {
  hora: false,
  clima: false,
  musica: false,
  recursos: false,
  misiones: false,
  sitios: SITIOS_INICIALES,
}

export function leerExtrasFondo(): ExtrasFondo {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return { ...APAGADOS, sitios: { ...SITIOS_INICIALES } }
    // Los `sitios` se mezclan aparte porque lo guardado puede ser de antes de
    // que existieran (v1.0.2): sin esto, un panel viejo se quedaría sin sitio.
    const guardado = JSON.parse(crudo) as Partial<ExtrasFondo>
    return { ...APAGADOS, ...guardado, sitios: { ...SITIOS_INICIALES, ...guardado.sitios } }
  } catch {
    return { ...APAGADOS, sitios: { ...SITIOS_INICIALES } }
  }
}

function guardar(estado: ExtrasFondo): ExtrasFondo {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    /* sin almacenamiento no hay memoria, pero el cambio de esta sesión vale */
  }
  return estado
}

/** Enciende o apaga un panel; devuelve el estado completo resultante. */
export function alternarExtraFondo(cual: PanelFondo): ExtrasFondo {
  const ahora = leerExtrasFondo()
  ahora[cual] = !ahora[cual]
  return guardar(ahora)
}

/** Lleva un panel a uno de los ocho sitios del borde. */
export function moverExtraFondo(cual: PanelFondo, sitio: SitioFondo): ExtrasFondo {
  const ahora = leerExtrasFondo()
  ahora.sitios = { ...ahora.sitios, [cual]: sitio }
  return guardar(ahora)
}

/** La clave, expuesta para que la ventana del fondo filtre sus eventos `storage`. */
export const CLAVE_EXTRAS_FONDO = CLAVE
