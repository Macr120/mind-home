import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'

type TipoPieza = 'p' | 'c' | 'a' | 't' | 'd' | 'r'
type Bando = 'b' | 'n'
type Modo = '2j' | 'ia'

interface Pieza {
  t: TipoPieza
  b: Bando
}

type TableroAjedrez = (Pieza | null)[]

interface EstadoAjedrez {
  tab: TableroAjedrez
  turno: Bando
  // Derechos de enroque: corto/largo de blancas y negras
  enroques: { bc: boolean; bl: boolean; nc: boolean; nl: boolean }
  alPaso: number | null
}

interface MovAjedrez {
  de: number
  a: number
  enroque?: 'corto' | 'largo'
  alPaso?: boolean
  promocion?: boolean
}

const GLIFO: Record<TipoPieza, string> = { p: '♟', c: '♞', a: '♝', t: '♜', d: '♛', r: '♚' }
const VALOR: Record<TipoPieza, number> = { p: 1, c: 3, a: 3, t: 5, d: 9, r: 0 }

const SALTOS_CABALLO = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const DIRS_REY = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const DIAGONALES = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const RECTAS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

const dentro = (f: number, c: number) => f >= 0 && f < 8 && c >= 0 && c < 8

function estadoInicial(): EstadoAjedrez {
  const tab: TableroAjedrez = new Array(64).fill(null)
  const fondo: TipoPieza[] = ['t', 'c', 'a', 'd', 'r', 'a', 'c', 't']
  fondo.forEach((tipo, c) => {
    tab[c] = { t: tipo, b: 'n' }
    tab[56 + c] = { t: tipo, b: 'b' }
  })
  for (let c = 0; c < 8; c++) {
    tab[8 + c] = { t: 'p', b: 'n' }
    tab[48 + c] = { t: 'p', b: 'b' }
  }
  return { tab, turno: 'b', enroques: { bc: true, bl: true, nc: true, nl: true }, alPaso: null }
}

function atacaEnLinea(tab: TableroAjedrez, f: number, c: number, por: Bando, dirs: number[][], tipos: TipoPieza[]): boolean {
  for (const [df, dc] of dirs) {
    let f1 = f + df
    let c1 = c + dc
    while (dentro(f1, c1)) {
      const p = tab[f1 * 8 + c1]
      if (p) {
        if (p.b === por && tipos.includes(p.t)) return true
        break
      }
      f1 += df
      c1 += dc
    }
  }
  return false
}

function atacada(tab: TableroAjedrez, idx: number, por: Bando): boolean {
  const f = Math.floor(idx / 8)
  const c = idx % 8
  // Un peón blanco ataca hacia arriba: la casilla es atacada si el peón está una fila abajo
  const df = por === 'b' ? 1 : -1
  for (const dc of [-1, 1]) {
    if (dentro(f + df, c + dc)) {
      const p = tab[(f + df) * 8 + c + dc]
      if (p && p.b === por && p.t === 'p') return true
    }
  }
  for (const [sf, sc] of SALTOS_CABALLO) {
    if (dentro(f + sf, c + sc)) {
      const p = tab[(f + sf) * 8 + c + sc]
      if (p && p.b === por && p.t === 'c') return true
    }
  }
  for (const [sf, sc] of DIRS_REY) {
    if (dentro(f + sf, c + sc)) {
      const p = tab[(f + sf) * 8 + c + sc]
      if (p && p.b === por && p.t === 'r') return true
    }
  }
  return atacaEnLinea(tab, f, c, por, DIAGONALES, ['a', 'd']) || atacaEnLinea(tab, f, c, por, RECTAS, ['t', 'd'])
}

function idxRey(tab: TableroAjedrez, b: Bando): number {
  return tab.findIndex((p) => p?.t === 'r' && p.b === b)
}

function enJaque(tab: TableroAjedrez, b: Bando): boolean {
  return atacada(tab, idxRey(tab, b), b === 'b' ? 'n' : 'b')
}

