export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const dinero = (n: number) =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
