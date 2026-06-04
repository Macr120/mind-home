export const hoyISO = () => new Date().toISOString().slice(0, 10)

export function formatearFecha(fecha: string) {
  const hoy = hoyISO()
  if (fecha === hoy) return 'Hoy'
  const ayer = new Date(`${hoy}T12:00:00`)
  ayer.setDate(ayer.getDate() - 1)
  const ayerISO = ayer.toISOString().slice(0, 10)
  if (fecha === ayerISO) return 'Ayer'
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function etiquetaGrupoFecha(fecha: string) {
  return formatearFecha(fecha)
}
