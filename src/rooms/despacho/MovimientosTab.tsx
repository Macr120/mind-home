import { useState } from 'react'
import type { Transaccion } from '../../core/data/db'
import { finanzasRepo } from '../../core/data/repository'
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO, getCategoria } from './categorias'
import { hoyISO, money2 } from './mes'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'

export function MovimientosTab({ movimientos }: { movimientos: Transaccion[] }) {
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto')
  const cats = tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO
  const [categoria, setCategoria] = useState(cats[0].id)
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(hoyISO())

  const cambiarTipo = (t: 'gasto' | 'ingreso') => {
    setTipo(t)
    setCategoria((t === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO)[0].id)
  }

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseFloat(monto)
    if (!valor || valor <= 0) return
    await finanzasRepo.add({
      fecha,
      tipo,
      categoria,
      monto: valor,
      nota: nota.trim() || undefined,
    })
    setMonto('')
    setNota('')
  }

  const t = useT()

  return (
    <div data-tut="despacho.movimientos" className="space-y-5">
      <form
        data-tut="despacho.mov.form"
        onSubmit={agregar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <div className="flex gap-2">
          {(['gasto', 'ingreso'] as const).map((tipo2) => (
            <button
              key={tipo2}
              type="button"
              onClick={() => cambiarTipo(tipo2)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                tipo === tipo2
                  ? tipo2 === 'gasto'
                    ? 'bg-red-600 texto-cta'
                    : 'bg-emerald-600 texto-cta'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {t(`despacho.m.${tipo2}`, tipo2)}
            </button>
          ))}
        </div>

        {/* Selector de categoría */}
        <div className="grid grid-cols-4 gap-2">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition ${
                categoria === c.id
                  ? 'bg-white/20 ring-2'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              style={categoria === c.id ? { boxShadow: `0 0 0 2px ${c.color}` } : undefined}
            >
              <span className="text-xl"><Icono emoji={c.icon} /></span>
              <span className="text-white/70">{c.nombre}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            type="number"
            step="0.01"
            placeholder={t('despacho.m.monto', 'Monto')}
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <input
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            type="date"
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('despacho.m.nota', 'Nota (opcional)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 font-bold texto-cta hover:brightness-110 transition"
        >
          {t('despacho.m.agregar', 'Agregar movimiento')}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/40">
          {t('despacho.m.movs', `${movimientos.length} movimientos`, { n: String(movimientos.length) })}
        </p>
        <Archivador
          items={movimientos}
          fecha={(m) => m.fecha}
          clave={(m) => m.id ?? m.fecha}
          vacio={t('despacho.m.sinRegistros', 'Sin movimientos registrados.')}
          resumen={(movs) => {
            const balance = movs.reduce((s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0)
            return (
              <span style={{ color: balance >= 0 ? '#34d399' : '#f87171' }}>
                {balance >= 0 ? '+' : '−'}
                {money2(Math.abs(balance))}
              </span>
            )
          }}
        >
          {(m) => {
            const c = getCategoria(m.categoria)
            return (
              <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 border border-white/10">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                  style={{ background: c.color + '33' }}
                >
                  <Icono emoji={c.icon} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.nombre}
                    {m.nota ? <span className="text-white/40"> · {m.nota}</span> : null}
                  </p>
                  <p className="text-xs text-white/40">{m.fecha}</p>
                </div>
                <span
                  className="ml-auto font-semibold text-sm"
                  style={{ color: m.tipo === 'ingreso' ? '#34d399' : '#f87171' }}
                >
                  {m.tipo === 'ingreso' ? '+' : '−'}
                  {money2(m.monto)}
                </span>
                <button
                  onClick={() => m.id && finanzasRepo.remove(m.id)}
                  className="text-white/30 hover:text-white/70 px-1"
                  title={t('chat.eliminar', 'Eliminar')}
                >
                  <Icono nombre="cerrar" />
                </button>
              </div>
            )
          }}
        </Archivador>
      </div>
    </div>
  )
}