function movsPseudo(e: EstadoAjedrez, idx: number): MovAjedrez[] {
  const pieza = e.tab[idx]!
  const f = Math.floor(idx / 8)
  const c = idx % 8
  const movs: MovAjedrez[] = []
  const propia = (i: number) => e.tab[i]?.b === pieza.b

  if (pieza.t === 'p') {
    const df = pieza.b === 'b' ? -1 : 1
    const filaInicial = pieza.b === 'b' ? 6 : 1
    const filaPromo = pieza.b === 'b' ? 0 : 7
    const f1 = f + df
    if (dentro(f1, c) && !e.tab[f1 * 8 + c]) {
      movs.push({ de: idx, a: f1 * 8 + c, promocion: f1 === filaPromo })
      const f2 = f + 2 * df
      if (f === filaInicial && !e.tab[f2 * 8 + c]) movs.push({ de: idx, a: f2 * 8 + c })
    }
    for (const dc of [-1, 1]) {
      if (!dentro(f1, c + dc)) continue
      const a = f1 * 8 + c + dc
      if (e.tab[a] && e.tab[a]!.b !== pieza.b) movs.push({ de: idx, a, promocion: f1 === filaPromo })
      else if (e.alPaso === a) movs.push({ de: idx, a, alPaso: true })
    }
  } else if (pieza.t === 'c') {
    for (const [sf, sc] of SALTOS_CABALLO)
      if (dentro(f + sf, c + sc) && !propia((f + sf) * 8 + c + sc)) movs.push({ de: idx, a: (f + sf) * 8 + c + sc })
  } else if (pieza.t === 'r') {
    for (const [sf, sc] of DIRS_REY)
      if (dentro(f + sf, c + sc) && !propia((f + sf) * 8 + c + sc)) movs.push({ de: idx, a: (f + sf) * 8 + c + sc })
    const rival: Bando = pieza.b === 'b' ? 'n' : 'b'
    const base = pieza.b === 'b' ? 56 : 0
    const corto = pieza.b === 'b' ? e.enroques.bc : e.enroques.nc
    const largo = pieza.b === 'b' ? e.enroques.bl : e.enroques.nl
    if (idx === base + 4 && !atacada(e.tab, idx, rival)) {
      if (corto && !e.tab[base + 5] && !e.tab[base + 6] && !atacada(e.tab, base + 5, rival) && !atacada(e.tab, base + 6, rival))
        movs.push({ de: idx, a: base + 6, enroque: 'corto' })
      if (largo && !e.tab[base + 1] && !e.tab[base + 2] && !e.tab[base + 3] && !atacada(e.tab, base + 3, rival) && !atacada(e.tab, base + 2, rival))
        movs.push({ de: idx, a: base + 2, enroque: 'largo' })
    }
  } else {
    const dirs = pieza.t === 'a' ? DIAGONALES : pieza.t === 't' ? RECTAS : [...DIAGONALES, ...RECTAS]
    for (const [sf, sc] of dirs) {
      let f1 = f + sf
      let c1 = c + sc
      while (dentro(f1, c1)) {
        const a = f1 * 8 + c1
        if (!e.tab[a]) movs.push({ de: idx, a })
        else {
          if (e.tab[a]!.b !== pieza.b) movs.push({ de: idx, a })
          break
        }
        f1 += sf
        c1 += sc
      }
    }
  }
  return movs
}

function aplicar(e: EstadoAjedrez, m: MovAjedrez): EstadoAjedrez {
  const tab = [...e.tab]
  const pieza = { ...tab[m.de]! }
  tab[m.de] = null
  if (m.alPaso) tab[m.a + (pieza.b === 'b' ? 8 : -8)] = null
  if (m.promocion) pieza.t = 'd'
  tab[m.a] = pieza
  if (m.enroque) {
    const base = pieza.b === 'b' ? 56 : 0
    if (m.enroque === 'corto') {
      tab[base + 5] = tab[base + 7]
      tab[base + 7] = null
    } else {
      tab[base + 3] = tab[base]
      tab[base] = null
    }
  }
  const enroques = { ...e.enroques }
  if (pieza.t === 'r') {
    if (pieza.b === 'b') {
      enroques.bc = false
      enroques.bl = false
    } else {
      enroques.nc = false
      enroques.nl = false
    }
  }
  for (const [casilla, clave] of [[63, 'bc'], [56, 'bl'], [7, 'nc'], [0, 'nl']] as [number, keyof EstadoAjedrez['enroques']][]) {
    if (m.de === casilla || m.a === casilla) enroques[clave] = false
  }
  const dobleDePeon = pieza.t === 'p' && Math.abs(m.a - m.de) === 16
  return {
    tab,
    turno: e.turno === 'b' ? 'n' : 'b',
    enroques,
    alPaso: dobleDePeon ? (m.de + m.a) / 2 : null,
  }
}

function movsLegales(e: EstadoAjedrez, idx: number): MovAjedrez[] {
  const bando = e.tab[idx]!.b
  return movsPseudo(e, idx).filter((m) => !enJaque(aplicar(e, m).tab, bando))
}

