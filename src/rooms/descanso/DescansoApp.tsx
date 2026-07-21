import { useEffect, useRef, useState } from 'react'
import { rutinasRepo, suenoRepo, perfilSuenoRepo } from '../../core/data/repository'
import type { PerfilSueno, RegistroSueno } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { BannerAviso } from '../../core/ui/BannerAviso'
import { FilaAviso } from '../../core/ui/FilaAviso'
import { Icono } from '../../core/ui/iconos/Icono'
import { aMin, distanciaMin, duracionHoras, puntuarNoche, type Puntuacion } from './puntuacion'
import { useAlarma, useRecordatorio } from './useAlarma'
import { buscarRutinaSueno, sincronizarRutinaSueno } from './rutinaSueno'
import { fechaLocalISO } from '../../core/fechaLocal'

const hoy = () => fechaLocalISO()

/** Cuánto antes de dormir se avisa de dejar las pantallas. */
const MIN_PANTALLAS = 60

const PERFIL_DEFAULT: Omit<PerfilSueno, 'id'> = {
  horaDormir: '23:00',
  horaDespertar: '07:00',
  objetivoHoras: 8,
  alarmaActiva: false,
  avisoDormir: false,
  avisoPantallas: false,
}

/** '7.5' → '7 h 30 min'. */
function formatoHoras(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

const dd = (n: number) => String(n).padStart(2, '0')

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Minutos del día → 'HH:mm' (envuelve al cruzar las 24 h). */
const aHHMM = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${dd(Math.floor(m / 60))}:${dd(m % 60)}`
}

const COLOR_COMP = { duracion: '#818cf8', horario: '#38bdf8', interrupciones: '#fb7185' }

const colorTotal = (total: number) =>
  total >= 90 ? '#34d399' : total >= 70 ? '#22d3ee' : total >= 50 ? '#fbbf24' : '#fb7185'

/** Degradado de las barras de la semana: noche abajo, amanecer arriba. */
const GRADIENTE_NOCHE = 'linear-gradient(180deg, #38bdf8 0%, #4338ca 100%)'

// ---------------------------------------------------------------------------
// Franja de la noche: el sueño como un cielo que va del crepúsculo al amanecer
// ---------------------------------------------------------------------------

const ANCHO = 320
const ALTO = 96

/**
 * Estrellas del cielo: [x en 0–1, y, radio, opacidad]. Fijas a propósito —
 * `Math.random()` en render rompería la pureza y titilarían en cada repintado.
 * Se concentran en la franja alta y en los costados para no estorbar al texto.
 */
const ESTRELLAS: [number, number, number, number][] = [
  [0.13, 30, 0.9, 0.35],
  [0.19, 14, 1.2, 0.55],
  [0.25, 26, 0.8, 0.4],
  [0.28, 10, 1.4, 0.75],
  [0.34, 20, 1, 0.6],
  [0.37, 33, 0.9, 0.5],
  [0.43, 12, 1.5, 0.9],
  [0.47, 27, 0.9, 0.55],
  [0.52, 17, 1.1, 0.7],
  [0.56, 31, 1.3, 0.8],
  [0.61, 11, 0.9, 0.5],
  [0.65, 24, 1.2, 0.65],
  [0.7, 15, 1, 0.5],
  [0.74, 29, 0.8, 0.4],
  [0.79, 19, 1.1, 0.35],
  [0.22, 62, 0.9, 0.3],
  [0.31, 70, 1.1, 0.45],
  [0.63, 72, 0.9, 0.3],
  [0.68, 64, 1, 0.4],
  [0.75, 71, 0.8, 0.28],
]

function FranjaNoche({ dormir, despertar, caption }: { dormir: string; despertar: string; caption: string }) {
  const ini = aMin(dormir)
  const fin = aMin(despertar)
  const ok = !Number.isNaN(ini) && !Number.isNaN(fin)
  const horas = ok ? duracionHoras(dormir, despertar) : 0
  const totalMin = horas * 60

  // Una marca por hora en punto dentro de la ventana; se etiquetan las pares.
  const marcas: { x: number; hora: number }[] = []
  if (ok && totalMin > 0) {
    for (let m = Math.ceil((ini + 1) / 60) * 60; m < ini + totalMin; m += 60) {
      marcas.push({ x: ((m - ini) / totalMin) * ANCHO, hora: (m / 60) % 24 })
    }
  }

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full">
      <defs>
        {/* El crepúsculo y el alba ocupan solo los extremos: en medio es noche cerrada. */}
        <linearGradient id="cielo-noche" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b1a78" />
          <stop offset="0.1" stopColor="#191a44" />
          <stop offset="0.28" stopColor="#070a18" />
          <stop offset="0.72" stopColor="#070a18" />
          <stop offset="0.87" stopColor="#2b1338" />
          <stop offset="0.96" stopColor="#8a3f22" />
          <stop offset="1" stopColor="#e08a2e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={ANCHO} height={ALTO} rx="14" fill="url(#cielo-noche)" />
      {ESTRELLAS.map(([fx, y, r, o], i) => (
        <circle key={i} cx={fx * ANCHO} cy={y} r={r} fill="#fff" opacity={o} />
      ))}
      {ok && (
        <>
          <text x="13" y="24" fontSize="13">🌙</text>
          <text x="30" y="24" fill="#ffffffcc" fontSize="10" fontWeight="700">{dormir}</text>
          <text x={ANCHO - 13} y="24" textAnchor="end" fontSize="13">☀️</text>
          <text x={ANCHO - 30} y="24" textAnchor="end" fill="#ffffffcc" fontSize="10" fontWeight="700">
            {despertar}
          </text>
        </>
      )}
      <text x={ANCHO / 2} y="52" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="900">
        {ok ? formatoHoras(horas) : '—'}
      </text>
      <text x={ANCHO / 2} y="66" textAnchor="middle" fill="#ffffff70" fontSize="9">
        {caption}
      </text>
      {marcas.map(({ x, hora }) => (
        <g key={hora}>
          <line x1={x} y1={78} x2={x} y2={84} stroke="#ffffff33" strokeWidth={1} />
          {hora % 2 === 0 && (
            <text x={x} y={93} textAnchor="middle" fill="#ffffff59" fontSize="7.5">
              {dd(hora)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Barra de 24 h: arrastrar la luna (acostarse) y el sol (despertar)
// ---------------------------------------------------------------------------

const PASO_MIN = 15 // el arrastre salta de cuarto en cuarto de hora
const HORAS_EJE = [0, 6, 12, 18, 24]

/**
 * Barra de 0 a 24 h con la ventana de sueño. Se agarra el asa más cercana al
 * clic (como cualquier slider de rango) y la ventana se pinta en dos tramos
 * cuando cruza la medianoche, que es el caso normal.
 */
function BarraHorario({
  dormir,
  despertar,
  arrastra,
  onArrastre,
  onFin,
}: {
  dormir: string
  despertar: string
  arrastra: string
  onArrastre: (cambios: { horaDormir: string } | { horaDespertar: string }) => void
  onFin: () => void
}) {
  const pista = useRef<HTMLDivElement>(null)
  const asa = useRef<'dormir' | 'despertar' | null>(null)

  const ini = aMin(dormir)
  const fin = aMin(despertar)
  const ok = !Number.isNaN(ini) && !Number.isNaN(fin)
  const tramos: [number, number][] = !ok
    ? []
    : fin > ini
      ? [[ini, fin - ini]]
      : [
          [ini, 1440 - ini],
          [0, fin],
        ]

  /** Minutos bajo el cursor, ya redondeados al paso. */
  const minutosEn = (clientX: number): number => {
    const el = pista.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.round((clamp01((clientX - r.left) / r.width) * 1440) / PASO_MIN) * PASO_MIN
  }

  const aplicar = (clientX: number) => {
    const hhmm = aHHMM(minutosEn(clientX))
    if (asa.current === 'dormir') onArrastre({ horaDormir: hhmm })
    else if (asa.current === 'despertar') onArrastre({ horaDespertar: hhmm })
  }

  return (
    <div>
      <div
        ref={pista}
        onPointerDown={(e) => {
          const min = minutosEn(e.clientX)
          asa.current = distanciaMin(min, ini) <= distanciaMin(min, fin) ? 'dormir' : 'despertar'
          e.currentTarget.setPointerCapture(e.pointerId)
          aplicar(e.clientX)
        }}
        onPointerMove={(e) => asa.current && aplicar(e.clientX)}
        onPointerUp={(e) => {
          if (asa.current) {
            asa.current = null
            onFin()
          }
          e.currentTarget.releasePointerCapture?.(e.pointerId)
        }}
        className="relative h-4 w-full cursor-pointer touch-none rounded-full bg-black/30"
        title={arrastra}
      >
        {tramos.map(([desde, largo], i) => (
          <div
            key={i}
            className="absolute inset-y-0 rounded-full bg-indigo-500"
            style={{ left: `${(desde / 1440) * 100}%`, width: `${(largo / 1440) * 100}%` }}
          />
        ))}
        {ok &&
          (
            [
              ['dormir', ini, 'noche'],
              ['despertar', fin, 'dia'],
            ] as const
          ).map(([id, min, icono]) => (
            <div
              key={id}
              className="ui-panel pointer-events-none absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 text-xs shadow-lg"
              style={{ left: `${(min / 1440) * 100}%` }}
            >
              <Icono nombre={icono} />
            </div>
          ))}
      </div>
      <div className="relative mt-1 h-3 text-[9px] text-white/35">
        {HORAS_EJE.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {dd(h)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Barra de un componente de la puntuación (duración / horario / interrupciones). */
function BarraComp({ nombre, pts, max, color }: { nombre: string; pts: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-white/60">{nombre}</span>
        <span className="font-bold texto-vivo" style={vivo(color)}>
          {pts}
          <span className="text-white/30">/{max}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full" style={{ width: `${(pts / max) * 100}%`, background: color }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function DescansoApp() {
  const t = useT()
  const registros = suenoRepo.useAll()
  const filasPerfil = perfilSuenoRepo.useAll()
  const perfil: Omit<PerfilSueno, 'id'> & { id?: number } = filasPerfil?.[0] ?? PERFIL_DEFAULT

  const guardarPerfil = async (cambios: Partial<PerfilSueno>) => {
    const fila = filasPerfil?.[0]
    if (fila?.id != null) await perfilSuenoRepo.update(fila.id, cambios)
    else await perfilSuenoRepo.add({ ...PERFIL_DEFAULT, ...cambios })
  }

  const { sonando, detener } = useAlarma(
    perfil.alarmaActiva,
    perfil.horaDespertar,
    t('descanso.alarma.notif', 'Hora de despertar'),
  )

  // Los recordatorios se agendan contra la hora GUARDADA, no contra la previa
  // del arrastre: si no, se re-programarían en cada movimiento del dedo.
  const horaPantallas = aHHMM(aMin(perfil.horaDormir) - MIN_PANTALLAS)
  const avisoDormir = useRecordatorio(
    !!perfil.avisoDormir,
    perfil.horaDormir,
    t('descanso.aviso.dormirTitulo', 'Hora de dormir'),
    t('descanso.aviso.dormirCuerpo', 'Es tu hora de dormir: apaga y a la cama.'),
  )
  const avisoPantallas = useRecordatorio(
    !!perfil.avisoPantallas,
    horaPantallas,
    t('descanso.aviso.pantallasTitulo', 'Baja el ritmo'),
    t('descanso.aviso.pantallasCuerpo', 'Falta una hora para dormir: deja las pantallas y baja las luces.'),
  )

  // Horario en curso mientras se arrastra la barra: solo se escribe en Dexie al
  // soltar, porque guardar en cada movimiento duplicaría la fila del perfil
  // cuando todavía no existe (`guardarPerfil` hace `add` si no la encuentra).
  const [previa, setPrevia] = useState<{ horaDormir: string; horaDespertar: string } | null>(null)
  // Se descarta en cuanto el perfil guardado ya la refleja, para que al soltar
  // no parpadee el valor viejo mientras Dexie confirma.
  if (previa && perfil.horaDormir === previa.horaDormir && perfil.horaDespertar === previa.horaDespertar) {
    setPrevia(null)
  }
  const horaDormirVis = previa?.horaDormir ?? perfil.horaDormir
  const horaDespertarVis = previa?.horaDespertar ?? perfil.horaDespertar

  const arrastrarHorario = (cambios: { horaDormir: string } | { horaDespertar: string }) =>
    setPrevia({ horaDormir: horaDormirVis, horaDespertar: horaDespertarVis, ...cambios })

  const soltarHorario = () => {
    if (previa) void guardarPerfil(previa)
  }

  // ---- espejo en el calendario: el sueño como bloque diario 'Dormir' ----
  const rutinas = rutinasRepo.useAll()
  const rutinaSueno = buscarRutinaSueno(rutinas)
  const nombreRutina = t('descanso.rutina.nombre', 'Dormir')
  const sembrando = useRef(false)

  useEffect(() => {
    // Con las listas aún cargando (undefined) no se puede decidir si falta la
    // fila: escribir ahora duplicaría el perfil y el bloque del calendario.
    if (!rutinas || !filasPerfil || sembrando.current) return
    sembrando.current = true
    void (async () => {
      try {
        // El perfil tiene que existir de verdad: arrastrar el bloque en el
        // calendario escribe el horario en esa fila.
        if (!filasPerfil[0]) await perfilSuenoRepo.add(PERFIL_DEFAULT)
        await sincronizarRutinaSueno(rutinaSueno, perfil.horaDormir, perfil.horaDespertar, nombreRutina)
      } finally {
        sembrando.current = false
      }
    })()
  }, [rutinas, filasPerfil, rutinaSueno, perfil.horaDormir, perfil.horaDespertar, nombreRutina])

  /** Enciende/apaga un aviso; al encender pide permiso de notificaciones. */
  const setAviso = async (campo: 'alarmaActiva' | 'avisoDormir' | 'avisoPantallas', v: boolean) => {
    if (v && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    await guardarPerfil({ [campo]: v })
  }

  // ---- registro de la noche ----
  const [acosto, setAcosto] = useState('')
  const [desperto, setDesperto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [interrupciones, setInterrupciones] = useState(0)
  const [calidad, setCalidad] = useState(3)
  const [nota, setNota] = useState('')

  const horaAcostarse = acosto || perfil.horaDormir
  const horaDespertar = desperto || perfil.horaDespertar
  const horasNoche = duracionHoras(horaAcostarse, horaDespertar)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (horasNoche <= 0) return
    await suenoRepo.add({
      fecha,
      horas: horasNoche,
      calidad,
      nota: nota.trim() || undefined,
      horaAcostarse,
      horaDespertar,
      interrupciones,
    })
    setNota('')
    setInterrupciones(0)
    setFecha(hoy())
  }

  const lista = registros ?? []
  const ultimo = lista[0]
  const punt = ultimo ? puntuarNoche(ultimo, perfil) : null

  const etiqueta = (p: Puntuacion) =>
    t(`descanso.et.${p.etiqueta}`, { excelente: 'Excelente', buena: 'Buena', regular: 'Regular', baja: 'Baja' }[p.etiqueta])

  // ---- semana (últimas 7 noches por fecha) ----
  // `ahora` se congela al montar: Date.now() suelto en render viola la pureza.
  const [ahora] = useState(() => Date.now())
  const porFecha = new Map<string, number>()
  for (const r of lista) if (!porFecha.has(r.fecha)) porFecha.set(r.fecha, r.horas)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ahora - (6 - i) * 86_400_000)
    const iso = fechaLocalISO(d)
    return { iso, inicial: 'DLMXJVS'[d.getDay()], horas: porFecha.get(iso) ?? 0 }
  })
  const maxEje = Math.max(perfil.objetivoHoras, ...dias.map((d) => d.horas), 8)
  const conDatos = dias.filter((d) => d.horas > 0)
  const promedio = conDatos.length
    ? conDatos.reduce((a, d) => a + d.horas, 0) / conDatos.length
    : 0

  const horasHorario = duracionHoras(horaDormirVis, horaDespertarVis)

  const etiquetaOn = t('descanso.horario.on', 'Activado')
  const etiquetaOff = t('descanso.horario.off', 'Desactivado')

  return (
    <div data-tut="descanso.app" className="mx-auto max-w-2xl space-y-5">
      {/* ---- recordatorios que ya sonaron ---- */}
      {avisoPantallas.avisando && (
        <BannerAviso
          icono="pantallas"
          titulo={t('descanso.aviso.pantallasTitulo', 'Baja el ritmo')}
          cuerpo={t('descanso.aviso.pantallasCuerpo', 'Falta una hora para dormir: deja las pantallas y baja las luces.')}
          color="#a78bfa"
          ok={t('descanso.aviso.ok', 'Entendido')}
          onCerrar={avisoPantallas.cerrar}
        />
      )}
      {avisoDormir.avisando && (
        <BannerAviso
          icono="noche"
          titulo={t('descanso.aviso.dormirTitulo', 'Hora de dormir')}
          cuerpo={t('descanso.aviso.dormirCuerpo', 'Es tu hora de dormir: apaga y a la cama.')}
          color="#22d3ee"
          ok={t('descanso.aviso.ok', 'Entendido')}
          onCerrar={avisoDormir.cerrar}
        />
      )}

      {/* ---- puntuación de sueño ---- */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-cyan-400">{t('descanso.score.titulo', 'Puntuación de sueño')}</p>
        {punt && ultimo ? (
          <div className="mt-3 flex items-center gap-5">
            <div className="shrink-0 text-center">
              <p className="text-5xl font-black leading-none texto-vivo" style={vivo(colorTotal(punt.total))}>
                {punt.total}
              </p>
              <p className="mt-1.5 text-xs font-bold texto-vivo" style={vivo(colorTotal(punt.total))}>
                {etiqueta(punt)}
              </p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {(
                [
                  ['duracion', t('descanso.score.duracion', 'Duración'), punt.duracion, 50],
                  ['horario', t('descanso.score.horario', 'Hora de acostarse'), punt.horario, 30],
                  ['interrupciones', t('descanso.score.interrupciones', 'Interrupciones'), punt.interrupciones, 20],
                ] as const
              ).map(([id, nombre, pts, max]) => (
                <BarraComp key={id} nombre={nombre} pts={pts} max={max} color={COLOR_COMP[id]} />
              ))}
              <p className="pt-0.5 text-xs text-white/40">
                {t('descanso.score.noche', 'Noche del {fecha} · {horas}', {
                  fecha: ultimo.fecha,
                  horas: formatoHoras(ultimo.horas),
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-white/40">
            {t('descanso.score.vacia', 'Registra tu primera noche para ver tu puntuación.')}
          </p>
        )}
      </div>

      {/* ---- horario y despertador ---- */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-cyan-400">{t('descanso.horario.titulo', 'Horario y avisos')}</p>
        <FranjaNoche
          dormir={horaDormirVis}
          despertar={horaDespertarVis}
          caption={t('descanso.deSueno', 'de sueño')}
        />
        <BarraHorario
          dormir={horaDormirVis}
          despertar={horaDespertarVis}
          arrastra={t('descanso.horario.arrastra', 'Arrastra la luna y el sol para ajustar tu horario')}
          onArrastre={arrastrarHorario}
          onFin={soltarHorario}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
            <Icono nombre="cuarto-descanso" /> {t('descanso.horario.dormir', 'Hora de dormir')}
            <input
              type="time"
              value={horaDormirVis}
              onChange={(e) => e.target.value && guardarPerfil({ horaDormir: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-lg font-bold text-white outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-white/50">
            <Icono nombre="alarma" /> {t('descanso.horario.despertar', 'Despertar')}
            <input
              type="time"
              value={horaDespertarVis}
              onChange={(e) => e.target.value && guardarPerfil({ horaDespertar: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-lg font-bold text-white outline-none focus:border-white/30"
            />
          </label>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          {t('descanso.horario.objetivo', 'Objetivo de sueño')}
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={4}
              max={12}
              step={0.5}
              value={perfil.objetivoHoras}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (v >= 1 && v <= 24) void guardarPerfil({ objetivoHoras: v })
              }}
              className="w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-center font-bold outline-none focus:border-white/30"
            />
            h
          </span>
        </label>
        <p className={`text-sm ${horasHorario >= perfil.objetivoHoras ? 'text-emerald-400' : 'text-amber-400'}`}>
          {horasHorario >= perfil.objetivoHoras
            ? t('descanso.horario.cumple', '✓ Este horario cumple tu objetivo de dormir.')
            : t('descanso.horario.noCumple', 'Este horario da {h}, por debajo de tu objetivo de {o} h.', {
                h: formatoHoras(horasHorario),
                o: perfil.objetivoHoras,
              })}
        </p>
        <div className="space-y-2">
          <FilaAviso
            icono="alarma"
            texto={t('descanso.horario.alarma', 'Despertador')}
            hint={t('descanso.horario.alarmaHint', 'Sonará a las {hora} mientras la app esté abierta.', {
              hora: perfil.horaDespertar,
            })}
            activo={perfil.alarmaActiva}
            onCambio={(v) => void setAviso('alarmaActiva', v)}
            on={etiquetaOn}
            off={etiquetaOff}
          />
          <FilaAviso
            icono="noche"
            texto={t('descanso.aviso.dormir', 'Recordatorio de dormir')}
            hint={t('descanso.aviso.dormirHint', 'Te avisará a las {hora} mientras la app esté abierta.', {
              hora: perfil.horaDormir,
            })}
            activo={!!perfil.avisoDormir}
            onCambio={(v) => void setAviso('avisoDormir', v)}
            on={etiquetaOn}
            off={etiquetaOff}
          />
          <FilaAviso
            icono="pantallas"
            texto={t('descanso.aviso.pantallas', 'Dejar las pantallas')}
            hint={t('descanso.aviso.pantallasHint', 'Te avisará a las {hora}, una hora antes de dormir (con la app abierta).', {
              hora: horaPantallas,
            })}
            activo={!!perfil.avisoPantallas}
            onCambio={(v) => void setAviso('avisoPantallas', v)}
            on={etiquetaOn}
            off={etiquetaOff}
          />
        </div>
      </div>

      {/* ---- registrar noche ---- */}
      <form onSubmit={guardar} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-cyan-400">{t('descanso.reg.titulo', 'Registrar noche')}</p>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-xs text-white/60">
            {t('descanso.reg.fecha', 'Fecha')}
            <input
              type="date"
              value={fecha}
              max={hoy()}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-xs text-white/60">
            <Icono nombre="noche" /> {t('descanso.reg.acosto', 'Me acosté')}
            <input
              type="time"
              value={horaAcostarse}
              onChange={(e) => setAcosto(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm outline-none focus:border-white/30"
            />
          </label>
          <label className="block text-xs text-white/60">
            <Icono nombre="dia" /> {t('descanso.reg.desperto', 'Desperté')}
            <input
              type="time"
              value={horaDespertar}
              onChange={(e) => setDesperto(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm outline-none focus:border-white/30"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-sm text-white/70">
            = <span className="font-bold text-cyan-400">{formatoHoras(horasNoche)}</span>
          </span>
          <label className="flex items-center gap-2 text-sm text-white/70">
            {t('descanso.reg.interrupciones', 'Interrupciones')}
            <input
              type="number"
              min={0}
              max={20}
              value={interrupciones}
              onChange={(e) => setInterrupciones(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center outline-none focus:border-white/30"
            />
          </label>
          <span className="flex items-center gap-1 text-sm text-white/70">
            {t('descanso.reg.calidad', 'Calidad')}
            <span className="ml-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCalidad(n)}
                  className={`text-xl leading-none ${n <= calidad ? 'text-amber-400' : 'text-white/20'}`}
                  title={t('descanso.nDe5', `${n} de 5`, { n })}
                >
                  <Icono nombre="estrella" />
                </button>
              ))}
            </span>
          </span>
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('descanso.reg.ph.nota', 'Nota (ej. desperté cansado)')}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-600 py-2 font-bold texto-cta transition hover:brightness-110"
        >
          {t('descanso.reg.guardar', 'Registrar descanso')}
        </button>
      </form>

      {/* ---- últimas 7 noches ---- */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-cyan-400">{t('descanso.sem.titulo', 'Últimas 7 noches')}</p>
          {promedio > 0 && (
            <p className="text-xs text-white/50">
              {t('descanso.sem.promedio', 'Promedio: {h}', { h: formatoHoras(Math.round(promedio * 10) / 10) })}
            </p>
          )}
        </div>
        <div className="relative mt-3 h-28">
          {/* línea del objetivo */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-emerald-400/50"
            style={{ bottom: `${(perfil.objetivoHoras / maxEje) * 100}%` }}
          />
          <div className="flex h-full items-end gap-2">
            {dias.map((d) => (
              <div key={d.iso} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                {d.horas > 0 && (
                  <span className="text-[10px] font-bold text-white/60">{d.horas}</span>
                )}
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(d.horas / maxEje) * 82}%`,
                    background: GRADIENTE_NOCHE,
                    opacity: d.horas >= perfil.objetivoHoras ? 1 : 0.45,
                  }}
                />
                <span className="text-[10px] text-white/40">{d.inicial}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- historial ---- */}
      <div className="space-y-2" data-tut="descanso.historial">
        {lista.length === 0 && (
          <p className="py-4 text-center text-sm text-white/40">
            {t('descanso.hist.vacio', 'Aún no hay noches registradas.')}
          </p>
        )}
        {lista.map((r: RegistroSueno) => {
          const pr = puntuarNoche(r, perfil)
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span
                className="w-9 shrink-0 rounded-md py-0.5 text-center text-sm font-black"
                style={{ background: `${colorTotal(pr.total)}22`, color: colorTotal(pr.total) }}
              >
                {pr.total}
              </span>
              <span className="whitespace-nowrap font-bold text-cyan-400">{formatoHoras(r.horas)}</span>
              {r.horaAcostarse && r.horaDespertar && (
                <span className="text-xs text-white/50">
                  {r.horaAcostarse}–{r.horaDespertar}
                </span>
              )}
              <span className="text-sm text-amber-400">{'★'.repeat(r.calidad)}</span>
              <span className="truncate text-xs text-white/40">
                {r.fecha}
                {r.interrupciones ? ` · ${r.interrupciones}⏸` : ''}
                {r.nota ? ` · ${r.nota}` : ''}
              </span>
              <button
                onClick={() => r.id && suenoRepo.remove(r.id)}
                className="ml-auto text-white/30 hover:text-white/70"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* ---- alarma sonando ---- */}
      {sonando && (
        <div className="ui-noche fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/90 backdrop-blur">
          <span className="animate-bounce text-7xl"><Icono nombre="alarma" /></span>
          <p className="text-4xl font-black text-white">{perfil.horaDespertar}</p>
          <p className="text-white/60">{t('descanso.alarma.notif', 'Hora de despertar')}</p>
          <button
            onClick={detener}
            className="rounded-full bg-orange-600 px-10 py-3 text-lg font-black texto-cta transition hover:brightness-110"
          >
            {t('descanso.alarma.detener', 'Detener')}
          </button>
        </div>
      )}
    </div>
  )
}
