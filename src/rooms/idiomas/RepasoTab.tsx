import type { PerfilIdioma } from '../../core/data/db'
import { VACIO, tarjetasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { tarjetasVencidas } from './srs'
import { EjerciciosTab } from './EjerciciosTab'
import { hoyISO } from './stats'

/**
 * El repaso son los EJERCICIOS, y salen directamente de las tarjetas de los
 * temas del temario (ahí se crean, se ilustran y se clasifican). El modo de
 * flashcards desapareció: una carta que solo se le da la vuelta no dice si te
 * la sabes; responder, sí — y el SRS se programa igual.
 */
export function RepasoTab({ perfil, temaInicial, onTemaAplicado }: {
  perfil: PerfilIdioma
  /** Tema con el que se llega desde el temario (▶ practicar). */
  temaInicial: string | null
  onTemaAplicado: () => void
}) {
  const t = useT()
  const tarjetas = (tarjetasIdiomaRepo.useAll() ?? VACIO).filter((x) => x.idiomaId === perfil.id)

  return (
    <div className="space-y-3" data-tut="idiomas.repaso.panel">
      {/* Sin registro rápido a propósito: la meta la pone el SRS y se cumple cuando
          no quedan tarjetas vencidas. Un «repasé» de un toque no repasa ninguna
          carta: sería declararse estudiado sin estudiar. */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-white/50">
          {t('idiomas.rep.reservar', 'Tu rato de repaso')}
        </span>
        <HorarioActividad
          actividad={{
            actividadId: actividadId('idioma', perfil.id!),
            plantillaId: 'idiomas',
            nombre: t('idiomas.rep.bloque', 'Repasar {idioma}', { idioma: perfil.nombre }),
            emoji: '🌐',
            horaSugerida: '20:00',
            seccion: 'repaso',
          }}
          hechoHoy={tarjetasVencidas(tarjetas, hoyISO()).length === 0}
        />
      </div>

      <EjerciciosTab
        perfil={perfil}
        tarjetas={tarjetas}
        temaInicial={temaInicial}
        onTemaAplicado={onTemaAplicado}
      />
    </div>
  )
}
