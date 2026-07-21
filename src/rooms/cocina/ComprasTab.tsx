import { useState } from 'react'
import type { ItemCompra, ListaCompra } from '../../core/data/db'
import { itemsCompraRepo, listasCompraRepo } from '../../core/data/repository'
import { CATEGORIAS_COMPRA, adivinarCategoria, getCategoriaCompra } from './categoriasCompra'
import { ImagenCocina, MiniaturaFoto } from './ImagenCocina'
import { promptLista } from './promptsFoto'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

type Sub = 'crear' | 'listas'

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
          onClick={() => setSub('crear')}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${
            sub === 'crear' ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {t('cocina.comp.subCrear', 'Crear lista')}
        </button>
        <button
          type="button"
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

/** Formulario para añadir un artículo (al generador si listaId es undefined, o a una lista). */
function AgregarItem({ listaId }: { listaId?: number }) {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null)
  const categoria = categoriaSel ?? adivinarCategoria(nombre)

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    await itemsCompraRepo.add({
      nombre: nombre.trim(),
      cantidad: cantidad.trim() || undefined,
      categoria,
      comprado: false,
      creadoEn: new Date().toISOString(),
      listaId,
    })
    setNombre('')
    setCantidad('')
    setCategoriaSel(null)
  }

  return (
    <form onSubmit={agregar} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
      <p className="text-sm font-semibold"><Icono nombre="tab-compras" /> {t('cocina.comp.agregar', 'Agregar al súper')}</p>
      <div className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t('cocina.comp.ph.nombre', 'Qué hay que comprar...')}
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder={t('cocina.comp.ph.cantidad', 'Cant.')}
          className="w-20 rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10 outline-none"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIAS_COMPRA.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoriaSel(c.id)}
            title={t(`cocina.cat.${c.id}`, c.label)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-sm transition ${
              categoria === c.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono emoji={c.icon} />
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/40">
        {t('cocina.comp.categoria', `Categoría: ${getCategoriaCompra(categoria).label}`, {
          c: t(`cocina.cat.${getCategoriaCompra(categoria).id}`, getCategoriaCompra(categoria).label),
        })}
        {categoriaSel === null && nombre.trim() !== '' && ` ${t('cocina.comp.auto', '(sugerida)')}`}
      </p>
      <button
        type="submit"
        className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
      >
        {t('cocina.comp.añadir', 'Añadir a la lista')}
      </button>
    </form>
  )
}

