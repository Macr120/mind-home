import { useMemo, useState, type ReactNode } from 'react'
import { Shapes } from 'lucide-react'
import { useAjustes, type EstiloIconos } from '../state/ajustesStore'
import { useT } from '../i18n/useT'
import { TEMAS_UI, modoBase, type ModoUI } from '../ui/temasUI'
import { Icono } from '../ui/iconos/Icono'
import { MASCOTAS, type MascotaId } from '../chat/mascotas'
import { useMascota } from '../state/mascotaStore'
import { useDiseño } from '../state/disenoStore'
import { CUERPOS_PRESET } from '../house/cuerpos'
import { CapturaPersonajes, PERSONAJES_ONBOARDING } from './CapturaPersonajes'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { plantillasCuarto, getPlantilla, CORTAS } from '../registry'
import { MiniaturaCuarto } from '../house/Miniatura'
import { objetosDe } from '../state/objetosPlantillaStore'
import { asignarPlantillaACuarto } from '../gamificacion/plantillaBundle'
import { hayBackend } from '../cuenta/supabase'
import { useEditorUi } from '../state/editorUiStore'
import { useTutorial } from '../tutorial/tutorialStore'
import { tutorialPrimerosPasos } from '../tutorial/primerosPasos.meta'
import { tutorialCasa } from '../tutorial/menus.meta'
import type { TutorialDef } from '../tutorial/tipos'
import {
  useBienvenida,
  appsAsignadas,
  LS_BIENVENIDA,
  type PasoGuia,
} from './bienvenidaStore'

/**
 * Menú de bienvenida de primera vez: idioma → apariencia de la interfaz →
 * intereses (crean cuartos con su app) → personaje → asistente. Idioma y
 * apariencia se aplican en vivo; el resto, al confirmar. Al terminar toma el
 * relevo la guía de 3 pasos (`GuiaPasos`). (El plan no se elige aquí: se entra
 * en modo local sin decidir nada, y la cuenta vive en Configuraciones → Cuenta.)
 *
 * OJO: este componente es LAZY y solo se monta con `abierto` (App.tsx); el
 * disparo de la primera vez (`evaluarPrimeraVez`) vive en `PrimeraVezGate`,
 * que sí está montado siempre — aquí ya no puede vivir.
 */
export function BienvenidaOverlay() {
  const guia = useBienvenida((s) => s.guia)
  return guia ? <GuiaPasos /> : <Wizard />
}

/** Contenedor modal compartido por el asistente y la guía. */
function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="ui-panel ui-pop flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 p-5 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

/**
 * Guía de 3 pasos que cierra la bienvenida: crear un cuarto → recorrer la casa →
 * explorar. Cada tour marca su paso al terminar y devuelve aquí, así el avance
 * queda a la vista (se guarda, por si se cierra a medias).
 */
