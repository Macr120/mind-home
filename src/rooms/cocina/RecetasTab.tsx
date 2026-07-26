import { useMemo, useState } from 'react'
import type { MomentoComida, Receta } from '../../core/data/db'
import { comidasRepo, itemsCompraRepo, listasCompraRepo, recetasRepo } from '../../core/data/repository'
import { adivinarCategoria } from './categoriasCompra'
import { MOMENTOS } from './constantes'
import { Icono } from '../../core/ui/iconos/Icono'
import { hoyISO } from './fecha'
import { normalizar } from '../../core/chat/dispatcher'
import { ImagenCocina } from './ImagenCocina'
import { Portada } from './Portada'
import { urlImagenReceta } from './imagenesPreset'
import { promptReceta } from './promptsFoto'
import { crearRecetaIA } from './recetaIA'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'

export function RecetasTab({ recetas }: { recetas: Receta[] }) {
  const t = useT()
  const [busqueda, setBusqueda] = useState('')
  // null = todas · '__sin__' = sin carpeta · otro = nombre de carpeta
  const [carpetaSel, setCarpetaSel] = useState<string | null>(null)
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null)
  const [editando, setEditando] = useState<Receta | 'nueva' | null>(null)
  const [peticionIA, setPeticionIA] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  const generar = async () => {
    const peticion = (peticionIA ?? '').trim()
    if (!peticion || generando) return
    setGenerando(true)
    setErrorIA('')
    try {
      const r = await crearRecetaIA(peticion)
      // No se guarda todavía: se abre el formulario para revisar y confirmar.
      setEditando({ ...r, fuente: 'ia', creadaEn: new Date().toISOString() })
      setPeticionIA(null)
    } catch {
      setErrorIA(t('cocina.rec.errorIA', 'No se pudo crear la receta. Inténtalo otra vez.'))
    } finally {
      setGenerando(false)
    }
  }

  const carpetas = useMemo(() => {
    const set = new Set<string>()
    for (const r of recetas) if (r.carpeta?.trim()) set.add(r.carpeta.trim())
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [recetas])

  const hayNoCarpeta = recetas.some((r) => !r.carpeta?.trim())

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return recetas
    return recetas.filter(
      (r) =>
        normalizar(r.nombre).includes(q) ||
        r.etiquetas.some((e) => normalizar(e).includes(q)) ||
        (r.carpeta ? normalizar(r.carpeta).includes(q) : false),
    )
  }, [recetas, busqueda])

  const grupos = useMemo(() => {
    const sinCarpeta = (r: Receta) => !r.carpeta?.trim()
    if (carpetaSel === '__sin__') return [{ carpeta: null, items: filtradas.filter(sinCarpeta) }]
    if (carpetaSel !== null) return [{ carpeta: carpetaSel, items: filtradas.filter((r) => r.carpeta?.trim() === carpetaSel) }]
    const gs: { carpeta: string | null; items: Receta[] }[] = carpetas.map((c) => ({
      carpeta: c,
      items: filtradas.filter((r) => r.carpeta?.trim() === c),
    }))
    const sin = filtradas.filter(sinCarpeta)
    if (sin.length) gs.push({ carpeta: null, items: sin })
    return gs.filter((g) => g.items.length > 0)
  }, [filtradas, carpetas, carpetaSel])

  if (editando) {
    return (
      <FormReceta
        receta={editando === 'nueva' ? null : editando}
        carpetas={carpetas}
        onCerrar={() => setEditando(null)}
      />
    )
  }

  const seleccionada = recetas.find((r) => r.id === seleccionadaId) ?? null
  if (seleccionada) {
    return (
      <DetalleReceta
        receta={seleccionada}
        onVolver={() => setSeleccionadaId(null)}
        onEditar={() => setEditando(seleccionada)}
      />
    )
  }

  const totalVisibles = grupos.reduce((s, g) => s + g.items.length, 0)

  return (
    <div data-tut="cocina.recetas.lista" className="space-y-4">
      <div className="flex gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('cocina.rec.buscar', 'Buscar receta o etiqueta...')}
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        {iaActiva() && (
          <button
            type="button"
            onClick={() => setPeticionIA((v) => (v === null ? '' : null))}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold texto-cta hover:brightness-110"
          >
            <Icono nombre="brillo" /> {t('cocina.rec.crearIA', 'Con IA')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditando('nueva')}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15"
        >
          <Icono nombre="agregar" /> {t('cocina.rec.nueva', 'Nueva')}
        </button>
      </div>

      {peticionIA !== null && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <input
            autoFocus
            value={peticionIA}
            onChange={(e) => setPeticionIA(e.target.value)}
            placeholder={t('cocina.rec.phIA', '¿Qué quieres cocinar? Ej: pollo al horno con verduras')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
          />
          <button
            type="button"
            onClick={generar}
            disabled={!peticionIA.trim() || generando}
            className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold texto-cta hover:brightness-110 disabled:opacity-40"
          >
            {generando ? t('cocina.rec.generando', 'Cocinando…') : t('cocina.rec.generar', 'Crear receta')}
          </button>
          {errorIA && <p className="text-xs text-amber-300">{errorIA}</p>}
        </div>
      )}

      {carpetas.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <ChipCarpeta activo={carpetaSel === null} onClick={() => setCarpetaSel(null)} label={t('cocina.rec.todas', 'Todas')} />
          {carpetas.map((c) => (
            <ChipCarpeta key={c} activo={carpetaSel === c} onClick={() => setCarpetaSel(c)} label={c} />
          ))}
          {hayNoCarpeta && (
            <ChipCarpeta activo={carpetaSel === '__sin__'} onClick={() => setCarpetaSel('__sin__')} label={t('cocina.rec.sinCarpeta', 'Sin carpeta')} />
          )}
        </div>
      )}

      {totalVisibles === 0 && (
        <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
          {recetas.length === 0
            ? t('cocina.rec.vacio', 'Tu recetario está vacío. Crea una receta o pídesela al asistente.')
            : t('cocina.rec.sinResultados', 'Ninguna receta coincide con la búsqueda.')}
        </p>
      )}

      {grupos.map((g) => (
        <div key={g.carpeta ?? '__sin__'} className="space-y-2">
          {carpetaSel === null && (
            <p className="px-1 text-xs font-semibold text-white/50">
              {g.carpeta ?? t('cocina.rec.sinCarpeta', 'Sin carpeta')}
            </p>
          )}
          {g.items.map((r) => (
            <TarjetaReceta key={r.id} receta={r} onClick={() => setSeleccionadaId(r.id ?? null)} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ChipCarpeta({ activo, onClick, label }: { activo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        activo ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

function TarjetaReceta({ receta: r, onClick }: { receta: Receta; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-left hover:bg-white/10 transition"
    >
      <div className="flex items-center gap-3">
        <Portada
          foto={r.foto}
          url={urlImagenReceta(r.nombre)}
          emoji={r.emoji}
          nombre={r.nombre}
          className="h-11 w-11 shrink-0 rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white/90 truncate">
            {r.nombre}
            {r.fuente === 'ia' && <span className="ml-1.5 text-xs"><Icono nombre="brillo" /></span>}
          </p>
          <p className="text-xs text-white/40">
            {r.calorias > 0 &&
              `${t('cocina.rec.kcalPorPorcion', '{n} kcal/porción', { n: String(r.calorias) })} · `}
            {r.minutos > 0 && `${r.minutos} min · `}
            {t('cocina.rec.porciones', `${r.porciones} porciones`, { n: String(r.porciones) })}
          </p>
        </div>
      </div>
      {r.etiquetas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {r.etiquetas.map((e) => (
            <span key={e} className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
              {e}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

export function DetalleReceta({
  receta,
  onVolver,
  onEditar,
  etiquetaVolver,
}: {
  receta: Receta
  onVolver: () => void
  /** Sin este handler la receta se muestra en modo lectura (sin editar/eliminar). */
  onEditar?: () => void
  etiquetaVolver?: string
}) {
  const t = useT()
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [momento, setMomento] = useState<MomentoComida>('comida')
  const [registrado, setRegistrado] = useState(false)
  const [enLista, setEnLista] = useState(false)

  const guardarEnLista = async () => {
    const creadoEn = new Date().toISOString()
    const listaId = await listasCompraRepo.add({
      nombre: `${receta.emoji} ${receta.nombre}`,
      creadoEn,
    })
    for (const ing of receta.ingredientes) {
      await itemsCompraRepo.add({
        nombre: ing,
        categoria: adivinarCategoria(ing),
        comprado: false,
        creadoEn,
        listaId,
      })
    }
    setEnLista(true)
    setTimeout(() => setEnLista(false), 2500)
  }

  const toggleIngrediente = (i: number) => {
    setMarcados((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  }

  const registrarAlDiario = async () => {
    await comidasRepo.add({
      fecha: hoyISO(),
      momento,
      nombre: receta.nombre,
      calorias: receta.calorias,
      proteinas: receta.proteinas,
      carbohidratos: receta.carbohidratos,
      grasas: receta.grasas,
    })
    setRegistrado(true)
    setTimeout(() => setRegistrado(false), 2500)
  }

  const eliminar = async () => {
    if (!receta.id) return
    await recetasRepo.remove(receta.id)
    onVolver()
  }

  const cambiarFoto = async (foto: Blob | undefined) => {
    if (receta.id) await recetasRepo.update(receta.id, { foto })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {etiquetaVolver ?? t('cocina.rec.volver', '‹ Recetario')}
        </button>
        {onEditar && (
          <>
            <button
              type="button"
              onClick={onEditar}
              className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              <Icono nombre="editar" /> {t('cocina.rec.editar', 'Editar')}
            </button>
            <button
              type="button"
              onClick={eliminar}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20"
            >
              {t('chat.eliminar', 'Eliminar')}
            </button>
          </>
        )}
      </div>

      {onEditar ? (
        <ImagenCocina
          foto={receta.foto}
          url={urlImagenReceta(receta.nombre)}
          prompt={promptReceta(receta)}
          emoji={receta.emoji}
          nombre={receta.nombre}
          onCambiar={cambiarFoto}
        />
      ) : (
        <Portada
          foto={receta.foto}
          url={urlImagenReceta(receta.nombre)}
          emoji={receta.emoji}
          nombre={receta.nombre}
          className="aspect-video w-full rounded-xl border border-white/10"
          tamEmoji="text-6xl"
        />
      )}

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl"><Icono emoji={receta.emoji} /></span>
          <div>
            <p className="text-lg font-bold text-white/90">{receta.nombre}</p>
            <p className="text-xs text-white/40">
              {receta.minutos > 0 && (
                <>
                  <Icono nombre="cronometro" /> {receta.minutos} min ·{' '}
                </>
              )}
              {t('cocina.rec.porciones', `${receta.porciones} porciones`, { n: String(receta.porciones) })}
            </p>
          </div>
        </div>
        {receta.calorias > 0 && (
          <p className="mt-3 text-sm">
            <span className="font-semibold text-amber-400">{receta.calorias} kcal</span>
            <span className="text-white/40 text-xs">
              {' '}
              {t('cocina.rec.porPorcion', 'por porción')} · P {receta.proteinas}g · C {receta.carbohidratos}g · G {receta.grasas}g
            </span>
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold"><Icono nombre="canasta" /> {t('cocina.rec.ingredientes', 'Ingredientes')}</p>
          <button
            type="button"
            onClick={guardarEnLista}
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            {enLista ? (
              t('cocina.rec.enLista', '✓ Guardada en Listas')
            ) : (
              <><Icono nombre="tab-compras" /> {t('cocina.rec.aLista', 'Generar lista de compras')}</>
            )}
          </button>
        </div>
        <ul className="space-y-1.5">
          {receta.ingredientes.map((ing, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleIngrediente(i)}
                className="flex w-full items-center gap-2 text-left text-sm"
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${
                    marcados.has(i)
                      ? 'bg-emerald-600 border-emerald-500 texto-cta'
                      : 'border-white/25'
                  }`}
                >
                  {marcados.has(i) ? '✓' : ''}
                </span>
                <span className={marcados.has(i) ? 'line-through text-white/40' : 'text-white/85'}>
                  {ing}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {receta.pasos.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-sm font-semibold mb-2"><Icono nombre="chef" /> {t('cocina.rec.pasos', 'Preparación')}</p>
          <ol className="space-y-2.5">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="h-5 w-5 shrink-0 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-white/85">{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-sm font-semibold"><Icono nombre="tab-diario" /> {t('cocina.rec.registrar', 'Registrar al diario de hoy')}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMomento(m.id)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                momento === m.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Icono emoji={m.icon} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={registrarAlDiario}
          className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
        >
          {registrado
            ? t('cocina.rec.registrado', '✓ Registrado (1 porción)')
            : t('cocina.rec.registrarBtn', 'Registrar 1 porción')}
        </button>
      </div>
    </div>
  )
}

function FormReceta({ receta, carpetas, onCerrar }: { receta: Receta | null; carpetas: string[]; onCerrar: () => void }) {
  const t = useT()
  const [nombre, setNombre] = useState(receta?.nombre ?? '')
  const [emoji, setEmoji] = useState(receta?.emoji ?? '🍲')
  const [carpeta, setCarpeta] = useState(receta?.carpeta ?? '')
  const [porciones, setPorciones] = useState(String(receta?.porciones ?? 2))
  const [minutos, setMinutos] = useState(String(receta?.minutos ?? ''))
  const [etiquetas, setEtiquetas] = useState(receta?.etiquetas.join(', ') ?? '')
  const [ingredientes, setIngredientes] = useState(receta?.ingredientes.join('\n') ?? '')
  const [pasos, setPasos] = useState(receta?.pasos.join('\n') ?? '')
  const [calorias, setCalorias] = useState(String(receta?.calorias || ''))
  const [proteinas, setProteinas] = useState(String(receta?.proteinas || ''))
  const [carbos, setCarbos] = useState(String(receta?.carbohidratos || ''))
  const [grasas, setGrasas] = useState(String(receta?.grasas || ''))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const listaIngredientes = ingredientes.split('\n').map((x) => x.trim()).filter(Boolean)
    if (!nombre.trim() || listaIngredientes.length === 0) return
    const datos = {
      nombre: nombre.trim(),
      emoji: emoji.trim() || '🍲',
      carpeta: carpeta.trim() || undefined,
      porciones: Math.max(1, parseInt(porciones, 10) || 2),
      minutos: Math.max(0, parseInt(minutos, 10) || 0),
      etiquetas: etiquetas.split(',').map((x) => x.trim()).filter(Boolean),
      ingredientes: listaIngredientes,
      pasos: pasos.split('\n').map((x) => x.trim()).filter(Boolean),
      calorias: Math.max(0, parseInt(calorias, 10) || 0),
      proteinas: Math.max(0, parseInt(proteinas, 10) || 0),
      carbohidratos: Math.max(0, parseInt(carbos, 10) || 0),
      grasas: Math.max(0, parseInt(grasas, 10) || 0),
    }
    if (receta?.id) await recetasRepo.update(receta.id, datos)
    // Sin id pero con receta = viene precargada de la IA; conserva su origen.
    else await recetasRepo.add({ ...datos, fuente: receta?.fuente ?? 'manual', creadaEn: new Date().toISOString() })
    onCerrar()
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {t('cocina.rec.cancelar', '‹ Cancelar')}
        </button>
        <p className="text-sm font-semibold">
          {receta ? t('cocina.rec.editarTitulo', 'Editar receta') : t('cocina.rec.nuevaTitulo', 'Nueva receta')}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-14 rounded-lg bg-black/30 px-2 py-2 text-center text-lg border border-white/10 outline-none"
            aria-label={t('cocina.rec.emoji', 'Emoji')}
          />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('cocina.rec.ph.nombre', 'Nombre del platillo')}
            className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CampoNum label={t('cocina.rec.campoPorciones', 'Porciones')} value={porciones} onChange={setPorciones} />
          <CampoNum label={t('cocina.rec.campoMinutos', 'Minutos')} value={minutos} onChange={setMinutos} />
        </div>
        <input
          value={etiquetas}
          onChange={(e) => setEtiquetas(e.target.value)}
          placeholder={t('cocina.rec.ph.etiquetas', 'Etiquetas separadas por coma (pollo, rápida...)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <input
          value={carpeta}
          onChange={(e) => setCarpeta(e.target.value)}
          list="carpetas-recetas"
          placeholder={t('cocina.rec.ph.carpeta', 'Carpeta (ej. Italiana, Mexicana...)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <datalist id="carpetas-recetas">
          {carpetas.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <label className="block">
          <span className="text-[10px] text-white/45">
            {t('cocina.rec.campoIngredientes', 'Ingredientes (uno por línea, con cantidad)')}
          </span>
          <textarea
            value={ingredientes}
            onChange={(e) => setIngredientes(e.target.value)}
            rows={5}
            placeholder={'200 g de arroz\n1 pechuga de pollo\n...'}
            className="mt-0.5 w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-white/45">
            {t('cocina.rec.campoPasos', 'Pasos (uno por línea)')}
          </span>
          <textarea
            value={pasos}
            onChange={(e) => setPasos(e.target.value)}
            rows={5}
            className="mt-0.5 w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          />
        </label>
        <p className="text-[10px] text-white/45">{t('cocina.rec.macrosPorcion', 'Macros por porción')}</p>
        <div className="grid grid-cols-4 gap-2">
          <CampoNum label="kcal" value={calorias} onChange={setCalorias} />
          <CampoNum label="P" value={proteinas} onChange={setProteinas} />
          <CampoNum label="C" value={carbos} onChange={setCarbos} />
          <CampoNum label="G" value={grasas} onChange={setGrasas} />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
        >
          {t('cocina.rec.guardar', 'Guardar receta')}
        </button>
      </div>
    </form>
  )
}

function CampoNum({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none"
      />
    </label>
  )
}
