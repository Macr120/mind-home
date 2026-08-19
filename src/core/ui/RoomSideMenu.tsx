import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Cuarto } from '../data/db'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { confirmar } from '../state/confirmarStore'
import { useAsignar } from '../state/asignarStore'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { tituloSubtituloCuarto, useNombreCuarto } from './roomDisplay'
import { TechoToggleButton, ExplotarToggleButton } from './TechoToggleButton'
import { ResumenJugador, ProgresoApp } from './ProgresoPanel'
import { PlantillasCatalogo } from './PlantillasCatalogo'
import { InfraestructuraCatalogo } from './InfraestructuraCatalogo'
import { ObjetosCatalogo } from './ObjetosCatalogo'
import { CATS_ESPECIALES } from './inventarioGrupos'
import { useProgreso } from '../gamificacion/actividad'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { vivo } from './estilos'
import type { NombreIcono } from './iconos/catalogo'
import { BotonTutoriales } from '../tutorial/SelectorTutorial'
import { useHud } from '../state/hudStore'
import { useConstruyendo } from '../state/construyendo'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'
import { useAjustes } from '../state/ajustesStore'
import { PanelCuartosRapido } from './PanelCuartosRapido'
import { IconoCuarto } from './IconoCuarto'
import { BadgeMisiones } from './BadgeMisiones'
import { planesMetaRepo, rutinasRepo } from '../data/repository'
import { usePendientesPorApp } from '../hoy'
import { esMeta, metasCumplidasDe } from '../metas'

/** Orden en que se listan los cuartos; el rótulo de cada categoría ya no se pinta. */
const CATEGORIAS: { key: Cuarto['categoria'] }[] = [
  { key: 'cuerpo' },
  { key: 'mente' },
  { key: 'complemento' },
  { key: 'config' },
]

