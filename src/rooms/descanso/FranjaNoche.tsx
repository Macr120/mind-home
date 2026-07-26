import { useEffect, useState } from 'react'
import { estadoCielo } from '../../core/house/cielo'
import { mezclar } from '../../core/house/temas'
import { aMin } from './puntuacion'

/**
 * La ventana de sueño dibujada como un cielo REAL: cada punto de la franja es
 * una hora concreta y toma el color que el ciclo día/noche de la casa
 * (`core/house/cielo.ts`) tiene a esa hora. Dormir 21:00–05:00 se ve distinto
 * de 03:00–11:00, porque de verdad lo es.
 *
 * Encima va lo que cambia solo con el reloj: las estrellas se apagan donde el
 * cielo aclara, la luna (con su fase de hoy) cruza la noche siguiendo la hora
 * actual, y si estás dentro de tu horario aparece la marca del «ahora».
 */

const ANCHO = 320
const ALTO = 108

const dd = (n: number) => String(n).padStart(2, '0')

/** Oscuridad del cielo a ese minuto del día (0 = día pleno, 1 = noche cerrada). */
const oscuridadEn = (min: number) => estadoCielo(((min % 1440) + 1440) % 1440).nocheFactor

/** Color del cielo a ese minuto, oscurecido para que la franja no compita con el panel. */
function colorEn(min: number): string {
  const est = estadoCielo(((min % 1440) + 1440) % 1440)
  return mezclar(est.cieloColor, '#04060f', est.nocheFactor * 0.72)
}

/**
 * Tinta legible sobre el cielo de ese minuto: quien duerme de día (o despierta
 * ya con el sol alto) tiene ese trozo de franja claro, y el texto blanco ahí no
 * se lee. Se decide por la luminancia del color final, no por la hora: el
 * naranja del atardecer es «claro» de día pero oscuro ya oscurecido.
 */
const tinta = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5 ? '#0b1020' : '#ffffff'
}

const tintaEn = (min: number) => tinta(colorEn(min))

/** PRNG determinista: mismas estrellas para el mismo horario, sin titileo al repintar. */
function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fase lunar 0–1 (0 = luna nueva) contando desde una luna nueva conocida. */
function faseLunar(fecha: Date): number {
  const NUEVA = Date.UTC(2000, 0, 6, 18, 14)
  const SINODICO = 29.530588853 * 86_400_000
  return ((((fecha.getTime() - NUEVA) % SINODICO) + SINODICO) % SINODICO) / SINODICO
}

const EMOJIS_LUNA = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

/** Minuto del día actual; se refresca al cambiar el minuto, no en cada render. */
function useMinutoActual(): number {
  const [min, setMin] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  useEffect(() => {
    // El primer salto se alinea con el minuto en punto; a partir de ahí, cada minuto.
    let intervalo = 0
    const tic = () => {
      const d = new Date()
      setMin(d.getHours() * 60 + d.getMinutes())
    }
    const arranque = window.setTimeout(
      () => {
        tic()
        intervalo = window.setInterval(tic, 60_000)
      },
      (60 - new Date().getSeconds()) * 1000,
    )
    return () => {
      window.clearTimeout(arranque)
      window.clearInterval(intervalo)
    }
  }, [])
  return min
}

