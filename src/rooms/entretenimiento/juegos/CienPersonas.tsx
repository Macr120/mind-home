import { useRef, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { COLOR } from '../constantes'
import { AvisoJev } from './AvisoJev'
import { CapturaCaras } from './cien.caras'
import { CARAS, GRUPOS_EDAD, PERSONAS, type Persona } from './cien.personas'
import { preguntarJevLote, type FaltaJev } from './jev'

/** Personas por petición: el servidor acepta hasta 25 y las decide en paralelo. */
const LOTE = 25
const MAX_PREGUNTA = 200

type Voto = 'si' | 'no' | 'duda' | 'nada'
/** `p` = probabilidad del «sí»; null mientras no contesta. */
type Celda = { p: number; voto: Voto } | null

function votoDe(p: number): Voto {
  return p >= 0.6 ? 'si' : p <= 0.4 ? 'no' : 'duda'
}

const COLOR_VOTO: Record<Voto, string> = {
  si: 'bg-emerald-500/70',
  no: 'bg-red-500/65',
  duda: 'bg-amber-400/65',
  nada: 'bg-white/10',
}

function estadoPersona(p: Persona) {
  return {
    persona: `${p.nombre}, ${p.edad} años, ${p.ocupacion}, de ${p.ciudad}`,
    ingresos: p.ingresos,
    familia: p.familia,
    forma_de_ser: p.forma,
  }
}

/**
 * Encuesta sintética: una pregunta, 100 personas INVENTADAS y una decisión de
 * Jev por cada una (sí / no / indeciso), que van llegando por lotes.
 */
export function CienPersonas() {
  const t = useT()
  const [pregunta, setPregunta] = useState('')
  const [preguntada, setPreguntada] = useState('')
  const [celdas, setCeldas] = useState<Celda[]>(() => PERSONAS.map(() => null))
  const [corriendo, setCorriendo] = useState(false)
  const [falta, setFalta] = useState<FaltaJev | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [elegida, setElegida] = useState<number | null>(null)
  // Solo para repintar cuando llega una cara nueva (viven en `CARAS`).
  const [, setCaras] = useState(0)
  // Evita que un lote de la encuesta anterior pise la nueva.
  const turno = useRef(0)

  const ejemplos = [
    t('entre.j.cien.ej1', '¿Pagarías 10 dólares al mes por una IA que conteste tus correos?'),
    t('entre.j.cien.ej2', '¿Vale la pena comprar un coche eléctrico hoy?'),
    t('entre.j.cien.ej3', '¿El trabajo desde casa debería ser la norma?'),
    t('entre.j.cien.ej4', '¿Dejarías que una IA eligiera tu próximo viaje?'),
  ]

  const preguntar = async (texto: string) => {
    const q = texto.trim().slice(0, MAX_PREGUNTA)
    if (!q || corriendo) return
    const mio = ++turno.current
    setPregunta(q)
    setPreguntada(q)
    setCeldas(PERSONAS.map(() => null))
    setFalta(null)
    setElegida(null)
    setCorriendo(true)
    setSegundos(0)
    const t0 = performance.now()
    const instruccion = {
      voto: `Ponte en el lugar de esta persona (edad, trabajo, ingresos, familia y forma de ser). ¿Respondería que SÍ a esta pregunta?: «${q}»`,
    }
    const lotes = Array.from({ length: Math.ceil(PERSONAS.length / LOTE) }, (_, i) => i * LOTE)
    let fallos: FaltaJev | null = null
    await Promise.all(
      lotes.map(async (desde) => {
        const grupo = PERSONAS.slice(desde, desde + LOTE)
        const r = await preguntarJevLote(grupo.map(estadoPersona), instruccion)
        if (turno.current !== mio) return
        if (!r.ok) fallos ??= r.falta
        setCeldas((prev) => {
          const nuevas = [...prev]
          grupo.forEach((_, j) => {
            const p = r.ok ? r.valor[j]?.voto : undefined
            nuevas[desde + j] = p === undefined ? { p: 0.5, voto: 'nada' } : { p, voto: votoDe(p) }
          })
          return nuevas
        })
        setSegundos((performance.now() - t0) / 1000)
      }),
    )
    if (turno.current !== mio) return
    setCorriendo(false)
    setFalta(fallos)
  }

  const listas = celdas.filter((c): c is NonNullable<Celda> => c !== null)
  const validas = listas.filter((c) => c.voto !== 'nada')
  const cuenta = (v: Voto, lista = validas) => lista.filter((c) => c.voto === v).length
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)
  const persona = elegida === null ? null : PERSONAS[elegida]
  const celdaElegida = elegida === null ? null : celdas[elegida]

  return (
    <div className="mx-auto max-w-[560px] space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void preguntar(pregunta)
        }}
      >
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          maxLength={MAX_PREGUNTA}
          placeholder={t('entre.j.cien.placeholder', 'Hazle una pregunta de sí o no a 100 personas…')}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/35"
        />
        <button
          type="submit"
          disabled={!pregunta.trim() || corriendo}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-black disabled:opacity-40"
          style={{ background: COLOR }}
        >
          {t('entre.j.cien.preguntar', 'Preguntar a las 100')}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {ejemplos.map((ej) => (
          <button
            key={ej}
            type="button"
            onClick={() => void preguntar(ej)}
            disabled={corriendo}
            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-start text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            {ej}
          </button>
        ))}
      </div>

      {preguntada && <p className="text-sm font-bold">«{preguntada}»</p>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-black">{validas.length}/100</p>
          <p className="text-[10px] uppercase tracking-wide text-white/45">{t('entre.j.cien.decisiones', 'Decisiones')}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-black">{segundos.toFixed(1)} s</p>
          <p className="text-[10px] uppercase tracking-wide text-white/45">{t('entre.j.cien.tiempo', 'Tiempo')}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-lg font-black">{segundos > 0 ? Math.round(validas.length / segundos) : 0}/s</p>
          <p className="text-[10px] uppercase tracking-wide text-white/45">{t('entre.j.cien.porSegundo', 'Por segundo')}</p>
        </div>
      </div>

      {/* Las 100 personas: cada una se pinta con su voto conforme llega */}
      <div className="mx-auto grid max-w-[380px] grid-cols-10 gap-1">
        {PERSONAS.map((p, i) => {
          const c = celdas[i]
          return (
            <button
              key={i}
              type="button"
              onClick={() => setElegida(i)}
              aria-label={`${p.nombre}, ${p.edad}`}
              className={`aspect-square overflow-hidden rounded-md text-[10px] font-bold transition ${
                c ? COLOR_VOTO[c.voto] : corriendo ? 'animate-pulse bg-white/10' : 'bg-white/10'
              } ${elegida === i ? 'ring-2 ring-white' : ''}`}
            >
              {CARAS[i] ? <img src={CARAS[i]} alt="" draggable={false} className="h-full w-full object-cover" /> : p.nombre.charAt(0)}
            </button>
          )
        })}
      </div>

      {falta && <AvisoJev falta={falta} alReintentar={() => void preguntar(preguntada)} />}

      {validas.length > 0 && (
        <div className="space-y-2 rounded-xl bg-white/5 p-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-500/80" style={{ width: `${pct(cuenta('si'), validas.length)}%` }} />
            <div className="h-full bg-amber-400/75" style={{ width: `${pct(cuenta('duda'), validas.length)}%` }} />
            <div className="h-full bg-red-500/75" style={{ width: `${pct(cuenta('no'), validas.length)}%` }} />
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-emerald-400">
              {t('entre.j.cien.si', 'Sí')} {cuenta('si')}
            </span>
            <span className="text-amber-300">
              {t('entre.j.cien.duda', 'Indecisos')} {cuenta('duda')}
            </span>
            <span className="text-red-400">
              {t('entre.j.cien.no', 'No')} {cuenta('no')}
            </span>
          </div>
          {!corriendo && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] text-white/45">{t('entre.j.cien.porEdad', '«Sí» por edad')}</p>
              {GRUPOS_EDAD.map((g) => {
                const delGrupo = validas.filter((c) => {
                  const edad = PERSONAS[celdas.indexOf(c)]?.edad ?? 0
                  return edad >= g.desde && edad <= g.hasta
                })
                const v = pct(cuenta('si', delGrupo), delGrupo.length)
                return (
                  <div key={g.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-12 shrink-0 text-white/55">
                      {g.hasta > 100 ? `${g.desde}+` : `${g.desde}–${g.hasta}`}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-emerald-500/75" style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-9 shrink-0 text-end font-semibold">{v} %</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {persona && (
        <div className="flex gap-3 rounded-xl bg-white/5 p-3 text-sm">
          {elegida !== null && CARAS[elegida] && (
            <img
              src={CARAS[elegida]}
              alt=""
              draggable={false}
              className={`h-16 w-16 shrink-0 rounded-xl object-cover ${celdaElegida ? COLOR_VOTO[celdaElegida.voto] : 'bg-white/10'}`}
            />
          )}
          <div className="min-w-0">
            <p className="font-bold">
              {persona.nombre}, {persona.edad}
            </p>
            <p className="text-xs text-white/60">
              {persona.ocupacion} · {persona.ciudad}
            </p>
            <p className="text-xs text-white/45">{persona.forma}</p>
            {celdaElegida && celdaElegida.voto !== 'nada' && (
              <p className="mt-1 text-xs font-semibold">
                <Icono nombre="memoria" /> Jev ·{' '}
                {celdaElegida.voto === 'si'
                  ? t('entre.j.cien.si', 'Sí')
                  : celdaElegida.voto === 'no'
                    ? t('entre.j.cien.no', 'No')
                    : t('entre.j.cien.duda', 'Indecisos')}{' '}
                · {Math.round(celdaElegida.p * 100)} %
              </p>
            )}
          </div>
        </div>
      )}

      <CapturaCaras alCapturar={() => setCaras((n) => n + 1)} />

      <p className="text-center text-[11px] text-white/35">
        {t('entre.j.cien.nota', 'Son 100 personas inventadas que decide Jev, no una encuesta real.')}
      </p>
    </div>
  )
}
