import { useState } from 'react'
import type { ItemCompra, ListaCompra } from '../../core/data/db'
import { VACIO, finanzasRepo, itemsCompraRepo, listasCompraRepo } from '../../core/data/repository'
import { CATEGORIAS_COMPRA, adivinarCategoria, getCategoriaCompra } from './categoriasCompra'
import { hoyISO } from './fecha'
import { money2 } from '../despacho/mes'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

type Sub = 'crear' | 'listas'

/** Categoría del gasto en el Despacho: la compra del súper es comida. */
const CATEGORIA_GASTO = 'comida'

export function ComprasTab({ items, listas }: { items: ItemCompra[]; listas: ListaCompra[] }) {
  const t = useT()
  const [sub, setSub] = useState<Sub>('crear')

  // Sueltos (sin lista) = el generador "Crear lista".
  const sueltos = items.filter((i) => i.listaId == null)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-tut="cocina.compras.sub.crear"
          onClick={() => setSub('crear')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${
            sub === 'crear' ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {t('cocina.comp.subCrear', 'Crear lista')}
        </button>
        <button
          type="button"
          data-tut="cocina.compras.sub.listas"
          onClick={() => setSub('listas')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${
            sub === 'listas' ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {t('cocina.comp.subListas', 'Listas')}
          {listas.length > 0 && <span className="ml-1.5 opacity-70">({listas.length})</span>}
        </button>
      </div>

      {sub === 'crear' ? (
        <GeneradorCompras items={sueltos} />
      ) : (
        <ListasGuardadas items={items} listas={listas} />
      )}
    </div>
  )
}

/** Renglón para añadir un artículo: nombre, cantidad y listo. La categoría la
 *  adivina el nombre y se corrige después en el propio artículo. */
function FilaAgregar({ listaId }: { listaId?: number }) {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await itemsCompraRepo.add({
      nombre: nombre.trim(),
      cantidad: cantidad.trim() || undefined,
      categoria: adivinarCategoria(nombre),
      comprado: false,
      creadoEn: new Date().toISOString(),
      listaId,
    })
    setNombre('')
    setCantidad('')
  }

  return (
    <form onSubmit={agregar} className="flex gap-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('cocina.comp.ph.nombre', 'Qué hay que comprar...')}
        className="flex-1 min-w-0 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
      />
      <input
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder={t('cocina.comp.ph.cantidad', 'Cant.')}
        className="w-16 shrink-0 rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10 outline-none"
      />
      <button
        type="submit"
        aria-label={t('cocina.comp.añadir', 'Añadir a la lista')}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold texto-cta hover:brightness-110"
      >
        <Icono nombre="agregar" />
      </button>
    </form>
  )
}

/** Un artículo: check, nombre, cantidad y precio editables, categoría y borrar. */
function FilaItem({ item, conCheck, conPrecio }: { item: ItemCompra; conCheck: boolean; conPrecio: boolean }) {
  const t = useT()

  const guardar = (cambios: Partial<ItemCompra>) => {
    if (item.id) void itemsCompraRepo.update(item.id, cambios)
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      {conCheck && (
        <button
          type="button"
          onClick={() => guardar({ comprado: !item.comprado })}
          className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center text-xs ${
            item.comprado ? 'bg-emerald-600 border-emerald-500 texto-cta' : 'border-white/30'
          }`}
        >
          {item.comprado ? <Icono nombre="confirmar" /> : null}
        </button>
      )}
      <span className={`flex-1 min-w-0 truncate ${item.comprado ? 'line-through text-white/40' : 'text-white/90'}`}>
        {item.nombre}
      </span>
      <input
        value={item.cantidad ?? ''}
        onChange={(e) => guardar({ cantidad: e.target.value.trim() || undefined })}
        placeholder={t('cocina.comp.ph.cantidad', 'Cant.')}
        aria-label={t('cocina.comp.ph.cantidad', 'Cant.')}
        className="w-14 shrink-0 rounded-lg bg-black/30 border border-white/10 px-1.5 py-1 text-xs text-center outline-none focus:border-amber-400/50"
      />
      {conPrecio && (
        <input
          type="number"
          min={0}
          step="0.01"
          value={item.precio ?? ''}
          onChange={(e) => guardar({ precio: parseFloat(e.target.value) || undefined })}
          placeholder={t('cocina.comp.ph.precio', '$')}
          aria-label={t('cocina.comp.precio', 'Precio')}
          className="w-16 shrink-0 rounded-lg bg-black/30 border border-white/10 px-1.5 py-1 text-xs text-right outline-none focus:border-amber-400/50"
        />
      )}
      <select
        value={getCategoriaCompra(item.categoria).id}
        onChange={(e) => guardar({ categoria: e.target.value })}
        aria-label={t('cocina.comp.cambiarCat', 'Cambiar categoría')}
        className="shrink-0 rounded-lg bg-black/30 border border-white/10 px-1 py-1 text-sm outline-none"
      >
        {CATEGORIAS_COMPRA.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => item.id && itemsCompraRepo.remove(item.id)}
        className="shrink-0 text-white/30 hover:text-red-400 px-1"
        aria-label={t('chat.eliminar', 'Eliminar')}
      >
        ×
      </button>
    </li>
  )
}

/** Artículos agrupados por categoría (pasillo del súper), para ir comprando. */
function ItemsPorCategoria({ items }: { items: ItemCompra[] }) {
  const t = useT()
  const grupos = CATEGORIAS_COMPRA.map((c) => ({
    ...c,
    items: items.filter((i) => getCategoriaCompra(i.categoria).id === c.id),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      {grupos.map((g) => (
        <div key={g.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-sm font-semibold">
            <span><Icono emoji={g.icon} /></span>
            <span>{t(`cocina.cat.${g.id}`, g.label)}</span>
            <span className="ml-auto text-xs text-white/40">{g.items.filter((i) => !i.comprado).length}</span>
          </div>
          <ul className="divide-y divide-white/5">
            {[...g.items]
              .sort((a, b) => Number(a.comprado) - Number(b.comprado))
              .map((item) => (
                <FilaItem key={item.id} item={item} conCheck conPrecio />
              ))}
          </ul>
        </div>
      ))}
    </>
  )
}

/** "Crear lista": UNA tarjeta — apuntas, ves lo apuntado y lo guardas. */
function GeneradorCompras({ items }: { items: ItemCompra[] }) {
  const t = useT()
  const [nombreLista, setNombreLista] = useState('')

  const guardarEnLista = async () => {
    if (items.length === 0) return
    const creadoEn = new Date().toISOString()
    const nombre =
      nombreLista.trim() ||
      `${t('cocina.comp.listaDefecto', 'Lista')} ${new Date().toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}`
    const listaId = await listasCompraRepo.add({ nombre, creadoEn })
    for (const it of items) {
      if (it.id) await itemsCompraRepo.update(it.id, { listaId, comprado: false })
    }
    setNombreLista('')
  }

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
      <input
        value={nombreLista}
        onChange={(e) => setNombreLista(e.target.value)}
        placeholder={t('cocina.comp.phLista', 'Nombre de la lista (ej. Súper semanal)')}
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm font-semibold border border-white/10 outline-none focus:border-amber-400/50"
      />

      <FilaAgregar />

      {items.length === 0 ? (
        <p className="text-xs text-white/40">
          {t('cocina.comp.generadorVacio', 'Aún no hay nada. Agrega artículos arriba, o manda los ingredientes de una receta desde la pestaña Recetas.')}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-white/5 rounded-lg bg-black/20">
            {items.map((item) => (
              <FilaItem key={item.id} item={item} conCheck={false} conPrecio={false} />
            ))}
          </ul>
          <button
            type="button"
            onClick={guardarEnLista}
            className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
          >
            {t('cocina.comp.guardarBtn', 'Guardar en lista')}
            <span className="ml-1.5 font-normal opacity-80">
              ({t('cocina.comp.nItems', `${items.length} artículos`, { n: String(items.length) })})
            </span>
          </button>
        </>
      )}
    </div>
  )
}

/** "Listas": listas guardadas; abre una para editarla y comprar. */
function ListasGuardadas({ items, listas }: { items: ItemCompra[]; listas: ListaCompra[] }) {
  const t = useT()
  const [selId, setSelId] = useState<number | null>(null)

  const seleccionada = listas.find((l) => l.id === selId) ?? null
  if (seleccionada) {
    return (
      <DetalleLista
        lista={seleccionada}
        items={items.filter((i) => i.listaId === seleccionada.id)}
        onVolver={() => setSelId(null)}
      />
    )
  }

  if (listas.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
        {t('cocina.comp.listasVacio', 'No tienes listas guardadas. Arma una en "Crear lista" o genérala desde una receta.')}
      </p>
    )
  }

  return (
    <ul data-tut="cocina.compras.listas" className="space-y-2">
      {listas.map((l) => {
        const suyos = items.filter((i) => i.listaId === l.id)
        const pend = suyos.filter((i) => !i.comprado).length
        const cuenta = suyos.reduce((s, i) => s + (i.precio ?? 0), 0)
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => setSelId(l.id ?? null)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left hover:bg-white/10 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/90 truncate">{l.nombre}</p>
                <p className="text-xs text-white/40">
                  {t('cocina.comp.nItems', `${suyos.length} artículos`, { n: String(suyos.length) })}
                  {suyos.length > 0 && ` · ${t('cocina.comp.nPend', `${pend} por comprar`, { n: String(pend) })}`}
                </p>
              </div>
              {cuenta > 0 && <span className="shrink-0 text-sm font-bold text-white/70">{money2(cuenta)}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Detalle de una lista guardada: comprar, llevar la cuenta y pasarla al Despacho. */
function DetalleLista({
  lista,
  items,
  onVolver,
}: {
  lista: ListaCompra
  items: ItemCompra[]
  onVolver: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(lista.nombre)

  const comprados = items.filter((i) => i.comprado).length
  const pct = items.length > 0 ? (comprados / items.length) * 100 : 0

  const guardarNombre = async () => {
    const limpio = nombre.trim()
    if (limpio && limpio !== lista.nombre && lista.id) {
      await listasCompraRepo.update(lista.id, { nombre: limpio })
    } else if (!limpio) {
      setNombre(lista.nombre)
    }
  }

  const borrarChecks = async () => {
    for (const i of items) if (i.comprado && i.id) await itemsCompraRepo.update(i.id, { comprado: false })
  }

  const limpiarComprados = async () => {
    for (const i of items) if (i.comprado && i.id) await itemsCompraRepo.remove(i.id)
  }

  // El gasto del Despacho NO se borra con la lista: el dinero ya se gastó.
  const eliminarLista = async () => {
    for (const i of items) if (i.id) await itemsCompraRepo.remove(i.id)
    if (lista.id) await listasCompraRepo.remove(lista.id)
    onVolver()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {t('cocina.comp.volver', '‹ Listas')}
        </button>
        <button
          type="button"
          onClick={eliminarLista}
          className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
        >
          {t('cocina.comp.eliminarLista', 'Eliminar lista')}
        </button>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          aria-label={t('cocina.comp.phNombreLista', 'Nombre de la lista')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-base font-bold border border-white/10 outline-none focus:border-amber-400/50"
        />

        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">
                {t('cocina.comp.progreso', `${comprados} de ${items.length} comprados`, {
                  c: String(comprados),
                  n: String(items.length),
                })}
              </span>
              {comprados > 0 && (
                <span className="flex gap-3 text-xs font-semibold">
                  <button type="button" onClick={borrarChecks} className="text-amber-400 hover:underline">
                    {t('cocina.comp.borrarChecks', 'Borrar checks')}
                  </button>
                  <button type="button" onClick={limpiarComprados} className="text-white/50 hover:underline">
                    {t('cocina.comp.limpiar', 'Limpiar comprados')}
                  </button>
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}

        <FilaAgregar listaId={lista.id} />
      </div>

      <ItemsPorCategoria items={items} />

      <CuentaLista lista={lista} items={items} />
    </div>
  )
}

/**
 * La cuenta del súper: suma de los precios de la lista y su gasto en el
 * Despacho. Un movimiento por lista (`ListaCompra.gastoId`), que se actualiza
 * si la cuenta cambia — así el mes no se llena de compras duplicadas.
 */
function CuentaLista({ lista, items }: { lista: ListaCompra; items: ItemCompra[] }) {
  const t = useT()
  const transacciones = finanzasRepo.useAll() ?? VACIO
  const total = items.reduce((s, i) => s + (i.precio ?? 0), 0)
  const conPrecio = items.filter((i) => i.precio != null && i.precio > 0).length
  // Si el gasto se borró desde el Despacho, la lista vuelve a estar sin registrar.
  const gasto = lista.gastoId != null ? transacciones.find((x) => x.id === lista.gastoId) : undefined
  const alDia = gasto != null && gasto.monto === total

  const registrar = async () => {
    if (total <= 0 || !lista.id) return
    const datos = {
      fecha: hoyISO(),
      tipo: 'gasto' as const,
      categoria: CATEGORIA_GASTO,
      monto: total,
      nota: `${t('cocina.comp.notaGasto', 'Súper')}: ${lista.nombre}`,
    }
    if (gasto?.id) {
      await finanzasRepo.update(gasto.id, { monto: total })
    } else {
      const id = await finanzasRepo.add(datos)
      await listasCompraRepo.update(lista.id, { gastoId: id })
    }
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold"><Icono nombre="moneda" /> {t('cocina.comp.cuenta', 'Cuenta del súper')}</p>
        <p className="text-lg font-black text-white/90">{money2(total)}</p>
      </div>
      <p className="text-[10px] text-white/40">
        {conPrecio === 0
          ? t('cocina.comp.cuentaAyuda', 'Escribe el precio de cada artículo y la cuenta se va sumando sola.')
          : t('cocina.comp.cuentaConPrecio', `${conPrecio} de ${items.length} artículos con precio`, {
              c: String(conPrecio),
              n: String(items.length),
            })}
      </p>
      <button
        type="button"
        onClick={registrar}
        disabled={total <= 0 || alDia}
        className="w-full rounded-xl py-2.5 text-sm font-bold bg-amber-600 texto-cta hover:brightness-110 disabled:opacity-40"
      >
        {alDia
          ? t('cocina.comp.gastoAlDia', '✓ Registrado en el Despacho')
          : gasto
          ? t('cocina.comp.actualizarGasto', 'Actualizar el gasto del Despacho')
          : t('cocina.comp.registrarGasto', 'Registrar como gasto en el Despacho')}
      </button>
    </div>
  )
}
