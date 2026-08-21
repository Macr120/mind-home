import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import type { Cuarto } from '../data/db'
import { planesMetaRepo, rutinasRepo } from '../data/repository'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useCuartos } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { useAsignar } from '../state/asignarStore'
import { useAjustes } from '../state/ajustesStore'
import { objetosDe } from '../state/objetosPlantillaStore'
import { MiniaturaCuarto } from '../house/Miniatura'
import { getTema } from '../house/temas'
import { esMeta, metasCumplidasDe } from '../metas'
import { usePendientesPorApp } from '../hoy'
import { useProgreso, type ProgresoJugador, type ProgresoPlantilla } from '../gamificacion/actividad'
import { useSisifo, marcarSisifoVisto } from '../gamificacion/sisifo'
import { DIAS_META, RANGOS, SEMANAS, colorArcoiris, nombreRango } from '../gamificacion/sisifoData'
import { useSisifoUi } from '../state/sisifoUiStore'
import { AroSisifo } from './ProgresoPanel'
import { tituloSubtituloCuarto, useNombreCuarto } from './roomDisplay'
import { vivo } from './estilos'
import { Barra } from './Barra'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { usePreviewBlob } from './comun/usePreviewBlob'
import { useArrastreFilas } from './comun/arrastre'
import { IconoCuarto } from './IconoCuarto'
import { BadgeMisiones } from './BadgeMisiones'
import { PanelCuartoEditar } from './PanelCuartoEditar'
import { PanelCuartoFondo } from './PanelCuartoFondo'

/** Mismo orden que el menú lateral; aquí tampoco se pinta el rótulo de la categoría. */
const ORDEN: Cuarto['categoria'][] = ['cuerpo', 'mente', 'complemento', 'config']

/** Cómo se ve cada cuarto en la rejilla: su icono o su cuarto amueblado en 3D. */
const LS_VISTA_3D = 'mh.cuartos3D'

/** Una sola lista: la rejilla entera es el destino del arrastre. */
const LISTA = 'pantalla'

/**
 * El fondo de pantalla, como `background` de la propia rejilla y no como una capa
 * aparte: así la rejilla sigue en el flujo (es ella la que scrollea y la que da
 * altura al panel) y el fondo se queda quieto al deslizar, porque el fondo de un
 * elemento con scroll se ancla a su caja, no a su contenido.
 */
function useFondoPantalla(): CSSProperties | undefined {
  const id = useDiseño((s) => s.panelFondoId)
  const atenuacion = useDiseño((s) => s.panelFondoAtenuacion)
  const imagen = useDiseño((s) => s.fondosPanel.find((f) => f.id === id)?.imagen)
  const url = usePreviewBlob(imagen)
  if (!url) return undefined
  const velo =
    atenuacion > 0
      ? `linear-gradient(color-mix(in srgb, var(--ui-panel-solido, var(--ui-panel)) ${atenuacion * 100}%, transparent) 0 100%), `
      : ''
  return { background: `${velo}center / cover no-repeat url(${JSON.stringify(url)})` }
}

/**
 * El reto de Sísifo, en la misma fila del título: rango del año, insignias y
 * nivel general. Toca para abrir la montaña, igual que los aros del menú lateral.
 * Cada aro lleva su contador debajo (rango e insignias), como en la pestaña
 * Cuartos; el texto del medio se esconde en pantallas estrechas.
 */
