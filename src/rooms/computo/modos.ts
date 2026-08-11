import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Los modos de la calculadora: cada uno CAMBIA la vista entera, no se apila.
 *
 * Este archivo es solo datos a propósito. La tira de chips, `destinoInicial()`
 * de `ComputoApp` y los comandos del chat leen todos de aquí, y ninguno de esos
 * sitios puede arrastrar el motor (mathjs) al bundle de arranque.
 */

export type Modo = 'normal' | 'grafica' | 'bases' | 'matrices' | 'sistemas' | 'unidades' | 'propina' | 'regla3'

export const MODOS: { id: Modo; icono: NombreIcono; labelEs: string }[] = [
  { id: 'normal', icono: 'calculadora', labelEs: 'Normal' },
  // «grafica» era un menú plegable y su id ya viajaba como sección en enlaces,
  // rutinas y widgets guardados: al ser un modo con el MISMO id, todo aquello
  // sigue aterrizando donde debe. El FORMULARIO sigue siendo desplegable.
  { id: 'grafica', icono: 'funcion', labelEs: 'Gráfica' },
  { id: 'bases', icono: 'chip', labelEs: 'Bases' },
  { id: 'matrices', icono: 'rejilla', labelEs: 'Matrices' },
  { id: 'sistemas', icono: 'llaves', labelEs: 'Sistemas' },
  { id: 'unidades', icono: 'regla', labelEs: 'Unidades' },
  { id: 'propina', icono: 'moneda', labelEs: 'Propina' },
  { id: 'regla3', icono: 'comparar', labelEs: 'Regla de 3' },
]

const IDS = new Set<string>(MODOS.map((m) => m.id))

/** ¿Esta sección del chat nombra un modo? */
export const esModo = (s: string | undefined): s is Modo => s != null && IDS.has(s)
