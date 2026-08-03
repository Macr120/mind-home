/** Utilidades de hora 'HH:mm'. La agenda las usa para calcular fines de bloque. */

const aMin = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const aHora = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Suma minutos a una hora, dando la vuelta a medianoche. */
export const sumarMin = (hora: string, min: number) => aHora(aMin(hora) + min)

/** Ordena horas 'HH:mm' de menor a mayor. */
export const ordenarHoras = (horas: string[]) => [...horas].sort((a, b) => aMin(a) - aMin(b))
