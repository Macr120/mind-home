import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useState } from 'react'
import type { BloqueDef, ItemPlantilla, TipoBloque } from '../../core/data/db'
import {
  alternarHabitoDia,
  itemsPlantillaRepo,
  sumarContadorPlantilla,
  useItemsPlantilla,
} from '../../core/data/repository'
import { usePlantillasCustom } from '../../core/state/plantillasCustomStore'
import { useT } from '../../core/i18n/useT'
import { fechaLocalISO } from '../../core/fechaLocal'
import { comprimirFoto, Foto } from './fotos'

const EMOJI_BLOQUE: Record<TipoBloque, string> = {
  notas: '📝',
  checklist: '✅',
  contador: '🔢',
  enlaces: '🔗',
  lista: '📋',
  valoracion: '⭐',
  bitacora: '📔',
  progreso: '📈',
  habito: '🔥',
  sesiones: '⏱️',
  cuenta: '⏳',
  galeria: '🖼️',
}

const inputCls =
  'min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-white/30'
const btnAgregarCls =
  'shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20'

/**
 * App genérica de una plantilla personalizada: renderiza sus bloques (notas,
 * checklist, contador, enlaces). La definición viene del store; los datos se
 * leen/escriben SOLO vía repos (regla dura: aquí no se toca `db`).
 */
