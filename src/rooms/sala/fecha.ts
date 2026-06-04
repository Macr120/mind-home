export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function diasEntre(inicio: string, fin: string) {
  const a = new Date(`${inicio}T12:00:00`)
  const b = new Date(`${fin}T12:00:00`)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

export function formatearRango(inicio: string, fin: string) {
  const fmt = (f: string) =>
    new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  if (inicio === fin) return fmt(inicio)
  return `${fmt(inicio)} – ${fmt(fin)}`
}

export function añoDe(fecha: string) {
  return fecha.slice(0, 4)
}

export const dinero = (n: number, moneda = 'MXN') =>
  n.toLocaleString('es-MX', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  })
