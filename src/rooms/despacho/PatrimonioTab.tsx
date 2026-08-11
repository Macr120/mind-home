import { useState } from 'react'
import type { Patrimonio } from '../../core/data/db'
import { VACIO, metasRepo, patrimonioRepo, rutinasRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { crearMeta, enlazarMeta, esMeta, ponerPeriodo } from '../../core/metas'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLORES_RUTINA } from '../../core/ui/coloresRutina'
import { vivo } from '../../core/ui/estilos'
import { etiquetaCorta, etiquetaPeriodo, hoyISO, money, money2 } from './mes'
import { amortizar, serieNeto, type FilaProyectable } from './proyeccion'
import { useFoco, type FocoFinanzas } from './foco'
import { Ayuda, BotonPrimario, CampoDinero, INPUT, Plegable, ROJO, TARJETA, VERDE } from './ui'
import { SimulacionTab } from './SimulacionTab'
import { BarraEjemplo } from './BarraEjemplo'
import { borrarEjemploPatrimonio, cargarEjemploPatrimonio, hayEjemploPatrimonio } from './ejemplos'
import type { TipoMeta } from './MetasTab'
import {
  desenlazar,
  enlazarConMeta,
  esDeuda,
  guardarEfectivoAuto,
  leerEfectivoAuto,
  revaluar,
  saldoVivo,
  usePatrimonio,
  type LineaPatrimonio,
} from './patrimonio'

/** Submenús de Patrimonio. */
export type VistaPatrimonio = 'activos' | 'pasivos' | 'simulacion'

/** Cuánto pasado dibujan las gráficas de esta pestaña. */
const MESES_ATRAS = 24

/** Lo que necesita una fila para saltar a su meta y para dejarse encontrar. */
interface PropsFoco {
  foco: FocoFinanzas | null
  onFocoUsado: () => void
  onIrAMeta: (id: number, tipo: TipoMeta) => void
}

/**
 * Lo que tienes menos lo que debes. Mezcla tres fuentes: las metas de
 * ahorro/inversión y de deuda, el efectivo que sale de tus movimientos, y las
 * filas que escribes a mano (la casa, el coche, la hipoteca).
 *
 * Cada fila puede llevar una tasa —plusvalía, rendimiento o interés del
 * crédito—: con ella el neto es lo que vale HOY, no lo que valía el día que lo
 * apuntaste. Lo escrito nunca se reescribe solo, y el botón de la tarjeta deja
 * ver el número sin estimar.
 */
