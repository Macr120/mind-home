import type { ImagenEjercicio, TipoEntrenamiento } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { actividadId } from '../../core/rutinas'
import { HorarioActividad } from '../../core/ui/HorarioActividad'
import { Icono } from '../../core/ui/iconos/Icono'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'

/**
 * La tarjeta de una rutina del catálogo, con su horario. Es la misma en Fuerza,
 * Resistencia y Flexibilidad: estaba calcada en las tres, y sus tres catálogos
 * (`RutinaFuerza`, `RutinaCardio`, `RutinaFlex`) comparten forma, así que lo único
 * que cambiaba entre ellas era el color.
 *
 * El 📅 de antes abría siete botones L–D que escribían en `planEjercicio`: sin
 * hora, sin aviso y sin forma de deshacerlo (la app tenía tres `add` y ningún
 * `remove`). Ahora ese sitio lo ocupa `HorarioActividad`, que escribe el bloque
 * real del calendario.
 */

/** Lo que las tres rutinas del catálogo tienen en común. */
export interface RutinaCatalogo {
  id?: number
  nombre: string
  duracionMin: number
  ejercicios?: string[]
  descripcion?: string
}

export function TarjetaRutina({
  rutina,
  tipo,
  acento,
  imgPorClave,
  onUsar,
  onBorrar,
  hechoHoy,
}: {
  rutina: RutinaCatalogo
  tipo: TipoEntrenamiento
  /** Lo único que cambia entre las tres pestañas. */
  acento: { boton: string; hoverBorde: string }
  imgPorClave: Map<string, ImagenEjercicio>
  onUsar: () => void
  onBorrar: () => void
  /** ¿Ya entrenaste esto hoy? Evita que «Registrar» duplique la sesión. */
  hechoHoy?: boolean
}) {
  const t = useT()
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">{rutina.nombre}</p>
          {rutina.descripcion && (
            <p className="text-xs text-white/45">
              {rutina.descripcion} · {rutina.duracionMin} min
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onBorrar}
          title={t('ejercicio.rutina.borrar', 'Borrar rutina')}
          className="shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold text-white/70 hover:bg-red-500/20 hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
        <button
          type="button"
          onClick={onUsar}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold texto-cta ${acento.boton}`}
        >
          {t('ejercicio.rutina.usar', 'Usar rutina')}
        </button>
      </div>

      {rutina.ejercicios && rutina.ejercicios.length > 0 && (
        <>
          <p className="mt-1.5 text-xs text-white/55">{rutina.ejercicios.join(', ')}</p>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {rutina.ejercicios.map((nombreEj) => (
              <MiniaturaEjercicio
                key={nombreEj}
                nombre={nombreEj}
                registro={imgPorClave.get(normalizarEjercicio(nombreEj))}
                hoverBorde={acento.hoverBorde}
                tamano="sm"
              />
            ))}
          </div>
        </>
      )}

      {/* Sin id no hay llave estable que ligar (rutina sembrada aún sin guardar). */}
      {rutina.id != null && (
        <div className="mt-2">
          <HorarioActividad
            actividad={{
              actividadId: actividadId(tipo, rutina.id),
              plantillaId: 'ejercicio',
              nombre: rutina.nombre,
              emoji: '💪',
              horaSugerida: '07:00',
              duracionMin: rutina.duracionMin,
              seccion: tipo,
              registroRapido: {
                esquemaId: 'sesion',
                valores: { tipo, titulo: rutina.nombre, duracionMin: rutina.duracionMin },
                etiqueta: t('ejercicio.registrarSesion', 'Registrar {n} min', {
                  n: rutina.duracionMin,
                }),
              },
            }}
            hechoHoy={hechoHoy}
          />
        </div>
      )}
    </div>
  )
}
