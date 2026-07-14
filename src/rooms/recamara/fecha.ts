export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function nombreDia(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "Lun 14" para etiquetas compactas de gráficas. */
export function diaCorto(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
  })
}
