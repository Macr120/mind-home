import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { getPlantilla } from '../registry'
import { sonar } from '../audio/sfx'
import { vibrar } from '../audio/vibrar'
import { vivo } from '../ui/estilos'
import { Icono } from '../ui/iconos/Icono'
import { Barra } from '../ui/Barra'
import { useCelebracion, type Celebracion } from '../state/celebracionStore'
import { XP_POR_NIVEL } from './actividad'
import { festejarAleatorio } from './festejo'
import { GB_POR_NIVEL } from '../cuenta/almacenUso'

/**
 * Las celebraciones de la gamificación (ver `celebracionStore`), de menor a
 * mayor: racha (tarjeta en el tercio superior que se va sola), lista cumplida (tarjeta con la barra de
 * XP animándose) y subida de nivel (la grande). Montado SIEMPRE en App —no
 * lazy: reacciona sin acción del usuario— y sin coste en reposo (`null` sin
 * celebración pendiente). Vive en la raíz, fuera de todo `backdrop-blur`, así
 * que `fixed` sí es la pantalla y no necesita portal.
 */

/** Cuánto vive cada celebración si el usuario no la toca (ms). */
const DURACION: Record<Celebracion['tipo'], number> = { racha: 2600, lista: 5000, nivel: 6500, suscripcion: 15000 }

/** Créditos de IA al mes del nivel 1 de Pro; los demás son múltiplos (`productos.ts`). */
const CREDITOS_BASE = 700

/** El dorado de la bienvenida a Pro: no depende de ninguna app. */
const COLOR_PRO = '#f5b83d'

const claveDe = (c: Celebracion) =>
  c.tipo === 'racha'
    ? `racha:${c.plantillaId}:${c.racha}`
    : c.tipo === 'lista'
      ? `lista:${c.plantillaId}:${c.xpDespues}`
      : c.tipo === 'nivel'
        ? `nivel:${c.plantillaId}:${c.nivel}`
        : `suscripcion:${c.nivel}:${c.restaurada}`

export function CelebracionesOverlay() {
  const actual = useCelebracion((s) => s.actual)
  if (!actual) return null
  // key por contenido: cada celebración monta de cero (sonido, timer, barra).
  if (actual.tipo === 'suscripcion') return <BienvenidaPro key={claveDe(actual)} nivel={actual.nivel} restaurada={actual.restaurada} />
  return <Celebrando key={claveDe(actual)} c={actual} />
}

/**
 * La bienvenida a Pro (o su vuelta al restaurar): lo que trae el nivel, dicho en
 * grande y con fiesta. Una compra que solo cambia una etiqueta en Ajustes no se
 * siente, y en la tienda además parece que el botón no hizo nada.
 */
