import { useMemo, useState, type ReactNode } from 'react'
import type { PeriodoMovimiento, Transaccion } from '../../core/data/db'
import { finanzasRepo } from '../../core/data/repository'
import { getCategoria, sugerenciasCategorias } from './categorias'
import { acumulado, esFijo, hoyISO, money2 } from './mes'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Archivador } from '../_shared/Archivador'
import { BarraEjemplo } from './BarraEjemplo'
import { borrarEjemplo, cargarEjemplo, hayEjemplo } from './ejemplos'

/** Cada cuánto se repite un fijo (un variable siempre es 'unico'). */
type PlazoFijo = Exclude<PeriodoMovimiento, 'unico'>

const PLAZOS: { id: PlazoFijo; es: string }[] = [
  { id: 'dia', es: 'Cada día' },
  { id: 'semana', es: 'Cada semana' },
  { id: 'mes', es: 'Cada mes' },
  { id: 'anio', es: 'Cada año' },
]

/** Cuánto pesa al mes un movimiento que se repite (para el total de la sección). */
const AL_MES: Record<PeriodoMovimiento, number> = {
  unico: 0,
  dia: 30.44,
  semana: 4.348,
  mes: 1,
  anio: 1 / 12,
}

/**
 * Gastos o ingresos de UN tipo: un solo formulario para todos, en 5 pasos
 * (monto → variable o fijo → categoría → periodo → nota). El periodo solo
 * aparece cuando el movimiento es fijo, que es lo único que se repite.
 */
