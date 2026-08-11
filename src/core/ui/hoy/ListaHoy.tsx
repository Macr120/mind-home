import { useEffect, useState } from 'react'
import type { Rutina } from '../../data/db'
import { usePasosHoy, type PasoHoy } from '../../hoy'
import { useT } from '../../i18n/useT'
import { sincronizarAgendaDeMeta, sincronizarMetasDeApp, useMetaDiaria } from '../../metaDiaria'
import { getPlantilla } from '../../registry'
import { hoyISO } from '../../rutinas'
import { Icono } from '../iconos/Icono'
import { EditorRutina, rutinaNueva } from '../RutinasPanel'
import { FilaHoy } from './FilaHoy'

/**
 * Los pasos de hoy de la app abierta, bajo el header de su cuarto: qué toca hacer
 * aquí y cuánto llevas. Sustituye a la vieja barra de meta diaria, que solo sabía
 * de un objetivo por app y no tenía nada que ver con las metas del cronograma.
 *
 * Nace PLEGADA, con el resumen del día en la misma altura que tenía la barra: la
 * app es lo que el usuario vino a ver, y una lista siempre abierta le comería la
 * pantalla. Lo urgente (llegó su hora y sigue pendiente) se asoma igualmente.
 *
 * Lo cumplido no se borra: baja a «Hechos», plegado. Ver el registro surtir efecto
 * es la mitad de la recompensa, y desde ahí se puede deshacer si se coló.
 */

const LS_ABIERTO = (plantillaId: string) => `mh.hoy.abierto.${plantillaId}`

export function ListaHoy({ plantillaId, color }: { plantillaId: string; color: string }) {
  const t = useT()
  const fecha = hoyISO()
  const pasos = usePasosHoy(plantillaId)
  const estadoMeta = useMetaDiaria(plantillaId)
  const [abierto, setAbierto] = useState(() => localStorage.getItem(LS_ABIERTO(plantillaId)) === '1')
  const [verHechos, setVerHechos] = useState(false)
  const [agendando, setAgendando] = useState<Rutina | null>(null)
  // «Ahora no» solo calla el asomo de la lista plegada, y solo en esta visita: el
  // paso sigue pendiente y a la vista al desplegar.
  const [callados, setCallados] = useState<string[]>([])

  const cumplida = estadoMeta?.cumplida
  // Lo agendado sigue al objetivo principal de la app: cumplirlo palomea su
  // ocurrencia de hoy en el calendario. Aquí, porque es donde el usuario registra.
  useEffect(() => {
    if (cumplida === undefined) return
    void sincronizarAgendaDeMeta(plantillaId, fecha, cumplida)
  }, [plantillaId, fecha, cumplida])

  // Y el camino de vuelta: lo hecho hoy empuja las metas de ritmo de esta app.
  // La cuenta de pasos cumplidos es la señal — cambia justo cuando hay algo nuevo.
  const cumplidos = pasos?.filter((p) => p.hecho).length
  useEffect(() => {
    if (cumplidos === undefined) return
    void sincronizarMetasDeApp(plantillaId, fecha)
  }, [plantillaId, fecha, cumplidos])

  const alternar = () => {
    setAbierto((a) => {
      localStorage.setItem(LS_ABIERTO(plantillaId), a ? '0' : '1')
      return !a
    })
  }

  const agendar = (paso: PasoHoy) => {
    const p = getPlantilla(plantillaId)
    setAgendando(
      rutinaNueva({
        plantillaId,
        nombre: paso.titulo,
        emoji: p?.icon ?? '⏰',
        color: p?.color,
        seccion: paso.seccion,
      }),
    )
  }

  if (!pasos || pasos.length === 0) return null

  // Un objetivo apagado no cuenta en ninguno de los dos lados: se pinta al final
  // solo para poder volver a ponerle una cifra.
  const cuentan = pasos.filter((p) => !p.apagado)
  const apagados = pasos.filter((p) => p.apagado)
  const pendientes = cuentan.filter((p) => !p.hecho)
  const hechos = cuentan.filter((p) => p.hecho)
  const frac = cuentan.length > 0 ? hechos.length / cuentan.length : 0
  // Plegada, lo urgente se asoma igual: para eso avisa.
  const asomados = abierto ? [] : pendientes.filter((p) => p.urgente && !callados.includes(p.id))

  return (
    <>
      <div className="border-b border-white/10">
        <button
          type="button"
          data-tut="hoy.cabecera"
          onClick={alternar}
          className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/5"
        >
          <span className="shrink-0 text-xs font-semibold text-white/70">
            {t('hoy.titulo', 'Hoy')} · {hechos.length}/{cuentan.length}
          </span>
          <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10 sm:w-40">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(frac * 100)}%`, background: color }}
            />
          </div>
          <span className="min-w-0 truncate text-xs text-white/45">
            {pendientes.length === 0
              ? t('hoy.alDia', 'Todo hecho por hoy')
              : (pendientes[0].detalle ?? pendientes[0].titulo)}
          </span>
          <span
            className={`ml-auto shrink-0 text-xs text-white/40 transition-transform ${abierto ? 'rotate-90' : ''}`}
          >
            <Icono nombre="siguiente" />
          </span>
        </button>

        {(abierto || asomados.length > 0) && (
          <div data-tut="hoy.lista" className="space-y-0.5 px-2 pb-2">
            {(abierto ? pendientes : asomados).map((p) => (
              <FilaHoy
                key={p.id}
                paso={p}
                plantillaId={plantillaId}
                fecha={fecha}
                color={color}
                onAgendar={agendar}
                onDescartar={(x) => setCallados((c) => [...c, x.id])}
              />
            ))}

            {abierto && pendientes.length === 0 && cuentan.length > 0 && (
              <p className="px-2 py-1.5 text-xs text-white/40">{t('hoy.alDia', 'Todo hecho por hoy')}</p>
            )}

            {/* Apagados: sin cifra que cumplir, pero con su campo para reactivarlos. */}
            {abierto &&
              apagados.map((p) => (
                <div key={p.id} className="opacity-50">
                  <FilaHoy paso={p} plantillaId={plantillaId} fecha={fecha} color={color} />
                </div>
              ))}

            {abierto && hechos.length > 0 && (
              <>
                <button
                  type="button"
                  data-tut="hoy.hechos"
                  onClick={() => setVerHechos((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] text-white/40 transition hover:text-white/70"
                >
                  <span className={`transition-transform ${verHechos ? 'rotate-90' : ''}`}>
                    <Icono nombre="siguiente" />
                  </span>
                  {t('hoy.hechos', 'Hechos ({n})', { n: hechos.length })}
                </button>
                {verHechos &&
                  hechos.map((p) => (
                    <FilaHoy
                      key={p.id}
                      paso={p}
                      plantillaId={plantillaId}
                      fecha={fecha}
                      color={color}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Mismo editor que el calendario: agendar desde la app crea la misma fila. */}
      {agendando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel-glass ui-pop max-h-[85vh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md">
            <EditorRutina rutina={agendando} onCerrar={() => setAgendando(null)} />
          </div>
        </div>
      )}
    </>
  )
}
