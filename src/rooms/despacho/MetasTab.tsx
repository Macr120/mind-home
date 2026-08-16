import { useState } from 'react'
import type { Meta, Patrimonio, Transaccion } from '../../core/data/db'
import { VACIO, finanzasRepo, metasRepo, patrimonioRepo } from '../../core/data/repository'
import { CATEGORIA_ABONO } from './categorias'
import { hoyISO, money2 } from './mes'
import { saldoVivo, valorMeta } from './patrimonio'
import { useFoco, type FocoFinanzas } from './foco'
import { AZUL, BotonPrimario, CampoDinero, INPUT, Plegable, TARJETA, VERDE } from './ui'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { SimCompuesto, SimSimple, SimCredito } from './SimuladoresTab'
import { CalculadorasFinancieras } from './CalculadorasFinancieras'
import { BarraEjemplo } from './BarraEjemplo'
import { borrarEjemploMeta, cargarEjemploMeta, hayEjemploMeta } from './ejemplos'
import { useResumenReal } from './useResumen'
import { vivo } from '../../core/ui/estilos'

/** Tipo real de la meta en la base (`Meta.tipo`); no cambia con la reorganización de pestañas. */
export type TipoMeta = 'ahorro' | 'inversion' | 'deuda'

/** Sub-menús de Metas: Ahorro e Inversión se ven juntos en una sola pestaña. */
export type VistaMeta = 'financieras' | 'ahorroInversion' | 'deuda'

/** Textos por tipo de meta: clave i18n + español (el fallback de `t`). */
const COPY: Record<
  TipoMeta,
  { nueva: [string, string]; phNombre: [string, string]; phObjetivo: [string, string]; vacio: [string, string]; abonar: [string, string]; phAbono: [string, string] }
> = {
  ahorro: {
    nueva: ['despacho.meta.nueva', 'Nueva meta de ahorro'],
    phNombre: ['despacho.meta.ph.nombre', 'Ej. Viaje a Japón'],
    phObjetivo: ['despacho.meta.ph.objetivo', 'Meta'],
    vacio: ['despacho.meta.vacio', 'Aún no tienes metas. ¡Crea tu primer objetivo de ahorro!'],
    // Sin «+» en el texto: el signo lo pone <Icono nombre="agregar"> (regla de CLAUDE.md).
    abonar: ['despacho.meta.abonar', 'Abonar'],
    phAbono: ['despacho.meta.ph.abono', 'Abonar'],
  },
  inversion: {
    nueva: ['despacho.meta.nuevaInv', 'Nueva meta de inversión'],
    phNombre: ['despacho.meta.ph.nombreInv', 'Ej. Fondo indexado'],
    phObjetivo: ['despacho.meta.ph.objetivo', 'Meta'],
    vacio: ['despacho.meta.vacioInv', 'Aún no tienes metas de inversión. Define cuánto quieres invertir y ve aportando.'],
    abonar: ['despacho.meta.aportar', 'Aportar'],
    phAbono: ['despacho.meta.ph.aporte', 'Aportar'],
  },
  deuda: {
    nueva: ['despacho.meta.nuevaDeuda', 'Nueva deuda por pagar'],
    phNombre: ['despacho.meta.ph.nombreDeuda', 'Ej. Tarjeta de crédito'],
    phObjetivo: ['despacho.meta.ph.deuda', 'Deuda'],
    vacio: ['despacho.meta.vacioDeuda', 'Sin deudas registradas. Anota lo que debes y ve registrando cada pago.'],
    abonar: ['despacho.meta.pagar', 'Pagar'],
    phAbono: ['despacho.meta.ph.pago', 'Pagar'],
  },
}

/**
 * La que acabas de crear, arriba. El repositorio las sirve por id ascendente
 * (lo aprovechan el patrimonio y el planificador), así que el orden de la lista
 * se decide aquí: al alta le sigue el ojo, no el final del scroll.
 */
const recientesPrimero = (metas: Meta[]): Meta[] => [...metas].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))

