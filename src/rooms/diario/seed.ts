import { db } from '../../core/data/db'
import { hoyISO } from './fecha'

function sumarDias(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Noticias de ejemplo si la central está vacía. */
export async function sembrarDiario() {
  const n = await db.noticias.count()
  if (n > 0) return

  const hoy = hoyISO()
  await db.noticias.bulkAdd([
    {
      fecha: hoy,
      categoria: 'tecnologia',
      titulo: 'Avances en modelos de lenguaje abiertos',
      resumen:
        'Nuevos modelos locales permiten ejecutar IA en dispositivos sin enviar datos a la nube.',
      fuente: 'Tech Review',
      leido: false,
      destacada: true,
      creadoEn: hoy,
    },
    {
      fecha: hoy,
      categoria: 'economia',
      titulo: 'Mercados reaccionan a datos de inflación',
      resumen: 'Los índices principales cerraron mixtos tras el reporte mensual.',
      fuente: 'Finanzas Hoy',
      leido: false,
      destacada: false,
      creadoEn: hoy,
    },
    {
      fecha: sumarDias(hoy, -1),
      categoria: 'ciencia',
      titulo: 'Telescopio registra exoplaneta en zona habitable',
      resumen: 'El hallazgo abre preguntas sobre atmósferas similares a la Tierra.',
      fuente: 'Ciencia Global',
      leido: true,
      destacada: false,
      creadoEn: hoy,
    },
    {
      fecha: sumarDias(hoy, -2),
      categoria: 'deportes',
      titulo: 'Final de liga define campeón en penales',
      resumen: 'Partido épico ante más de 80 mil espectadores en el estadio.',
      fuente: 'Deportes MX',
      leido: false,
      destacada: false,
      creadoEn: hoy,
    },
  ])
}