function RetoSisifo({ progreso }: { progreso: ProgresoJugador | undefined }) {
  const t = useT()
  const sisifo = useSisifo()
  if (!sisifo) return null
  const rango = RANGOS[sisifo.rango - 1]
  const abrir = () => {
    void marcarSisifoVisto(sisifo.insignias)
    useSisifoUi.getState().abrir()
  }
  return (
    <div data-tut="inicio.reto" className="flex min-w-0 shrink items-center gap-1.5">
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <AroSisifo
          valor={sisifo.altura / DIAS_META}
          color={rango.color}
          icono="montaña"
          pequeno
          onClick={abrir}
          title={`${nombreRango(rango)} · ${t('sisifo.dia', 'Día')} ${sisifo.altura}/${DIAS_META}`}
        />
        <span className="text-[9px] font-semibold tabular-nums text-white/50">
          {sisifo.rango}/{RANGOS.length}
        </span>
      </div>
      <div className="hidden min-w-0 leading-tight md:block">
        <p className="truncate text-[11px] font-bold text-white/85">{nombreRango(rango)}</p>
        <p className="truncate text-[10px] text-white/45">
          {t('progreso.nivel', 'Nivel')} {progreso?.nivel ?? 1}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <AroSisifo
          valor={sisifo.insignias / SEMANAS}
          color={colorArcoiris(Math.max(1, sisifo.insignias))}
          icono="gema"
          pequeno
          onClick={abrir}
          title={`${sisifo.insignias}/${SEMANAS} ${t('sisifo.insignias', 'insignias')}`}
          ping={sisifo.hayNuevo}
        />
        <span className="text-[9px] font-semibold tabular-nums text-white/50">
          {sisifo.insignias}/{SEMANAS}
        </span>
      </div>
    </div>
  )
}

/**
 * Las cifras de una tarjeta: nivel y XP arriba, y debajo racha, listas cumplidas
 * y avance de metas. Con el fondo de pantalla puesto, el texto va sobre la
 * tarjeta opaca, no sobre la foto.
 */
