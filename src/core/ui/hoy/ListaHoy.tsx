import { lazy, Suspense, useEffect, useState } from 'react'
import type { Rutina } from '../../data/db'
import { usePasosHoy, type PasoHoy } from '../../hoy'
import { useT } from '../../i18n/useT'
import { sincronizarAgendaDeMeta, sincronizarMetasDeApp, useMetaDiaria } from '../../metaDiaria'
import { getPlantilla } from '../../registry'
import { hoyISO } from '../../rutinas'
import { useAjustes } from '../../state/ajustesStore'
import { Icono } from '../iconos/Icono'
import { EditorRutina, rutinaNueva } from '../RutinasPanel'
import { FilaHoy } from './FilaHoy'

// El planificador (y con él casi todo `ui/metas`, ~40 KB gz) solo hace falta al
// ABRIR el panel de Metas de la app: lazy para sacarlo del chunk de arranque.
const CronogramaApp = lazy(() =>
  import('../metas/CronogramaApp').then((m) => ({ default: m.CronogramaApp })),
)

/**
 * Las Metas de la app abierta, desde su header: el mismo botón rojo que el
 * calendario, pero acotado a esta app. Abre un panel a pantalla completa con
 * dos pisos:
 *
 * 1. «Hoy», plegable (nace abierta): la checklist del día — sus objetivos, lo
 *    agendado y los pasos de sus metas, agrupados por el plan o la meta del que
 *    salen (`deQuien`). El botón lleva la cuenta del día, y se pone ámbar si un
 *    paso ya pasó de su hora.
 * 2. El planificador Metas · Planes · Cronograma de la app (`CronogramaApp`),
 *    que antes vivía repetido dentro de las pestañas de cada app.
 *
 * Lo cumplido no se borra: baja a «Hechos», plegado. Ver el registro surtir
 * efecto es la mitad de la recompensa, y desde ahí se puede deshacer si se coló.
 */

/** Un plan, una meta o un bloque, con los pasos suyos que tocan hoy. */
interface Grupo {
  titulo: string
  pasos: PasoHoy[]
}

/**
 * Reparte los pasos por su procedencia SIN reordenarlos: `armarPasosHoy` ya los
 * dejó con lo urgente arriba y luego por hora, y cada grupo se coloca donde cae
 * su primer paso. Así un paso urgente sigue arrastrando a su grupo al principio.
 */
function agrupar(pasos: PasoHoy[], sinDueño: string): Grupo[] {
  const grupos: Grupo[] = []
  for (const p of pasos) {
    const titulo = p.deQuien ?? sinDueño
    const grupo = grupos.find((g) => g.titulo === titulo)
    if (grupo) grupo.pasos.push(p)
    else grupos.push({ titulo, pasos: [p] })
  }
  return grupos
}

