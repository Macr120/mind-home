export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function añoDe(fecha: string) {
  return fecha.slice(0, 4)
}

export function formatearFecha(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`)
  if (fecha.endsWith('-01-01') && fecha.length === 10) {
    return d.getFullYear().toString()
  }
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