/** Lo que necesita una meta para saltar a su línea de patrimonio y dejarse encontrar. */
export interface PropsFocoMetas {
  foco: FocoFinanzas | null
  onFocoUsado: () => void
  onIrAFila: (id: number, naturaleza: 'activo' | 'pasivo') => void
}

export function MetasTab({ vista, ...f }: { vista: VistaMeta } & PropsFocoMetas) {
  if (vista === 'financieras') return <VistaFinancieras />
  if (vista === 'deuda') return <VistaDeuda {...f} />
  return <VistaAhorroInversion {...f} />
}

/** Solo las calculadoras: sin lista de metas propia, sin Cronograma — eso vive en Ahorro/Inversión. */
function VistaFinancieras() {
  const t = useT()
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        <Icono nombre="calculadora" /> {t('despacho.calc.titulo', 'Calculadoras financieras')}
      </p>
      <CalculadorasFinancieras />
    </div>
  )
}

/**
 * Ahorro e inversión en una sola lista mezclada (`tipo` de cada fila decide su
 * texto). El toggle de la forma decide con QUÉ tipo nace la meta nueva; el
 * ejemplo y el simulador siguen ese mismo toggle. Desde la v116 el árbol de
 * metas también es uno solo (`ambitoId: 'ahorroInversion'`).
 */
function VistaAhorroInversion({ foco, onFocoUsado, onIrAFila }: PropsFocoMetas) {
  const t = useT()
  const metas = recientesPrimero(
    (metasRepo.useAll() ?? VACIO).filter((m) => {
      const tp = m.tipo ?? 'ahorro'
      return tp === 'ahorro' || tp === 'inversion'
    }),
  )
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<'ahorro' | 'inversion'>('ahorro')
  const copy = COPY[nuevoTipo]

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj || obj <= 0) return
    await metasRepo.add({ nombre: nombre.trim(), objetivo: obj, ahorrado: 0, tipo: nuevoTipo })
    setNombre('')
    setObjetivo('')
  }

  return (
    <div className="space-y-4">
      <Disponible />

      <form onSubmit={crear} className={`${TARJETA} space-y-3`}>
        <PestanasCarpeta
          items={[
            { id: 'ahorro', labelEs: 'Ahorro' },
            { id: 'inversion', labelEs: 'Inversión' },
          ]}
          activo={nuevoTipo}
          onCambio={setNuevoTipo}
          prefijoClave="despacho.tab"
          color={AZUL}
          variante="sub"
          nivel={3}
          flecha={false}
        />
        <p className="text-sm font-semibold">{t(...copy.nueva)}</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t(...copy.phNombre)}
            className={`col-span-2 ${INPUT}`}
          />
          <CampoDinero
            valor={objetivo}
            onValor={setObjetivo}
            placeholder={t(...copy.phObjetivo)}
            aria-label={t(...copy.phObjetivo)}
          />
        </div>
        <BotonPrimario type="submit" className="w-full">
          {t('despacho.meta.crear', 'Crear meta')}
        </BotonPrimario>
      </form>

      <div data-tut="despacho.metas.lista" className="space-y-3">
        {metas.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">{t(...copy.vacio)}</p>
        )}
        {metas.map((m) => (
          <MetaCard
            key={m.id}
            meta={m}
            tipo={(m.tipo ?? 'ahorro') as TipoMeta}
            foco={foco}
            onFocoUsado={onFocoUsado}
            onIrAFila={onIrAFila}
          />
        ))}
      </div>

      <BarraEjemplo
        cargado={hayEjemploMeta(metas, nuevoTipo)}
        onCargar={() => cargarEjemploMeta(nuevoTipo)}
        onBorrar={() => borrarEjemploMeta(metas, nuevoTipo)}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="calculadora" /> {t('despacho.s.simulador', 'Simulador')}
        </p>
        <SimInversion />
      </div>
    </div>
  )
}

