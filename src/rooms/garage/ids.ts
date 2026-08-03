/**
 * Identidad estable entre dispositivos (mismo patrón que `rooms/agenda/ids.ts`).
 *
 * El id autoincremental de Dexie es local: el 3 de este teléfono es otra fila en
 * la laptop. Como las rutinas que el garaje proyecta en el calendario guardan a
 * qué trámite pertenecen dentro de un string (`ambitoId`), ese string tiene que
 * ser el mismo en todos lados o el vínculo se rompería al sincronizar.
 */
export const nuevoId = (prefijo: 'tv' | 'tl') => `${prefijo}-${crypto.randomUUID()}`
