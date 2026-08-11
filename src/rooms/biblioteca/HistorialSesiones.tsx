import type { EntradaBiblio, SesionEstudio } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { getPilar } from './constantes'
import { fmtMin } from './stats'

/**
 * Las sesiones de estudio archivadas por año › mes › semana, con los minutos de
 * cada carpeta en la insignia. Vive en Resumen y no en Estudio: esa pestaña es
 * para HACER (el temporizador), esta para VER.
 */
export function HistorialSesiones({
  sesiones,
  entradas,
}: {
  sesiones: SesionEstudio[]
  entradas: EntradaBiblio[]
}) {
  const t = useT()
  if (sesiones.length === 0) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4" data-tut="biblioteca.r.historial">
      <p className="mb-2 text-sm font-semibold">{t('biblioteca.est.historial', 'Sesiones recientes')}</p>
      <Archivador
        items={sesiones}
        fecha={(s) => s.fecha}
        clave={(s) => s.id ?? s.fecha}
        resumen={(xs) => fmtMin(xs.reduce((acc, s) => acc + s.minutos, 0))}
        vacio={t('biblioteca.est.sinSesiones', 'Aún no has estudiado con el temporizador.')}
      >
        {(s) => {
          const pilar = getPilar(s.pilarId)
          const entrada = s.entradaId != null ? entradas.find((e) => e.id === s.entradaId) : undefined
          return (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-white/80">
                <Icono emoji={pilar.icon} /> {pilar.titulo}
                {entrada && <span className="text-white/40"> · {entrada.titulo}</span>}
              </span>
              <span className="shrink-0 text-xs text-white/40">{fmtMin(s.minutos)}</span>
            </div>
          )
        }}
      </Archivador>
    </div>
  )
}
