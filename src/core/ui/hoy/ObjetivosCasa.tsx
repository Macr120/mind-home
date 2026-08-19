import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { esDeMeta, repartirPasos, usePasosDeTodas, type PasoHoy, type PasosDeApp } from '../../hoy'
import { useOtorgarListasCompletas } from '../../gamificacion/listas'
import { useT } from '../../i18n/useT'
import { abrirApp } from '../../abrirApp'
import { abrirEnlace } from '../../enlaceApp'
import { useRutinasUI } from '../../state/rutinasUiStore'
import { Icono } from '../iconos/Icono'
import { vivo } from '../estilos'
import { EditorRutina, rutinaNueva } from '../RutinasPanel'
import { AnadirObjetivo } from './AnadirObjetivo'
import { FilaHoy } from './FilaHoy'

/**
 * Las **Misiones de toda la casa**: la checklist del día de cada app, junta en
 * el reloj del HUD. Es la misma lista que cada cuarto enseña en su botón
 * Misiones (`ListaHoy`), pero sin tener que entrar cuarto por cuarto — el sitio
 * donde se ve «qué me queda hoy» de una sola mirada.
 *
 * Dos columnas: lo que falta y lo que ya está. Lo cumplido vivía en un plegable
 * y ahí no lo veía nadie; enfrente de lo pendiente es la mitad de la historia
 * del día, y en una jornada buena es la que da gusto mirar.
 *
 * Lo pendiente va además en dos bloques, como en el panel de cada cuarto: las
 * misiones del día y los pasos que sirven a una meta (`esDeMeta`). Dentro de cada
 * bloque manda la app, que es la unidad de esta vista.
 *
 * Aquí NO se registra: se va a la app. Estás fuera de todos los cuartos, así que
 * un botón de «registrar» escribiría a ciegas en uno que no tienes delante — la
 * fila lleva a su sección y el dato se apunta donde vive.
 *
 * Las metas, sus planes y el cronograma NO están aquí: son del cuarto «Metas».
 */

/** Un grupo con sus pasos ya repartidos entre lo que falta y lo que está. */
interface Columna {
  app: PasosDeApp['app']
  pendientes: PasoHoy[]
  hechos: PasoHoy[]
  completa: boolean
}

/** Las misiones personales no son de ninguna app: van con el color del calendario. */
const COLOR_PERSONAL = '#dc2626'