export function MovimientosTab({ tipo, movimientos }: { tipo: 'gasto' | 'ingreso'; movimientos: Transaccion[] }) {
  const t = useT()
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [fijo, setFijo] = useState(false)
  const [plazo, setPlazo] = useState<PlazoFijo>('mes')
  const color = tipo === 'ingreso' ? '#34d399' : '#f87171'
  const signo = tipo === 'ingreso' ? '+' : '−'

  const sugerencias = useMemo(() => sugerenciasCategorias(tipo, movimientos), [tipo, movimientos])
  const fijos = movimientos.filter(esFijo)
  const variables = movimientos.filter((m) => !esFijo(m))
  const totalMes = fijos.reduce((a, m) => a + m.monto * AL_MES[m.periodo ?? 'unico'], 0)
  const totalAcumulado = fijos.reduce((a, m) => a + acumulado(m), 0)

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseFloat(monto)
    if (!valor || valor <= 0) return
    await finanzasRepo.add({
      fecha,
      tipo,
      // Sin categoría cae en 'Otros', igual que la captura por chat.
      categoria: categoria.trim() || 'Otros',
      monto: valor,
      nota: nota.trim() || undefined,
      periodo: fijo ? plazo : 'unico',
    })
    setMonto('')
    setNota('')
  }

  return (
    <div data-tut="despacho.movimientos" className="space-y-4">
      <form
        data-tut="despacho.mov.form"
        onSubmit={agregar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">
          {tipo === 'gasto' ? t('despacho.m.nuevoGasto', 'Nuevo gasto') : t('despacho.m.nuevoIngreso', 'Nuevo ingreso')}
        </p>

        <Paso n={1} titulo={t('despacho.m.monto', 'Monto')}>
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
        </Paso>

        <Paso n={2} titulo={t('despacho.m.tipoMov', '¿Variable o fijo?')}>
          <div data-tut="despacho.mov.fijo" className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setFijo(false)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                !fijo ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {t('despacho.m.variable', 'Variable')}
            </button>
            <button
              type="button"
              onClick={() => setFijo(true)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                fijo ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Icono nombre="repetir" /> {t('despacho.m.fijo', 'Fijo')}
            </button>
          </div>
        </Paso>

        <Paso n={3} titulo={t('despacho.m.categoria', 'Categoría')}>
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            list={`despacho-cats-${tipo}`}
            placeholder={t('despacho.m.categoriaPh', 'Escribe la tuya o elige una conocida')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <datalist id={`despacho-cats-${tipo}`}>
            {sugerencias.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
        </Paso>

        {fijo && (
          <Paso n={4} titulo={t('despacho.m.plazo', '¿Cada cuánto?')}>
            <div data-tut="despacho.mov.plazo" className="grid grid-cols-4 gap-1.5">
              {PLAZOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlazo(p.id)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                    plazo === p.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {t(`despacho.plazo.${p.id}`, p.es)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-white/40">
              {t('despacho.m.plazoAyuda', 'Se repite solo desde la fecha que pusiste, sin volver a capturarlo.')}
            </p>
          </Paso>
        )}

        <Paso n={fijo ? 5 : 4} titulo={t('despacho.m.nota', 'Nota (opcional)')}>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={t('despacho.m.nota', 'Nota (opcional)')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </Paso>

        <button
          type="submit"
          className="w-full rounded-lg py-2 font-bold texto-cta hover:brightness-110 transition"
          style={{ background: color }}
        >
          {t('despacho.m.agregar', 'Agregar movimiento')}
        </button>
      </form>

      {fijos.length > 0 && (
        <div data-tut="despacho.repetidos" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs uppercase tracking-wide text-white/40">
              <Icono nombre="repetir" /> {t('despacho.m.repetidos', 'Fijos')}
            </p>
            <p className="text-xs text-white/40">
              {t('despacho.m.alMes', `≈ ${money2(totalMes)} al mes`, { n: money2(totalMes) })}
            </p>
          </div>
          {fijos.map((m) => (
            <Fila key={m.id} mov={m} color={color} signo={signo} editable />
          ))}
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 border border-white/10">
            <span className="text-xs text-white/50">
              {t('despacho.m.acumuladoTotal', 'Acumulado de tus fijos hasta hoy')}
            </span>
            <span className="text-sm font-bold" style={{ color }}>
              {signo}
              {money2(totalAcumulado)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/40">
          {t('despacho.m.movs', `${variables.length} movimientos`, { n: String(variables.length) })}
        </p>
        <Archivador
          items={variables}
          fecha={(m) => m.fecha}
          clave={(m) => m.id ?? m.fecha}
          vacio={
            tipo === 'gasto'
              ? t('despacho.m.sinGastos', 'Sin gastos registrados.')
              : t('despacho.m.sinIngresos', 'Sin ingresos registrados.')
          }
          resumen={(movs) => {
            const total = movs.reduce((s, m) => s + m.monto, 0)
            return (
              <span style={{ color }}>
                {signo}
                {money2(total)}
              </span>
            )
          }}
        >
          {(m) => <Fila mov={m} color={color} signo={signo} />}
        </Archivador>
      </div>

      <BarraEjemplo
        cargado={hayEjemplo(movimientos, tipo)}
        onCargar={() => cargarEjemplo(tipo)}
        onBorrar={() => borrarEjemplo(movimientos, tipo)}
      />
    </div>
  )
}

/** Un paso numerado del formulario. */
function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-xs text-white/40">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
          {n}
        </span>
        {titulo}
      </p>
      {children}
    </div>
  )
}

/** Una fila de la lista; los fijos dejan editar el monto en sitio. */
function Fila({
  mov,
  color,
  signo,
  editable,
}: {
  mov: Transaccion
  color: string
  signo: string
  editable?: boolean
}) {
  const t = useT()
  const c = getCategoria(mov.categoria)
  const plazo = PLAZOS.find((p) => p.id === mov.periodo)

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 border border-white/10">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: c.color + '33' }}
      >
        <Icono emoji={c.icon} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {c.nombre}
          {mov.nota ? <span className="text-white/40"> · {mov.nota}</span> : null}
        </p>
        <p className="text-xs text-white/40">
          {!plazo
            ? mov.fecha
            : `${t(`despacho.plazo.${plazo.id}`, plazo.es)} · ${t('despacho.m.desde', `desde ${mov.fecha}`, { f: mov.fecha })} · ${t('despacho.m.llevas', `llevas ${money2(acumulado(mov))}`, { n: money2(acumulado(mov)) })}`}
        </p>
      </div>
      {editable ? (
        <input
          type="number"
          step="0.01"
          defaultValue={mov.monto}
          onBlur={(e) => {
            const v = parseFloat(e.target.value)
            if (mov.id && v > 0 && v !== mov.monto) void finanzasRepo.update(mov.id, { monto: v })
          }}
          className="ml-auto w-24 rounded-lg bg-black/30 px-2 py-1 text-right text-sm outline-none border border-white/10 focus:border-white/30"
          style={{ color }}
        />
      ) : (
        <span className="ml-auto font-semibold text-sm" style={{ color }}>
          {signo}
          {money2(mov.monto)}
        </span>
      )}
      <button
        onClick={() => mov.id && finanzasRepo.remove(mov.id)}
        className="text-white/30 hover:text-white/70 px-1"
        title={t('chat.eliminar', 'Eliminar')}
      >
        <Icono nombre="cerrar" />
      </button>
    </div>
  )
}
