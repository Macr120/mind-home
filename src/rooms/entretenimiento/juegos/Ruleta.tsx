import { Icono } from '../../../core/ui/iconos/Icono'
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../../../core/i18n/useT'
import { COLOR } from '../constantes'
import { SALDO_INICIAL, guardarSaldo, leerSaldo } from './almacen'

// Orden real de los números en una ruleta europea
const ORDEN_RUEDA = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const SECTOR = 360 / 37
const FICHAS = [1, 5, 25, 100]

function colorNumero(n: number): string {
  return n === 0 ? '#16a34a' : ROJOS.has(n) ? '#dc2626' : '#1f2937'
}

function gana(clave: string, n: number): boolean {
  if (clave.startsWith('num')) return n === Number(clave.slice(3))
  if (n === 0) return false
  switch (clave) {
    case 'rojo':
      return ROJOS.has(n)
    case 'negro':
      return !ROJOS.has(n)
    case 'par':
      return n % 2 === 0
    case 'impar':
      return n % 2 === 1
    case 'baja':
      return n <= 18
    case 'alta':
      return n >= 19
    case 'd1':
      return n <= 12
    case 'd2':
      return n >= 13 && n <= 24
    case 'd3':
      return n >= 25
    case 'c1':
      return n % 3 === 1
    case 'c2':
      return n % 3 === 2
    case 'c3':
      return n % 3 === 0
    default:
      return false
  }
}

// El pago incluye la ficha apostada: pleno 36×, docena/columna 3×, suertes simples 2×
function multiplicador(clave: string): number {
  if (clave.startsWith('num')) return 36
  if (clave.startsWith('d') || clave.startsWith('c')) return 3
  return 2
}

const SECTORES = ORDEN_RUEDA.map((n, i) => {
  const a0 = ((i * SECTOR - 90 - SECTOR / 2) * Math.PI) / 180
  const a1 = (((i + 1) * SECTOR - 90 - SECTOR / 2) * Math.PI) / 180
  const r = 100
  const am = ((i * SECTOR - 90) * Math.PI) / 180
  return {
    n,
    path: `M0,0 L${(r * Math.cos(a0)).toFixed(2)},${(r * Math.sin(a0)).toFixed(2)} A${r},${r} 0 0 1 ${(r * Math.cos(a1)).toFixed(2)},${(r * Math.sin(a1)).toFixed(2)} Z`,
    xt: 82 * Math.cos(am),
    yt: 82 * Math.sin(am),
    rot: i * SECTOR,
  }
})