export function ObjetivosCasa({ fecha }: { fecha: string }) {
  const t = useT()
  const porApp = usePasosDeTodas(fecha)
  const [anadiendo, setAnadiendo] = useState(false)
  // El camino largo: la rutina con varios pasos, en el mismo editor del calendario.
  const [agendando, setAgendando] = useState<Rutina | null>(null)

  // Los apagados (objetivo en 0) se quedan fuera: aquí no se configuran cifras,
  // eso se hace en el panel de su propia app.
  const grupos: Columna[] = (porApp ?? []).map((g) => {
    const r = repartirPasos(g.pasos)
    return { app: g.app, pendientes: r.pendientes, hechos: r.hechos, completa: r.completa }
  })
  // Completar desde aquí también otorga el XP (sin el grupo personal, que no es
  // de ninguna app); un día pasado otorga sin celebrar y uno futuro no otorga.
  useOtorgarListasCompletas(
    grupos.filter((g) => g.app && g.completa).map((g) => g.app!.id),
    fecha,
  )
  const conHechos = grupos.filter((g) => g.hechos.length > 0)
  // Lo pendiente se parte en dos bloques —lo de cada día y lo que sirve a una
  // meta—, cada uno con sus tarjetas por app; una app con las dos clases sale en
  // los dos. Los rótulos solo se pintan si hay de todo: con una sola clase no hay
  // nada que separar y la columna ya se llama «Misiones». Lo cumplido no se parte:
  // es un archivo, y ahí lo que importa es el día entero.
  const delDia = grupos.map((g) => ({ ...g, pasos: g.pendientes.filter((p) => !esDeMeta(p)) }))
  const deMetas = grupos.map((g) => ({ ...g, pasos: g.pendientes.filter(esDeMeta) }))
  const bloques = [
    { titulo: t('hoy.grupoApp', 'Misiones del día'), icono: 'lista' as const, grupos: delDia },
    { titulo: t('hoy.grupoMetas', 'Pasos de tus metas'), icono: 'objetivo' as const, grupos: deMetas },
  ]
    .map((b) => ({ ...b, grupos: b.grupos.filter((g) => g.pasos.length > 0) }))
    .filter((b) => b.grupos.length > 0)
  const conPendientes = grupos.filter((g) => g.pendientes.length > 0)
  const totalPendientes = grupos.reduce((n, g) => n + g.pendientes.length, 0)
  const totalHechos = grupos.reduce((n, g) => n + g.hechos.length, 0)
  const totalCuentan = totalPendientes + totalHechos

  /** El cuarto se abre DEBAJO del calendario: hay que cerrarlo antes. */
  const irALaApp = (id: string) => {
    useRutinasUI.getState().cerrarCalendario()
    abrirApp(id)
  }

  /**
   * La fila lleva a SU sección. `abrirEnlace` es el mismo camino que ya usan los
   * chips de app de una meta (cerrar el calendario + abrir el cuarto con la
   * intención), así que no se inventa navegación nueva.
   */
  const irAlPaso = (appId: string) => (paso: PasoHoy) => {
    abrirEnlace({ plantillaId: appId, seccion: paso.seccion })
  }

  /**
   * La tarjeta de un grupo dentro de una columna. Sin `app` es el grupo de los
   * objetivos personales: no hay cuarto al que ir, así que su cabecera no es un
   * botón y sus filas conservan la palomita (se cumplen a mano, que es la única
   * forma que tienen de cumplirse).
   */
  const tarjeta = (app: Columna['app'], pasos: PasoHoy[], apagada = false) => {
    const color = app?.color ?? COLOR_PERSONAL
    const titulo = app
      ? t(`room.${app.id}.nombre`, app.nombre).split(' · ')[0]
      : t('hoy.casa.personales', 'Personales')
    return (
      <div
        key={app?.id ?? '__personales__'}
        className={`rounded-xl border p-2 ${
          apagada ? 'border-white/5 bg-white/[0.02]' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <button
          type="button"
          onClick={() => app && irALaApp(app.id)}
          disabled={!app}
          title={app ? t('hoy.casa.abrirApp', 'Abrir esta app') : undefined}
          className={`mb-1 flex w-full items-center gap-1.5 px-1 text-start disabled:cursor-default ${
            apagada ? 'opacity-70' : ''
          }`}
        >
          <span className="texto-vivo text-[11px] font-bold uppercase tracking-wider" style={vivo(color)}>
            <Icono emoji={app?.icon ?? '🎯'} /> {titulo}
          </span>
          <span className="text-[10px] tabular-nums text-white/30">{pasos.length}</span>
        </button>
        {pasos.map((p) => (
          <FilaHoy
            key={p.id}
            paso={p}
            plantillaId={app?.id ?? ''}
            fecha={fecha}
            color={color}
            onIr={app ? irAlPaso(app.id) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div data-tut="cal.objetivos" className="min-h-0 flex-1 overflow-y-auto p-3">
      {/* `items-start` para que una columna corta no se estire al alto de la otra;
          en móvil se apilan (Objetivos primero, que es lo que hay que hacer). */}
      <div className="mx-auto grid max-w-5xl items-start gap-3 md:grid-cols-2">
        {/* ── Lo que falta ─────────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              {t('hoy.titulo', 'Misiones')}
            </p>
            {totalCuentan > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/60">
                {totalPendientes}
              </span>
            )}
            <button
              type="button"
              onClick={() => setAnadiendo(true)}
              className="ms-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
            >
              <Icono nombre="agregar" /> {t('cal.objetivo.nuevo', 'Misión')}
            </button>
          </div>

          {bloques.map((b) => (
            <div key={b.titulo} className="space-y-2">
              {bloques.length > 1 && (
                <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-white/45">
                  <Icono nombre={b.icono} /> {b.titulo}
                </p>
              )}
              {b.grupos.map((g) => tarjeta(g.app, g.pasos))}
            </div>
          ))}

          {porApp && conPendientes.length === 0 && (
            <p className="py-6 text-center text-xs text-white/30">
              {totalCuentan === 0
                ? t('hoy.casa.vacio', 'Hoy no hay nada pendiente en ninguna app.')
                : t('hoy.alDia', 'Todo hecho por hoy')}
            </p>
          )}
        </section>

        {/* ── Lo que ya está ───────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              {t('cal.logros', 'Logros')}
            </p>
            {totalHechos > 0 && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-300">
                {totalHechos}
              </span>
            )}
          </div>

          {conHechos.map((g) => tarjeta(g.app, g.hechos, true))}

          {porApp && conHechos.length === 0 && (
            <p className="py-6 text-center text-xs text-white/30">
              {t('cal.logros.vacio', 'Todavía no has cumplido nada hoy.')}
            </p>
          )}
        </section>
      </div>

      {/* Sin app dada: la hoja pregunta primero de cuál es el objetivo. La
          checklist tampoco fija app: en el editor se elige (o ninguna, que es
          una misión personal) y el título lo pone el usuario. */}
      {anadiendo && (
        <AnadirObjetivo
          onCerrar={() => setAnadiendo(false)}
          onNuevaChecklist={() => {
            setAnadiendo(false)
            setAgendando(rutinaNueva())
          }}
        />
      )}

      {/* Mismo editor que el calendario: lo creado aquí es una misión más. */}
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
