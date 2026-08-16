import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import { AvatarModelo } from '../house/AvatarModelo'
import { useDiseño } from '../state/disenoStore'
import { useCuartos } from '../state/cuartosStore'
import {
  EMOJI_HUMOR,
  type Humor,
  type ProgresoJugador,
  type ProgresoPlantilla,
} from '../gamificacion/actividad'
import { useWrappedUi } from '../state/wrappedUiStore'
import { useSisifoUi } from '../state/sisifoUiStore'
import { useLayout } from '../state/layoutStore'
import { useEditorUi, PERSONAJE_AVATAR } from '../state/editorUiStore'
import { useSisifo, marcarSisifoVisto } from '../gamificacion/sisifo'
import { DIAS_META, RANGOS, colorArcoiris, nombreRango } from '../gamificacion/sisifoData'
import { useT } from '../i18n/useT'
import { useNombreCuarto } from './roomDisplay'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/** Barra de progreso compacta con color propio. */
function Barra({ valor, color }: { valor: number; color: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, valor)) * 100)}%`, background: color }}
      />
    </div>
  )
}

/**
 * Radar de XP por cuarto: cada cuarto de la casa es un vértice y su valor es la
 * suma de XP de las apps asignadas a objetos de ese cuarto. Escala relativa al
 * cuarto con más XP; crear un cuarto nuevo agrega su vértice automáticamente.
 */
function RadarCuartos({ enfoques }: { enfoques: ProgresoPlantilla[] }) {
  const t = useT()
  const nombreCuarto = useNombreCuarto()
  const cuartos = useCuartos((s) => s.cuartos)
  // Solo pares cuarto::app (estables al mover objetos): el radar no depende de posiciones.
  const asignaciones = useDiseño(
    useShallow((s) => s.objetos.filter((o) => !!o.plantillaId).map((o) => `${o.roomId}::${o.plantillaId}`)),
  )
  const roomColors = useDiseño((s) => s.roomColors)

  const xpDe = new Map(enfoques.map((e) => [e.plantillaId, e.xp]))
  const datos = [...cuartos]
    .sort((a, b) => a.orden - b.orden)
    .map((c) => {
      const apps = new Set(
        asignaciones.filter((a) => a.startsWith(`${c.id}::`)).map((a) => a.slice(c.id.length + 2)),
      )
      return {
        id: c.id,
        icon: c.icon,
        nombre: nombreCuarto(c),
        color: roomColors[c.id] ?? c.color,
        xp: [...apps].reduce((acc, p) => acc + (xpDe.get(p) ?? 0), 0),
      }
    })
  if (datos.length === 0) return null

  const cx = 100
  const cy = 96
  const R = 60
  const maxXp = Math.max(1, ...datos.map((d) => d.xp))
  const punto = (i: number, r: number): [number, number] => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / datos.length
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]
  }
  const anillo = (f: number) => datos.map((_, i) => punto(i, R * f).join(',')).join(' ')
  const poligono = datos.map((d, i) => punto(i, R * (d.xp / maxXp)).join(',')).join(' ')

  return (
    <div data-tut="progreso.radar" className="mt-3">
      <svg viewBox="0 0 200 192" className="mx-auto block w-full max-w-[220px]" role="img">
        {[1 / 3, 2 / 3, 1].map((f) => (
          <polygon key={f} points={anillo(f)} fill="none" stroke="color-mix(in srgb, var(--ui-ink) 12%, transparent)" />
        ))}
        {datos.map((d, i) => {
          const [x, y] = punto(i, R)
          return (
            <line key={d.id} x1={cx} y1={cy} x2={x} y2={y} stroke="color-mix(in srgb, var(--ui-ink) 12%, transparent)" />
          )
        })}
        <polygon
          points={poligono}
          fill="rgba(52,211,153,0.22)"
          stroke="#34d399"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {datos.map((d, i) => {
          const [x, y] = punto(i, R * (d.xp / maxXp))
          const [ex, ey] = punto(i, R + 16)
          return (
            <g key={d.id}>
              <circle cx={x} cy={y} r="2.6" fill={d.color}>
                <title>{`${d.nombre}: ${d.xp} XP`}</title>
              </circle>
              <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" fontSize="12">
                <title>{`${d.nombre}: ${d.xp} XP`}</title>
                {d.icon}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-center text-[10px] text-white/40">
        {t('progreso.radarCuartos', 'XP por cuarto')}
      </p>
    </div>
  )
}

/** Render 3D compacto del avatar del jugador (el mismo modelo que en la casa).
 * Exportado: la portada del Wrapped también lo muestra. */
export function AvatarMini() {
  const avatar = useDiseño((s) => s.avatar)
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [1.5, 1.3, 3], fov: 30, near: 0.1, far: 100 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />
      {/* Centra el avatar en el origen (la cámara mira ahí por defecto). */}
      <group position={[0, -0.85, 0]}>
        <AvatarModelo av={avatar} />
      </group>
    </Canvas>
  )
}

/** Cabecera plegable reutilizable de las cartas del resumen. */
function CabeceraPlegable({
  abierto,
  onToggle,
  children,
}: {
  abierto: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-2 text-start"
    >
      {children}
      <span className="shrink-0 text-[10px] text-white/40">{abierto ? '▾' : '▸'}</span>
    </button>
  )
}

/**
 * Insignia circular con anillo de progreso y un símbolo SVG con fondo de color:
 * botón compacto que abre la Montaña de Sísifo. Flanquea la cabeza del avatar
 * (rango a la izquierda, insignias a la derecha).
 */
function AroSisifo({
  valor,
  color,
  icono,
  title,
  onClick,
  ping,
}: {
  valor: number
  color: string
  icono: NombreIcono
  title: string
  onClick: () => void
  ping?: boolean
}) {
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:opacity-90"
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="color-mix(in srgb, var(--ui-ink) 12%, transparent)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, valor)))}
        />
      </svg>
      <span
        className="relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] text-white"
        style={{ background: color }}
      >
        <Icono nombre={icono} />
      </span>
      {ping && <span className="ui-accent-bg absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full" />}
    </button>
  )
}

/**
 * Resumen del jugador (tamagotchi) que encabeza la pestaña Cuartos: el
 * personaje vive de la actividad real en las apps asignadas (registrar
 * comidas, sesiones, gastos, etc. lo alimenta; abandonarlo lo entristece).
 * Personaje y nivel viven en una sola carta plegable.
 */
export function ResumenJugador({ progreso }: { progreso: ProgresoJugador | undefined }) {
  const t = useT()
  const nombreAvatar = useDiseño((s) => s.avatar.nombre)
  const [abierto, setAbierto] = useState(true)
  const hayNuevo = useWrappedUi((s) => s.hayNuevo)
  const sisifo = useSisifo()
  const abrirMontana = () => {
    if (sisifo) void marcarSisifoVisto(sisifo.insignias)
    useSisifoUi.getState().abrir()
  }
  const editarAvatar = () => {
    useLayout.getState().setEditMode(true)
    useEditorUi.getState().editarPersonaje(PERSONAJE_AVATAR)
  }

  if (!progreso) {
    return (
      <p className="px-2 py-6 text-center text-xs text-white/40">
        {t('progreso.cargando', 'Calculando tu progreso…')}
      </p>
    )
  }

  const FRASES: Record<Humor, string> = {
    feliz: t('progreso.humor.feliz', '¡Está feliz! Sigue con tu racha.'),
    contento: t('progreso.humor.contento', 'Está contento. Un registro más hoy lo animará.'),
    triste: t('progreso.humor.triste', 'Está triste… registra algo en tus apps para animarlo.'),
    dormido: t('progreso.humor.dormido', 'Está dormido. Usa tus apps para despertarlo.'),
  }

  return (
    <div className="mb-4 px-2">
      <section data-tut="progreso.resumen" data-tut-zona="progreso" className="rounded-xl border border-white/10 bg-white/5">
        <CabeceraPlegable abierto={abierto} onToggle={() => setAbierto(!abierto)}>
          <span className="text-base leading-none">
            <Icono emoji={EMOJI_HUMOR[progreso.humor]} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/90">
            {nombreAvatar || t('progreso.jugador', 'Tu personaje')}
          </span>
          {/* Punto de "hay un resumen nuevo sin ver" (aunque la carta esté plegada). */}
          {hayNuevo && (
            <span
              className="ui-accent-bg h-2 w-2 shrink-0 rounded-full"
              title={t('wrapped.nuevoTitulo', 'Tienes un resumen nuevo')}
            />
          )}
          <span className="shrink-0 text-[11px] font-semibold text-white/60">
            {t('progreso.nivel', 'Nivel')} {progreso.nivel}
          </span>
        </CabeceraPlegable>

        {abierto && (
          <div className="px-3 pb-3 text-center">
            <div className="relative mx-auto h-32 w-full">
              {/* Rango actual (Montaña de Sísifo): a la altura de la cabeza, a la izquierda. */}
              {sisifo && (
                <div data-tut="progreso.sisifo.rango" className="absolute start-0 top-1 z-10 flex flex-col items-center gap-1">
                  <AroSisifo
                    valor={sisifo.altura / DIAS_META}
                    color={RANGOS[sisifo.rango - 1].color}
                    icono="montaña"
                    onClick={abrirMontana}
                    title={`${nombreRango(RANGOS[sisifo.rango - 1])} · ${t('sisifo.dia', 'Día')} ${sisifo.altura}/${DIAS_META}`}
                  />
                  <span className="text-[10px] font-semibold text-white/60">{sisifo.rango}/12</span>
                </div>
              )}
              <button
                type="button"
                data-tut="progreso.avatar"
                onClick={editarAvatar}
                title={t('progreso.editarAvatar', 'Editar tu personaje')}
                className="block h-full w-full"
              >
                <AvatarMini />
              </button>
              {/* Insignias ganadas (Montaña de Sísifo): a la altura de la cabeza, a la derecha. */}
              {sisifo && (
                <div data-tut="progreso.sisifo.insignias" className="absolute end-0 top-1 z-10 flex flex-col items-center gap-1">
                  <AroSisifo
                    valor={sisifo.insignias / 52}
                    color={colorArcoiris(Math.max(1, sisifo.insignias))}
                    icono="gema"
                    onClick={abrirMontana}
                    title={`${sisifo.insignias}/52 ${t('sisifo.insignias', 'insignias')}`}
                    ping={sisifo.hayNuevo}
                  />
                  <span className="text-[10px] font-semibold text-white/60">{sisifo.insignias}/52</span>
                </div>
              )}
            </div>
            <p className="text-[11px] leading-snug text-white/50">{FRASES[progreso.humor]}</p>

            {/* El Wrapped del personaje: su resumen semanal/mensual/anual. */}
            <button
              type="button"
              data-tut="progreso.wrapped"
              onClick={() => useWrappedUi.getState().abrir()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/10"
            >
              <Icono nombre="brillo" /> {t('wrapped.menu', 'Tu resumen')}
              {hayNuevo && (
                <span className="ui-accent-bg rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {t('wrapped.nuevo', 'Nuevo')}
                </span>
              )}
            </button>

            {/* Radar de XP por cuarto (sustituye a las barras de salud/energía). */}
            <RadarCuartos enfoques={progreso.enfoques} />

            {/* ── Nivel y racha ── */}
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-start">
              <div className="flex items-center gap-2">
                <Barra valor={progreso.avanceNivel} color="#34d399" />
                <span className="shrink-0 text-[10px] text-white/40">
                  {Math.round(progreso.avanceNivel * 100)}%
                </span>
                <span className="shrink-0 text-[10px] text-white/45">{progreso.xp} XP</span>
              </div>
              <p className="text-[11px] text-white/60">
                <Icono nombre="racha" /> {t('progreso.racha', 'Racha')}:{' '}
                <b className="text-white/85">
                  {progreso.racha} {t('progreso.dias', progreso.racha === 1 ? 'día' : 'días')}
                </b>
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/** Progreso compacto de la app de un cuarto, incrustado en su card del menú. */
export function ProgresoApp({ enfoque, color }: { enfoque: ProgresoPlantilla; color: string }) {
  const t = useT()
  return (
    <div className="mt-1.5 border-t border-white/[0.06] pt-1.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-bold text-white/55">{t('progreso.nv', 'Nv')} {enfoque.nivel}</span>
        <Barra valor={enfoque.avanceNivel} color={color} />
        <span className="shrink-0 text-[10px] text-white/40">{enfoque.xp} XP</span>
      </div>
      <div className="mt-1 flex gap-3 text-[10px] text-white/45">
        <span><Icono nombre="racha" /> {enfoque.racha}</span>
        <span>
          {t('progreso.hoy', 'Hoy')}: {enfoque.hoy > 0 ? `✓ ${enfoque.hoy}` : '—'}
        </span>
        <span>
          {t('progreso.semana', '7 días')}: {enfoque.dias7}/7
        </span>
      </div>
    </div>
  )
}
