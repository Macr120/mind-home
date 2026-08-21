import { useEffect, useState } from 'react'
import type { PlantillaCustom } from '../data/db'
import { getPlantilla, plantillasCuarto, DESCRIPCIONES, type Plantilla } from '../registry'
import { usePreviaPlantilla } from '../state/previaPlantillaStore'
import { useShallow } from 'zustand/react/shallow'
import { useDiseño, idsPlantillasAsignadas } from '../state/disenoStore'
import { useAsistentes } from '../state/asistentesStore'
import { nombreAsistente } from '../chat/mascotas'
import { usePlantillasCustom } from '../state/plantillasCustomStore'
import { useGruposPlantilla, nombreCarpeta } from '../state/gruposPlantillaStore'
import { useObjetosPlantilla } from '../state/objetosPlantillaStore'
import { asistenteDePlantilla } from '../gamificacion/asistentesPlantilla'
import { useAppsConDatos } from '../gamificacion/actividad'
import { RECURSOS } from '../house/recursos'
import { SIEMBRA, tipoYColor } from '../house/modelosRecursos'
import { META_ESPECIAL_PLANTILLA } from '../house/especialesPlantillaMeta'
import { MiniaturaModelo } from '../house/Miniatura'
import { getTema } from '../house/temas'
import { PlantillaCustomEditor } from './PlantillaCustomEditor'
import { SelectorObjeto3D } from './SelectorObjeto3D'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { vivo } from './estilos'
import { useArrastre } from './comun/arrastre'

type Modo = 'asistente' | 'cuarto'

/** Nombre del recurso 3D por id (para la vista previa del conjunto de la app). */
const nombreRecurso = (id: number): string =>
  RECURSOS.find((r) => r.id === id)?.nombre ?? `Recurso ${id}`

/**
 * Catálogo de plantillas (apps) del menú Funciones, organizado en carpetas
 * editables (crear/renombrar/borrar/reordenar y arrastrar plantillas entre
 * ellas). Las apps del sistema se ocultan al asignarse a un cuarto; las
 * plantillas personalizadas permanecen visibles (con editar/borrar) en su
 * carpeta aunque estén en uso.
 */
