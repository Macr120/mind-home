import type { Cuarto } from '../data/db'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { useAsignar } from '../state/asignarStore'
import { tituloSubtituloCuarto } from './roomDisplay'
import { TechoToggleButton } from './TechoToggleButton'
import { useT } from '../i18n/useT'

const CATEGORIAS: { key: Cuarto['categoria']; label: string }[] = [
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'config', label: 'Configuración' },
]

export function RoomSideMenu({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  const openRoom = useHouse((s) => s.openRoom)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const objetos = useDiseño((s) => s.objetos)
  const editRoom = useLayout((s) => s.editRoom)
  const cuartos = useCuartos((s) => s.cuartos)
  const crear = useCuartos((s) => s.crear)
  const abrirAsignar = useAsignar((s) => s.abrir)

  /** ¿El cuarto tiene al menos un objeto con app (plantilla) asignada? */
  const tieneApp = (id: string) =>
    objetos.some((o) => o.roomId === id && o.plantillaId)

  return (
    <aside
      className="ui-panel flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-white/10"
      aria-label={t('nav.ariaMenu', 'Menú de cuartos')}
    >
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            title={t('nav.retraer', 'Retraer menú')}
            className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-[3px] rounded-md transition hover:bg-white/10"
          >
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black tracking-tight text-white/90">
            🏠 Mind Home
          </h1>
          <TechoToggleButton />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-white/45">
          <b className="text-white/70">{t('nav.ayuda.editar', 'Editar')}</b>{' '}
          {t('nav.ayuda.editarTexto', 'personaliza el cuarto ·')}{' '}
          <b className="text-white/70">{t('nav.ayuda.entrar', 'Entrar')}</b>{' '}
          {t('nav.ayuda.entrarTexto', 'abre la app.')}
        </p>
      </div>

      <div className="scroll-sutil min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {cuartos.length === 0 && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-white/40">
            {t('nav.sinCuartos', 'Aún no hay cuartos. Crea el primero abajo.')}
          </p>
        )}

        {CATEGORIAS.map(({ key, label }) => {
          const grupo = cuartos.filter((c) => c.categoria === key)
          if (grupo.length === 0) return null
          return (
            <section key={key} className="mb-4">
              <h2 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {t(`cat.${key}`, label)}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {grupo.map((cuarto) => {
                  const color = roomColors[cuarto.id] ?? cuarto.color
                  const nombre = roomNames[cuarto.id] || cuarto.nombre
                  const { titulo, subtitulo } = tituloSubtituloCuarto(cuarto, nombre, t)
                  const conApp = tieneApp(cuarto.id)
                  return (
                    <li
                      key={cuarto.id}
                      className="rounded-lg border px-2 py-1.5 transition"
                      style={{
                        borderColor: 'rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
                            style={{ background: `${color}33` }}
                          >
                            {cuarto.icon}
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
                            onClick={() => editRoom(cuarto.id)}
                            title={t('nav.editarCuarto', 'Editar este cuarto')}
                            className="flex min-w-[5.25rem] items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold text-white/80 transition hover:bg-white/12"
                          >
                            <span className="text-sm leading-none">⚙️</span>
                            <span>{t('nav.editar', 'Editar')}</span>
                          </button>
                          {conApp ? (
                            <button
                              type="button"
                              onClick={() => openRoom(cuarto.id)}
                              className="min-w-[5.25rem] rounded-md px-2 py-2 text-xs font-bold transition hover:brightness-110"
                              style={{ background: color, color: '#0f1115' }}
                            >
                              {t('nav.entrar', 'Entrar ›')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirAsignar(cuarto.id)}
                              title={t('nav.asignarApp', 'Asignar una app a este cuarto')}
                              className="min-w-[5.25rem] rounded-md border border-dashed border-white/25 px-2 py-2 text-xs font-bold text-white/70 transition hover:border-white/45 hover:text-white/90"
                            >
                              {t('nav.asignar', '+ Asignar')}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {/* Crear cuarto nuevo (genérico, vacío). */}
        <button
          type="button"
          onClick={() => crear()}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white/90"
        >
          ➕ {t('nav.crearCuarto', 'Crear cuarto')}
        </button>
      </div>
    </aside>
  )
}

/** Menú retraído: botón flotante (3 líneas + Mind Home) y toggle de techo. */
export function FloatingMenuButton({ onToggle }: { onToggle: () => void }) {
  const t = useT()
  return (
    <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        title={t('nav.abrir', 'Abrir menú')}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15"
      >
        <span className="flex flex-col items-center justify-center gap-[3px]">
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
        </span>
        <span className="text-sm font-black text-white/90">🏠 Mind Home</span>
      </button>
      <TechoToggleButton />
    </div>
  )
}