function BienvenidaPro({ nivel, restaurada }: { nivel: number; restaurada: boolean }) {
  const t = useT()
  const avanzar = useCelebracion((s) => s.avanzar)

  useEffect(() => {
    sonar('nivel')
    vibrar(60)
    festejarAleatorio()
    const timer = window.setTimeout(() => useCelebracion.getState().avanzar(), DURACION.suscripcion)
    return () => window.clearTimeout(timer)
  }, [])

  const ventajas = [
    { icono: 'energia', texto: t('celebra.pro.creditos', '{n} créditos de IA cada mes', { n: (nivel * CREDITOS_BASE).toLocaleString() }) },
    { icono: 'sincronizar', texto: t('celebra.pro.sync', 'Sincronización entre todos tus dispositivos') },
    { icono: 'nube', texto: t('celebra.pro.nube', '{gb} GB de almacenamiento en tu nube', { gb: GB_POR_NIVEL[nivel] ?? GB_POR_NIVEL[1] }) },
  ] as const

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="ui-scrim" onClick={avanzar} />
      <div
        role="dialog"
        aria-modal="true"
        className="ui-panel-legible ui-pop relative w-full max-w-sm overflow-hidden rounded-2xl border p-6 text-center"
        style={{ borderColor: `${COLOR_PRO}66`, backgroundImage: `linear-gradient(${COLOR_PRO}1a, transparent 60%)` }}
      >
        {DESTELLOS.map((d) => (
          <span
            key={d.delay}
            aria-hidden
            className={`celebra-destello texto-vivo pointer-events-none absolute ${d.size}`}
            style={{ ...vivo(COLOR_PRO), top: d.top, left: d.left, animationDelay: d.delay }}
          >
            ✦
          </span>
        ))}
        <p className="text-5xl">
          <Icono nombre="corona" />
        </p>
        <p className="texto-vivo mt-2 text-2xl font-black" style={vivo(COLOR_PRO)}>
          {restaurada ? t('celebra.pro.tituloRestaurada', '¡Tu suscripción está de vuelta!') : t('celebra.pro.titulo', '¡Felicidades!')}
        </p>
        <p className="mt-1 text-sm font-bold text-white/90">
          {t('celebra.pro.nivel', 'Ahora tienes Pro · Nivel ×{n}', { n: nivel })}
        </p>
        <ul className="mt-4 space-y-2 text-start">
          {ventajas.map((v) => (
            <li key={v.icono} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="texto-vivo shrink-0 text-xl" style={vivo(COLOR_PRO)}>
                <Icono nombre={v.icono} />
              </span>
              <span className="text-sm font-semibold text-white/85">{v.texto}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={avanzar}
          className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-black"
          style={{ background: COLOR_PRO }}
        >
          {t('celebra.pro.seguir', '¡A disfrutarlo!')}
        </button>
      </div>
    </div>
  )
}

/** La barra de nivel animándose del XP viejo al nuevo (a tope si cruza nivel). */
function BarraXp({ xpAntes, xpDespues, color }: { xpAntes: number; xpDespues: number; color: string }) {
  const t = useT()
  const cruzaNivel = Math.floor(xpDespues / XP_POR_NIVEL) > Math.floor(xpAntes / XP_POR_NIVEL)
  const [valor, setValor] = useState((xpAntes % XP_POR_NIVEL) / XP_POR_NIVEL)
  useEffect(() => {
    // Un respiro con el valor viejo pintado; la transición CSS hace el resto.
    const destino = cruzaNivel ? 1 : (xpDespues % XP_POR_NIVEL) / XP_POR_NIVEL
    const timer = window.setTimeout(() => setValor(destino), 250)
    return () => window.clearTimeout(timer)
  }, [cruzaNivel, xpDespues])
  return (
    <div className="flex items-center gap-2">
      <Barra valor={valor} color={color} />
      <span className="shrink-0 text-[10px] text-white/45">{t('progreso.xp', '{n} XP', { n: xpDespues })}</span>
    </div>
  )
}

/** Posiciones y retardos de los ✦ de la tarjeta de nivel. */
const DESTELLOS = [
  { top: '8%', left: '12%', delay: '0s', size: 'text-xl' },
  { top: '18%', left: '82%', delay: '0.3s', size: 'text-sm' },
  { top: '55%', left: '6%', delay: '0.6s', size: 'text-base' },
  { top: '70%', left: '88%', delay: '0.9s', size: 'text-lg' },
  { top: '4%', left: '55%', delay: '1.2s', size: 'text-sm' },
]

function Celebrando({ c }: { c: Exclude<Celebracion, { tipo: 'suscripcion' }> }) {
  const t = useT()
  const avanzar = useCelebracion((s) => s.avanzar)
  const p = getPlantilla(c.plantillaId)
  const color = p?.color ?? '#34d399'
  const nombre = p ? t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0] : c.plantillaId

  useEffect(() => {
    if (c.tipo === 'racha') {
      sonar('recoger')
      vibrar(20)
    } else if (c.tipo === 'lista') {
      sonar('anotacion')
      vibrar(30)
      festejarAleatorio()
    } else {
      sonar('nivel')
      vibrar(60)
      festejarAleatorio()
    }
    const timer = window.setTimeout(() => useCelebracion.getState().avanzar(), DURACION[c.tipo])
    return () => window.clearTimeout(timer)
  }, [c])

  if (c.tipo === 'racha') {
    // En el tercio superior y con fondo sólido: pegada arriba se perdía entre el
    // contenido y tapaba la píldora de la demo. Sin scrim —no bloquea: se va sola
    // o al tocarla—; el tinte va como imagen para no pisar `ui-panel-legible`.
    return (
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[calc(14vh+var(--safe-top))]">
        <button
          type="button"
          onClick={avanzar}
          className="ui-panel-legible ui-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border p-4 text-start shadow-2xl"
          style={{ borderColor: `${color}66`, backgroundImage: `linear-gradient(${color}1f, ${color}1f)` }}
        >
          <span className="text-2xl">
            <Icono nombre="racha" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="texto-vivo text-sm font-bold" style={vivo(color)}>
              {c.racha === 0
                ? t('celebra.racha.titulo0', 'Empieza tu racha hoy')
                : c.racha === 1
                  ? t('celebra.racha.titulo1', '¡Racha de 1 día!')
                  : t('celebra.racha.titulo', '¡Racha de {n} días!', { n: c.racha })}
            </p>
            <p className="text-xs text-white/60">
              {c.racha === 0
                ? t('celebra.racha.cuerpo0', 'Registra algo en {app} y arranca 🔥', { app: nombre })
                : t('celebra.racha.cuerpo', 'Sigue así en {app} 🔥', { app: nombre })}
            </p>
          </div>
        </button>
      </div>
    )
  }

  const esNivel = c.tipo === 'nivel'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="ui-scrim" onClick={avanzar} />
      <div className="ui-panel-legible ui-pop relative w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 p-5 text-center">
        {esNivel &&
          DESTELLOS.map((d) => (
            <span
              key={d.delay}
              aria-hidden
              className={`celebra-destello texto-vivo pointer-events-none absolute ${d.size}`}
              style={{ ...vivo(color), top: d.top, left: d.left, animationDelay: d.delay }}
            >
              ✦
            </span>
          ))}
        <p className={esNivel ? 'text-5xl' : 'text-4xl'}>
          <Icono nombre={esNivel ? 'estrella' : 'trofeo'} />
        </p>
        {esNivel ? (
          <>
            <p className="texto-vivo mt-2 text-3xl font-black" style={vivo(color)}>
              {t('progreso.nv', 'Nv')} {c.nivel}
            </p>
            <p className="mt-1 text-base font-bold text-white/90">
              {t('celebra.nivel.titulo', '¡Subiste de nivel!')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t('celebra.nivel.cuerpo', '{app} alcanzó el nivel {n} 🎉', { app: nombre, n: c.nivel })}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-base font-bold text-white/90">
              {t('celebra.lista.titulo', '¡Misiones del día!')}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {t('celebra.lista.cuerpo', 'Completaste la lista de {app}', { app: nombre })}
            </p>
            <p className="texto-vivo mt-2 text-xl font-black" style={vivo(color)}>
              {t('celebra.lista.xp', '+{xp} XP', { xp: c.xpDespues - c.xpAntes })}
            </p>
            <div className="mt-2">
              <BarraXp xpAntes={c.xpAntes} xpDespues={c.xpDespues} color={color} />
            </div>
          </>
        )}
        <button
          type="button"
          onClick={avanzar}
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold text-white"
          style={{ background: color }}
        >
          {t('celebra.seguir', '¡Seguir!')}
        </button>
      </div>
    </div>
  )
}