export default function PlantillaGenericaApp({ plantillaId }: { plantillaId: string }) {
  const t = useT()
  const def = usePlantillasCustom((s) => s.lista.find((p) => p.id === plantillaId))
  const items = useItemsPlantilla(plantillaId) ?? []

  if (!def) {
    return (
      <p className="py-10 text-center text-sm text-white/45">
        {t('plantillaCustom.eliminada', 'Esta plantilla fue eliminada.')}
      </p>
    )
  }

  return (
    <div data-tut="plantilla.bloques" className="mx-auto max-w-2xl space-y-4">
      {def.bloques.map((b) => {
        const deBloque = items.filter((i) => i.bloqueId === b.id)
        return (
          <section key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white/85">
              <span><Icono emoji={EMOJI_BLOQUE[b.tipo]} /></span>
              <span className="min-w-0 truncate">{b.titulo}</span>
            </h2>
            {b.tipo === 'notas' && (
              <BloqueNotas plantillaId={def.id} bloque={b} fila={deBloque[0]} />
            )}
            {b.tipo === 'checklist' && (
              <BloqueChecklist plantillaId={def.id} bloque={b} items={deBloque} />
            )}
            {b.tipo === 'contador' && (
              <BloqueContador plantillaId={def.id} bloque={b} fila={deBloque[0]} color={def.color} />
            )}
            {b.tipo === 'enlaces' && (
              <BloqueEnlaces plantillaId={def.id} bloque={b} items={deBloque} />
            )}
            {b.tipo === 'lista' && (
              <BloqueLista plantillaId={def.id} bloque={b} items={deBloque} />
            )}
            {b.tipo === 'valoracion' && (
              <BloqueValoracion plantillaId={def.id} bloque={b} fila={deBloque[0]} color={def.color} />
            )}
            {b.tipo === 'bitacora' && (
              <BloqueBitacora plantillaId={def.id} bloque={b} items={deBloque} />
            )}
            {b.tipo === 'progreso' && (
              <BloqueProgreso plantillaId={def.id} bloque={b} items={deBloque} color={def.color} />
            )}
            {b.tipo === 'habito' && (
              <BloqueHabito plantillaId={def.id} bloque={b} items={deBloque} color={def.color} />
            )}
            {b.tipo === 'sesiones' && (
              <BloqueSesiones plantillaId={def.id} bloque={b} items={deBloque} color={def.color} />
            )}
            {b.tipo === 'cuenta' && <BloqueCuenta bloque={b} color={def.color} />}
            {b.tipo === 'galeria' && (
              <BloqueGaleria plantillaId={def.id} bloque={b} items={deBloque} />
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Texto libre en una fila única; guarda al salir del campo. */
function BloqueNotas({
  plantillaId,
  bloque,
  fila,
}: {
  plantillaId: string
  bloque: BloqueDef
  fila?: ItemPlantilla
}) {
  const t = useT()
  // null = sin edición local: se muestra lo guardado (p. ej. lo que anota la IA).
  const [borrador, setBorrador] = useState<string | null>(null)

  const guardar = async () => {
    if (borrador == null) return
    if (fila?.id != null) {
      await itemsPlantillaRepo.update(fila.id, { texto: borrador })
    } else if (borrador.trim()) {
      await itemsPlantillaRepo.add({
        plantillaId,
        bloqueId: bloque.id,
        texto: borrador,
        creadoEn: new Date().toISOString(),
      })
    }
    setBorrador(null)
  }

  return (
    <textarea
      value={borrador ?? fila?.texto ?? ''}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={() => void guardar()}
      rows={4}
      placeholder={t('plantillaCustom.notasPh', 'Escribe tus notas… (se guardan solas)')}
      className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
    />
  )
}

/** Pendientes con casilla: agregar, palomear y borrar. */
function BloqueChecklist({
  plantillaId,
  bloque,
  items,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
}) {
  const t = useT()
  const [nuevo, setNuevo] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const texto = nuevo.trim()
    if (!texto) return
    setNuevo('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      texto,
      hecho: false,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void agregar(e)} className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={t('plantillaCustom.checklistPh', 'Nuevo pendiente…')}
          maxLength={120}
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      {items.length === 0 && (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.checklistVacio', 'Sin pendientes todavía.')}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
            <button
              type="button"
              onClick={() => i.id != null && void itemsPlantillaRepo.update(i.id, { hecho: !i.hecho })}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] transition ${
                i.hecho ? 'border-emerald-400 bg-emerald-500/30' : 'border-white/25 hover:border-white/50'
              }`}
            >
              {i.hecho ? <Icono nombre="confirmar" /> : null}
            </button>
            <span
              className={`min-w-0 flex-1 break-words text-sm ${
                i.hecho ? 'text-white/35 line-through' : 'text-white/85'
              }`}
            >
              {i.texto}
            </span>
            <button
              type="button"
              onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
              title={t('plantillaCustom.borrarItem', 'Borrar')}
              className="shrink-0 rounded px-1 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
            >
              <Icono nombre="cerrar" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Valor acumulado con − / ＋ y barra de progreso si el bloque tiene meta. */
function BloqueContador({
  plantillaId,
  bloque,
  fila,
  color,
}: {
  plantillaId: string
  bloque: BloqueDef
  fila?: ItemPlantilla
  color: string
}) {
  const valor = fila?.valor ?? 0

  const sumar = (n: number) => sumarContadorPlantilla(plantillaId, bloque.id, n)

  const progreso = bloque.meta ? Math.min(100, Math.max(0, (valor / bloque.meta) * 100)) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => void sumar(-1)}
          className="h-9 w-9 rounded-lg bg-white/5 text-lg font-bold transition hover:bg-white/10"
        >
          −
        </button>
        <span className="min-w-16 text-center text-3xl font-black tabular-nums" style={{ color }}>
          {valor}
        </span>
        <button
          type="button"
          onClick={() => void sumar(1)}
          className="h-9 w-9 rounded-lg bg-white/5 text-lg font-bold transition hover:bg-white/10"
        >
          ＋
        </button>
      </div>
      {progreso != null && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progreso}%`, background: color }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-white/45">
            {valor} / {bloque.meta}
          </p>
        </div>
      )}
    </div>
  )
}

/** Enlaces guardados con título opcional; abren en pestaña nueva. */
function BloqueEnlaces({
  plantillaId,
  bloque,
  items,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
}) {
  const t = useT()
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const u = url.trim()
    if (!u) return
    const completo = /^https?:\/\//i.test(u) ? u : `https://${u}`
    setTitulo('')
    setUrl('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      texto: titulo.trim() || completo,
      url: completo,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void agregar(e)} className="flex flex-wrap gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={t('plantillaCustom.enlaceTitulo', 'Título (opcional)')}
          maxLength={60}
          className={inputCls}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      {items.length === 0 && (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.enlacesVacio', 'Sin enlaces guardados.')}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
            <a
              href={i.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-sky-400 underline-offset-2 hover:underline"
            >
              {i.texto || i.url}
            </a>
            <button
              type="button"
              onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
              title={t('plantillaCustom.borrarItem', 'Borrar')}
              className="shrink-0 rounded px-1 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
            >
              <Icono nombre="cerrar" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Lista de viñetas (como checklist pero sin casilla). */
function BloqueLista({
  plantillaId,
  bloque,
  items,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
}) {
  const t = useT()
  const [nuevo, setNuevo] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const texto = nuevo.trim()
    if (!texto) return
    setNuevo('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      texto,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void agregar(e)} className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={t('plantillaCustom.listaPh', 'Nuevo elemento…')}
          maxLength={120}
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      {items.length === 0 && (
        <p className="text-xs text-white/40">{t('plantillaCustom.listaVacio', 'Lista vacía.')}</p>
      )}
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
            <span className="shrink-0 text-white/30">•</span>
            <span className="min-w-0 flex-1 break-words text-sm text-white/85">{i.texto}</span>
            <button
              type="button"
              onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
              title={t('plantillaCustom.borrarItem', 'Borrar')}
              className="shrink-0 rounded px-1 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
            >
              <Icono nombre="cerrar" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Valoración de 1 a 5 estrellas (fila única). */
function BloqueValoracion({
  plantillaId,
  bloque,
  fila,
  color,
}: {
  plantillaId: string
  bloque: BloqueDef
  fila?: ItemPlantilla
  color: string
}) {
  const valor = fila?.valor ?? 0

  const fijar = async (n: number) => {
    if (fila?.id != null) await itemsPlantillaRepo.update(fila.id, { valor: n })
    else
      await itemsPlantillaRepo.add({
        plantillaId,
        bloqueId: bloque.id,
        valor: n,
        creadoEn: new Date().toISOString(),
      })
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => void fijar(n)}
          className="text-3xl leading-none transition hover:scale-110"
          style={{ color: n <= valor ? color : 'rgba(255,255,255,0.2)' }}
        >
          <Icono nombre="estrella" />
        </button>
      ))}
    </div>
  )
}

/** Registro fechado tipo diario (entradas, la más reciente arriba). */
function BloqueBitacora({
  plantillaId,
  bloque,
  items,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
}) {
  const t = useT()
  const [nuevo, setNuevo] = useState('')

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const texto = nuevo.trim()
    if (!texto) return
    setNuevo('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      texto,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void agregar(e)} className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={t('plantillaCustom.bitacoraPh', 'Nueva entrada…')}
          maxLength={280}
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      {items.length === 0 && (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.bitacoraVacio', 'Sin entradas todavía.')}
        </p>
      )}
      <ul className="space-y-2">
        {[...items].reverse().map((i) => (
          <li key={i.id} className="group rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-white/85">
                {i.texto}
              </p>
              <button
                type="button"
                onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
                title={t('plantillaCustom.borrarItem', 'Borrar')}
                className="shrink-0 rounded px-1 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-white/35">{fechaCorta(i.creadoEn)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Medición numérica en el tiempo con mini-gráfica de línea. */
function BloqueProgreso({
  plantillaId,
  bloque,
  items,
  color,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
  color: string
}) {
  const t = useT()
  const [valor, setValor] = useState('')
  const unidad = bloque.unidad ?? ''
  const puntos = items.filter((i) => typeof i.valor === 'number').map((i) => i.valor as number)
  const ultimo = puntos.length ? puntos[puntos.length - 1] : null

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(valor)
    if (valor.trim() === '' || !Number.isFinite(n)) return
    setValor('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      valor: n,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => void registrar(e)} className="flex gap-2">
        <input
          type="number"
          step="any"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={t('plantillaCustom.progresoPh', 'Valor…')}
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      {ultimo == null ? (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.progresoVacio', 'Sin mediciones todavía.')}
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tabular-nums" style={{ color }}>
              {ultimo}
            </span>
            {unidad && <span className="text-xs text-white/45">{unidad}</span>}
          </div>
          {puntos.length > 1 && <MiniLinea valores={puntos} color={color} />}
          {bloque.meta != null && (
            <BarraMeta valor={ultimo} meta={bloque.meta} color={color} unidad={unidad} />
          )}
        </>
      )}
    </div>
  )
}

/** Línea de progresión (SVG puro) para una serie de valores. */
function MiniLinea({ valores, color }: { valores: number[]; color: string }) {
  const W = 280
  const H = 70
  const PAD = 6
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (valores.length - 1)
  const y = (v: number) => H - PAD - ((v - min) / rango) * (H - PAD * 2)
  const puntos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline
        points={puntos}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {valores.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === valores.length - 1 ? 3 : 2} fill={color} />
      ))}
    </svg>
  )
}

/** Barra de progreso hacia una meta (reutilizada por progreso y sesiones). */
function BarraMeta({
  valor,
  meta,
  color,
  unidad,
}: {
  valor: number
  meta: number
  color: string
  unidad?: string
}) {
  const pct = Math.min(100, Math.max(0, (valor / meta) * 100))
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-right text-[11px] text-white/45">
        {valor} / {meta}
        {unidad ? ` ${unidad}` : ''}
      </p>
    </div>
  )
}

/** Sesiones con minutos + nota; muestra el total acumulado. */
function BloqueSesiones({
  plantillaId,
  bloque,
  items,
  color,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
  color: string
}) {
  const t = useT()
  const [min, setMin] = useState('')
  const [nota, setNota] = useState('')
  const total = items.reduce((s, i) => s + (i.valor ?? 0), 0)

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(min)
    if (!Number.isFinite(n) || n <= 0) return
    setMin('')
    setNota('')
    await itemsPlantillaRepo.add({
      plantillaId,
      bloqueId: bloque.id,
      valor: n,
      texto: nota.trim() || undefined,
      creadoEn: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(e) => void registrar(e)} className="flex flex-wrap gap-2">
        <input
          type="number"
          min={1}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder={t('plantillaCustom.sesionMin', 'Minutos')}
          className="w-24 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-white/30"
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('plantillaCustom.sesionNota', 'Nota (opcional)')}
          maxLength={80}
          className={inputCls}
        />
        <button type="submit" className={btnAgregarCls}>
          ＋
        </button>
      </form>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-white/45">{t('plantillaCustom.sesionTotal', 'Total')}:</span>
        <span className="text-lg font-black tabular-nums" style={{ color }}>
          {total}
        </span>
        <span className="text-xs text-white/45">min{bloque.meta ? ` / ${bloque.meta}` : ''}</span>
      </div>
      {bloque.meta != null && <BarraMeta valor={total} meta={bloque.meta} color={color} unidad="min" />}
      {items.length === 0 && (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.sesionVacio', 'Sin sesiones todavía.')}
        </p>
      )}
      <ul className="space-y-1">
        {[...items].reverse().map((i) => (
          <li key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/5">
            <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color }}>
              {i.valor} min
            </span>
            {i.texto && <span className="min-w-0 flex-1 truncate text-sm text-white/70">{i.texto}</span>}
            <span className="ml-auto shrink-0 text-[10px] text-white/35">{fechaCorta(i.creadoEn)}</span>
            <button
              type="button"
              onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
              title={t('plantillaCustom.borrarItem', 'Borrar')}
              className="shrink-0 rounded px-1 text-white/30 opacity-0 transition hover:text-white/70 group-hover:opacity-100"
            >
              <Icono nombre="cerrar" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const SEMANAS_HABITO = 15

/** Hábito diario: marcar hoy, heatmap de las últimas semanas y racha. */
function BloqueHabito({
  plantillaId,
  bloque,
  items,
  color,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
  color: string
}) {
  const t = useT()
  const hoy = fechaLocalISO()
  const dias = useMemo(
    () => new Set(items.map((i) => i.texto).filter((x): x is string => !!x)),
    [items],
  )
  const marcadoHoy = dias.has(hoy)
  const racha = useMemo(() => calcularRacha(dias, hoy), [dias, hoy])
  const columnas = useMemo(() => {
    const lunes = inicioSemanaISO(hoy)
    return Array.from({ length: SEMANAS_HABITO }, (_, i) => {
      const lunesCol = sumarDiasISO(lunes, -7 * (SEMANAS_HABITO - 1 - i))
      return Array.from({ length: 7 }, (_, d) => sumarDiasISO(lunesCol, d))
    })
  }, [hoy])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void alternarHabitoDia(plantillaId, bloque.id, hoy)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            marcadoHoy
              ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
              : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          {marcadoHoy
            ? t('plantillaCustom.habitoHecho', 'Hecho hoy ✓')
            : t('plantillaCustom.habitoMarcar', 'Marcar hoy')}
        </button>
        <span className="text-sm text-white/70">
          <Icono nombre="racha" />{' '}
          <span className="font-bold" style={{ color }}>
            {racha}
          </span>{' '}
          {t('plantillaCustom.habitoRacha', 'racha')}
        </span>
      </div>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {columnas.map((col, ci) => (
          <div key={ci} className="flex shrink-0 flex-col gap-0.5">
            {col.map((f) => (
              <div
                key={f}
                title={f}
                className={`h-3 w-3 rounded-[2px] ${f === hoy ? 'ring-1 ring-white/60' : ''} ${
                  f > hoy ? 'opacity-0' : ''
                }`}
                style={{ background: dias.has(f) ? color : 'rgba(255,255,255,0.06)' }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-right text-[11px] text-white/40">
        {dias.size} {t('plantillaCustom.habitoDias', 'días activos')}
      </p>
    </div>
  )
}

/** Cuenta regresiva hacia una fecha objetivo. */
function BloqueCuenta({ bloque, color }: { bloque: BloqueDef; color: string }) {
  const t = useT()
  if (!bloque.fecha) {
    return (
      <p className="text-xs text-white/40">
        {t('plantillaCustom.cuentaSinFecha', 'Configura una fecha objetivo al editar.')}
      </p>
    )
  }
  const dias = diasEntre(fechaLocalISO(), bloque.fecha)
  const etiqueta =
    dias > 0
      ? t('plantillaCustom.cuentaDias', 'días restantes')
      : dias === 0
        ? t('plantillaCustom.cuentaHoy', '¡Hoy!')
        : t('plantillaCustom.cuentaPaso', 'días atrás')
  return (
    <div className="text-center">
      <div className="text-4xl font-black tabular-nums" style={{ color }}>
        {Math.abs(dias)}
      </div>
      <p className="text-xs text-white/50">{etiqueta}</p>
      <p className="mt-1 text-[11px] text-white/35">{fechaCorta(bloque.fecha + 'T00:00:00')}</p>
    </div>
  )
}

/** Galería de fotos comprimidas. */
function BloqueGaleria({
  plantillaId,
  bloque,
  items,
}: {
  plantillaId: string
  bloque: BloqueDef
  items: ItemPlantilla[]
}) {
  const t = useT()

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const archivo of archivos) {
      const foto = await comprimirFoto(archivo)
      await itemsPlantillaRepo.add({
        plantillaId,
        bloqueId: bloque.id,
        foto,
        creadoEn: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="space-y-2">
      <label className={`${btnAgregarCls} inline-flex cursor-pointer`}>
        {t('plantillaCustom.galeriaAgregar', 'Agregar fotos')}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void subir(e)} />
      </label>
      {items.length === 0 && (
        <p className="text-xs text-white/40">
          {t('plantillaCustom.galeriaVacio', 'Sin fotos todavía.')}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {items.map(
          (i) =>
            i.foto && (
              <div
                key={i.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
              >
                <Foto blob={i.foto} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => i.id != null && void itemsPlantillaRepo.remove(i.id)}
                  title={t('plantillaCustom.borrarItem', 'Borrar')}
                  className="ui-noche absolute right-1 top-1 rounded bg-black/60 px-1.5 text-white/80 opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                >
                  <Icono nombre="cerrar" />
                </button>
              </div>
            ),
        )}
      </div>
    </div>
  )
}

/** Fecha corta legible (local) desde un ISO. */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

/** Suma días a una fecha `yyyy-mm-dd` local. */
function sumarDiasISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return fechaLocalISO(new Date(y, m - 1, d + n))
}

/** Lunes de la semana de una fecha `yyyy-mm-dd`. */
function inicioSemanaISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7 // lunes = 0
  return sumarDiasISO(iso, -dow)
}

/** Días consecutivos marcados hasta hoy (o hasta ayer si hoy no está marcado). */
function calcularRacha(dias: Set<string>, hoy: string): number {
  let n = 0
  let cur = dias.has(hoy) ? hoy : sumarDiasISO(hoy, -1)
  while (dias.has(cur)) {
    n++
    cur = sumarDiasISO(cur, -1)
  }
  return n
}

/** Diferencia en días entre dos fechas `yyyy-mm-dd` local. */
function diasEntre(desdeISO: string, hastaISO: string): number {
  const a = new Date(desdeISO + 'T00:00:00')
  const b = new Date(hastaISO + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