/** Barra de progreso de compra + limpiar comprados (para listas guardadas). */
function ProgresoCompras({ items }: { items: ItemCompra[] }) {
  const t = useT()
  if (items.length === 0) return null
  const comprados = items.filter((i) => i.comprado).length
  const pct = (comprados / items.length) * 100

  const limpiarComprados = async () => {
    for (const i of items) {
      if (i.comprado && i.id) await itemsCompraRepo.remove(i.id)
    }
  }

  return (
    <div className="rounded-xl bg-white/5 px-4 py-3 border border-white/10">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t('cocina.comp.progreso', `${comprados} de ${items.length} comprados`, { c: String(comprados), n: String(items.length) })}
        </span>
        {comprados > 0 && (
          <button
            type="button"
            onClick={limpiarComprados}
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            {t('cocina.comp.limpiar', 'Limpiar comprados')}
          </button>
        )}
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-black/40 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Artículos agrupados por categoría. Con checkbox de comprado si `mostrarComprado`. */
function ListaItems({ items, mostrarComprado }: { items: ItemCompra[]; mostrarComprado: boolean }) {
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
            <span className="ml-auto text-xs text-white/40">
              {mostrarComprado ? g.items.filter((i) => !i.comprado).length : g.items.length}
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {[...g.items]
              .sort((a, b) => Number(a.comprado) - Number(b.comprado))
              .map((item) => (
                <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                  {mostrarComprado && (
                    <button
                      type="button"
                      onClick={() => item.id && itemsCompraRepo.update(item.id, { comprado: !item.comprado })}
                      className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center text-xs ${
                        item.comprado ? 'bg-emerald-600 border-emerald-500 texto-cta' : 'border-white/30'
                      }`}
                    >
                      {item.comprado ? <Icono nombre="confirmar" /> : null}
                    </button>
                  )}
                  <span className={`flex-1 min-w-0 truncate ${item.comprado ? 'line-through text-white/40' : 'text-white/90'}`}>
                    {item.nombre}
                    {item.cantidad && <span className="text-white/40"> · {item.cantidad}</span>}
                  </span>
                  <select
                    value={getCategoriaCompra(item.categoria).id}
                    onChange={(e) => item.id && itemsCompraRepo.update(item.id, { categoria: e.target.value })}
                    aria-label={t('cocina.comp.cambiarCat', 'Cambiar categoría')}
                    className="rounded-lg bg-black/30 border border-white/10 px-1 py-1 text-sm outline-none"
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
                    className="text-white/30 hover:text-red-400 px-1"
                    aria-label={t('chat.eliminar', 'Eliminar')}
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </>
  )
}

/** "Crear lista": generador de artículos sueltos que luego se guardan en una lista. */
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
    <div className="space-y-4">
      <AgregarItem />

      {items.length === 0 ? (
        <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
          {t('cocina.comp.generadorVacio', 'Aún no hay nada. Agrega artículos arriba, o manda los ingredientes de una receta desde la pestaña Recetas.')}
        </p>
      ) : (
        <>
          <ListaItems items={items} mostrarComprado={false} />

          <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
            <p className="text-sm font-semibold"><Icono nombre="tab-compras" /> {t('cocina.comp.guardarTitulo', 'Guardar en una lista')}</p>
            <input
              value={nombreLista}
              onChange={(e) => setNombreLista(e.target.value)}
              placeholder={t('cocina.comp.phLista', 'Nombre de la lista (ej. Súper semanal)')}
              className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
            />
            <button
              type="button"
              onClick={guardarEnLista}
              className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
            >
              {t('cocina.comp.guardarBtn', 'Guardar en lista')}
            </button>
            <p className="text-[10px] text-white/40">
              {t('cocina.comp.guardarNota', 'Los artículos pasan a la lista y se vacía este generador.')}
            </p>
          </div>
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
    <ul className="space-y-2">
      {listas.map((l) => {
        const suyos = items.filter((i) => i.listaId === l.id)
        const pend = suyos.filter((i) => !i.comprado).length
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => setSelId(l.id ?? null)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left hover:bg-white/10 transition"
            >
              {l.foto && <MiniaturaFoto foto={l.foto} className="h-12 w-12 shrink-0 rounded-lg" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/90 truncate">{l.nombre}</p>
                <p className="text-xs text-white/40">
                  {t('cocina.comp.nItems', `${suyos.length} artículos`, { n: String(suyos.length) })}
                  {suyos.length > 0 && ` · ${t('cocina.comp.nPend', `${pend} por comprar`, { n: String(pend) })}`}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Detalle de una lista guardada: editar nombre, artículos y marcar comprados. */
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

  const guardarNombre = async () => {
    const limpio = nombre.trim()
    if (limpio && limpio !== lista.nombre && lista.id) {
      await listasCompraRepo.update(lista.id, { nombre: limpio })
    } else if (!limpio) {
      setNombre(lista.nombre)
    }
  }

  const eliminarLista = async () => {
    for (const i of items) if (i.id) await itemsCompraRepo.remove(i.id)
    if (lista.id) await listasCompraRepo.remove(lista.id)
    onVolver()
  }

  const cambiarFoto = async (foto: Blob | undefined) => {
    if (lista.id) await listasCompraRepo.update(lista.id, { foto })
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

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={guardarNombre}
        aria-label={t('cocina.comp.phNombreLista', 'Nombre de la lista')}
        className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-base font-bold border border-white/10 outline-none focus:border-amber-400/50"
      />

      <ImagenCocina
        foto={lista.foto}
        prompt={promptLista(lista.nombre, items.map((i) => i.nombre))}
        onCambiar={cambiarFoto}
      />

      <ProgresoCompras items={items} />
      <ListaItems items={items} mostrarComprado={true} />
      <AgregarItem listaId={lista.id} />
    </div>
  )
}