export function PlantillasCatalogo() {
  const t = useT()
  // Solo «qué apps están en uso»: jamás `s.objetos` crudo (re-render a 60 Hz).
  const idsAsignadas = useDiseño(useShallow((s) => idsPlantillasAsignadas(s.objetos)))
  const asistentes = useAsistentes((s) => s.lista)
  const guardar = useAsistentes((s) => s.guardar)
  const customs = usePlantillasCustom((s) => s.lista)
  const eliminarPlantilla = usePlantillasCustom((s) => s.eliminar)
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const grupos = useGruposPlantilla((s) => s.grupos)
  const { crear, renombrar, eliminar: eliminarGrupo, reordenar, mover, asegurarMiembros, alternarPlegado } =
    useGruposPlantilla.getState()
  const overrides = useObjetosPlantilla((s) => s.overrides)
  const { agregar: agregarObjeto, eliminar: eliminarObjeto, setPrincipal } =
    useObjetosPlantilla.getState()

  const [abierta, setAbierta] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>('asistente')
  const [editor, setEditor] = useState<PlantillaCustom | 'nueva' | null>(null)
  const [renombrando, setRenombrando] = useState<number | null>(null)
  const [nombreTmp, setNombreTmp] = useState('')
  // Plantilla a la que se le está agregando un objeto (abre el selector 3D).
  const [agregandoA, setAgregandoA] = useState<string | null>(null)

  const asignadas = new Set(idsAsignadas)
  const idsCustom = new Set(customs.map((c) => c.id))

  // Apps sin cuarto que NO están vacías: borrar un cuarto no borra los datos de
  // su app, así que aquí siguen esperando con toda su información.
  const conDatos = useAppsConDatos(
    plantillasCuarto()
      .map((p) => p.id)
      .filter((id) => !asignadas.has(id)),
  )

  // Reconciliación: cualquier plantilla (sistema o custom) sin carpeta cae en la primera.
  useEffect(() => {
    if (grupos.length === 0) return
    void asegurarMiembros(plantillasCuarto().map((p) => p.id))
  }, [grupos, customs, asegurarMiembros])

  const alternar = (plantillaId: string, m: Modo) => {
    if (abierta === plantillaId && modo === m) setAbierta(null)
    else {
      setAbierta(plantillaId)
      setModo(m)
    }
  }

  // Un solo asistente por app: liga la app al elegido y la quita de los demás.
  const asignarAsistente = async (plantillaId: string, asistenteId: string) => {
    for (const a of asistentes) {
      const tiene = a.cuartos.includes(plantillaId)
      if (a.id === asistenteId) {
        if (!tiene) await guardar({ ...a, cuartos: [...a.cuartos, plantillaId] })
      } else if (tiene) {
        await guardar({ ...a, cuartos: a.cuartos.filter((c) => c !== plantillaId) })
      }
    }
    setAbierta(null)
  }

  const eliminarCustom = async (id: string) => {
    if (!window.confirm(t('plantillaCustom.confirmarBorrar', '¿Eliminar esta plantilla y todos sus datos?'))) return
    await eliminarPlantilla(id)
  }

  const confirmarRenombre = async () => {
    const id = renombrando
    const nuevo = nombreTmp.trim()
    setRenombrando(null)
    if (id != null && nuevo) await renombrar(id, nuevo)
  }

  const borrarGrupo = async (id: number) => {
    if (!window.confirm(t('plantillaCustom.borrarGrupoConfirm', '¿Borrar esta carpeta? Sus plantillas pasan a la primera.'))) return
    await eliminarGrupo(id)
  }

  /**
   * El gesto compartido de la casa. Claves: `g:<id>` (cabecera de carpeta) y
   * `t:<plantillaId>` (tarjeta). El destino es la carpeta bajo el dedo: una
   * tarjeta se muda a ella y una carpeta se coloca justo antes de esa.
   */
  const gesto = useArrastre<number>(
    (e, mano) => {
      const cae = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-grupo]')
      if (!cae) return null
      const id = Number(cae.getAttribute('data-grupo'))
      return mano === `g:${id}` ? null : id
    },
    (mano, destinoId) => {
      if (mano.startsWith('t:')) {
        void mover(mano.slice(2), destinoId)
      } else {
        const id = Number(mano.slice(2))
        const ids = grupos.map((g) => g.id!).filter((x) => x !== id)
        const idx = ids.indexOf(destinoId)
        void reordenar([...ids.slice(0, idx), id, ...ids.slice(idx)])
      }
    },
  )

  /** Tarjeta de una plantilla (app del sistema o custom) dentro de su carpeta. */
  const renderTarjeta = (p: Plantilla) => {
    const abierto = abierta === p.id
    const asistente = asistenteDePlantilla(asistentes, p.id)
    const esCustom = idsCustom.has(p.id)
    const enUso = asignadas.has(p.id)
    const gestoTarjeta = gesto.props(`t:${p.id}`)
    return (
      <li
        key={p.id}
        {...gestoTarjeta}
        className={`ui-brillo cursor-grab rounded-lg border active:cursor-grabbing ${
          gesto.enMano === `t:${p.id}` ? 'opacity-40' : ''
        }`}
        style={{ ...gestoTarjeta.style, ...vivo(p.color), borderColor: `${p.color}33` }}
      >
        {/* Cabecera: icono de la app (entra directo) + nombre + asistente + asignar */}
        <div className="flex w-full items-center gap-2 p-2.5">
          <button
            type="button"
            onClick={() => usePreviaPlantilla.getState().abrir(p.id)}
            title={t('plantillas.entrar', 'Entrar a la app')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base transition hover:brightness-110"
            style={{ background: `${p.color}33` }}
          >
            <Icono emoji={p.icon} />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">
            {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
          </span>
          {enUso ? (
            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50">
              {t('plantillaCustom.enUsoTag', 'en uso')}
            </span>
          ) : (
            conDatos.has(p.id) && (
              <span
                title={t(
                  'plantillas.conDatosAyuda',
                  'Esta app guarda información tuya aunque no viva en ningún cuarto. Toca su icono para abrirla, o asígnala a un cuarto.',
                )}
                className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50"
              >
                {t('plantillas.conDatos', 'con datos')}
              </span>
            )
          )}
          <button
            type="button"
            onClick={() => alternar(p.id, 'asistente')}
            title={
              asistente
                ? `${t('plantillas.asistente', 'Asistente que la atiende')}: ${nombreAsistente(t, asistente)}`
                : t('plantillas.sinAsistente', 'Sin asistente (la atienden todos)')
            }
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base transition hover:bg-white/10 ${
              abierto && modo === 'asistente' ? 'ring-1 ring-white/40 bg-white/10' : ''
            }`}
          >
            {asistente ? <Icono emoji={asistente.emoji} /> : <Icono nombre="vinculo" />}
          </button>
          {!enUso && (
            <button
              type="button"
              onClick={() => alternar(p.id, 'cuarto')}
              title={t('plantillas.asignar', 'Asignar a un objeto o cuarto')}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base transition hover:bg-white/10 ${
                abierto && modo === 'cuarto' ? 'ring-1 ring-white/40 bg-white/10' : ''
              }`}
            >
              <Icono nombre="cuartos" />
            </button>
          )}
          {esCustom && (
            <>
              <button
                type="button"
                onClick={() => setEditor(customs.find((c) => c.id === p.id)!)}
                title={t('plantillaCustom.editar', 'Editar plantilla')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-white/60 transition hover:bg-white/10 hover:text-white/90"
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => void eliminarCustom(p.id)}
                title={t('plantillaCustom.eliminar', 'Eliminar plantilla')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-red-400/70 transition hover:bg-red-500/15 hover:text-red-400"
              >
                <Icono nombre="cerrar" />
              </button>
            </>
          )}
        </div>

        {abierto && modo === 'asistente' && (
          <div className="px-2.5 pb-2.5">
            <p className="mb-1.5 px-0.5 text-[10px] text-white/40">
              {t('plantillas.asistente', 'Asistente que la atiende')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => void asignarAsistente(p.id, '')}
                title={t('plantillas.sinAsistente', 'Sin asistente (la atienden todos)')}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-base transition ${
                  !asistente
                    ? 'border-white/40 bg-white/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icono nombre="vinculo" />
              </button>
              {asistentes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => void asignarAsistente(p.id, a.id)}
                  title={nombreAsistente(t, a)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-base transition ${
                    asistente?.id === a.id
                      ? 'border-white/40 bg-white/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Icono emoji={a.emoji} />
                </button>
              ))}
            </div>
          </div>
        )}

        {abierto && modo === 'cuarto' && (
          <div className="px-2.5 pb-2.5">
            <p className="text-[11px] leading-snug text-white/50">
              {t(`room.${p.id}.desc`, DESCRIPCIONES[p.id] ?? '')}
            </p>
            {/* Conjunto de objetos de la app: clic = principal (★), ✕ = quitar, ＋ = agregar. */}
            <p className="mb-1 mt-2 px-0.5 text-[10px] font-semibold text-white/40">
              {t('plantillas.traeObjetos', 'Objetos que trae la app')}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(overrides[p.id] ?? SIEMBRA[p.id] ?? []).map((s, i) => (
                <div
                  key={i}
                  className="relative flex flex-col items-center gap-1 rounded-md border border-white/10 bg-black/20 p-1.5"
                >
                  <button
                    type="button"
                    onClick={() => void setPrincipal(p.id, i)}
                    title={
                      s.principal
                        ? t('plantillas.esPrincipal', 'Objeto principal')
                        : t('plantillas.hacerPrincipal', 'Marcar como principal')
                    }
                    className="w-full"
                  >
                    <MiniaturaModelo {...tipoYColor(s)} tema={tema} className="h-12 w-full object-contain" />
                  </button>
                  {s.principal && (
                    <span
                      title={t('plantillas.objetoPrincipal', 'Objeto principal (entrada del cuarto)')}
                      className="pointer-events-none absolute start-1 top-1 text-amber-300"
                    >
                      <Icono nombre="estrella" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void eliminarObjeto(p.id, i)}
                    title={t('plantillas.quitarObjeto', 'Quitar objeto')}
                    className="absolute end-0.5 top-0.5 rounded px-1 text-[11px] text-white/40 transition hover:text-red-400"
                  >
                    ✕
                  </button>
                  <span className="w-full truncate text-center text-[9px] leading-tight text-white/55">
                    {s.tipo ? META_ESPECIAL_PLANTILLA[s.tipo]?.nombre ?? s.tipo : nombreRecurso(s.recurso!)}
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAgregandoA(p.id)}
                title={t('plantillas.agregarObjeto', 'Agregar objeto')}
                className="flex min-h-[4.75rem] flex-col items-center justify-center rounded-md border border-dashed border-white/20 bg-black/10 text-xl leading-none text-white/40 transition hover:border-white/40 hover:text-white/70"
              >
                ＋
              </button>
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <section>
      <p className="mb-2 px-2 text-[11px] leading-snug text-white/45">
        {t(
          'plantillas.ayuda',
          'Arrastra una plantilla a otra carpeta; toca el icono para probar la app y el nombre de la carpeta para renombrarla.',
        )}
      </p>

      <div className="flex flex-col gap-3">
        {grupos.map((g) => {
          const visibles = g.miembros
            .map((id) => getPlantilla(id))
            .filter((p): p is Plantilla => !!p)
            .filter((p) => idsCustom.has(p.id) || !asignadas.has(p.id))
          return (
            <section
              key={g.id}
              data-grupo={g.id}
              className={`rounded-xl transition ${
                gesto.destino === g.id && gesto.enMano
                  ? gesto.enMano.startsWith('t:')
                    ? // Soltar una tarjeta dentro: se resalta la carpeta entera.
                      'bg-white/5 ring-1 ring-accent/70'
                    : // Reordenar carpetas: línea de inserción sobre la destino.
                      'border-t-2 border-accent'
                  : ''
              }`}
            >
              {/* Encabezado de carpeta: arrastrable (reordenar) + nombre editable + borrar */}
              <div
                {...(g.id != null && renombrando !== g.id ? gesto.props(`g:${g.id}`) : {})}
                className={`mb-1.5 flex items-center gap-1.5 px-1 ${
                  renombrando !== g.id ? 'cursor-grab active:cursor-grabbing' : ''
                } ${gesto.enMano === `g:${g.id}` ? 'opacity-40' : ''}`}
              >
                <span className="cursor-grab select-none text-white/25 active:cursor-grabbing" title={t('plantillaCustom.arrastrarGrupo', 'Arrastrar para reordenar')}>
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => g.id != null && void alternarPlegado(g.id)}
                  title={
                    g.plegado
                      ? t('plantillaCustom.desplegarGrupo', 'Desplegar carpeta')
                      : t('plantillaCustom.plegarGrupo', 'Plegar carpeta')
                  }
                  className="shrink-0 rounded text-white/30 transition hover:text-white/70"
                >
                  <Icono
                    nombre="siguiente"
                    className={`transition-transform ${g.plegado ? '' : 'rotate-90'}`}
                  />
                </button>
                {renombrando === g.id ? (
                  <input
                    autoFocus
                    value={nombreTmp}
                    onChange={(e) => setNombreTmp(e.target.value)}
                    onBlur={() => void confirmarRenombre()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void confirmarRenombre()
                      if (e.key === 'Escape') setRenombrando(null)
                    }}
                    maxLength={30}
                    className="min-w-0 flex-1 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/80 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (g.id != null) {
                        setRenombrando(g.id)
                        setNombreTmp(g.nombre)
                      }
                    }}
                    title={t('plantillaCustom.renombrarGrupo', 'Renombrar carpeta')}
                    className="min-w-0 flex-1 truncate text-start text-[10px] font-bold uppercase tracking-wider text-white/30 transition hover:text-white/60"
                  >
                    {g.emoji ? <><Icono emoji={g.emoji} />{' '}</> : null}
                    {nombreCarpeta(t, g.nombre)}
                  </button>
                )}
                {/* Plegada, el conteo dice qué se está escondiendo. */}
                {g.plegado && (
                  <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/45">
                    {visibles.length}
                  </span>
                )}
                {!g.esBase && (
                  <button
                    type="button"
                    onClick={() => g.id != null && void borrarGrupo(g.id)}
                    title={t('plantillaCustom.borrarGrupo', 'Borrar carpeta')}
                    className="shrink-0 rounded px-1 text-sm text-white/30 transition hover:text-red-400"
                  >
                    ✕
                  </button>
                )}
              </div>

              {!g.plegado &&
                (visibles.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">{visibles.map(renderTarjeta)}</ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-center text-[10px] text-white/30">
                    {t('plantillaCustom.grupoVacio', 'Carpeta vacía · arrastra plantillas aquí')}
                  </p>
                ))}
            </section>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void crear(t('plantillaCustom.nuevoGrupoNombre', 'Nuevo grupo'))}
          className="w-full rounded-xl border border-dashed border-white/15 px-3 py-2 text-center text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-white/80"
        >
          ＋ {t('plantillaCustom.nuevoGrupo', 'Nuevo grupo')}
        </button>
        <button
          type="button"
          data-tut="menu.plantillas.crear"
          onClick={() => setEditor('nueva')}
          className="w-full rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-center text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white/85"
        >
          ＋ {t('plantillaCustom.crear', 'Crear plantilla')}
        </button>
      </div>

      {editor && (
        <PlantillaCustomEditor
          inicial={editor === 'nueva' ? undefined : editor}
          onCerrar={() => setEditor(null)}
        />
      )}

      {agregandoA && (
        <SelectorObjeto3D
          onElegir={(recurso) => {
            void agregarObjeto(agregandoA, recurso)
            setAgregandoA(null)
          }}
          onCerrar={() => setAgregandoA(null)}
        />
      )}

      {/* La previsualización («Entrar a la app») vive en `PlantillaPreviaOverlay`,
          montado en la raíz de App: aquí dentro del <aside> su `fixed` quedaba
          encajonado por el stacking context del panel. */}
    </section>
  )
}