export function FranjaNoche({
  dormir,
  despertar,
  caption,
  horas,
  textoFalta,
}: {
  dormir: string
  despertar: string
  caption: string
  /** Duración de la ventana, ya formateada por la app ('8 h'). */
  horas: string
  /** Texto de lo que falta para despertar; solo se pinta dentro del horario. */
  textoFalta: (minutos: number) => string
}) {
  const ahora = useMinutoActual()
  const ini = aMin(dormir)
  const fin = aMin(despertar)
  const ok = !Number.isNaN(ini) && !Number.isNaN(fin)
  // Minutos de ventana: al cruzar la medianoche el fin cae "al día siguiente".
  const total = ok ? (fin - ini + 1440) % 1440 || 1440 : 0

  const transcurrido = ok ? (ahora - ini + 1440) % 1440 : 0
  const dentro = ok && transcurrido < total
  const progreso = total ? transcurrido / total : 0

  // Una muestra del cielo por cada media hora de ventana (entre 12 y 48).
  const n = Math.min(48, Math.max(12, Math.round(total / 30)))
  const paradas = !ok
    ? []
    : Array.from({ length: n + 1 }, (_, i) => ({
        offset: i / n,
        color: colorEn(ini + (total * i) / n),
      }))

  // Estrellas: más cuanto más larga la noche, y brillo según lo oscuro que esté
  // el cielo justo debajo de cada una (en el alba se apagan solas).
  const rnd = aleatorio(ini * 1440 + total)
  const estrellas = !ok
    ? []
    : Array.from({ length: Math.round(14 + Math.min(total, 720) / 24) }, () => {
        const fx = rnd()
        return {
          fx,
          // Se reparten arriba y en una banda baja, dejando libre el centro del texto.
          y: rnd() < 0.75 ? 8 + rnd() * 26 : 62 + rnd() * 12,
          r: 0.7 + rnd() * 0.8,
          o: (0.25 + rnd() * 0.6) * oscuridadEn(ini + total * fx),
        }
      })

  // La fase se congela al montar: `new Date()` suelto en render viola la pureza.
  const [montadoEn] = useState(() => Date.now())
  const luna = EMOJIS_LUNA[Math.round(faseLunar(new Date(montadoEn)) * 8) % 8]

  // Marcas: cada hora en punto de la ventana; se etiquetan las pares salvo que
  // la ventana sea corta, donde caben todas.
  const marcas: { x: number; hora: number; tinta: string }[] = []
  if (ok && total > 0) {
    for (let m = Math.ceil((ini + 1) / 60) * 60; m < ini + total; m += 60) {
      const x = ((m - ini) / total) * ANCHO
      // Pegadas al borde la etiqueta saldría cortada: esa hora se salta.
      if (x < 9 || x > ANCHO - 9) continue
      marcas.push({ x, hora: Math.floor(m / 60) % 24, tinta: tintaEn(m) })
    }
  }
  const cadaHora = marcas.length <= 7
  // El bloque central se lee sobre el cielo de media noche ya velado por el halo
  // (misma opacidad que el halo bajo el texto), no sobre el cielo pelado.
  const tintaCentro = ok ? tinta(mezclar(colorEn(ini + total / 2), '#040711', 0.5)) : '#ffffff'
  const xAhora = progreso * ANCHO
  // El astro describe un arco sobre la franja en vez de arrastrarse por el borde.
  const yAstro = 42 - Math.sin(progreso * Math.PI) * 17

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full">
      <defs>
        <linearGradient id="cielo-noche" x1="0" y1="0" x2="1" y2="0">
          {paradas.map((p) => (
            <stop key={p.offset} offset={p.offset} stopColor={p.color} />
          ))}
        </linearGradient>
        {/* El pie se apaga un poco: da profundidad sin ensuciar el cielo claro. */}
        <linearGradient id="cielo-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        {/* Halo central: el texto grande se lee igual si el horario cae de día. */}
        <radialGradient id="cielo-halo" cx="0.5" cy="0.58" r="0.62">
          <stop offset="0" stopColor="#040711" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#040711" stopOpacity="0.5" />
          <stop offset="1" stopColor="#040711" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width={ANCHO} height={ALTO} rx="14" fill="url(#cielo-noche)" />
      {estrellas.map((e, i) => (
        <circle key={i} cx={e.fx * ANCHO} cy={e.y} r={e.r} fill="#fff" opacity={e.o} />
      ))}
      <rect x="0" y="0" width={ANCHO} height={ALTO} rx="14" fill="url(#cielo-suelo)" />
      <rect x="0" y="0" width={ANCHO} height={ALTO} rx="14" fill="url(#cielo-halo)" />

      {ok && (
        <>
          {/* Mientras duermes, la luna de hoy (con su fase) cruza tu noche. */}
          {dentro && (
            <>
              <line
                x1={xAhora}
                y1="6"
                x2={xAhora}
                y2={ALTO - 26}
                stroke={tintaEn(ahora)}
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text x={xAhora} y={yAstro} textAnchor="middle" fontSize="15">
                {luna}
              </text>
            </>
          )}
          <text x="10" y="24" fontSize="10">
            🛏️
          </text>
          <text x="36" y="24" fill={tintaEn(ini)} opacity={0.85} fontSize="10" fontWeight="700">
            {dormir}
          </text>
          <text x={ANCHO - 11} y="24" textAnchor="end" fontSize="11">
            ☀️
          </text>
          <text
            x={ANCHO - 30}
            y="24"
            textAnchor="end"
            fill={tintaEn(fin)}
            opacity={0.85}
            fontSize="10"
            fontWeight="700"
          >
            {despertar}
          </text>
        </>
      )}

      <text x={ANCHO / 2} y="58" textAnchor="middle" fill={tintaCentro} fontSize="22" fontWeight="900">
        {ok ? horas : '—'}
      </text>
      <text x={ANCHO / 2} y="72" textAnchor="middle" fill={tintaCentro} opacity={0.7} fontSize="9">
        {caption}
      </text>
      {dentro && (
        <text
          x={ANCHO / 2}
          y="84"
          textAnchor="middle"
          fill={tintaCentro}
          opacity={0.9}
          fontSize="8"
          fontWeight="700"
        >
          {textoFalta(total - transcurrido)}
        </text>
      )}

      {marcas.map(({ x, hora, tinta }) => (
        <g key={hora} opacity={0.55}>
          <line x1={x} y1={90} x2={x} y2={96} stroke={tinta} strokeWidth={1} />
          {(cadaHora || hora % 2 === 0) && (
            <text x={x} y={105} textAnchor="middle" fill={tinta} fontSize="7.5" fontWeight="600">
              {dd(hora)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
