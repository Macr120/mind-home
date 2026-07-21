import { useEffect, useState } from 'react'
import type { Cuarto } from '../data/db'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { useAsignar } from '../state/asignarStore'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { tituloSubtituloCuarto } from './roomDisplay'
import { TechoToggleButton, ExplotarToggleButton } from './TechoToggleButton'
import { ResumenJugador, ProgresoApp } from './ProgresoPanel'
import { PlantillasCatalogo } from './PlantillasCatalogo'
import { InfraestructuraCatalogo } from './InfraestructuraCatalogo'
import { ObjetosCatalogo } from './ObjetosCatalogo'
import { useProgreso } from '../gamificacion/actividad'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonTutoriales } from '../tutorial/SelectorTutorial'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'
import { useAjustes } from '../state/ajustesStore'

const CATEGORIAS: { key: Cuarto['categoria']; label: string }[] = [
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'config', label: 'Configuración' },
]

export function RoomSideMenu({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  const openRoom = useHouse((s) => s.openRoom)
  const activeRoom = useHouse((s) => s.activeRoom)
  const modoUI = useAjustes((s) => s.modoUI)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const objetos = useDiseño((s) => s.objetos)
  const editRoom = useLayout((s) => s.editRoom)
  const setEditMode = useLayout((s) => s.setEditMode)
  const cuartos = useCuartos((s) => s.cuartos)
  const abrirAsignar = useAsignar((s) => s.abrir)
  const [menu, setMenu] = useState<'cuartos' | 'plantillas' | 'objetos'>('cuartos')
  // Inventario tiene dos sub-pestañas: Objetos (biblioteca) y Objetos especiales (vehículos).
  const [invSub, setInvSub] = useState<'objetos' | 'especiales'>('objetos')
  // Plantillas tiene dos sub-pestañas: de cuarto (apps) y de infraestructura (se construyen en el mapa).
  const [plantSub, setPlantSub] = useState<'cuartos' | 'infra'>('cuartos')
  const setInventarioObjetosActivo = useEditorUi((s) => s.setInventarioObjetosActivo)
  const progreso = useProgreso()

  // Con Inventarios abierto, los objetos del mapa/cuartos se pueden arrastrar
  // directo en la escena 3D sin entrar al editor. Se limpia al salir.
  useEffect(() => {
    setInventarioObjetosActivo(menu === 'objetos')
  }, [menu, setInventarioObjetosActivo])
  useEffect(() => () => setInventarioObjetosActivo(false), [setInventarioObjetosActivo])

  /** App (plantilla) asignada a algún objeto del cuarto, si la hay. */
  const appDe = (id: string) =>
    objetos.find((o) => o.roomId === id && o.plantillaId)?.plantillaId

  // En modo transparente el menú flota SOBRE la escena (si no, su vidrio solo
  // dejaría ver el fondo de la app) y deja el ancho completo a lo que abra:
  // con una app abierta se queda por debajo, así se ve a pantalla completa.
  const flotante = modoUI === 'transparente'

  return (
    <>
      {/* Vidrio del menú flotante. Va en una capa APARTE y no en el <aside>
          porque un `backdrop-filter` encajonaría dentro del menú a los
          diálogos y apps `position: fixed` que se abren desde él. */}
      {flotante && !activeRoom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-60"
          style={{ backdropFilter: 'blur(var(--ui-vidrio-blur, 12px))' }}
        />
      )}
      {/* El "?" vive FUERA del panel, flotando junto a su borde: es el único
          resto del HUD izquierdo que sigue a la vista con el menú abierto.
          Con una app abierta estorbaría sobre su encabezado (ella trae el suyo). */}
      {!activeRoom && (
        <div className="absolute left-[15.75rem] top-3 z-30">
          <BotonTutoriales />
        </div>
      )}
      <aside
      data-tut-zona={
        menu === 'plantillas'
          ? 'menu-plantillas'
          : menu === 'objetos'
            ? 'menu-inventario'
            : 'menu-cuartos'
      }
      className={`ui-panel flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-white/10 ${
        flotante ? `absolute inset-y-0 left-0 shadow-2xl ${activeRoom ? 'z-10' : 'z-30'}` : ''
      }`}
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
          <h1 className="min-w-0 flex-1 truncate text-lg font-black tracking-tight text-white/90">
            <Icono nombre="casa" /> Mind Home
          </h1>
          <ExplotarToggleButton />
          <TechoToggleButton />
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
                <Icono nombre="construir" /> {t('inv.subPlantInfra', 'Infraestructura')}
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
                <ObjetosCatalogo soloCategorias={['Pistolas', 'Vehículos', 'Cuadro y espejo', 'Fuentes', 'Parque', 'Luces', 'Anuncios', 'Principales']} />
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
          <b className="text-white/70">{t('nav.ayuda.editar', 'Editar')}</b>{' '}
          {t('nav.ayuda.editarTexto', 'personaliza el cuarto ·')}{' '}
          <b className="text-white/70">{t('nav.ayuda.entrar', 'Entrar')}</b>{' '}
          {t('nav.ayuda.entrarTexto', 'abre la app.')}
        </p>
        {cuartos.length === 0 && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-white/40">
            {t('nav.sinCuartos', 'Aún no hay cuartos. Crea el primero abajo.')}
          </p>
        )}

        {CATEGORIAS.map(({ key, label }) => {
          const grupo = cuartos.filter((c) => c.categoria === key)
          if (grupo.length === 0) return null
          return (
            <section key={key} className="mb-4" data-tut="menu.cuartos.lista">
              <h2 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {t(`cat.${key}`, label)}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {grupo.map((cuarto) => {
                  const color = roomColors[cuarto.id] ?? cuarto.color
                  const nombre = roomNames[cuarto.id] || cuarto.nombre
                  const { titulo, subtitulo } = tituloSubtituloCuarto(cuarto, nombre, t)
                  const appId = appDe(cuarto.id)
                  const enfoque = appId
                    ? progreso?.enfoques.find((e) => e.plantillaId === appId)
                    : undefined
                  return (
                    <li
                      key={cuarto.id}
                      data-tut={`menu.cuartos.card.${cuarto.id}`}
                      className="rounded-lg border px-2 py-1.5 transition"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--ui-ink) 10%, transparent)',
                        background: 'color-mix(in srgb, var(--ui-ink) 3%, transparent)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
                            style={{ background: `${color}33` }}
                          >
                            <Icono emoji={cuarto.icon} />
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-semibold text-white/90">
                              {titulo}
                            </span>
                            {subtitulo && (
                              <span className="block truncate text-[11px] text-white/45">
                                {subtitulo}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            data-tut="menu.cuartos.editar"
                            onClick={() => editRoom(cuarto.id)}
                            title={t('nav.editarCuarto', 'Editar este cuarto')}
                            className="flex min-w-[5.25rem] items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold text-white/80 transition hover:bg-white/12"
                          >
                            <Icono nombre="ajustes" className="text-sm leading-none" />
                            <span>{t('nav.editar', 'Editar')}</span>
                          </button>
                          {appId ? (
                            <button
                              type="button"
                              data-tut="menu.cuartos.entrar"
                              onClick={() => openRoom(cuarto.id)}
                              className="min-w-[5.25rem] rounded-md px-2 py-2 text-xs font-bold transition hover:brightness-110"
                              style={{ background: color, color: 'var(--ui-accent-ink)' }}
                            >
                              {t('nav.entrar', 'Entrar ›')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-tut="menu.cuartos.asignar"
                              onClick={() => abrirAsignar(cuarto.id)}
                              title={t('nav.asignarApp', 'Asignar una app a este cuarto')}
                              className="min-w-[5.25rem] rounded-md border border-dashed border-white/25 px-2 py-2 text-xs font-bold text-white/70 transition hover:border-white/45 hover:text-white/90"
                            >
                              {t('nav.asignar', '+ Asignar')}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Progreso de la app del cuarto, directo en su card. */}
                      {enfoque && <ProgresoApp enfoque={enfoque} color={color} />}
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

/** Menú retraído: botón flotante (3 líneas + Mind Home) y toggle de techo. */
export function FloatingMenuButton({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  // Con una app abierta, su overlay tapa la casa: los controles de la vista 3D y el
  // selector de tutoriales estorban sobre su encabezado (la app tiene su propio "?").
  const appAbierta = useHouse((s) => !!s.activeRoom)
  const plegado = useHud((s) => s.plegado.supIzq)

  // Plegado: queda solo la casa (con una app abierta se ignora, es el único acceso al menú).
  if (plegado && !appAbierta) {
    return (
      <div className="absolute left-3 top-3 z-30">
        <TiradorHud zona="supIzq">
          <Icono nombre="casa" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
      <button
        type="button"
        data-tut="menu.abrir"
        data-tut-zona="menu-cuartos"
        onClick={onToggle}
        title={t('nav.abrir', 'Abrir menú')}
        className="ui-hud flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/15"
      >
        <span className="flex flex-col items-center justify-center gap-[3px]">
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
        </span>
        <span className="text-sm font-black text-white/90">
          <Icono nombre="casa" /> Mind Home
        </span>
      </button>
      {!appAbierta && (
        <>
          <ExplotarToggleButton />
          <TechoToggleButton />
          {/* Selector de tutoriales: el ÚNICO "?" de la casa (en las apps va en su header). */}
          <BotonTutoriales />
          <BotonPlegarHud zona="supIzq" />
        </>
      )}
    </div>
  )
}