function GuiaPasos() {
  const t = useT()
  const cerrar = useBienvenida((s) => s.cerrar)
  const hechos = useBienvenida((s) => s.hechos)

  // Al salir del tour se vuelve a la guía; solo cuenta como hecho si llegó al final.
  const lanzar = (def: TutorialDef, paso: PasoGuia) => {
    cerrar()
    void useTutorial.getState().iniciar(def, {
      alTerminar: (completado) => {
        if (completado) useBienvenida.getState().completar(paso)
        useBienvenida.getState().abrirGuia()
      },
    })
  }

  const explorar = () => {
    useBienvenida.getState().completar('explorar')
    cerrar()
  }

  // Abre el editor en Configuraciones, donde vive la sección Cuenta.
  const crearCuenta = () => {
    cerrar()
    useEditorUi.getState().setTab('config')
    useLayout.getState().setEditMode(true)
  }

  const pasos: { id: PasoGuia; titulo: string; desc: string; cta: string; accion: () => void }[] = [
    {
      id: 'cuarto',
      titulo: t('bienvenida.guia.cuarto.titulo', 'Crea un cuarto'),
      desc: t('bienvenida.guia.cuarto.desc', 'Te enseño a crear un cuarto y darle su app.'),
      cta: t('bienvenida.guia.empezar', 'Empezar'),
      accion: () => lanzar(tutorialPrimerosPasos, 'cuarto'),
    },
    {
      id: 'tour',
      titulo: t('bienvenida.guia.tour.titulo', 'Recorre tu casa'),
      desc: t('bienvenida.guia.tour.desc', 'Un paseo por el menú, el movimiento, el reloj y el chat.'),
      cta: t('bienvenida.guia.empezar', 'Empezar'),
      accion: () => lanzar(tutorialCasa, 'tour'),
    },
    {
      id: 'explorar',
      titulo: t('bienvenida.guia.explorar.titulo', 'Explora por tu cuenta'),
      desc: t('bienvenida.guia.explorar.desc', 'Listo. Cada menú y cada app guardan su propio tutorial en el botón ?.'),
      cta: t('bienvenida.guia.salir', 'Salir a la casa'),
      accion: explorar,
    },
  ]
  // El paso activo es el primero pendiente (los demás quedan atenuados).
  const activo = pasos.findIndex((p) => !hechos.includes(p.id))
  const completados = pasos.filter((p) => hechos.includes(p.id)).length

  return (
    <Modal>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-white/90">
            {t('bienvenida.final.titulo', '¡Tu casa está lista!')}
          </h2>
          <p className="mt-0.5 text-sm text-white/60">
            {t('bienvenida.guia.desc', 'Tres pasos para tomarle el modo.')}
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
        >
          ✕
        </button>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="ui-accent-bg h-full rounded-full transition-all duration-300"
            style={{ width: `${(completados / pasos.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-white/45">
          {completados}/{pasos.length}
        </span>
      </div>

      <div className="mt-3 grid gap-2 overflow-y-auto">
        {pasos.map((p, i) => {
          const hecho = hechos.includes(p.id)
          const esActivo = i === activo
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                esActivo ? 'border-accent bg-white/10' : 'border-white/10 bg-white/5'
              } ${hecho ? 'opacity-60' : ''}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                  hecho ? 'ui-accent-bg' : 'bg-white/10 text-white/70'
                }`}
              >
                {hecho ? '✓' : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white/90">{p.titulo}</span>
                <span className="block text-[11px] leading-snug text-white/50">{p.desc}</span>
              </span>
              <button
                type="button"
                onClick={p.accion}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  esActivo
                    ? 'ui-accent-bg'
                    : 'border border-white/10 bg-white/5 font-semibold text-white/70 hover:bg-white/10'
                }`}
              >
                {hecho ? t('bienvenida.guia.repetir', 'Repetir') : p.cta}
              </button>
            </div>
          )
        })}
      </div>

      {hayBackend() && (
        <button
          type="button"
          onClick={crearCuenta}
          className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          {t('bienvenida.cuenta', 'Crear cuenta o entrar (sincroniza tu casa)')}
        </button>
      )}
    </Modal>
  )
}

// Cuatro: el idioma se pregunta antes, en la puerta de entrada (`PuertaIdioma`).
const TOTAL_PASOS = 4

function Wizard() {
  const t = useT()
  const cerrar = useBienvenida((s) => s.cerrar)
  const temaUI = useAjustes((s) => s.temaUI)
  const setTemaUI = useAjustes((s) => s.setTemaUI)
  const modoUI = useAjustes((s) => s.modoUI)
  const setModoUI = useAjustes((s) => s.setModoUI)
  const estiloIconos = useAjustes((s) => s.estiloIconos)
  const setEstiloIconos = useAjustes((s) => s.setEstiloIconos)

  const [paso, setPaso] = useState(0)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [personajeSel, setPersonajeSel] = useState<string>('base')
  const [capturas, setCapturas] = useState<Record<string, string> | null>(null)
  const [mascotaSel, setMascotaSel] = useState<string>(useMascota.getState().mascota)
  const [ocupado, setOcupado] = useState(false)
  // Apps aún sin asignar al abrir: al relanzar no se ofrecen las que ya tienes.
  const disponibles = useMemo(() => {
    const ya = appsAsignadas()
    return plantillasCuarto().filter((p) => !ya.has(p.id))
  }, [])

  const cerrarSinCrear = () => {
    // Se marca como vista igualmente: si no, reaparecería en cada carga.
    localStorage.setItem(LS_BIENVENIDA, '1')
    cerrar()
  }

  const confirmar = async () => {
    setOcupado(true)
    try {
      const ya = appsAsignadas()
      for (const pid of seleccion) {
        if (ya.has(pid)) continue
        const p = getPlantilla(pid)
        if (!p) continue
        // Secuencial: cada cuarto espera su colocación antes de crear el siguiente.
        const cuartoId = await useCuartos.getState().crear({ categoria: p.categoria })
        await asignarPlantillaACuarto(cuartoId, pid)
      }
      // Aplica el personaje elegido como cuerpo del avatar.
      const diseno = useDiseño.getState()
      if (personajeSel === 'base') {
        await diseno.quitarAvatarModelo()
      } else if (MASCOTAS.some((m) => m.id === personajeSel)) {
        await diseno.setAvatarForma(personajeSel as MascotaId)
      } else {
        const preset = CUERPOS_PRESET.find((c) => c.id === personajeSel)
        if (preset) await diseno.setAvatarCuerpoPreset(preset)
      }
      await useMascota.getState().setMascota(mascotaSel)
      localStorage.setItem(LS_BIENVENIDA, '1')
      useBienvenida.getState().abrirGuia()
    } finally {
      setOcupado(false)
    }
  }

  const modos: { id: ModoUI; label: string; icono: 'dia' | 'noche' | 'burbujas' }[] = [
    { id: 'claro', label: t('ajustes.modo.claro', 'Claro'), icono: 'dia' },
    { id: 'oscuro', label: t('ajustes.modo.oscuro', 'Oscuro'), icono: 'noche' },
    {
      id: 'transparente',
      label: t('ajustes.modo.transparente', 'Transparente'),
      icono: 'burbujas',
    },
  ]
  // Cada botón previsualiza su propio estilo (emoji fijo / SVG fijo).
  const estilos: { id: EstiloIconos; label: string; muestra: ReactNode }[] = [
    { id: 'emoji', label: t('ajustes.iconos.emoji', 'Emojis'), muestra: <span>😀</span> },
    {
      id: 'profesional',
      label: t('ajustes.iconos.profesional', 'Profesional'),
      muestra: <Shapes size="1em" strokeWidth={2} className="inline-block" />,
    },
  ]
  const titulos = [
    t('bienvenida.apariencia.titulo', '¿Cómo quieres ver la interfaz?'),
    t('bienvenida.intereses.titulo', '¿Qué te interesa llevar aquí?'),
    t('bienvenida.personaje.titulo', '¿Qué personaje quieres ser?'),
    t('bienvenida.asistente.titulo', '¿Quién te acompaña?'),
  ]

  return (
    <Modal>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('bienvenida.titulo', 'Te damos la bienvenida a Mind Planner Home')} ·{' '}
            {t('bienvenida.paso', 'Paso {n} de {m}', { n: paso + 1, m: TOTAL_PASOS })}
          </p>
          <h2 className="text-lg font-black text-white/90">{titulos[paso]}</h2>
        </div>
        <button
          type="button"
          onClick={cerrarSinCrear}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
        >
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {paso === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              {t(
                'bienvenida.intereses.desc',
                'Cada interés se vuelve un cuarto de tu casa con su app. Elige los que quieras.',
              )}
            </p>
            {disponibles.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                {t('bienvenida.intereses.todas', 'Tu casa ya tiene todas las apps disponibles.')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {disponibles.map((p) => {
                  const activo = seleccion.has(p.id)
                  const corta = CORTAS[p.id]
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSeleccion((s) => {
                          const n = new Set(s)
                          if (n.has(p.id)) n.delete(p.id)
                          else n.add(p.id)
                          return n
                        })
                      }
                      className={`flex flex-col gap-1 rounded-xl border p-2 text-start transition ${
                        activo
                          ? 'border-accent bg-white/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {/* El cuarto que arma la app, con sus objetos ya colocados. */}
                      <MiniaturaCuarto
                        siembra={objetosDe(p.id)}
                        color={p.color}
                        tema={null}
                        className="h-16 w-full object-contain"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-white/90">
                          {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
                        </span>
                        {corta && (
                          <span className="block text-[10px] leading-snug text-white/45">
                            {t(`room.${p.id}.corta`, corta)}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {paso === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                {t('ajustes.modo', 'Apariencia')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {modos.map((m) => {
                  const activo = modoUI === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModoUI(m.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                        m.id === 'transparente' ? 'col-span-2' : ''
                      } ${
                        activo
                          ? 'ui-accent-bg border-transparent'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Icono nombre={m.icono} />
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                {t('ajustes.iconos', 'Estilo de iconos')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {estilos.map((e) => {
                  const activo = estiloIconos === e.id
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEstiloIconos(e.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                        activo
                          ? 'ui-accent-bg border-transparent'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {e.muestra}
                      <span>{e.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                {t('ajustes.tema', 'Tema de la interfaz')}
              </p>
              <div className="grid gap-1.5">
                {TEMAS_UI.map((tema) => {
                  const activo = temaUI === tema.id
                  return (
                    <button
                      key={tema.id}
                      type="button"
                      onClick={() => setTemaUI(tema.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        activo
                          ? 'border-accent bg-white/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                        style={{ background: tema.vars[modoBase(modoUI)]['--ui-accent'] }}
                      />
                      <Icono emoji={tema.icon} />
                      <span className="flex-1 text-start">{t(`temaUI.${tema.id}`, tema.nombre)}</span>
                      {activo && <span className="text-accent">●</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              {t(
                'bienvenida.personaje.desc',
                'Este será tu cuerpo en la casa. Puedes seguir personalizándolo después en el editor.',
              )}
            </p>
            {!capturas ? (
              <>
                <p className="py-6 text-center text-sm text-white/40">
                  {t('bienvenida.personaje.generando', 'Preparando vistas previas…')}
                </p>
                <CapturaPersonajes onListo={setCapturas} />
              </>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {PERSONAJES_ONBOARDING.map((p) => {
                  const activo = personajeSel === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersonajeSel(p.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                        activo
                          ? 'border-accent bg-white/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <img src={capturas[p.id]} alt="" className="h-14 w-14 object-contain" />
                      <span className="w-full truncate text-center text-[10px] font-semibold text-white/75">
                        {t(
                          p.id === 'base'
                            ? 'editor.pers.modeloBase'
                            : MASCOTAS.some((m) => m.id === p.id)
                              ? `mascota.${p.id}.nombre`
                              : `editor.pers.cuerpo.${p.id}`,
                          p.nombre,
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              {t('bienvenida.asistente.desc', 'Tu asistente habla contigo en el chat y vive en el mapa.')}
            </p>
            <div className="grid gap-2">
              {MASCOTAS.map((m) => {
                const activo = mascotaSel === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMascotaSel(m.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-start transition ${
                      activo
                        ? 'border-accent bg-white/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* El personaje 3D, ya capturado en el paso anterior (mismo id). */}
                    {capturas?.[m.id] ? (
                      <img src={capturas[m.id]} alt="" className="h-10 w-10 shrink-0 object-contain" />
                    ) : (
                      <span className="text-2xl">
                        <Icono emoji={m.emoji} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white/90">
                        {t(`mascota.${m.id}.nombre`, m.nombre)}
                      </span>
                      <span className="block text-[11px] leading-snug text-white/50">
                        {t(`mascota.${m.id}.saludo`, m.saludo)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </div>

      <footer className="flex items-center gap-2">
        {paso > 0 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            disabled={ocupado}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            {t('bienvenida.atras', 'Atrás')}
          </button>
        )}
        <div className="flex-1" />
        {paso < TOTAL_PASOS - 1 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => p + 1)}
            className="ui-accent-bg rounded-xl px-5 py-2 text-sm font-bold"
          >
            {t('bienvenida.siguiente', 'Siguiente')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={ocupado}
            className="ui-accent-bg rounded-xl px-5 py-2 text-sm font-bold disabled:opacity-60"
          >
            {ocupado
              ? t('bienvenida.creando', 'Creando tu casa…')
              : t('bienvenida.crear', 'Crear mi casa')}
          </button>
        )}
      </footer>
    </Modal>
  )
}