function VistaDeuda({ foco, onFocoUsado, onIrAFila }: PropsFocoMetas) {
  const t = useT()
  const tipo: TipoMeta = 'deuda'
  const metas = recientesPrimero((metasRepo.useAll() ?? VACIO).filter((m) => (m.tipo ?? 'ahorro') === tipo))
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const copy = COPY[tipo]

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj || obj <= 0) return
    await metasRepo.add({ nombre: nombre.trim(), objetivo: obj, ahorrado: 0, tipo })
    setNombre('')
    setObjetivo('')
  }

  return (
    <div className="space-y-4">
      <Disponible />

      <form onSubmit={crear} className={`${TARJETA} space-y-3`}>
        <p className="text-sm font-semibold">{t(...copy.nueva)}</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t(...copy.phNombre)}
            className={`col-span-2 ${INPUT}`}
          />
          <CampoDinero
            valor={objetivo}
            onValor={setObjetivo}
            placeholder={t(...copy.phObjetivo)}
            aria-label={t(...copy.phObjetivo)}
          />
        </div>
        <BotonPrimario type="submit" className="w-full">
          {t('despacho.meta.crear', 'Crear meta')}
        </BotonPrimario>
      </form>

      <div data-tut="despacho.deuda.lista" className="space-y-3">
        {metas.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">{t(...copy.vacio)}</p>
        )}
        {metas.map((m) => (
          <MetaCard
            key={m.id}
            meta={m}
            tipo={tipo}
            foco={foco}
            onFocoUsado={onFocoUsado}
            onIrAFila={onIrAFila}
          />
        ))}
      </div>

      <BarraEjemplo
        cargado={hayEjemploMeta(metas, tipo)}
        onCargar={() => cargarEjemploMeta(tipo)}
        onBorrar={() => borrarEjemploMeta(metas, tipo)}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="calculadora" /> {t('despacho.s.simulador', 'Simulador')}
        </p>
        <SimCredito />
      </div>

    </div>
  )
}

/**
 * Con cuánto cuentas este mes. Cada abono se registra como gasto, así que este
 * número baja solo conforme apartas dinero: es lo que queda por repartir.
 */
function Disponible() {
  const t = useT()
  const { ingresos, gastos, disponible } = useResumenReal()
  if (ingresos === 0 && gastos === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 border border-white/10">
      <div className="min-w-0">
        <p className="text-xs text-white/55">{t('despacho.metas.disponible', 'Disponible este mes')}</p>
        <p className="text-[11px] text-white/40">
          {t('despacho.metas.disponibleDetalle', `ingresos ${money2(ingresos)} − gastos ${money2(gastos)}`, {
            i: money2(ingresos),
            g: money2(gastos),
          })}
        </p>
      </div>
      <p
        className="texto-vivo ms-auto text-lg font-bold"
        style={vivo(disponible >= 0 ? '#34d399' : '#f87171')}
      >
        {money2(disponible)}
      </p>
    </div>
  )
}

/** Inversión trae dos simuladores: interés compuesto y simple. */
function SimInversion() {
  const [sim, setSim] = useState<'compuesto' | 'simple'>('compuesto')
  return (
    <div className="space-y-4">
      <PestanasCarpeta
        items={[
          { id: 'compuesto', labelEs: 'Compuesto' },
          { id: 'simple', labelEs: 'Simple' },
        ]}
        activo={sim}
        onCambio={setSim}
        prefijoClave="despacho.s"
        color={AZUL}
        variante="sub"
        nivel={3}
      />
      {sim === 'compuesto' ? <SimCompuesto /> : <SimSimple />}
    </div>
  )
}

/**
 * Lo que la meta rinde —o lo que cuesta— con el tiempo.
 *
 * La tasa se guarda en la línea de Patrimonio enlazada, que es la que sabe de
 * términos; si la meta aún no tiene una, se crea al escribirla. Eso NO mueve el
 * patrimonio: la meta ya contaba ahí, solo pasa de línea calculada a línea con
 * condiciones.
 *
 * El monto inicial no se va nunca: la barra y su «X de Y» siguen contando lo
 * que has puesto, y el rendimiento se enseña aparte.
 */