function CifrasApp({
  enfoque,
  color,
  metas,
  planes,
}: {
  enfoque: ProgresoPlantilla | undefined
  color: string
  metas: number | null
  /** Planes aceptados; solo lo pasa el cuarto Metas, que es de quien son. */
  planes: number | null
}) {
  const t = useT()
  if (!enfoque) return null
  return (
    <div className="w-full space-y-1 border-t border-white/10 pt-1.5">
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-[9px] font-bold text-white/60">
          {t('progreso.nv', 'Nv')} {enfoque.nivel}
        </span>
        {/* La barra es lo único que encoge: el nivel y los XP siempre completos. */}
        <span className="flex min-w-3 flex-1 basis-3 items-center">
          <Barra valor={enfoque.avanceNivel} color={color} />
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-white/40">{enfoque.xp} XP</span>
      </div>
      {/* `flex-wrap`: con el 4º dato del planificador ya no caben en una línea a
          `md:grid-cols-5`, y solo esa tarjeta parte en dos. */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] tabular-nums text-white/45">
        <span title={t('progreso.rachaTitulo', 'Racha de días con actividad')}>
          <Icono nombre="racha" /> {enfoque.racha}
        </span>
        <span title={t('progreso.listasTitulo', 'Listas de misiones cumplidas')}>
          <Icono nombre="trofeo" /> {enfoque.listas}
        </span>
        {metas != null && (
          <span title={t('nav.rapido.metas', 'Metas cumplidas en esta app')}>
            <Icono nombre="objetivo" /> {metas}
          </span>
        )}
        {planes != null && (
          <span title={t('progreso.planesTitulo', 'Planes aceptados')}>
            <Icono nombre="lista" /> {planes}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Pantalla de inicio de la casa: la rejilla de cuartos con app, con la mecánica
 * de un teléfono. Un toque entra; una pulsación larga levanta la tarjeta, enciende
 * el modo edición (todas tiemblan) y permite reordenarlas o abrir su ficha.
 *
 * Cada tarjeta lleva el pulso de su app —nivel, XP, racha, listas y metas— y, si
 * quedan misiones para hoy, un contador rojo en la esquina, como las notificaciones
 * de un teléfono.
 *
 * También salen los cuartos vacíos, al final y con «+ Asignar»: tocarlos abre el
 * catálogo de apps para darles una sin pasar por el menú lateral.
 *
 * Va por portal al body porque `fixed` NO es la pantalla cuando algún ancestro tiene
 * `backdrop-filter` (la pastilla del HUD lo lleva).
 */
export function PanelCuartosRapido({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  // Solo se monta con el panel abierto, así que su escaneo no pesa en la casa.
  const progreso = useProgreso()
  const enfoques = progreso?.enfoques
  const openRoom = useHouse((s) => s.openRoom)
  const abrirAsignar = useAsignar((s) => s.abrir)
  const cuartos = useCuartos((s) => s.cuartos)
  const reordenarPanel = useCuartos((s) => s.reordenarPanel)
  const roomColors = useDiseño((s) => s.roomColors)
  const conAgua = useLayout((s) => s.conAgua)
  const nombreApp = useAjustes((s) => s.nombreApp)
  const nombreCuarto = useNombreCuarto()
  // Iconos vs. miniaturas 3D del cuarto amueblado (preferencia del dispositivo).
  const [vista3D, setVista3D] = useState(() => localStorage.getItem(LS_VISTA_3D) === '1')
  const [edicion, setEdicion] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [fondoAbierto, setFondoAbierto] = useState(false)
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  // Primera app por cuarto (estable al mover objetos), igual que en el menú lateral.
  const appPorCuarto = useDiseño(
    useShallow((s) => {
      const m: Record<string, string> = {}
      for (const o of s.objetos) if (o.plantillaId && !(o.roomId in m)) m[o.roomId] = o.plantillaId
      return m
    }),
  )

  const fondo = useFondoPantalla()
  const pendientes = usePendientesPorApp()
  // Una sola lectura de rutinas para las metas cumplidas de las 17.
  const rutinas = rutinasRepo.useAll()
  const metas = useMemo(() => (rutinas ?? []).filter(esMeta), [rutinas])
  // Los planes son del planificador, así que solo su tarjeta gana el chip.
  const planes = planesMetaRepo.useAll()
  const aceptados = useMemo(() => (planes ?? []).filter((p) => p.aceptadoEn).length, [planes])

  // Escape sale primero del modo edición y solo después cierra el panel. Con un
  // diálogo encima no hace nada: ese Escape es suyo (los dos escuchan a la vez).
  const conDialogo = editando != null || fondoAbierto
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || conDialogo) return
      if (edicion) setEdicion(false)
      else onCerrar()
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [onCerrar, edicion, conDialogo])

  // Base por categoría (como el menú lateral) y encima el puesto que el usuario
  // haya arrastrado; lo que nunca se movió se queda detrás en su sitio de siempre.
  // Los cuartos sin app se van al final: son un pendiente, no un sitio al que
  // entrar. Ese desempate va DESPUÉS del puesto arrastrado (el sort es estable),
  // así ninguno se cuela entre las apps; al recibir una, su `ordenPanel` lo
  // recoloca solo.
  //
  // La alberca vacía no entra: es agua, no una app pendiente de asignar. Con app
  // asignada sí sale, porque entonces hay algo a lo que entrar.
  const lista = cuartos
    .filter((c) => appPorCuarto[c.id] || !conAgua[c.id])
    .sort((a, b) => ORDEN.indexOf(a.categoria) - ORDEN.indexOf(b.categoria))
    .map((c, i) => ({ c, k: c.ordenPanel ?? cuartos.length + i }))
    .sort((a, b) => a.k - b.k)
    .map((p) => p.c)
    .sort((a, b) => Number(!appPorCuarto[a.id]) - Number(!appPorCuarto[b.id]))

  const arrastre = useArrastreFilas(
    lista,
    (c) => c.id,
    () => LISTA,
    (nuevas) => void reordenarPanel(nuevas.map((c) => c.id)),
    'x',
    // Levantar una tarjeta es lo que enciende el modo edición, como en un teléfono:
    // el mismo gesto sirve para moverla sin soltarla y volver a empezar.
    () => setEdicion(true),
  )

  const cuartoEditando = editando ? cuartos.find((c) => c.id === editando) : undefined

  return createPortal(
    <>
      <div
        // En el teléfono el panel se queda a dos dedos del borde: con `p-4` el hueco
        // era más estrecho que su propio contenido y se salía por la derecha.
        className="ui-scrim z-40 grid place-items-center p-2 holgado:p-4"
        onClick={() => (edicion ? setEdicion(false) : onCerrar())}
      >
        <div
          className="ui-panel ui-pop flex max-h-[85vh] w-full min-w-0 max-w-3xl flex-col rounded-2xl border border-white/10 p-2.5 shadow-2xl holgado:max-h-[80vh] holgado:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="mb-2 flex items-center gap-1.5 holgado:mb-3 holgado:gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white/90">
                <Icono nombre="casa" />{' '}
                <span className="sm:hidden">{nombreApp || t('app.brandCorto', 'MPH')}</span>
                <span className="hidden sm:inline">{nombreApp || t('app.brand', 'Planificador Mental-Casa')}</span>
              </p>
              {/* `truncate`: en móvil el bloque es estrecho y sin esto la ayuda se
                  partía en tres líneas y estiraba la cabecera. */}
              <p className="truncate text-[11px] text-white/45">
                {edicion
                  ? t('nav.rapido.editando', 'Arrastra para reordenar, o toca el lápiz para editar.')
                  : t('nav.rapido.ayuda', 'Toca un cuarto para abrir su app.')}
              </p>
            </div>

            <RetoSisifo progreso={progreso} />

            {edicion ? (
              <button
                type="button"
                onClick={() => setEdicion(false)}
                className="shrink-0 rounded-lg border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-bold text-white/90 transition hover:bg-white/25"
              >
                {t('nav.rapido.listo', 'Listo')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-tut="inicio.fondo"
                  onClick={() => setFondoAbierto(true)}
                  title={t('nav.fondo.titulo', 'Fondo de pantalla')}
                  aria-label={t('nav.fondo.titulo', 'Fondo de pantalla')}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-sm text-white/60 transition hover:bg-white/12"
                >
                  <Icono nombre="imagen" />
                </button>
                {lista.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = !vista3D
                      setVista3D(v)
                      localStorage.setItem(LS_VISTA_3D, v ? '1' : '0')
                    }}
                    title={
                      vista3D
                        ? t('nav.vistaIconos', 'Ver los cuartos con su icono')
                        : t('nav.vista3D', 'Ver los cuartos en 3D')
                    }
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm transition ${
                      vista3D
                        ? 'border-white/25 bg-white/15 text-white/90'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/12'
                    }`}
                  >
                    <Icono nombre={vista3D ? 'cuartos' : 'cubo-vistas'} />
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              data-tut="inicio.cerrar"
              onClick={onCerrar}
              title={t('rutinas.cerrar', 'Cerrar')}
              aria-label={t('rutinas.cerrar', 'Cerrar')}
              className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
            >
              <Icono nombre="cerrar" />
            </button>
          </header>

          {lista.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs leading-relaxed text-white/40">
              {t(
                'nav.rapido.sinCuartos',
                'Aún no hay cuartos. Créalos desde el editor de mapa.',
              )}
            </p>
          ) : (
            // El fondo va DETRÁS DE LAS APPS, no de la ventana entera: sobre la
            // cabecera dejaba el título y los botones ilegibles.
            <ul
              data-tut="inicio.rejilla"
              className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto rounded-xl p-1.5 sm:grid-cols-4 holgado:gap-2 holgado:p-2 md:grid-cols-5"
              style={fondo}
            >
              {lista.map((cuarto, i) => {
                const color = roomColors[cuarto.id] ?? cuarto.color
                const { titulo } = tituloSubtituloCuarto(cuarto, nombreCuarto(cuarto), t)
                const appId: string | undefined = appPorCuarto[cuarto.id]
                const props = arrastre.fila(cuarto)
                const enfoque = appId ? enfoques?.find((e) => e.plantillaId === appId) : undefined
                const porHacer = appId ? pendientes.get(appId) : undefined
                return (
                  <li key={cuarto.id} {...props} className={`relative ${props.className}`}>
                    <button
                      type="button"
                      // En modo edición un toque ya no entra: se estaría entrando a la
                      // app justo cuando se quiere ordenarla.
                      //
                      // El cuarto vacío abre el catálogo de apps. Se cierra el panel a
                      // propósito: el diálogo de asignar no va por portal y con el panel
                      // encima (mismo z, y este se monta después en el body) no se vería.
                      onClick={() => {
                        if (edicion) return
                        if (appId) openRoom(cuarto.id)
                        else abrirAsignar(cuarto.id)
                        onCerrar()
                      }}
                      title={
                        appId
                          ? t('nav.entrarCuarto', 'Entrar a {nombre}', { nombre: titulo })
                          : t('nav.asignarApp', 'Asignar una app a este cuarto')
                      }
                      className={`ui-brillo flex h-full w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center holgado:gap-1.5 holgado:px-1.5 holgado:py-3 ${
                        edicion ? 'ui-tiembla' : ''
                      }`}
                      style={{
                        ...vivo(color),
                        borderColor: 'color-mix(in srgb, var(--ui-ink) 10%, transparent)',
                        // Opaca a propósito: con foto de fondo, una tarjeta translúcida
                        // deja el nombre y las cifras ilegibles. Pero el fondo NO va en
                        // línea: así ganaba al `:hover` de `.ui-brillo` y la dejaba muerta.
                        // Aquí solo se dice SOBRE QUÉ mezcla la clase y cuánto en reposo.
                        '--brillo-fondo': 'var(--ui-panel-solido, var(--ui-panel))',
                        '--brillo': '12%',
                        // Desfase por tarjeta: si tiemblan al unísono parece un fallo.
                        animationDelay: edicion ? `${(i % 5) * -60}ms` : undefined,
                      } as CSSProperties}
                    >
                      <span
                        className={`flex items-center justify-center overflow-hidden rounded-xl text-xl holgado:text-2xl ${
                          vista3D && appId ? 'h-12 w-12 holgado:h-16 holgado:w-16' : 'h-9 w-9 holgado:h-12 holgado:w-12'
                        }`}
                        style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}
                      >
                        {/* En 3D, el cuarto amueblado que arma la app: PNG cacheado por el
                            generador de miniaturas (un canvas por tarjeta agotaría los
                            contextos WebGL del navegador). */}
                        {vista3D && appId ? (
                          <MiniaturaCuarto
                            siembra={objetosDe(appId)}
                            color={color}
                            tema={tema}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <IconoCuarto cuarto={cuarto} />
                        )}
                      </span>
                      <span className="w-full truncate text-[11px] font-semibold text-white/90 holgado:text-xs">{titulo}</span>
                      {appId ? (
                        <CifrasApp
                          enfoque={enfoque}
                          color={color}
                          metas={metasCumplidasDe(metas, appId)}
                          planes={appId === 'metas' ? aceptados : null}
                        />
                      ) : (
                        <span className="w-full truncate text-[11px] font-bold" style={{ color }}>
                          {t('nav.asignar', '+ Asignar')}
                        </span>
                      )}
                    </button>

                    {/* En modo edición el lápiz ocupa esa esquina. */}
                    {!edicion && porHacer && (
                      <BadgeMisiones pendientes={porHacer} className="absolute -top-1.5 -end-1.5" />
                    )}

                    {edicion && (
                      <button
                        type="button"
                        onClick={() => setEditando(cuarto.id)}
                        title={t('nav.editar.titulo', 'Editar cuarto')}
                        aria-label={t('nav.editar.titulo', 'Editar cuarto')}
                        className="absolute -top-1 -end-1 grid h-6 w-6 place-items-center rounded-full border border-white/20 text-[11px] text-white/80 shadow-lg transition hover:brightness-125"
                        style={{ background: 'var(--ui-panel-solido, var(--ui-panel))' }}
                      >
                        <Icono nombre="editar" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {cuartoEditando && (
        <PanelCuartoEditar cuarto={cuartoEditando} onCerrar={() => setEditando(null)} />
      )}
      {fondoAbierto && <PanelCuartoFondo onCerrar={() => setFondoAbierto(false)} />}
    </>,
    document.body,
  )
}