export function PatrimonioTab({ vista, foco, onFocoUsado, onIrAMeta }: { vista: VistaPatrimonio } & PropsFoco) {
  const t = useT()
  const [efectivoAuto, setEfectivoAuto] = useState(leerEfectivoAuto)
  const [soloEscrito, setSoloEscrito] = useState(false)
  const { fisicos, liquidos, pasivos, totalActivos, totalPasivos, neto, netoEscrito } =
    usePatrimonio(efectivoAuto)

  const cambiarEfectivo = (v: boolean) => {
    guardarEfectivoAuto(v)
    setEfectivoAuto(v)
  }

  const estimado = neto - netoEscrito
  const mostrado = soloEscrito ? netoEscrito : neto
  // Con el toggle puesto, el desglose de arriba también tiene que ser el escrito:
  // si no, la resta que se lee no da el número que está debajo.
  const escrito = (ls: LineaPatrimonio[]) => ls.reduce((s, l) => s + l.montoEscrito, 0)
  const activosVistos = soloEscrito ? escrito(fisicos) + escrito(liquidos) : totalActivos
  const pasivosVistos = soloEscrito ? escrito(pasivos) : totalPasivos

  return (
    <div className="space-y-4">
      <div data-tut="despacho.patr.neto" className={TARJETA}>
        <div className="flex items-center">
          <div>
            <p className="text-sm font-semibold">{t('despacho.patr.neto', 'Patrimonio neto')}</p>
            <p className="text-[11px] text-white/40">
              {money2(activosVistos)} − {money2(pasivosVistos)}
            </p>
          </div>
          <p
            className="texto-vivo ml-auto text-2xl font-bold"
            style={vivo(mostrado >= 0 ? VERDE : ROJO)}
          >
            {money2(mostrado)}
          </p>
        </div>

        {/* Sin tasas en ninguna línea no hay nada que estimar: el desglose y su
            botón solo aparecen cuando de verdad cambian el número. */}
        {Math.round(estimado) !== 0 && (
          <button
            onClick={() => setSoloEscrito((v) => !v)}
            aria-label={
              soloEscrito
                ? t('despacho.patr.verEstimado', 'ver con tasas')
                : t('despacho.patr.verEscrito', 'ver solo lo escrito')
            }
            className="mt-2 flex w-full items-center gap-2 rounded-lg bg-black/20 px-3 py-2 text-left text-[11px] hover:bg-black/30"
          >
            <span className="text-white/55">
              {t('despacho.patr.escrito', 'lo que apuntaste')} {money(netoEscrito)}
            </span>
            <span className="texto-vivo font-semibold" style={vivo(estimado >= 0 ? VERDE : ROJO)}>
              {estimado >= 0 ? '+' : '−'} {money(Math.abs(estimado))}{' '}
              {t('despacho.patr.porTasas', 'por tus tasas')}
            </span>
            <span className="ml-auto shrink-0 font-semibold text-white/40">
              {soloEscrito
                ? t('despacho.patr.verEstimado', 'ver con tasas')
                : t('despacho.patr.verEscrito', 'ver solo lo escrito')}
            </span>
          </button>
        )}

        <div className="mt-2">
          <Ayuda
            resumen={t('despacho.patr.ayudaCorta', 'Lo que tienes menos lo que debes.')}
            detalle={t(
              'despacho.patr.ayuda',
              'El ahorro, la inversión y las deudas entran solos desde tus metas; el balance del mes NO se suma aquí: es lo que le va a pasar a este número, no dinero aparte.',
            )}
          />
        </div>
      </div>

      {vista === 'simulacion' && <SimulacionTab />}

      {vista === 'activos' && (
        <>
          <Grupo
            titulo={t('despacho.patr.fisicos', 'Bienes y propiedades')}
            icono="casa"
            lineas={fisicos}
            clase="fisico"
            naturaleza="activo"
            foco={foco}
            onFocoUsado={onFocoUsado}
            onIrAMeta={onIrAMeta}
          />
          <Grupo
            titulo={t('despacho.patr.liquidos', 'Dinero e inversiones')}
            icono="moneda"
            lineas={liquidos}
            clase="liquido"
            naturaleza="activo"
            foco={foco}
            onFocoUsado={onFocoUsado}
            onIrAMeta={onIrAMeta}
          >
            <div className="space-y-1">
              <label className="flex items-start gap-2 text-[11px] text-white/55">
                <input
                  type="checkbox"
                  checked={efectivoAuto}
                  onChange={(e) => cambiarEfectivo(e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                />
                <span>
                  {t(
                    'despacho.patr.efectivoAuto',
                    'Sumar aquí lo que sobra de mis movimientos (todos mis ingresos menos todos mis gastos)',
                  )}
                </span>
              </label>
              {/* La letra chica va plegada: el que la necesita la abre. */}
              <div className="pl-6">
                <Ayuda
                  resumen={t('despacho.patr.efectivoOjoCorta', '¿Cuándo conviene?')}
                  detalle={t(
                    'despacho.patr.efectivoOjo',
                    'Solo cuadra si llevas registrados tus movimientos desde el principio. Si ya apuntaste tus cuentas arriba, déjalo apagado: sería el mismo dinero dos veces.',
                  )}
                />
              </div>
            </div>
          </Grupo>
        </>
      )}

      {vista === 'pasivos' && (
        // `clase` da igual en un pasivo (el balance lee las dos), pero hay que
        // fijar una para las filas nuevas: la deuda es dinero, no un bien.
        <Grupo
          titulo={t('despacho.patr.deudas', 'Deudas, créditos e hipotecas')}
          icono="tarjeta"
          lineas={pasivos}
          clase="fisico"
          naturaleza="pasivo"
          foco={foco}
          onFocoUsado={onFocoUsado}
          onIrAMeta={onIrAMeta}
        />
      )}

      {vista !== 'simulacion' && <Ejemplo naturaleza={vista === 'pasivos' ? 'pasivo' : 'activo'} />}
    </div>
  )
}

/** Tres líneas de fábrica con sus tasas: algo que sube, algo que baja y una deuda. */
function Ejemplo({ naturaleza }: { naturaleza: Patrimonio['naturaleza'] }) {
  const filas = patrimonioRepo.useAll() ?? VACIO
  return (
    <BarraEjemplo
      cargado={hayEjemploPatrimonio(filas, naturaleza)}
      onCargar={() => cargarEjemploPatrimonio(naturaleza)}
      onBorrar={() => borrarEjemploPatrimonio(filas, naturaleza)}
    />
  )
}

function Grupo({
  titulo,
  icono,
  lineas,
  clase,
  naturaleza,
  children,
  foco,
  onFocoUsado,
  onIrAMeta,
}: {
  titulo: string
  icono: 'casa' | 'moneda' | 'tarjeta'
  lineas: LineaPatrimonio[]
  clase: Patrimonio['clase']
  naturaleza: Patrimonio['naturaleza']
  children?: React.ReactNode
} & PropsFoco) {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [tasa, setTasa] = useState('')
  const [pago, setPago] = useState('')
  const [detalles, setDetalles] = useState(false)

  const esPasivo = naturaleza === 'pasivo'

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(monto)
    if (!nombre.trim() || !v || v <= 0) return
    const tasaAnual = parseFloat(tasa)
    const pagoMensual = parseFloat(pago)
    await patrimonioRepo.add({
      clase,
      naturaleza,
      nombre: nombre.trim(),
      monto: v,
      creadoEn: new Date().toISOString(),
      fechaValor: hoyISO(),
      ...(Number.isFinite(tasaAnual) && tasaAnual !== 0 ? { tasaAnual } : {}),
      ...(esPasivo && Number.isFinite(pagoMensual) && pagoMensual > 0 ? { pagoMensual } : {}),
    })
    setNombre('')
    setMonto('')
    setTasa('')
    setPago('')
  }

  const total = lineas.reduce((s, l) => s + l.monto, 0)

  return (
    <div className={`${TARJETA} space-y-3`}>
      <div className="flex items-center">
        <p className="text-sm font-semibold">
          <Icono nombre={icono} /> {titulo}
        </p>
        <span className="ml-auto text-sm font-bold text-white/70">{money2(total)}</span>
      </div>

      {lineas.length === 0 && (
        <p className="text-xs text-white/40">
          {t('despacho.patr.vacio', 'Nada aquí todavía. Anota lo que tienes — o lo que debes.')}
        </p>
      )}

      <GraficaGrupo lineas={lineas} naturaleza={naturaleza} />

      <ul className="space-y-1.5">
        {lineas.map((l) => (
          <Fila key={l.clave} linea={l} foco={foco} onFocoUsado={onFocoUsado} onIrAMeta={onIrAMeta} />
        ))}
      </ul>

      {children}

      <form onSubmit={crear} className="grid grid-cols-3 gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={
            esPasivo
              ? t('despacho.patr.phPasivo', 'Ej. Hipoteca de la casa')
              : clase === 'fisico'
                ? t('despacho.patr.phFisico', 'Ej. Departamento, coche')
                : t('despacho.patr.phLiquido', 'Ej. Cuenta de nómina')
          }
          className={`col-span-2 ${INPUT}`}
        />
        <CampoDinero
          valor={monto}
          onValor={setMonto}
          placeholder={t('despacho.patr.phMonto', 'Monto')}
          aria-label={t('despacho.patr.phMonto', 'Monto')}
        />

        {/* Cerrado de salida: dar de alta sigue siendo un nombre y un número. */}
        <Plegable
          abierto={detalles}
          onToggle={() => setDetalles((v) => !v)}
          etiqueta={t('despacho.patr.detalles', 'Cómo cambia con el tiempo')}
          className="col-span-3 rounded-lg bg-black/20 py-1.5 text-xs font-semibold text-white/55 hover:bg-black/30"
        />
        {detalles && (
          <div className="col-span-3 grid grid-cols-2 gap-2">
            <input
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={
                esPasivo
                  ? t('despacho.patr.phTasaPasivo', 'Tasa del crédito %')
                  : t('despacho.patr.phTasaActivo', 'Sube o baja al año %')
              }
              className={INPUT}
            />
            {esPasivo ? (
              <CampoDinero
                valor={pago}
                onValor={setPago}
                placeholder={t('despacho.patr.phPago', 'Mensualidad')}
                aria-label={t('despacho.patr.phPago', 'Mensualidad')}
              />
            ) : (
              <p className="self-center text-[11px] leading-tight text-white/40">
                {t('despacho.patr.ayudaTasaActivo', 'En negativo si pierde valor, como un coche.')}
              </p>
            )}
            {esPasivo && (
              <p className="col-span-2 text-[11px] leading-tight text-white/40">
                {t('despacho.patr.tasaBanco', 'La tasa anual que te da el banco, y lo que pagas cada mes.')}
              </p>
            )}
          </div>
        )}

        <BotonPrimario type="submit" className="col-span-3 text-sm">
          {t('despacho.patr.nueva', 'Añadir')}
        </BotonPrimario>
      </form>
    </div>
  )
}