function todosLegales(e: EstadoAjedrez): MovAjedrez[] {
  const movs: MovAjedrez[] = []
  for (let i = 0; i < 64; i++) if (e.tab[i]?.b === e.turno) movs.push(...movsLegales(e, i))
  return movs
}

// IA voraz: captura lo más valioso, corona, evita colgar la pieza y busca mates a una
function elegirMovIA(e: EstadoAjedrez): MovAjedrez | null {
  const movs = todosLegales(e)
  if (!movs.length) return null
  let mejorPuntaje = -Infinity
  let elegido = movs[0]
  for (const m of movs) {
    const objetivo = e.tab[m.a]
    let puntaje = (objetivo ? VALOR[objetivo.t] * 10 : 0) + (m.alPaso ? 10 : 0) + (m.promocion ? 80 : 0)
    const despues = aplicar(e, m)
    if (atacada(despues.tab, m.a, 'b')) puntaje -= VALOR[despues.tab[m.a]!.t] * 9
    const respuestas = todosLegales(despues)
    if (respuestas.length === 0) puntaje += enJaque(despues.tab, 'b') ? 10000 : -50
    puntaje += Math.random() * 5
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      elegido = m
    }
  }
  return elegido
}

function capturadas(tab: TableroAjedrez, b: Bando): TipoPieza[] {
  const iniciales: TipoPieza[] = ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 't', 't', 'c', 'c', 'a', 'a', 'd']
  const restantes = [...iniciales]
  for (const p of tab) {
    if (p?.b !== b) continue
    const k = restantes.indexOf(p.t)
    if (k >= 0) restantes.splice(k, 1)
  }
  return restantes
}

