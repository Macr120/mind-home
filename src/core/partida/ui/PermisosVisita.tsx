import { useMemo, useState } from 'react'
import { BotonPrimario, BotonSecundario, Modal } from '../../../rooms/_shared/ui'
import { appsAsignadas } from '../../bienvenida/bienvenidaStore'
import { useT } from '../../i18n/useT'
import { plantillasTodas } from '../../appContrato'
import { Icono } from '../../ui/iconos/Icono'

/**
 * Qué se abre de la casa antes de invitar a alguien.
 *
 * Solo se listan las apps que (a) declaran `visita` en su contrato —el defecto
 * es NO compartir, así que Finanzas, Agenda, Diario y Anecdotario no aparecen
 * nunca— y (b) están asignadas a un objeto de algún cuarto: ofrecer las 26
 * plantillas del catálogo para servir tres sería peor que no ofrecerlo.
 *
 * Todo empieza DESMARCADO: compartir es un acto, no un olvido. Lo que se marque
 * aquí es lo único que entra en el plano (`visita/plano.ts`) y lo único que el
 * invitado puede abrir (`RoomOverlay`).
 */
export function PermisosVisita({
  onCerrar,
  onConfirmar,
}: {
  onCerrar: () => void
  onConfirmar: (apps: string[]) => void
}) {
  const t = useT()
  const [marcadas, setMarcadas] = useState<string[]>([])

  const disponibles = useMemo(() => {
    const asignadas = appsAsignadas()
    return plantillasTodas().filter((p) => p.visita && asignadas.has(p.id))
  }, [])

  const alternar = (id: string) =>
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  return (
    <Modal titulo={t('visita.permisos.titulo', 'Qué verá tu invitado')} onCerrar={onCerrar}>
      <div className="space-y-3">
        <p className="text-[11px] leading-relaxed text-white/45">
          {t(
            'visita.permisos.intro',
            'Pasearán por tu MindHaOS. Las apps que marques se podrán abrir; el resto ni se lista. Nada de lo que no marques sale de este dispositivo.',
          )}
        </p>

        {disponibles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-white/35">
            {t('visita.permisos.ninguna', 'Todavía no tienes apps que se puedan compartir. Podrán pasear por la MindHaOS igual.')}
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-white/55">
              {t('visita.permisos.cuantas', '{n} apps disponibles hoy', { n: disponibles.length })}
            </p>
            {disponibles.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 transition hover:bg-white/10"
              >
                <input
                  type="checkbox"
                  checked={marcadas.includes(p.id)}
                  onChange={() => alternar(p.id)}
                  className="h-4 w-4 accent-accent"
                />
                <Icono emoji={p.icon} />
                <span className="min-w-0 flex-1 truncate text-sm">{t(`room.${p.id}.nombre`, p.nombre)}</span>
              </label>
            ))}
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
          <Icono nombre="candado" />
          <span>
            {t('visita.permisos.sinXp', 'Durante la visita tu invitado no gana experiencia ni progreso: lo que haga en su MindHaOS sigue esperándolo allí.')}
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <BotonSecundario onClick={onCerrar}>{t('visita.permisos.cancelar', 'Cancelar')}</BotonSecundario>
          <BotonPrimario onClick={() => onConfirmar(marcadas)}>
            <Icono nombre="casa" /> {t('visita.permisos.invitar', 'Invitar')}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}