export function ListaHoy({
  plantillaId,
  color,
  className = '',
}: {
  plantillaId: string
  color: string
  className?: string
}) {
  const t = useT()
  const fecha = hoyISO()
  const pasos = usePasosHoy(plantillaId)
  const estadoMeta = useMetaDiaria(plantillaId)
  const ajuste = useAjustes((s) => s.checklistApps[plantillaId])
  const setChecklistApp = useAjustes((s) => s.setChecklistApp)
  const [abierto, setAbierto] = useState(false)
  const [verHoy, setVerHoy] = useState(true)
  const [verHechos, setVerHechos] = useState(false)
  const [agendando, setAgendando] = useState<Rutina | null>(null)

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

  const nuevaChecklist = () => {
    const p = getPlantilla(plantillaId)
    // Sin hora y con `dias: []` (todos los días), que es lo que `rutinaNueva` ya
    // deja por defecto: una checklist diaria de esta app, no una alarma.
    setAgendando(rutinaNueva({ plantillaId, nombre: '', emoji: p?.icon ?? '✅', color: p?.color }))
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

  // Un objetivo apagado no cuenta en ninguno de los dos lados: se pinta al final
  // solo para poder volver a ponerle una cifra.
  const cuentan = (pasos ?? []).filter((p) => !p.apagado)
  const apagados = (pasos ?? []).filter((p) => p.apagado)
  const pendientes = cuentan.filter((p) => !p.hecho)
  const hechos = cuentan.filter((p) => p.hecho)
  const urgente = pendientes.some((p) => p.urgente)
  const grupos = agrupar(pendientes, t('hoy.grupoApp', 'Objetivos del día'))
  const nombreApp = t(`room.${plantillaId}.nombre`, getPlantilla(plantillaId)?.nombre ?? '').split(' · ')[0]

  return (
    <div data-tut="room.meta" data-tut-zona="hoy" className={`relative shrink-0 ${className}`}>
      {/* El mismo botón rojo que abre las Metas en el calendario; el ámbar avisa
          de un paso de hoy que ya pasó de su hora y sigue pendiente. */}
      <button
        type="button"
        data-tut="hoy.cabecera"
        onClick={() => setAbierto(true)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
          urgente
            ? 'ui-pop border-amber-400/40 bg-amber-400/10 text-amber-200'
            : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
        }`}
      >
        {t('cal.metas', 'Metas')}
        {cuentan.length > 0 && (
          <span className="tabular-nums opacity-70">
            {hechos.length}/{cuentan.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex bg-black/60" onClick={() => setAbierto(false)}>
          <div
            className="ui-panel-glass ui-pop flex h-full w-full flex-col overflow-hidden backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
              <h2 className="min-w-0 truncate text-sm font-bold">
                {nombreApp}
                <span className="text-white/40"> · {t('cal.metas', 'Metas')}</span>
              </h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                title={t('hoy.cerrar', 'Cerrar')}
                className="ms-auto shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>

            {/* Piso 1: la checklist de hoy, plegable y abierta de fábrica. */}
            <div className="border-b border-white/10 px-3 py-2">
              <button
                type="button"
                onClick={() => setVerHoy((v) => !v)}
                className="flex w-full items-center gap-1.5 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35 transition hover:text-white/60"
              >
                <span className={`transition-transform ${verHoy ? 'rotate-90' : ''}`}>
                  <Icono nombre="siguiente" />
                </span>
                {t('hoy.titulo', 'Hoy')}
                {cuentan.length > 0 && (
                  <span className="tabular-nums normal-case tracking-normal">
                    · {hechos.length}/{cuentan.length}
                  </span>
                )}
              </button>

              {verHoy && (
                <div data-tut="hoy.lista" className="space-y-0.5 pt-1">
                  {grupos.map((g) => (
                    <div key={g.titulo}>
                      {/* Con un solo grupo el encabezado no dice nada que no se vea. */}
                      {grupos.length > 1 && (
                        <p className="truncate px-2 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                          {g.titulo}
                        </p>
                      )}
                      {g.pasos.map((p) => (
                        <FilaHoy
                          key={p.id}
                          // Con encabezado, el «de quién» de la fila lo repetiría.
                          paso={grupos.length > 1 ? { ...p, deQuien: undefined } : p}
                          plantillaId={plantillaId}
                          fecha={fecha}
                          color={color}
                          onAgendar={agendar}
                        />
                      ))}
                    </div>
                  ))}

                  {pendientes.length === 0 && cuentan.length > 0 && (
                    <p className="px-2 py-1.5 text-xs text-white/40">{t('hoy.alDia', 'Todo hecho por hoy')}</p>
                  )}

                  {/* Apagados: sin cifra que cumplir, pero con su campo para reactivarlos. */}
                  {apagados.map((p) => (
                    <div key={p.id} className="opacity-50">
                      <FilaHoy paso={p} plantillaId={plantillaId} fecha={fecha} color={color} />
                    </div>
                  ))}

                  {hechos.length > 0 && !ajuste?.ocultarHechos && (
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

                  <div className="flex items-center gap-1.5 pt-1">
                    {/* Una lista propia es una rutina diaria con pasos: mismo editor. */}
                    <button
                      type="button"
                      onClick={nuevaChecklist}
                      className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icono nombre="agregar" />
                      {t('hoy.nueva', 'Nueva checklist')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistApp(plantillaId, { ocultarHechos: !ajuste?.ocultarHechos })}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                        ajuste?.ocultarHechos
                          ? 'ui-accent-bg border-transparent'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px]">{ajuste?.ocultarHechos ? '✓' : '○'}</span>
                      {t('hoy.ocultarHechos', 'Ocultar terminados')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Piso 2: el planificador de la app (el mismo del calendario, acotado).
                Necesita este contenedor con altura: por dentro es flex-1 min-h-0. */}
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <Suspense fallback={null}>
                <CronogramaApp plantillaId={plantillaId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Mismo editor que el calendario: agendar desde la app crea la misma fila. */}
      {agendando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="ui-panel-glass ui-pop max-h-[85vh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-white/10 p-3 shadow-2xl backdrop-blur-md">
            <EditorRutina rutina={agendando} onCerrar={() => setAgendando(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
