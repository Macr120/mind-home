/** Verbo de interacción sobre el mueble principal de cada cuarto. */
const ACCION_CUARTO: Record<string, string> = {
  cocina: 'Cocinar',
  ejercicio: 'Entrenar',
  recamara: 'Descansar',
  descanso: 'Descansar',
  anecdotario: 'Escribir',
  despacho: 'Finanzas',
  biblioteca: 'Estudiar',
  entretenimiento: 'Entretenerse',
  sala: 'Explorar el mundo',
  jardin: 'Meditar',
  garage: 'Mantenimiento',
  diario: 'Leer noticias',
  hobbies: 'Practicar',
}

export function accionCuarto(roomId: string): string {
  return ACCION_CUARTO[roomId] ?? 'Entrar'
}