export function Ajedrez() {
  const t = useT()
  const [modo, setModo] = useState<Modo | null>(null)
  const [estado, setEstado] = useState<EstadoAjedrez>(estadoInicial)
  const [sel, setSel] = useState<number | null>(null)
  const [ultMov, setUltMov] = useState<{ de: number; a: number } | null>(null)
  const [historial, setHistorial] = useState<{ estado: EstadoAjedrez; ultMov: { de: number; a: number } | null }[]>([])

  const legalesTurno = useMemo(() => todosLegales(estado), [estado])
  const movsSel = useMemo(() => (sel !== null ? movsLegales(estado, sel) : []), [estado, sel])
  const jaque = enJaque(estado.tab, estado.turno)
  const finPartida = legalesTurno.length === 0 ? (jaque ? (estado.turno === 'b' ? 'ganaN' : 'ganaB') : 'tablas') : null

  const reiniciar = (m: Modo | null) => {
    setModo(m)
    setEstado(estadoInicial())
    setSel(null)
    setUltMov(null)
    setHistorial([])
  }

  const jugarMov = (m: MovAjedrez) => {
    setHistorial((h) => [...h, { estado, ultMov }])
    setEstado(aplicar(estado, m))
    setUltMov({ de: m.de, a: m.a })
    setSel(null)
  }

  const deshacer = () => {
    if (!historial.length) return
    const copia = [...historial]
    let previo = copia.pop()!
    if (modo === 'ia' && previo.estado.turno === 'n' && copia.length) previo = copia.pop()!
    setHistorial(copia)
    setEstado(previo.estado)
    setUltMov(previo.ultMov)
    setSel(null)
  }

  useEffect(() => {
    if (modo !== 'ia' || estado.turno !== 'n' || legalesTurno.length === 0) return
    const id = setTimeout(() => {
      const m = elegirMovIA(estado)
      if (m) jugarMov(m)
    }, 550)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, estado])

  const clickCasilla = (i: number) => {
    if (finPartida || modo === null) return
    if (modo === 'ia' && estado.turno === 'n') return
    if (sel !== null) {
      const m = movsSel.find((x) => x.a === i)
      if (m) {
        jugarMov(m)
        return
      }
    }
    if (estado.tab[i]?.b === estado.turno) setSel(i === sel ? null : i)
    else setSel(null)
  }

  if (modo === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t('entre.j.modo.titulo', '¿Cómo quieres jugar?')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => reiniciar('ia')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="mascota-robot" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.ia', 'Contra la máquina')}</p>
            <p className="text-xs text-white/50">{t('entre.j.ajedrez.iaDesc', 'Tú llevas las blancas')}</p>
          </button>
          <button
            type="button"
            onClick={() => reiniciar('2j')}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <p className="text-2xl"><Icono nombre="companeros" /></p>
            <p className="mt-1 font-bold">{t('entre.j.modo.2j', '2 jugadores')}</p>
            <p className="text-xs text-white/50">{t('entre.j.modo.2jDesc', 'En el mismo dispositivo')}</p>
          </button>
        </div>
      </div>
    )
  }

  const capturadasBlancas = capturadas(estado.tab, 'b')
  const capturadasNegras = capturadas(estado.tab, 'n')
  const suma = (piezas: TipoPieza[]) => piezas.reduce((s, p) => s + VALOR[p], 0)
  const ventaja = suma(capturadasNegras) - suma(capturadasBlancas)
  const nombreBando = (b: Bando) =>
    b === 'b' ? t('entre.j.ajedrez.blancas', 'Blancas') : t('entre.j.ajedrez.negras', 'Negras')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {finPartida === null ? (
          <span className="text-white/60">
            {t('entre.j.turno', 'Turno')}:{' '}
            <strong className="text-white/90">
              {modo === 'ia' ? (estado.turno === 'b' ? t('entre.j.tu', 'Tú') : t('entre.j.maquina', 'Máquina')) : nombreBando(estado.turno)}
            </strong>
            {jaque && (
              <strong className="ml-2 rounded-md bg-red-500/25 px-2 py-0.5 text-red-300">
                {t('entre.j.ajedrez.jaque', 'Jaque')}
              </strong>
            )}
          </span>
        ) : (
          <span className="font-bold" style={{ color: COLOR }}>
            {finPartida === 'tablas'
              ? t('entre.j.ajedrez.tablas', '½–½ Tablas por ahogado')
              : finPartida === 'ganaB'
                ? t('entre.j.ajedrez.mateBlancas', '♔ Jaque mate: ganan blancas')
                : t('entre.j.ajedrez.mateNegras', '♚ Jaque mate: ganan negras')}
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={deshacer}
            disabled={!historial.length || (modo === 'ia' && estado.turno === 'n')}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold disabled:opacity-30"
          >
            ↩ {t('entre.j.deshacer', 'Deshacer')}
          </button>
          <button type="button" onClick={() => reiniciar(modo)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            <Icono nombre="sincronizar" /> {t('entre.j.nueva', 'Nueva partida')}
          </button>
          <button type="button" onClick={() => reiniciar(null)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
            {t('entre.j.modo.cambiar', 'Cambiar modo')}
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[440px] select-none grid-cols-8 overflow-hidden rounded-lg border-2 border-white/25">
        {estado.tab.map((pieza, i) => {
          const f = Math.floor(i / 8)
          const c = i % 8
          const oscura = (f + c) % 2 === 1
          const mov = movsSel.find((m) => m.a === i)
          const esUlt = ultMov !== null && (ultMov.de === i || ultMov.a === i)
          const esReyEnJaque = jaque && pieza?.t === 'r' && pieza.b === estado.turno
          let fondo = oscura ? '#b58863' : '#f0d9b5'
          if (esUlt) fondo = oscura ? '#b3a04a' : '#e8d982'
          if (sel === i) fondo = '#7fb069'
          if (esReyEnJaque) fondo = '#d16060'
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickCasilla(i)}
              className="relative flex aspect-square items-center justify-center"
              style={{
                background: fondo,
                boxShadow: mov && pieza ? 'inset 0 0 0 3px rgba(220,60,60,0.85)' : undefined,
              }}
            >
              {pieza && (
                <span
                  style={{
                    fontSize: 'min(9vw, 34px)',
                    lineHeight: 1,
                    color: pieza.b === 'b' ? '#fafafa' : '#111827',
                    textShadow: pieza.b === 'b' ? '0 1px 2px rgba(0,0,0,0.85)' : '0 1px 1px rgba(255,255,255,0.3)',
                  }}
                >
                  {GLIFO[pieza.t]}
                </span>
              )}
              {mov && !pieza && <span className="absolute h-[28%] w-[28%] rounded-full bg-emerald-700/70" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-white/60">
        <span>
          {nombreBando('b')}:{' '}
          <span className="text-base">{capturadasNegras.map((p, k) => <span key={k}>{GLIFO[p]}</span>)}</span>
          {ventaja > 0 && <strong style={{ color: COLOR }}> +{ventaja}</strong>}
        </span>
        <span>
          {nombreBando('n')}:{' '}
          <span className="text-base">{capturadasBlancas.map((p, k) => <span key={k}>{GLIFO[p]}</span>)}</span>
          {ventaja < 0 && <strong style={{ color: COLOR }}> +{-ventaja}</strong>}
        </span>
      </div>

      <p className="text-center text-xs text-white/35">
        {t('entre.j.ajedrez.promo', 'Los peones coronan a dama automáticamente.')}
      </p>
    </div>
  )
}