function TasaMeta({
  meta,
  tipo,
  fila,
  movimientos,
}: {
  meta: Meta
  tipo: TipoMeta
  fila?: Patrimonio
  movimientos: Transaccion[]
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const esPasivo = tipo === 'deuda'
  const hoy = hoyISO()
  const fechaValor = fila?.fechaValor ?? fila?.creadoEn.slice(0, 10) ?? hoy

  const capital = saldoVivo(meta)
  const valor = valorMeta(meta, movimientos, fila?.tasaAnual, fechaValor, hoy)
  const dif = valor - capital

  /** Escribir una tasa en una meta suelta es lo que le da su línea de patrimonio. */
  const guardar = async (campos: Partial<Patrimonio>) => {
    if (guardando || !meta.id) return
    setGuardando(true)
    try {
      if (fila?.id) await patrimonioRepo.update(fila.id, campos)
      else
        await patrimonioRepo.add({
          clase: 'liquido',
          naturaleza: esPasivo ? 'pasivo' : 'activo',
          nombre: meta.nombre,
          monto: capital,
          creadoEn: new Date().toISOString(),
          fechaValor: hoy,
          metaId: meta.id,
          ...(meta.ejemplo ? { ejemplo: true } : {}),
          ...campos,
        })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-2">
      {fila?.tasaAnual ? (
        <p className="text-[11px]">
          <span className="text-white/40">
            {esPasivo
              ? t('despacho.meta.pediste', `pediste ${money2(meta.objetivo)}`, { n: money2(meta.objetivo) })
              : t('despacho.meta.hasPuesto', `has puesto ${money2(meta.ahorrado)}`, { n: money2(meta.ahorrado) })}
            {' · '}
          </span>
          <span className="texto-vivo font-semibold" style={vivo(esPasivo ? '#f87171' : '#34d399')}>
            {esPasivo
              ? t('despacho.meta.debesHoy', `hoy debes ${money2(valor)}`, { n: money2(valor) })
              : t('despacho.meta.valenHoy', `hoy valen ${money2(valor)}`, { n: money2(valor) })}
          </span>
          {Math.round(dif) !== 0 && (
            <span className="text-white/40">
              {' '}
              ({dif >= 0 ? '+' : '−'}
              {money2(Math.abs(dif))}{' '}
              {esPasivo
                ? t('despacho.meta.deIntereses', 'de intereses')
                : t('despacho.meta.deRendimiento', 'de rendimiento')}
              )
            </span>
          )}
        </p>
      ) : null}

      <Plegable
        abierto={abierto}
        onToggle={() => setAbierto((v) => !v)}
        etiqueta={
          fila?.tasaAnual
            ? t('despacho.meta.tasaPuesta', `${fila.tasaAnual} %/año`, { n: String(fila.tasaAnual) })
            : esPasivo
              ? t('despacho.meta.ponerTasaDeuda', 'Ponerle su tasa de interés')
              : t('despacho.meta.ponerTasaAhorro', 'Ponerle cuánto rinde')
        }
      />

      {abierto && (
        <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-2">
          <label className="block">
            <span className="text-[11px] text-white/40">
              {esPasivo
                ? t('despacho.meta.tasaDeuda', 'Tasa anual %')
                : t('despacho.meta.tasaAhorro', 'Rinde al año %')}
            </span>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={fila?.tasaAnual ?? ''}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                guardar({ tasaAnual: Number.isFinite(v) && v !== 0 ? v : undefined })
              }}
              className="w-full rounded-lg bg-black/30 px-2 py-1 text-end text-sm outline-none border border-white/10 focus:border-white/30"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-white/40">{t('despacho.meta.desde', 'Desde')}</span>
            <input
              type="date"
              max={hoy}
              defaultValue={fechaValor}
              onBlur={(e) => e.target.value && guardar({ fechaValor: e.target.value.slice(0, 10) })}
              className="w-full rounded-lg bg-black/30 px-2 py-1 text-sm outline-none border border-white/10 focus:border-white/30"
            />
          </label>
          <p className="col-span-2 text-[11px] leading-tight text-white/40">
            {esPasivo
              ? t('despacho.meta.ayudaTasaDeuda', 'La del banco. Cada pago que registres deja de generar intereses desde su fecha.')
              : t('despacho.meta.ayudaTasaAhorro', 'Cada aportación rinde desde el día que la hiciste, no desde el principio.')}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * El puente con Patrimonio: la misma deuda (o la misma inversión) se abona aquí
 * y se ve allí, contada UNA vez. Enlazada, la fila de allí es la que guarda la
 * tasa y la mensualidad.
 */
function EnlacePatrimonio({
  meta,
  naturaleza,
  fila,
  onIrAFila,
}: {
  meta: Meta
  naturaleza: 'activo' | 'pasivo'
  fila?: Patrimonio
  onIrAFila: (id: number, naturaleza: 'activo' | 'pasivo') => void
}) {
  const t = useT()
  const [creando, setCreando] = useState(false)

  if (fila?.id) {
    const irA = fila.id
    return (
      <button
        onClick={() => onIrAFila(irA, naturaleza)}
        className="mt-2 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-600/30"
      >
        <Icono nombre="vincular" />{' '}
        {naturaleza === 'pasivo'
          ? t('despacho.meta.verEnPasivos', 'Ver en Patrimonio › Pasivos')
          : t('despacho.meta.verEnActivos', 'Ver en Patrimonio › Activos')}
      </button>
    )
  }

  const anadir = async () => {
    if (creando || !meta.id) return
    setCreando(true)
    try {
      // Nace como líquida: ahorro, inversión y deuda son dinero, no bienes. Y
      // hereda el `ejemplo` para que borrar el ejemplo no deje media cosa.
      const id = (await patrimonioRepo.add({
        clase: 'liquido',
        naturaleza,
        nombre: meta.nombre,
        monto: saldoVivo(meta),
        creadoEn: new Date().toISOString(),
        fechaValor: hoyISO(),
        metaId: meta.id,
        ...(meta.ejemplo ? { ejemplo: true } : {}),
      })) as number
      onIrAFila(id, naturaleza)
    } finally {
      setCreando(false)
    }
  }

  return (
    <button
      onClick={anadir}
      disabled={creando}
      className="mt-2 rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/40 hover:bg-black/40 disabled:opacity-50"
    >
      <Icono nombre="vincular" />{' '}
      {naturaleza === 'pasivo'
        ? t('despacho.meta.anadirAPasivos', 'Añadirla a Pasivos (con tasa y plazo)')
        : t('despacho.meta.anadirAActivos', 'Añadirla a Activos (con rendimiento)')}
    </button>
  )
}

function MetaCard({ meta, tipo, foco, onFocoUsado, onIrAFila }: { meta: Meta; tipo: TipoMeta } & PropsFocoMetas) {
  const t = useT()
  const copy = COPY[tipo]
  const [abono, setAbono] = useState('')
  const [verMovs, setVerMovs] = useState(false)
  const movimientos = (finanzasRepo.useAll() ?? VACIO).filter((m) => m.metaId != null && m.metaId === meta.id)
  const filasPatrimonio = patrimonioRepo.useAll() ?? VACIO
  const pct = Math.min(100, (meta.ahorrado / meta.objetivo) * 100)
  const completa = meta.ahorrado >= meta.objetivo
  const marcado = foco?.tipo === 'meta' && foco.id === meta.id
  const { ref, clase } = useFoco(marcado, onFocoUsado)
  const naturaleza: 'activo' | 'pasivo' = tipo === 'deuda' ? 'pasivo' : 'activo'
  const filaEnlazada = filasPatrimonio.find((f) => f.metaId === meta.id)

  /**
   * Abonar es mover dinero, no anotarlo aparte: además de subir el acumulado
   * queda un gasto real de hoy, así el balance del mes baja solo.
   */
  const abonar = async () => {
    const v = parseFloat(abono)
    if (!v || !meta.id) return
    await metasRepo.update(meta.id, { ahorrado: Math.max(0, meta.ahorrado + v) })
    await finanzasRepo.add({
      fecha: hoyISO(),
      tipo: 'gasto',
      categoria: CATEGORIA_ABONO[tipo],
      monto: v,
      nota: meta.nombre,
      metaId: meta.id,
      // Los abonos de una meta de ejemplo también son de ejemplo: si no,
      // «borrar el ejemplo» dejaría sus gastos sueltos en el historial.
      ...(meta.ejemplo ? { ejemplo: true } : {}),
    })
    setAbono('')
  }

  /** Deshacer un abono: se va el gasto y el acumulado vuelve donde estaba. */
  const deshacer = async (movId: number, monto: number) => {
    if (!meta.id) return
    await finanzasRepo.remove(movId)
    await metasRepo.update(meta.id, { ahorrado: Math.max(0, meta.ahorrado - monto) })
  }

  /**
   * Al borrar la meta, sus gastos SE QUEDAN (fueron dinero que salió de verdad),
   * pero pierden el `metaId`: una FK colgando puede resolverse contra otra meta
   * distinta al sincronizar con el segundo dispositivo. Por lo mismo se suelta
   * la línea de patrimonio que colgaba de ella, quedándose con su último saldo.
   */
  const borrar = async () => {
    if (!meta.id) return
    // Era el único borrado de la app sin confirmación — y el más destructivo.
    const ok = await confirmar({
      titulo: t('despacho.meta.borrarTitulo', '¿Borrar esta meta?'),
      mensaje: t(
        'despacho.meta.borrarMsg',
        `«${meta.nombre}» se va; sus movimientos se quedan en tu historial, pero sueltos.`,
        { n: meta.nombre },
      ),
      textoOk: t('despacho.meta.borrarOk', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    for (const m of movimientos) if (m.id) await finanzasRepo.update(m.id, { metaId: undefined })
    for (const f of filasPatrimonio) {
      if (f.metaId === meta.id && f.id) {
        await patrimonioRepo.update(f.id, { metaId: undefined, monto: saldoVivo(meta), fechaValor: hoyISO() })
      }
    }
    await metasRepo.remove(meta.id)
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`${TARJETA} transition ${clase}`}
    >
      <div className="flex items-center">
        <h3 className="font-bold">
          <Icono nombre={completa ? 'trofeo' : 'objetivo'} /> {meta.nombre}
        </h3>
        <button
          onClick={borrar}
          aria-label={t('despacho.meta.borrarTitulo', '¿Borrar esta meta?')}
          className="ms-auto text-white/30 hover:text-red-400"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: completa ? '#fbbf24' : VERDE }}
        />
      </div>
      <p className="mt-1.5 text-xs text-white/55">
        {money2(meta.ahorrado)} de {money2(meta.objetivo)} ({Math.round(pct)}%)
      </p>

      <TasaMeta meta={meta} tipo={tipo} fila={filaEnlazada} movimientos={movimientos} />

      <EnlacePatrimonio
        meta={meta}
        naturaleza={naturaleza}
        fila={filaEnlazada}
        onIrAFila={onIrAFila}
      />

      <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
        <div className="flex-1">
          <CampoDinero
            valor={abono}
            onValor={setAbono}
            placeholder={t(...copy.phAbono)}
            aria-label={t(...copy.phAbono)}
            className="w-full rounded-lg bg-black/30 py-1.5 ps-7 pe-3 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </div>
        {/* Verde de dinero que se mueve, como el alta de ingresos: abonar
            registra un movimiento real, no solo edita la meta. */}
        <BotonPrimario onClick={abonar} color={VERDE} className="px-4 py-1.5 text-sm">
          <Icono nombre="agregar" /> {t(...copy.abonar)}
        </BotonPrimario>
      </div>

      {movimientos.length > 0 && (
        <div className="mt-2">
          <Plegable
            abierto={verMovs}
            onToggle={() => setVerMovs((v) => !v)}
            etiqueta={t('despacho.meta.movs', `Movimientos (${movimientos.length})`, {
              n: String(movimientos.length),
            })}
          />
          {verMovs && (
            <ul className="mt-1 space-y-1">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1 text-xs">
                  <span className="text-white/40">{m.fecha}</span>
                  <span className="ms-auto text-white/70">{money2(m.monto)}</span>
                  <button
                    onClick={() => m.id && deshacer(m.id, m.monto)}
                    aria-label={t('despacho.meta.deshacer', 'Deshacer este abono')}
                    className="text-white/30 hover:text-red-400"
                  >
                    <Icono nombre="cerrar" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