/** Una línea: plegada enseña lo que vale hoy; abierta, de qué depende. */
function Fila({ linea, foco, onFocoUsado, onIrAMeta }: { linea: LineaPatrimonio } & PropsFoco) {
  const t = useT()
  const [abierta, setAbierta] = useState(false)
  const fila = linea.fila
  const cambio = linea.monto - linea.montoEscrito
  const marcado = foco?.tipo === 'patrimonio' && fila?.id === foco.id
  const { ref, clase } = useFoco(marcado, onFocoUsado)

  const borrar = async () => {
    if (!fila?.id) return
    const ok = await confirmar({
      titulo: t('despacho.patr.borrarTitulo', '¿Borrar esta línea?'),
      mensaje: t('despacho.patr.borrarMsg', `«${fila.nombre}» dejará de contar en tu patrimonio.`, {
        n: fila.nombre,
      }),
      textoOk: t('despacho.patr.borrarOk', 'Borrar'),
      peligro: true,
    })
    if (ok) await patrimonioRepo.remove(fila.id)
  }

  return (
    <li
      ref={ref as React.Ref<HTMLLIElement>}
      className={`rounded-lg bg-black/20 px-3 py-2 text-sm transition ${clase}`}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-white/85">{linea.nombre}</p>
          {linea.derivada && <p className="text-[11px] text-white/40">{linea.derivada}</p>}
          {fila?.tasaAnual != null && fila.tasaAnual !== 0 && (
            <p className="text-[11px]">
              <span
                className="texto-vivo font-semibold"
                style={vivo(colorTasa(fila.tasaAnual, linea.proyectable.naturaleza))}
              >
                {fila.tasaAnual > 0 ? '+' : '−'}
                {Math.abs(fila.tasaAnual)} {t('despacho.patr.alAno', '%/año')}
              </span>
              {fila.pagoMensual ? (
                <span className="text-white/40">
                  {' · '}
                  {t('despacho.patr.cuota', `${money(fila.pagoMensual)}/mes`, { n: money(fila.pagoMensual) })}
                </span>
              ) : null}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-white/85">{money2(linea.monto)}</p>
          {Math.round(cambio) !== 0 && (
            <p className="text-[11px] text-white/40">
              {t('despacho.patr.eran', `eran ${money(linea.montoEscrito)}`, {
                n: money(linea.montoEscrito),
              })}
            </p>
          )}
        </div>
        {fila && (
          <button
            onClick={() => setAbierta((v) => !v)}
            aria-label={t('despacho.patr.editar', 'Editar esta línea')}
            aria-expanded={abierta}
            className="shrink-0 text-white/30 hover:text-white/70"
          >
            <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
          </button>
        )}
      </div>

      {abierta && fila && (
        <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
          <Enlace linea={linea} fila={fila} onIrAMeta={onIrAMeta} />

          <div className="grid grid-cols-2 gap-2">
            <Campo
              label={
                linea.meta
                  ? linea.proyectable.naturaleza === 'pasivo'
                    ? t('despacho.patr.montoOriginal', 'Crédito original')
                    : t('despacho.patr.valorAparte', 'Valor aparte')
                  : t('despacho.patr.monto', 'Vale')
              }
            >
              <CampoDinero
                defaultValue={fila.monto}
                onNumero={(v) => revaluar(fila, v ?? 0)}
                aria-label={t('despacho.patr.monto', 'Vale')}
                className="w-full rounded-lg bg-black/30 py-1 pl-7 pr-2 text-right text-sm outline-none border border-white/10 focus:border-white/30"
              />
            </Campo>
            <Campo label={t('despacho.patr.fechaValor', 'Desde')}>
              <input
                type="date"
                max={hoyISO()}
                defaultValue={fila.fechaValor ?? fila.creadoEn.slice(0, 10)}
                onBlur={(e) =>
                  fila.id &&
                  e.target.value &&
                  patrimonioRepo.update(fila.id, { fechaValor: e.target.value.slice(0, 10) })
                }
                className="w-full rounded-lg bg-black/30 px-2 py-1 text-sm outline-none border border-white/10 focus:border-white/30"
              />
            </Campo>
            <Campo
              label={
                linea.proyectable.naturaleza === 'pasivo'
                  ? t('despacho.patr.tasaPasivo', 'Tasa anual %')
                  : t('despacho.patr.tasaActivo', 'Sube al año %')
              }
            >
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                defaultValue={fila.tasaAnual ?? ''}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value)
                  if (fila.id) patrimonioRepo.update(fila.id, { tasaAnual: Number.isFinite(v) ? v : undefined })
                }}
                className="w-full rounded-lg bg-black/30 px-2 py-1 text-right text-sm outline-none border border-white/10 focus:border-white/30"
              />
            </Campo>
            {linea.proyectable.naturaleza === 'pasivo' && (
              <Campo label={t('despacho.patr.pagoMensual', 'Pago al mes')}>
                <CampoDinero
                  defaultValue={fila.pagoMensual}
                  onNumero={(v) => {
                    if (fila.id)
                      patrimonioRepo.update(fila.id, { pagoMensual: v != null && v > 0 ? v : undefined })
                  }}
                  aria-label={t('despacho.patr.pagoMensual', 'Pago al mes')}
                  className="w-full rounded-lg bg-black/30 py-1 pl-7 pr-2 text-right text-sm outline-none border border-white/10 focus:border-white/30"
                />
              </Campo>
            )}
          </div>
          {linea.proyectable.naturaleza === 'pasivo' && <AlCronograma linea={linea} />}

          <button
            onClick={borrar}
            className="w-full rounded-lg bg-black/30 py-1.5 text-xs font-semibold text-white/40 hover:bg-red-500/20 hover:text-red-300"
          >
            <Icono nombre="cerrar" /> {t('despacho.patr.borrar', 'Borrar')}
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * El puente con Metas. Enlazadas, la fila y la meta son la MISMA cosa: aquí se
 * ve y allí se abona, y el patrimonio la cuenta una sola vez.
 */
function Enlace({
  linea,
  fila,
  onIrAMeta,
}: {
  linea: LineaPatrimonio
  fila: Patrimonio
  onIrAMeta: (id: number, tipo: TipoMeta) => void
}) {
  const t = useT()
  const todas = metasRepo.useAll() ?? VACIO
  const filas = patrimonioRepo.useAll() ?? VACIO
  const esPasivo = linea.proyectable.naturaleza === 'pasivo'
  const [creando, setCreando] = useState(false)

  // Solo metas del tipo que cuadra con la naturaleza, y que no cuelguen ya de
  // otra fila: una meta pertenece a una línea, no a dos.
  const ocupadas = new Set(filas.flatMap((f) => (f.metaId != null ? [f.metaId] : [])))
  const compatibles = todas.filter((m) => esDeuda(m) === esPasivo && !ocupadas.has(m.id!))

  // La meta se borró en otro sitio. No se limpia sola aquí: escribir durante el
  // render de una consulta viva es un bucle. Se le ofrece al usuario.
  if (linea.colgando) {
    return (
      <button
        onClick={() => desenlazar(fila, fila.monto)}
        className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11px] text-amber-200 hover:bg-amber-500/20"
      >
        <Icono nombre="alerta" />{' '}
        {t('despacho.patr.metaIdaSoltar', 'La meta enlazada ya no existe. Tócalo para soltar esta línea.')}
      </button>
    )
  }

  if (linea.meta) {
    const meta = linea.meta
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => meta.id && onIrAMeta(meta.id, (meta.tipo ?? 'ahorro') as TipoMeta)}
          className="rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-600/30"
        >
          <Icono nombre="vincular" />{' '}
          {esPasivo
            ? t('despacho.patr.abonarEnMetas', 'Pagar en Metas › Deuda')
            : t('despacho.patr.aportarEnMetas', 'Aportar en Metas')}
        </button>
        <button
          onClick={async () => {
            const ok = await confirmar({
              titulo: t('despacho.patr.desenlazar', '¿Soltar de la meta?'),
              mensaje: t(
                'despacho.patr.desenlazarMsg',
                `Volverán a ser dos cosas distintas: esta línea se quedará con ${money2(linea.monto)} y la meta seguirá por su cuenta.`,
                { n: money2(linea.monto) },
              ),
              textoOk: t('despacho.patr.desenlazarOk', 'Soltar'),
            })
            if (ok) await desenlazar(fila, linea.monto)
          }}
          className="text-[11px] font-semibold text-white/40 hover:text-white/70"
        >
          {t('despacho.patr.soltar', 'soltar')}
        </button>
      </div>
    )
  }

  const crearMetaDeLaFila = async () => {
    if (creando) return
    const tipo: TipoMeta = esPasivo ? 'deuda' : 'ahorro'
    // Una deuda ya trae su meta puesta: es lo que falta por pagar. Un activo no
    // —tener $50 000 no dice a cuánto quieres llegar—, así que hay que pedirlo.
    let objetivo = linea.monto
    if (!esPasivo) {
      const escrito = await pedirTexto({
        titulo: t('despacho.patr.objetivoTitulo', '¿Hasta cuánto quieres llegar?'),
        mensaje: t('despacho.patr.objetivoMsg', `Ya llevas ${money2(linea.monto)} aquí.`, {
          n: money2(linea.monto),
        }),
        valor: String(Math.round(linea.monto * 2)),
      })
      const v = parseFloat(escrito ?? '')
      if (!Number.isFinite(v) || v <= 0) return
      objetivo = v
    }

    setCreando(true)
    try {
      const id = (await metasRepo.add({
        nombre: fila.nombre,
        objetivo,
        // Lo que ya tienes cuenta como avance; una deuda arranca sin pagar.
        ahorrado: esPasivo ? 0 : linea.monto,
        tipo,
        // Si la fila es del ejemplo de fábrica, su meta también: borrar el
        // ejemplo no puede dejar la mitad suelta.
        ...(fila.ejemplo ? { ejemplo: true } : {}),
      })) as number
      await enlazarConMeta(fila, id)
      onIrAMeta(id, tipo)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={crearMetaDeLaFila}
        disabled={creando}
        className="w-full rounded-lg bg-black/30 py-1.5 text-[11px] font-semibold text-white/55 hover:bg-black/40 disabled:opacity-50"
      >
        <Icono nombre="vincular" />{' '}
        {esPasivo
          ? t('despacho.patr.crearMetaDeuda', 'Seguirla como meta de deuda')
          : t('despacho.patr.crearMetaAhorro', 'Seguirlo como meta de ahorro')}
      </button>
      {compatibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && enlazarConMeta(fila, Number(e.target.value))}
          className="w-full rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-white/55 outline-none border border-white/10 focus:border-white/30"
        >
          <option value="">{t('despacho.patr.enlazarMeta', 'Enlazar con una meta que ya tengo…')}</option>
          {compatibles.map((m) => (
            <option key={m.id} value={String(m.id)}>
              🎯 {m.nombre} · {money(saldoVivo(m))}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/**
 * Lleva la deuda al eje del tiempo de Metas › Deuda, con la fecha de
 * liquidación que sale de su propia amortización: la meta no se inventa un
 * plazo, lo hereda de la tasa y la mensualidad que ya escribiste.
 */
function AlCronograma({ linea }: { linea: LineaPatrimonio }) {
  const t = useT()
  const todas = rutinasRepo.useAll() ?? VACIO
  const [guardando, setGuardando] = useState(false)

  const p = linea.proyectable
  const am = amortizar(p.montoBase, p.tasaAnual ?? 0, p.pagoMensual ?? 0, hoyISO())
  if (!am.fechaLiquidacion) return null

  const nombre = t('despacho.patr.metaLiquidar', `Liquidar ${linea.nombre}`, { n: linea.nombre })
  const mias = todas.filter((r) => esMeta(r) && r.plantillaId === 'despacho' && r.ambitoId === 'deuda')
  const yaEsta = mias.some((r) => r.nombre === nombre)

  const poner = async () => {
    if (guardando || yaEsta) return
    setGuardando(true)
    try {
      // `crearMeta` necesita las hermanas de verdad: con ellas renumera el orden.
      const nueva = await crearMeta(
        mias,
        nombre,
        undefined,
        COLORES_RUTINA[mias.length % COLORES_RUTINA.length],
        'despacho',
        'deuda',
      )
      if (!nueva?.id) return
      await ponerPeriodo(nueva, hoyISO(), am.fechaLiquidacion!)
      await enlazarMeta(nueva, { plantillaId: 'despacho', seccion: 'deuda' })
      await rutinasRepo.update(nueva.id, {
        nota: t('despacho.patr.notaCronograma', `${money2(am.pago)} al mes · ${money2(am.interesesTotales)} de intereses`, {
          p: money2(am.pago),
          i: money2(am.interesesTotales),
        }),
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <button
      onClick={poner}
      disabled={guardando || yaEsta}
      className="w-full rounded-lg bg-black/30 py-1.5 text-[11px] font-semibold text-white/55 hover:bg-black/40 disabled:opacity-40"
    >
      <Icono nombre="objetivo" />{' '}
      {yaEsta
        ? t('despacho.patr.yaEnCronograma', 'Ya está en tu cronograma')
        : t('despacho.patr.alCronograma', `Ponerla en el cronograma · liquidas en ${etiquetaPeriodo(am.fechaLiquidacion, 'mes')}`, {
            f: etiquetaPeriodo(am.fechaLiquidacion, 'mes'),
          })}
    </button>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/40">{label}</span>
      {children}
    </label>
  )
}

/**
 * En un activo, subir es bueno y bajar malo; en una deuda es al revés, así que
 * una tasa alta se pinta en rojo aunque el número sea positivo.
 */
function colorTasa(tasa: number, naturaleza: 'activo' | 'pasivo'): string {
  if (naturaleza === 'pasivo') return ROJO
  return tasa >= 0 ? VERDE : ROJO
}

/** El total del grupo desde hace dos años hasta hoy. */
function GraficaGrupo({
  lineas,
  naturaleza,
}: {
  lineas: LineaPatrimonio[]
  naturaleza: 'activo' | 'pasivo'
}) {
  const t = useT()
  const proyectables: FilaProyectable[] = lineas.map((l) => l.proyectable)
  // Sin nada que mueva la curva sería una raya recta: no dice nada y ocupa.
  const cambia = lineas.some((l) => l.proyectable.tasaAnual || l.proyectable.serie || l.proyectable.historial)
  if (lineas.length === 0 || !cambia) return null

  const serie = serieNeto({
    activos: naturaleza === 'activo' ? proyectables : [],
    pasivos: naturaleza === 'pasivo' ? proyectables : [],
    hoy: hoyISO(),
    mesesAtras: MESES_ATRAS,
    mesesAdelante: 0,
  })
  const valores = serie.map((p) => (naturaleza === 'pasivo' ? p.pasivos : p.activos))
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const alto = Math.max(1, max - min)
  const color = naturaleza === 'pasivo' ? ROJO : VERDE
  const puntos = valores
    .map((v, i) => `${(i / Math.max(1, valores.length - 1)) * 100},${100 - ((v - min) / alto) * 100}`)
    .join(' ')

  return (
    <div data-tut="despacho.patr.grafica" className="rounded-lg bg-black/20 p-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
        <polyline
          points={puntos}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-white/40">
        <span>{etiquetaCorta(serie[0].fecha, 'mes')}</span>
        <span>{t('despacho.patr.hoy', 'hoy')}</span>
      </div>
    </div>
  )
}
