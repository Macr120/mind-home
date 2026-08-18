import { useEffect, useState } from 'react'
import type { Rutina } from '../../data/db'
import { repartirPasos, usePasosHoy, type PasoHoy } from '../../hoy'
import { useOtorgarListasCompletas } from '../../gamificacion/listas'
import { useT } from '../../i18n/useT'
import { sincronizarAgendaDeMeta, sincronizarMetasDeApp, useMetaDiaria } from '../../metaDiaria'
import { getPlantilla } from '../../registry'
import { hoyISO } from '../../rutinas'
import { useAjustes } from '../../state/ajustesStore'
import { useAsistentes } from '../../state/asistentesStore'
import { useMascota } from '../../state/mascotaStore'
import { asistenteResponsable } from '../../gamificacion/asistentesPlantilla'
import { nombreAsistente } from '../../chat/mascotas'
import { Icono } from '../iconos/Icono'
import { EditorRutina, rutinaNueva } from '../RutinasPanel'
import { AnadirObjetivo } from './AnadirObjetivo'
import { FilaHoy } from './FilaHoy'
import { MetasDeApp } from './MetasDeApp'

/**
 * Las **Misiones** de la app abierta, desde su header: la checklist del día —
 * sus misiones, lo agendado y los pasos de sus metas, agrupados por el plan o
 * la meta del que salen (`deQuien`). El botón lleva la cuenta del día, y se pone
 * ámbar si un paso ya pasó de su hora.
 *
 * Aquí NO se planea nada: las metas, sus planes y el cronograma viven en el
 * cuarto «Metas» (`rooms/metas`), que los ve todos juntos. Este panel es solo lo
 * que toca hacer hoy en ESTA app.
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
  const [verHechos, setVerHechos] = useState(false)
  const [agendando, setAgendando] = useState<Rutina | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)
  const asistentes = useAsistentes((s) => s.lista)
  const activoId = useMascota((s) => s.mascota)

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
    setAnadiendo(false)
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

  // Una misión apagada no cuenta en ninguno de los dos lados: se pinta al final
  // solo para poder volver a ponerle una cifra.
  const { cuentan, apagados, pendientes, hechos, completa } = repartirPasos(pasos ?? [])
  // La lista entera cumplida es lo que da el XP; el otorgamiento es idempotente.
  useOtorgarListasCompletas(completa ? [plantillaId] : undefined, fecha)
  const urgente = pendientes.some((p) => p.urgente)
  const grupos = agrupar(pendientes, t('hoy.grupoApp', 'Misiones del día'))
  const nombreApp = t(`room.${plantillaId}.nombre`, getPlantilla(plantillaId)?.nombre ?? '').split(' · ')[0]

  // Quién se encarga de esta app: siempre uno de los asistentes de la casa. Es el
  // mismo que da los avisos de aquí (`asistenteDeApp` en core/avisos.ts).
  const asistente = asistenteResponsable(asistentes, plantillaId, activoId)

  return (
    <div data-tut="room.meta" data-tut-zona="hoy" className={`relative shrink-0 ${className}`}>
      {/* El mismo botón rojo que abre las Misiones en el calendario, aquí acotado
          a esta app; el ámbar avisa de un paso de hoy que ya pasó de su hora y
          sigue pendiente. */}
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
        {t('hoy.titulo', 'Misiones')}
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
              {/* El título va a la DERECHA: el header flotante de la casa (☰ + MPH)
                  se dibuja encima de esta esquina izquierda y lo tapaba. Con él va
                  el asistente responsable: quien te lo va a recordar. */}
              {asistente && (
                <span
                  title={t('objetivos.responsable', '{quien} te recuerda lo de aquí', {
                    quien: nombreAsistente(t, asistente),
                  })}
                  className="ms-auto grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm"
                >
                  <Icono emoji={asistente.emoji} />
                </span>
              )}
              <h2 className={`min-w-0 truncate text-sm font-bold ${asistente ? '' : 'ms-auto'}`}>
                {nombreApp}
                <span className="text-white/40"> · {t('hoy.grupoApp', 'Misiones del día')}</span>
                {cuentan.length > 0 && (
                  <span className="ms-1.5 tabular-nums font-normal text-white/40">
                    {hechos.length}/{cuentan.length}
                  </span>
                )}
              </h2>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                title={t('hoy.cerrar', 'Cerrar')}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>

            {/* El pulso del día de un vistazo, antes de leer fila por fila. */}
            {cuentan.length > 0 && (
              <div className="h-1 w-full shrink-0 overflow-hidden bg-white/10">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.round((hechos.length / cuentan.length) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {/* Arriba lo que te propusiste, abajo lo que toca hoy. */}
              <MetasDeApp plantillaId={plantillaId} color={color} />

              <div data-tut="hoy.lista" className="space-y-0.5">
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

                {/* Sin misiones, la respuesta honesta: nadie se propuso nada aquí
                    todavía. Antes salía un «Registra algo hoy» que el núcleo se
                    inventaba y que el usuario no había puesto. */}
                {cuentan.length === 0 && apagados.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-white/35">
                    {t('hoy.nada', 'Aún no te has propuesto nada en esta app.')}
                  </p>
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
                        <FilaHoy key={p.id} paso={p} plantillaId={plantillaId} fecha={fecha} color={color} />
                      ))}
                  </>
                )}

                <div className="flex items-center gap-1.5 pt-1">
                  {/* Proponerse algo = elegirlo de lo que ofrece el asistente y
                      marcar los días. La checklist de varios pasos vive dentro. */}
                  <button
                    type="button"
                    data-tut="hoy.anadir"
                    onClick={() => setAnadiendo(true)}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icono nombre="agregar" />
                    {t('objetivos.anadir', 'Añadir misión')}
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
            </div>
          </div>
        </div>
      )}

      {anadiendo && (
        <AnadirObjetivo
          plantillaId={plantillaId}
          color={color}
          onCerrar={() => setAnadiendo(false)}
          onNuevaChecklist={nuevaChecklist}
        />
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
