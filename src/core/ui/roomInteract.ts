/** Verbo de interacción sobre el mueble principal de cada cuarto. */
export const ACCION_CUARTO: Record<string, string> = {
  cocina: 'Cocinar',
  ejercicio: 'Entrenar',
  recamara: 'Descansar',
  despacho: 'Finanzas',
  biblioteca: 'Estudiar',
  entretenimiento: 'Entretenerse',
  sala: 'Planear viaje',
  jardin: 'Meditar',
  garage: 'Mantenimiento',
  diario: 'Leer noticias',
  configuraciones: 'Configurar',
  diseno: 'Personalizar',
}

export function accionCuarto(roomId: string): string {
  return ACCION_CUARTO[roomId] ?? 'Entrar'
}