export function Ruleta() {
  const t = useT()
  const [saldo, setSaldo] = useState<number>(leerSaldo)
  const [ficha, setFicha] = useState(5)
  const [apuestas, setApuestas] = useState<Record<string, number>>({})
  const [ultimas, setUltimas] = useState<Record<string, number> | null>(null)
  const [girando, setGirando] = useState(false)
  const [angulo, setAngulo] = useState(0)
  const [resultado, setResultado] = useState<number | null>(null)
  const [historial, setHistorial] = useState<number[]>([])
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    guardarSaldo(saldo)
  }, [saldo])

  const totalApostado = Object.values(apuestas).reduce((s, v) => s + v, 0)

  const apostar = (clave: string) => {
    if (girando || saldo < ficha) return
    setSaldo(saldo - ficha)
    setApuestas({ ...apuestas, [clave]: (apuestas[clave] ?? 0) + ficha })
  }

  const limpiar = () => {
    if (girando || !totalApostado) return
    setSaldo(saldo + totalApostado)
    setApuestas({})
  }

  const repetir = () => {
    if (girando || !ultimas || totalApostado > 0) return
    const total = Object.values(ultimas).reduce((s, v) => s + v, 0)
    if (total > saldo) return
    setSaldo(saldo - total)
    setApuestas(ultimas)
  }

  const girar = () => {
    if (girando || totalApostado === 0) return
    const n = Math.floor(Math.random() * 37)
    const idx = ORDEN_RUEDA.indexOf(n)
    const objetivo = (((360 - idx * SECTOR) % 360) + 360) % 360
    const actual = ((angulo % 360) + 360) % 360
    const delta = (((objetivo - actual) % 360) + 360) % 360
    setAngulo(angulo + 4 * 360 + delta)
    setGirando(true)
    setMensaje(null)
    setResultado(null)
    const apostadas = apuestas
    window.setTimeout(() => {
      let pago = 0
      for (const [clave, monto] of Object.entries(apostadas)) if (gana(clave, n)) pago += monto * multiplicador(clave)
      setSaldo((s) => s + pago)
      setHistorial((h) => [n, ...h].slice(0, 12))
      setResultado(n)
      setUltimas(apostadas)
      setApuestas({})
      setGirando(false)
      setMensaje(
        pago > 0
          ? t('entre.j.rul.gano', `¡Ganaste ${pago} fichas! 🎉`, { n: String(pago) })
          : t('entre.j.rul.nada', 'Sin premio esta vez'),
      )
    }, 4600)
  }

  const celda = (clave: string, contenido: ReactNode, clases: string, estilo?: CSSProperties) => (
    <button key={clave} type="button" onClick={() => apostar(clave)} className={`relative ${clases}`} style={estilo}>
      {contenido}
      {apuestas[clave] != null && (
        <span className="absolute -right-1 -top-1 z-10 rounded-full bg-amber-500 px-1 text-[9px] font-black text-black shadow">
          {apuestas[clave]}
        </span>
      )}
    </button>
  )

  const claseNum = 'rounded-md py-1.5 text-sm font-bold text-white'
  const claseChip = 'rounded-md bg-white/10 py-1.5 text-xs font-semibold'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-1.5">
          <Icono emoji="💰" /> {t('entre.j.saldo', 'Saldo')}: <strong>{saldo}</strong>
        </span>
        {saldo === 0 && totalApostado === 0 && !girando && (
          <button
            type="button"
            onClick={() => setSaldo(SALDO_INICIAL)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-black"
            style={{ background: COLOR }}
          >
            <Icono nombre="moneda" /> {t('entre.j.recargar', 'Recibir 500 fichas')}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white/45">{t('entre.j.rul.ficha', 'Ficha')}:</span>
          {FICHAS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFicha(v)}
              className={`h-9 w-9 rounded-full border-2 text-xs font-bold ${
                ficha === v ? 'border-amber-400 bg-amber-400/25' : 'border-white/25 bg-white/10'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[250px]">
        <svg viewBox="-110 -110 220 220" className="w-full">
          <g
            style={{
              transform: `rotate(${angulo}deg)`,
              transformOrigin: '0px 0px',
              transition: girando ? 'transform 4.4s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
            }}
          >
            <circle r="104" fill="#3f2a14" />
            {SECTORES.map((s) => (
              <g key={s.n}>
                <path d={s.path} fill={colorNumero(s.n)} stroke="#0f1115" strokeWidth="0.6" />
                <text
                  x={s.xt}
                  y={s.yt}
                  fill="#fff"
                  fontSize="7.5"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${s.rot} ${s.xt} ${s.yt})`}
                >
                  {s.n}
                </text>
              </g>
            ))}
            <circle r="40" fill="#1a1108" stroke="#8a6b3f" strokeWidth="2" />
          </g>
          <polygon points="0,-86 -7,-106 7,-106" fill="#fbbf24" />
        </svg>
        {resultado !== null && !girando && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 text-xl font-black text-white shadow-lg"
              style={{ background: colorNumero(resultado) }}
            >
              {resultado}
            </span>
          </div>
        )}
      </div>

      {mensaje && (
        <p className="text-center text-sm font-bold" style={{ color: mensaje.includes('🎉') ? COLOR : undefined }}>
          {mensaje}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={girar}
          disabled={girando || totalApostado === 0}
          className="flex-1 rounded-xl py-2.5 font-bold text-black disabled:opacity-30"
          style={{ background: COLOR }}
        >
          <Icono nombre="rueda-fortuna" /> {t('entre.j.rul.girar', 'Girar')}
          {totalApostado > 0 && ` (${totalApostado})`}
        </button>
        <button
          type="button"
          onClick={limpiar}
          disabled={girando || !totalApostado}
          className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold disabled:opacity-30"
        >
          {t('entre.j.rul.limpiar', 'Quitar')}
        </button>
        <button
          type="button"
          onClick={repetir}
          disabled={girando || !ultimas || totalApostado > 0}
          className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold disabled:opacity-30"
        >
          {t('entre.j.rul.repetir', 'Repetir')}
        </button>
      </div>

      <div className="space-y-1">
        {celda('num0', '0', `${claseNum} w-full`, { background: '#16a34a' })}
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 36 }, (_, k) => k + 1).map((n) =>
            celda(`num${n}`, String(n), claseNum, { background: ROJOS.has(n) ? '#dc2626' : '#1f2937' }),
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {celda('c1', `${t('entre.j.rul.col', 'Col.')} 1 · 2:1`, claseChip)}
          {celda('c2', `${t('entre.j.rul.col', 'Col.')} 2 · 2:1`, claseChip)}
          {celda('c3', `${t('entre.j.rul.col', 'Col.')} 3 · 2:1`, claseChip)}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {celda('d1', t('entre.j.rul.d1', '1.ª docena'), claseChip)}
          {celda('d2', t('entre.j.rul.d2', '2.ª docena'), claseChip)}
          {celda('d3', t('entre.j.rul.d3', '3.ª docena'), claseChip)}
        </div>
        <div className="grid grid-cols-6 gap-1 text-[10px]">
          {celda('baja', '1–18', claseChip)}
          {celda('par', t('entre.j.rul.par', 'PAR'), claseChip)}
          {celda('rojo', t('entre.j.rul.rojo', 'ROJO'), 'rounded-md py-1.5 text-[10px] font-bold text-white', { background: '#dc2626' })}
          {celda('negro', t('entre.j.rul.negro', 'NEGRO'), 'rounded-md py-1.5 text-[10px] font-bold text-white', { background: '#1f2937' })}
          {celda('impar', t('entre.j.rul.impar', 'IMPAR'), claseChip)}
          {celda('alta', '19–36', claseChip)}
        </div>
      </div>

      {historial.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-white/40">{t('entre.j.rul.ultimos', 'Últimos')}:</span>
          {historial.map((n, k) => (
            <span
              key={k}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: colorNumero(n) }}
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
