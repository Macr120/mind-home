/**
 * Identidad estable entre dispositivos (mismo patrón que `nodosMapa.nodoId`).
 *
 * El id autoincremental de Dexie es local: el 3 de este teléfono es otra fila en
 * la laptop. Como las rutinas que la agenda proyecta en el calendario guardan a
 * quién pertenecen dentro de un string (`ambitoId`), ese string tiene que ser el
 * mismo en todos lados o el vínculo se rompería al sincronizar.
 */
export const nuevoId = (prefijo: 'ag' | 'ct' | 'md' | 'py' | 'ms' | 'cu' | 'cp') =>
  `${prefijo}-${crypto.randomUUID()}`
