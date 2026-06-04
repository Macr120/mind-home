export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function inicioSemana(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  const dia = d.getDay()
  const ajuste = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + ajuste)
  return d.toISOString().slice(0, 10)
}

export function diasSemana(desdeLunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(desdeLunes, i))
}

export function nombreFecha(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
