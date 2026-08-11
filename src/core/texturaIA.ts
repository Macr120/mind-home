import { generarImagen } from './imagenIA'

/**
 * Texturas de la casa generadas con IA: lo específico de la superficie (el
 * prompt y el tamaño), sobre el motor compartido de `core/imagenIA.ts`.
 *
 * Dos vías, las dos con el mismo prompt de encuadre:
 *  - solo descripción → el modelo la inventa;
 *  - descripción + foto → el modelo convierte la foto del usuario en textura.
 */

export type SuperficieTextura = 'piso' | 'muro' | 'techo' | 'fondo' | 'mapa' | 'puerta'

/** Cómo se nombra cada superficie dentro del prompt. */
const NOMBRE: Record<SuperficieTextura, string> = {
  piso: 'piso',
  muro: 'muro',
  techo: 'techo',
  fondo: 'fondo de cielo',
  mapa: 'terreno del mapa',
  puerta: 'puerta',
}

/** Encuadre que necesita cada superficie para verse bien mapeada en la escena 3D. */
const ENCUADRE: Record<SuperficieTextura, string> = {
  piso: 'Vista cenital perfectamente perpendicular al suelo, como una muestra de material de piso.',
  muro: 'Vista frontal perfectamente perpendicular a la pared, como una muestra de material de muro.',
  techo: 'Vista cenital perpendicular, como una muestra de material de techo o tejado.',
  fondo:
    'Paisaje panorámico de horizonte lejano visto desde el suelo, con el cielo ocupando la mayor parte del encuadre.',
  mapa:
    'Vista aérea cenital perfectamente perpendicular del terreno, como un mapa visto desde arriba, sin edificios ni personas y sin marco.',
  puerta:
    'Vista frontal perfectamente perpendicular de una hoja de puerta completa, que llena todo el encuadre de borde a borde, sin marco alrededor, sin muro y sin fondo.',
}

/** Superficies que se repiten en mosaico (el fondo, el mapa y la puerta se mapean enteros). */
const EN_MOSAICO = new Set<SuperficieTextura>(['piso', 'muro', 'techo'])

/** Reglas comunes a las tres superficies que se mapean en mosaico. */
const MOSAICO = [
  'Textura sin costuras (seamless), que se pueda repetir en mosaico sin que se noten los bordes.',
  'Sin perspectiva, sin profundidad, sin sombras proyectadas y con luz uniforme.',
  'El material llena todo el encuadre: sin objetos sueltos, sin muebles, sin personas y sin marco.',
].join(' ')

const SIN_TEXTO =
  'La imagen no debe contener ninguna letra, palabra, rótulo, número, logotipo ni marca de agua.'

/** Prompt de la textura. Con `conFoto` se le pide partir de la imagen adjunta. */
export function promptTextura(
  superficie: SuperficieTextura,
  descripcion: string,
  conFoto = false,
): string {
  const que = descripcion.trim()
  const base = conFoto
    ? [
        `Convierte la foto adjunta en una textura de ${NOMBRE[superficie]},`,
        'conservando su material, color y patrón; corrige la perspectiva, la iluminación y los reflejos.',
        que ? `Ajústala así: ${que}.` : '',
      ]
    : [`Textura de ${NOMBRE[superficie]}: ${que}.`]

  return [
    ...base,
    ENCUADRE[superficie],
    EN_MOSAICO.has(superficie) ? MOSAICO : '',
    SIN_TEXTO,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Genera la textura de una superficie y devuelve el Blob ya comprimido, listo
 * para guardarse como imagen de piso/muro/techo/fondo.
 */
export async function generarTextura(
  superficie: SuperficieTextura,
  descripcion: string,
  referencia?: Blob,
): Promise<Blob> {
  // El fondo se pinta a pantalla completa (y nace panorámico, sin recorte); el mapa
  // cubre todo el plano de una pieza; la puerta viste una hoja vertical; las demás se
  // repiten en mosaico —cuadradas—. Todas viven como Blob en IndexedDB.
  const grande = superficie === 'fondo' || superficie === 'mapa'
  const aspecto = superficie === 'fondo' ? '16:9' : superficie === 'puerta' ? '3:4' : '1:1'
  return generarImagen(
    promptTextura(superficie, descripcion, !!referencia),
    grande ? 1024 : 768,
    referencia,
    aspecto,
  )
}
