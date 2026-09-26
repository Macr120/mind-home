/**
 * Las últimas `max` entradas de una conversación, pero con el principio
 * avanzando a SALTOS de `max / 2` en vez de uno por turno. Con una ventana que
 * se desliza, el primer mensaje cambia en cada turno y el caché de prompts del
 * hilo nunca se relee (se paga la escritura, 1.25×, cada vez); así el prefijo
 * se mantiene idéntico varios turnos seguidos. Empieza en un turno del usuario,
 * como exige la API.
 */
export function ventanaEstable<T extends { rol: string }>(lista: T[], max: number): T[] {
  if (lista.length <= max) return lista
  const paso = Math.max(1, Math.floor(max / 2))
  let ini = Math.floor((lista.length - paso) / paso) * paso
  while (ini < lista.length - 1 && lista[ini].rol !== 'usuario') ini++
  return lista.slice(ini)
}
