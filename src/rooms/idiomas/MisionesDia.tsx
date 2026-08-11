import { useMemo } from 'react'
import { VACIO, partidasEjercicioRepo, repasosIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'
import { avanceMision, misionesDelDia } from './juego'
import { hoyISO } from './stats'

/**
 * Los tres retos del día. No tienen tabla: se derivan de la fecha y el idioma
 * (misma pareja = mismas misiones en todo dispositivo) y su avance se calcula
 * con las partidas de hoy más el agregado de repaso del día.
 */
export function MisionesDia({ idiomaId }: { idiomaId: number }) {
  const t = useT()
  const hoy = hoyISO()
  const partidas = partidasEjercicioRepo.useAll() ?? VACIO
  const repasos = repasosIdiomaRepo.useAll() ?? VACIO

  const { misiones, deHoy, repasoHoy } = useMemo(
    () => ({
      misiones: misionesDelDia(hoy, idiomaId),
      deHoy: partidas.filter((p) => p.idiomaId === idiomaId && p.fecha === hoy),
      repasoHoy: repasos.find((r) => r.idiomaId === idiomaId && r.fecha === hoy),
    }),
    [hoy, idiomaId, partidas, repasos],
  )

  const cumplidas = misiones.filter((m) => avanceMision(m, deHoy, repasoHoy) >= m.objetivo).length

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
        <Icono nombre="objetivo" />
        <span className="flex-1">{t('idiomas.mis.titulo', 'Retos de hoy')}</span>
        <span className="text-white/35">
          {cumplidas}/{misiones.length}
        </span>
      </p>

      <div className="grid gap-1.5 sm:grid-cols-3">
        {misiones.map((m) => {
          const hecho = Math.min(m.objetivo, avanceMision(m, deHoy, repasoHoy))
          const lista = hecho >= m.objetivo
          return (
            <div
              key={m.id}
              className="rounded-xl border px-2.5 py-2"
              style={{
                borderColor: lista ? `${COLOR}66` : 'rgb(255 255 255 / 0.1)',
                background: lista ? `${COLOR}18` : undefined,
              }}
            >
              <p className="flex items-start gap-1 text-[11px] leading-snug text-white/80">
                {lista && (
                  <span className="shrink-0" style={{ color: COLOR }}>
                    <Icono nombre="confirmar" />
                  </span>
                )}
                <span className="min-w-0">{t(`idiomas.mis.${m.id}`, m.es)}</span>
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(hecho / m.objetivo) * 100}%`, background: COLOR }}
                />
              </div>
              <p className="mt-0.5 text-right text-[9px] text-white/35">
                {hecho}/{m.objetivo}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