export function RoomSideMenu({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  const openRoom = useHouse((s) => s.openRoom)
  const activeRoom = useHouse((s) => s.activeRoom)
  const modoUI = useAjustes((s) => s.modoUI)
  const nombreApp = useAjustes((s) => s.nombreApp)
  const setNombreApp = useAjustes((s) => s.setNombreApp)
  // El nombre de la casa se cambia en el sitio, desde su propio encabezado.
  const [editandoNombre, setEditandoNombre] = useState(false)
  const roomColors = useDiseño((s) => s.roomColors)
  const nombreCuarto = useNombreCuarto()
  // Primera app por cuarto (estable al mover objetos): el menú no depende de posiciones.
  const appPorCuarto = useDiseño(
    useShallow((s) => {
      const m: Record<string, string> = {}
      for (const o of s.objetos) if (o.plantillaId && !(o.roomId in m)) m[o.roomId] = o.plantillaId
      return m
    }),
  )
  const editRoom = useLayout((s) => s.editRoom)
  const setEditMode = useLayout((s) => s.setEditMode)
  const cuartos = useCuartos((s) => s.cuartos)
  const intercambiarOrden = useCuartos((s) => s.intercambiarOrden)
  const eliminarCuarto = useCuartos((s) => s.eliminar)
  const abrirAsignar = useAsignar((s) => s.abrir)
  // Cuarto con la fila de opciones desplegada (el engrane); solo una a la vez.
  const [ajustesCuarto, setAjustesCuarto] = useState<string | null>(null)
  const [menu, setMenu] = useState<'cuartos' | 'plantillas' | 'objetos'>('cuartos')
  // Inventario tiene dos sub-pestañas: Objetos (biblioteca) y Objetos especiales (vehículos).
  const [invSub, setInvSub] = useState<'objetos' | 'especiales'>('objetos')
  // Plantillas tiene dos sub-pestañas: de cuarto (apps) y de infraestructura (se construyen en el mapa).
  const [plantSub, setPlantSub] = useState<'cuartos' | 'infra'>('cuartos')
  const setInventarioObjetosActivo = useEditorUi((s) => s.setInventarioObjetosActivo)
  const progreso = useProgreso()
  // Una sola consulta para las dos cifras que faltaban en la lista de cuartos:
  // lo que queda por hacer hoy y las metas cumplidas de cada app.
  const pendientes = usePendientesPorApp()
  const rutinas = rutinasRepo.useAll()
  const metas = useMemo(() => (rutinas ?? []).filter(esMeta), [rutinas])
  // Los planes son del planificador, así que solo su tarjeta gana el chip.
  const planes = planesMetaRepo.useAll()
  const aceptados = useMemo(() => (planes ?? []).filter((p) => p.aceptadoEn).length, [planes])

  /**
   * Borra un cuarto desde el menú. Con una app asignada la confirmación la lleva
   * `EliminarCuartoDialog` (explica que la plantilla vuelve al catálogo), así que
   * aquí solo se pregunta cuando el cuarto está vacío — si no, saldrían dos.
   */
  const borrarCuarto = async (id: string, nombre: string, conApp: boolean) => {
    setAjustesCuarto(null)
    if (!conApp) {
      const ok = await confirmar({
        titulo: t('nav.borrarCuartoTitulo', 'Borrar «{nombre}»', { nombre }),
        mensaje: t('nav.borrarCuartoMsg', 'Se van también sus muros, su decoración y sus objetos.'),
        textoOk: t('nav.borrarCuartoOk', 'Borrar'),
        peligro: true,
      })
      if (!ok) return
    }
    await eliminarCuarto(id)
  }

  // Con Inventarios abierto, los objetos del mapa/cuartos se pueden arrastrar
  // directo en la escena 3D sin entrar al editor. Se limpia al salir.
  useEffect(() => {
    setInventarioObjetosActivo(menu === 'objetos')
  }, [menu, setInventarioObjetosActivo])
  useEffect(() => () => setInventarioObjetosActivo(false), [setInventarioObjetosActivo])

  /** App (plantilla) asignada a algún objeto del cuarto, si la hay. */
  const appDe = (id: string) => appPorCuarto[id]

  // El menú SIEMPRE flota sobre la escena/app (nunca en flujo): abrirlo con una
  // app abierta ya no la comprime — se ve completa detrás. `flotante` queda solo
  // para la capa de vidrio del modo transparente.
  const flotante = modoUI === 'transparente'

  return (
    <>
      {/* Vidrio del menú flotante. Va en una capa APARTE y no en el <aside>
          porque un `backdrop-filter` encajonaría dentro del menú a los
          diálogos y apps `position: fixed` que se abren desde él. */}
      {flotante && !activeRoom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 z-20 w-60"
          style={{ backdropFilter: 'blur(var(--ui-vidrio-blur, 12px))' }}
        />
      )}
      {/* Columna que vive FUERA del panel, flotando junto a su borde: el "?" y los
          controles de la vista 3D (separar pisos y quitar techo). Estos dos iban en
          el encabezado del menú, donde le comían el ancho al nombre de la casa; en
          vertical aquí ya no lo tapan.
          Con una app abierta estorbarían sobre su encabezado (ella trae el suyo). */}
      {!activeRoom && (
        <div className="absolute start-[15.75rem] top-3 z-[35] flex flex-col items-center gap-2">
          <BotonTutoriales />
          <ExplotarToggleButton />
          <TechoToggleButton />
        </div>
      )}
      {/* z-30: sobre la app abierta (RoomOverlay z-20) y bajo los diálogos (z-40)
          y la previa de plantilla (z-50). La columna del «?» (z-[35]) solo existe
          sin app abierta y debe quedar por encima. */}
      <aside
      data-tut-zona={
        menu === 'plantillas'
          ? 'menu-plantillas'
          : menu === 'objetos'
            ? 'menu-inventario'
            : 'menu-cuartos'
      }
      className="ui-panel ui-desliza-inicio absolute inset-y-0 start-0 z-30 flex h-full min-h-0 w-60 flex-col border-e border-white/10 shadow-2xl"
      aria-label={t('nav.ariaMenu', 'Menú de cuartos')}
    >
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-tut="menu.retraer"
            onClick={onToggle}
            title={t('nav.retraer', 'Retraer menú')}
            className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-[3px] rounded-md transition hover:bg-white/10"
          >
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
          </button>
          {editandoNombre ? (
            // Sin controlar: el valor se lee del DOM al salir, así Escape puede
            // cancelar simplemente desmontando el input.
            <input
              autoFocus
              defaultValue={nombreApp}
              maxLength={40}
              placeholder={t('app.brand', 'Mind Planner Home')}
              aria-label={t('app.brandNombre', 'Nombre de la casa')}
              onBlur={(e) => {
                setNombreApp(e.currentTarget.value)
                setEditandoNombre(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNombreApp(e.currentTarget.value)
                  setEditandoNombre(false)
                } else if (e.key === 'Escape') setEditandoNombre(false)
              }}
              className="min-w-0 flex-1 rounded-md border border-white/20 bg-black/30 px-2 py-1 text-base font-black tracking-tight text-white/90 outline-none focus:border-white/40"
            />
          ) : (
            <>
              {/* Hasta dos líneas: el nombre de fábrica no cabe en una sola y ya
                  nadie le quita ancho, así que se lee entero en vez de cortarse. */}
              <h1 className="line-clamp-2 min-w-0 flex-1 text-base leading-tight font-black tracking-tight text-white/90">
                <Icono nombre="casa" /> {nombreApp || t('app.brand', 'Mind Planner Home')}
              </h1>
              <button
                type="button"
                onClick={() => setEditandoNombre(true)}
                title={t('app.brandEditar', 'Cambiar el nombre')}
                aria-label={t('app.brandEditar', 'Cambiar el nombre')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm text-white/40 transition hover:bg-white/10 hover:text-white/90"
              >
                <Icono nombre="editar" />
              </button>
            </>
          )}
        </div>
        <div className="mt-3 flex overflow-hidden rounded-lg border border-white/10 bg-black/30">
          <button
            type="button"
            data-tut="menu.tab.cuartos"
            onClick={() => setMenu('cuartos')}
            className={`h-8 flex-1 whitespace-nowrap text-[11px] font-semibold transition ${
              menu === 'cuartos'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            <Icono nombre="cuartos" /> {t('nav.menu.cuartos', 'Cuartos')}
          </button>
          <button
            type="button"
            data-tut="menu.tab.plantillas"
            onClick={() => setMenu('plantillas')}
            className={`h-8 flex-1 whitespace-nowrap text-[11px] font-semibold transition ${
              menu === 'plantillas'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            {t('inv.plantillas', 'Plantillas')}
          </button>
          <button
            type="button"
            data-tut="menu.tab.inventario"
            onClick={() => setMenu('objetos')}
            className={`h-8 flex-1 whitespace-nowrap text-[11px] font-semibold transition ${
              menu === 'objetos'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            <Icono nombre="inventario" /> {t('nav.menu.inventarios', 'Inventario')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {menu === 'plantillas' ? (
          <>
            <div className="mb-2 flex overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <button
                type="button"
                data-tut="menu.plant.sub.cuartos"
                onClick={() => setPlantSub('cuartos')}
                className={`h-7 flex-1 text-[11px] font-semibold transition ${
                  plantSub === 'cuartos'
                    ? 'bg-white/12 text-white'
                    : 'text-white/45 hover:bg-white/6 hover:text-white/70'
                }`}
              >
                {t('inv.subPlantCuartos', 'Cuartos')}
              </button>
              <button
                type="button"
                data-tut="menu.plant.sub.infra"
                onClick={() => setPlantSub('infra')}
                className={`h-7 flex-1 text-[11px] font-semibold transition ${
                  plantSub === 'infra'
                    ? 'bg-white/12 text-white'
                    : 'text-white/45 hover:bg-white/6 hover:text-white/70'
                }`}
              >
                <Icono nombre="construir" /> {t('inv.subPlantInfra', 'Complementos')}
              </button>
            </div>
            {plantSub === 'infra' ? (
              <InfraestructuraCatalogo alConstruir={onToggle} />
            ) : (
              <div data-tut="menu.plantillas.catalogo">
                <PlantillasCatalogo />
              </div>
            )}
          </>
        ) : menu === 'objetos' ? (
          <>
            <div className="mb-2 flex overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <button
                type="button"
                data-tut="menu.inv.sub.objetos"
                onClick={() => setInvSub('objetos')}
                className={`h-7 flex-1 text-[11px] font-semibold transition ${
                  invSub === 'objetos'
                    ? 'bg-white/12 text-white'
                    : 'text-white/45 hover:bg-white/6 hover:text-white/70'
                }`}
              >
                {t('inv.subObjetos', 'Objetos')}
              </button>
              <button
                type="button"
                data-tut="menu.inv.sub.especiales"
                onClick={() => setInvSub('especiales')}
                className={`h-7 flex-1 text-[11px] font-semibold transition ${
                  invSub === 'especiales'
                    ? 'bg-white/12 text-white'
                    : 'text-white/45 hover:bg-white/6 hover:text-white/70'
                }`}
              >
                <Icono emoji="🚗" /> {t('inv.subEspeciales', 'Objetos especiales')}
              </button>
            </div>
            <div data-tut="menu.inv.catalogo">
              {invSub === 'especiales' ? (
                <ObjetosCatalogo soloCategorias={CATS_ESPECIALES} />
              ) : (
                <ObjetosCatalogo />
              )}
            </div>
          </>
        ) : (
          <>
        {/* Resumen del jugador (tamagotchi + nivel global); el Wrapped vive dentro. */}
        <div data-tut="menu.resumen">
          <ResumenJugador progreso={progreso} />
        </div>
        <p className="mb-3 px-2 text-[11px] leading-snug text-white/45">
          {t(
            'nav.ayuda.tarjetaTexto',
            'Toca un cuarto para abrir su app; el engrane abre sus opciones (moverlo, borrarlo, editarlo).',
          )}
        </p>
        {cuartos.length === 0 && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-white/40">
            {t('nav.sinCuartos', 'Aún no hay cuartos. Crea el primero abajo.')}
          </p>
        )}

        {CATEGORIAS.map(({ key }) => {
          // Los cuartos que todavía no tienen app, al final de su grupo: son un
          // pendiente («+ Asignar»), no un sitio al que entrar, y en medio parten
          // la lista de las apps que sí se visitan. El orden entre los demás no se
          // toca — `sort` es estable y `filter` ya devolvió un arreglo propio.
          const grupo = cuartos
            .filter((c) => c.categoria === key)
            .sort((a, b) => Number(!appDe(a.id)) - Number(!appDe(b.id)))
          if (grupo.length === 0) return null
          return (
            // Sin encabezado de categoría: los cuartos se siguen agrupando por
            // ella (y ordenando dentro), pero el rótulo solo gastaba altura.
            <section key={key} className="mb-1.5" data-tut="menu.cuartos.lista">
              <ul className="flex flex-col gap-1.5">
                {grupo.map((cuarto, i) => {
                  const color = roomColors[cuarto.id] ?? cuarto.color
                  const { titulo, subtitulo } = tituloSubtituloCuarto(cuarto, nombreCuarto(cuarto), t)
                  const appId = appDe(cuarto.id)
                  const enfoque = appId
                    ? progreso?.enfoques.find((e) => e.plantillaId === appId)
                    : undefined
                  // Vecinos para ▲/▼: solo dentro del mismo bloque (con app o sin
                  // app), porque el `sort` de arriba manda los sin app al final y
                  // un intercambio a través de esa frontera no movería nada.
                  const mismoBloque = (otro?: Cuarto) => !!otro && !appDe(otro.id) === !appId
                  const arriba = mismoBloque(grupo[i - 1]) ? grupo[i - 1] : undefined
                  const abajo = mismoBloque(grupo[i + 1]) ? grupo[i + 1] : undefined
                  return (
                    <li
                      key={cuarto.id}
                      data-tut={`menu.cuartos.card.${cuarto.id}`}
                      className="relative rounded-lg border transition"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--ui-ink) 10%, transparent)',
                        background: 'color-mix(in srgb, var(--ui-ink) 3%, transparent)',
                      }}
                    >
                      {/* La tarjeta ENTERA es el botón de entrar (o de asignar app);
                          solo el engrane queda fuera, flotando en su esquina. */}
                      <button
                        type="button"
                        data-tut={appId ? 'menu.cuartos.entrar' : 'menu.cuartos.asignar'}
                        onClick={() => (appId ? openRoom(cuarto.id) : abrirAsignar(cuarto.id))}
                        title={
                          appId
                            ? t('nav.entrarCuarto', 'Entrar a {nombre}', { nombre: titulo })
                            : t('nav.asignarApp', 'Asignar una app a este cuarto')
                        }
                        className="ui-brillo block w-full rounded-lg px-2 py-1.5 text-start"
                        style={vivo(color)}
                      >
                        {/* `pe-9`: el hueco que ocupa el engrane sobre esta fila. */}
                        <div className="flex items-start gap-2 pe-9">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-lg"
                            style={{ background: `${color}33` }}
                          >
                            <IconoCuarto cuarto={cuarto} />
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block text-sm font-semibold text-white/90">{titulo}</span>
                            {appId ? (
                              subtitulo && (
                                <span className="block truncate text-[11px] text-white/45">{subtitulo}</span>
                              )
                            ) : (
                              <span className="block text-[11px] font-bold" style={{ color }}>
                                {t('nav.asignar', '+ Asignar')}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Progreso de la app del cuarto, dentro de su card. */}
                        {enfoque && (
                          <ProgresoApp
                            enfoque={enfoque}
                            color={color}
                            metas={appId ? metasCumplidasDe(metas, appId) : null}
                            planes={appId === 'metas' ? aceptados : null}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        data-tut="menu.cuartos.editar"
                        onClick={() => setAjustesCuarto((a) => (a === cuarto.id ? null : cuarto.id))}
                        aria-expanded={ajustesCuarto === cuarto.id}
                        title={t('nav.ajustesCuarto', 'Opciones del cuarto')}
                        className={`absolute end-2 top-1.5 grid h-8 w-8 place-items-center rounded-md border text-sm transition ${
                          ajustesCuarto === cuarto.id
                            ? 'border-white/25 bg-white/15 text-white/90'
                            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/12'
                        }`}
                      >
                        <Icono nombre="ajustes" />
                      </button>

                      {/* Lo que queda por hacer hoy, en la esquina superior derecha de la
                          tarjeta (como en la pantalla de inicio); va DESPUÉS del engrane
                          para quedar encima de él. */}
                      {appId && pendientes.get(appId) && (
                        <BadgeMisiones
                          pendientes={pendientes.get(appId)!}
                          className="absolute -top-1.5 -end-1.5"
                        />
                      )}

                      {ajustesCuarto === cuarto.id && (
                        <div className="flex gap-1 px-2 pb-1.5">
                          <BotonAjusteCuarto
                            icono="subir"
                            titulo={t('nav.subirCuarto', 'Subir en la lista')}
                            disabled={!arriba}
                            onClick={() => arriba && void intercambiarOrden(cuarto.id, arriba.id)}
                          />
                          <BotonAjusteCuarto
                            icono="bajar"
                            titulo={t('nav.bajarCuarto', 'Bajar en la lista')}
                            disabled={!abajo}
                            onClick={() => abajo && void intercambiarOrden(cuarto.id, abajo.id)}
                          />
                          <BotonAjusteCuarto
                            icono="basura"
                            titulo={t('nav.borrarCuarto', 'Borrar el cuarto')}
                            peligro
                            onClick={() => void borrarCuarto(cuarto.id, titulo, !!appId)}
                          />
                          <BotonAjusteCuarto
                            icono="editar"
                            titulo={t('nav.editarCuarto', 'Editar este cuarto')}
                            onClick={() => {
                              setAjustesCuarto(null)
                              editRoom(cuarto.id)
                            }}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {/* Crear cuarto: abre el editor de mapa en modo Cuartos con el pincel cuadrado. */}
        <button
          type="button"
          data-tut="menu.cuartos.crear"
          onClick={() => {
            usePlanos.getState().setModo('cuartos')
            usePlanos.getState().setPincelForma('cuadrado')
            useEditorUi.getState().setTab('mapa')
            setEditMode(true)
          }}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white/90"
        >
          <Icono nombre="agregar" /> {t('nav.crearCuarto', 'Crear cuarto')}
        </button>
          </>
        )}
      </div>
      </aside>
    </>
  )
}

/** Botón de la fila de opciones del cuarto (subir, bajar, borrar, editar). */
function BotonAjusteCuarto({
  icono,
  titulo,
  onClick,
  disabled,
  peligro,
}: {
  icono: NombreIcono
  titulo: string
  onClick: () => void
  disabled?: boolean
  peligro?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      aria-label={titulo}
      className={`grid h-8 flex-1 place-items-center rounded-md border border-white/10 bg-white/5 text-sm text-white/70 transition disabled:opacity-25 ${
        peligro ? 'hover:bg-red-500/25' : 'hover:bg-white/15'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )
}

/** Menú retraído: botón flotante (3 líneas + MPH) y toggle de techo. */
export function FloatingMenuButton({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  // La pastilla son DOS botones: las rayas abren el menú lateral (administrar los
  // cuartos) y la casa con el nombre, la rejilla de acceso rápido (entrar de un toque).
  const [rapido, setRapido] = useState(false)
  // Con una app abierta, su overlay tapa la casa: los controles de la vista 3D y el
  // selector de tutoriales estorban sobre su encabezado (la app tiene su propio "?").
  const appAbierta = useHouse((s) => !!s.activeRoom)
  const nombreApp = useAjustes((s) => s.nombreApp)
  const editMode = useLayout((s) => s.editMode)
  const movilVertical = useHud((s) => s.movilVertical)
  // Los editores de infraestructura traen su propio encabezado centrado arriba:
  // esta esquina se pliega para dejarle la franja (espejo en ToolbarPermanente).
  const construyendo = useConstruyendo()
  // En vertical el Editor (panel derecho) ocupa casi todo el ancho: este disparador se
  // pliega mientras esté abierto para no traslaparse (espejo en ToolbarPermanente).
  const plegado = useHud((s) => s.plegado.supIzq) || (movilVertical && editMode) || construyendo

  // Plegado: queda solo la casa (con una app abierta se ignora, es el único acceso al menú).
  if (plegado && !appAbierta) {
    return (
      <div className="absolute start-3 top-3 z-30">
        <TiradorHud zona="supIzq">
          <Icono nombre="casa" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div className="absolute start-3 top-3 z-30 flex items-start gap-2">
      <div className="ui-hud flex items-center overflow-hidden rounded-lg border border-white/10">
        <button
          type="button"
          data-tut="menu.abrir"
          data-tut-zona="menu-cuartos"
          onClick={onToggle}
          title={t('nav.abrir', 'Abrir menú')}
          className="flex items-center px-3 py-2 transition hover:bg-white/15"
        >
          <span className="flex flex-col items-center justify-center gap-[3px]">
            <span className="h-0.5 w-4 rounded bg-white/80" />
            <span className="h-0.5 w-4 rounded bg-white/80" />
            <span className="h-0.5 w-4 rounded bg-white/80" />
          </span>
        </button>
        <span aria-hidden className="h-5 w-px bg-white/15" />
        <button
          type="button"
          data-tut="menu.rapido"
          data-tut-zona="inicio"
          onClick={() => setRapido(true)}
          title={t('nav.rapido', 'Acceso rápido a los cuartos')}
          className="flex items-center px-3 py-2 transition hover:bg-white/15"
        >
          <span className="max-w-[7rem] truncate text-sm font-black text-white/90">
            {/* Botón flotante: del nombre de fábrica cabe solo la sigla; el que
                haya puesto el usuario ya es corto (o se recorta). */}
            <Icono nombre="casa" /> {nombreApp || t('app.brandCorto', 'MPH')}
          </span>
        </button>
      </div>
      {rapido && <PanelCuartosRapido onCerrar={() => setRapido(false)} />}
      {!appAbierta && (
        <>
          <ExplotarToggleButton />
          <TechoToggleButton />
          {/* Selector de tutoriales: el ÚNICO "?" de la casa (en las apps va en su header). */}
          <div className="flex flex-col items-center gap-1">
            <BotonTutoriales />
            <BotonPlegarHud zona="supIzq" />
          </div>
        </>
      )}
    </div>
  )
}
