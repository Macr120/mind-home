import { useState, type ReactNode } from 'react'
import type { DietaGuardada, Receta } from '../../core/data/db'
import { dietasGuardadasRepo, itemsCompraRepo, listasCompraRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { adivinarCategoria } from './categoriasCompra'
import { DetalleReceta } from './RecetasTab'
import { ImagenCocina } from './ImagenCocina'
import { Portada } from './Portada'
import { urlImagenDieta } from './imagenesPreset'
import { promptDieta } from './promptsFoto'
import { aplicarObjetivosDieta, generarDietaCompleta } from './generarDieta'
import { RECETAS_POR_DIETA, costoDieta } from './costosIA'
import { gramosDesdePct, repartoMacros } from './macros'
import { imagenIaActiva } from '../../core/imagenIA'
import { normalizar } from '../../core/chat/dispatcher'
import { Creditos } from '../../core/ui/Creditos'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Las dietas no tienen emoji propio: usan el de su primera receta. */
function emojiDieta(dieta: DietaGuardada, recetas: Receta[]): string {
  const primera = recetas.find((r) => r.id != null && dieta.recetaIds.includes(r.id))
  return primera?.emoji ?? '🥗'
}

/** El reparto de una dieta guardada, o null si no tiene macros. */
function repartoDieta(d: DietaGuardada) {
  return repartoMacros(d.proteinas ?? 0, d.carbohidratos ?? 0, d.grasas ?? 0, d.calorias)
}

/** Colores del reparto, en el orden P · C · G (los mismos de los macros de hoy). */
const COLOR_MACRO = { proteinas: '#f472b6', carbohidratos: '#60a5fa', grasas: '#a78bfa' } as const

/** Los tres tramos del reparto, ya traducidos y con su color. */
function tramosReparto(dieta: DietaGuardada, t: (clave: string, es: string) => string) {
  const r = repartoDieta(dieta)
  if (!r) return null
  return [
    { clave: 'proteinas', pct: r.proteinas, label: t('cocina.proteina', 'Proteína') },
    { clave: 'carbohidratos', pct: r.carbohidratos, label: t('cocina.carbos', 'Carbos') },
    { clave: 'grasas', pct: r.grasas, label: t('cocina.grasas', 'Grasas') },
  ] as const
}

/** Píldoras «25% proteína» — el reparto de un vistazo. */
export function ChipsReparto({ dieta }: { dieta: DietaGuardada }) {
  const t = useT()
  const tramos = tramosReparto(dieta, t)
  if (!tramos) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tramos.map((x) => (
        <span
          key={x.clave}
          className="flex items-center gap-1.5 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_MACRO[x.clave] }} />
          <b className="font-bold text-white/85">{x.pct}%</b> {x.label.toLowerCase()}
        </span>
      ))}
    </div>
  )
}

export function DietasTab({ dietas, recetas }: { dietas: DietaGuardada[]; recetas: Receta[] }) {
  const t = useT()
  const [selId, setSelId] = useState<number | null>(null)
  const [editando, setEditando] = useState<DietaGuardada | 'nueva' | null>(null)
  const [peticionIA, setPeticionIA] = useState<string | null>(null)
  // '' = quieto · 'plan' = pensando la dieta · 'fotos' = pintando las portadas.
  const [fase, setFase] = useState<'' | 'plan' | 'fotos'>('')
  const [errorIA, setErrorIA] = useState('')
  const generando = fase !== ''

  const generar = async () => {
    const peticion = (peticionIA ?? '').trim()
    if (!peticion || generando) return
    setErrorIA('')
    try {
      // Las recetas sí se guardan (el helper las mete al recetario); la dieta
      // se abre en el formulario para que el usuario la revise antes.
      setEditando(await generarDietaCompleta(peticion, setFase))
      setPeticionIA(null)
    } catch {
      setErrorIA(t('cocina.dieta.errorIA', 'No se pudo crear la dieta. Inténtalo otra vez.'))
    } finally {
      setFase('')
    }
  }

  // La IA vive DENTRO del alta (opción visible siempre; deshabilitada sin clave):
  // si se ocultara, nadie sabría que la dieta se puede pedir hecha con recetas y fotos.
  const bloqueIA = (
    <div className="space-y-2">
      <button
        type="button"
        data-tut="cocina.ia.dieta"
        onClick={() => setPeticionIA((v) => (v === null ? '' : null))}
        disabled={!iaActiva()}
        className="ui-accent-bg w-full rounded-xl py-2.5 text-sm font-bold hover:brightness-110 disabled:opacity-40"
      >
        <Icono nombre="brillo" /> {t('cocina.dieta.generarIA', 'Dieta con IA')}
      </button>
      {!iaActiva() && (
        <p className="text-[11px] text-white/40">
          {t('cocina.ia.sinClave', 'Configura la IA en el chat para crear recetas y dietas con imágenes.')}
        </p>
      )}
      {peticionIA !== null && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <input
            autoFocus
            value={peticionIA}
            onChange={(e) => setPeticionIA(e.target.value)}
            placeholder={t('cocina.dieta.phIA', '¿Qué dieta necesitas? Ej: bajar de peso, 1800 kcal, sin lácteos')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
          />
          <button
            type="button"
            onClick={generar}
            disabled={!peticionIA.trim() || generando}
            className="ui-accent-bg w-full rounded-lg py-2 text-sm font-bold hover:brightness-110 disabled:opacity-40"
          >
            {fase === 'plan'
              ? t('cocina.dieta.generando', 'Armando tu dieta y sus recetas…')
              : fase === 'fotos'
              ? t('cocina.dieta.generandoFotos', 'Pintando las fotos…')
              : t('cocina.dieta.generar', 'Crear dieta')}
          </button>
          {/* La dieta es lo más caro de la app: sus recetas se escriben una a
              una y cada foto son 10 créditos. El número va antes del gasto. */}
          <div className="flex items-center gap-2">
            <Creditos n={costoDieta(imagenIaActiva())} />
            <span className="text-[10px] text-white/40">
              {imagenIaActiva()
                ? t('cocina.ia.costoDieta', `La dieta, hasta ${RECETAS_POR_DIETA} recetas y sus fotos`, {
                    n: String(RECETAS_POR_DIETA),
                  })
                : t('cocina.ia.costoDietaSinFoto', `La dieta y hasta ${RECETAS_POR_DIETA} recetas, sin fotos`, {
                    n: String(RECETAS_POR_DIETA),
                  })}
            </span>
          </div>
          {errorIA && <p className="text-xs text-amber-300">{errorIA}</p>}
        </div>
      )}
    </div>
  )

  if (editando) {
    return (
      <FormDieta
        key={editando === 'nueva' ? 'nueva' : editando.id ?? 'ia'}
        dieta={editando === 'nueva' ? null : editando}
        recetas={recetas}
        bloqueIA={editando === 'nueva' ? bloqueIA : undefined}
        onCerrar={() => setEditando(null)}
      />
    )
  }

  const seleccionada = dietas.find((d) => d.id === selId) ?? null
  if (seleccionada) {
    return (
      <DetalleDieta
        dieta={seleccionada}
        recetas={recetas}
        onVolver={() => setSelId(null)}
        onEditar={() => setEditando(seleccionada)}
      />
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setEditando('nueva')}
        className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold hover:bg-white/15"
      >
        {t('cocina.dieta.nueva', 'Nueva dieta')}
      </button>

      {dietas.length === 0 && (
        <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
          {t('cocina.dieta.vacio', 'No hay dietas. Crea una o usa las de ejemplo.')}
        </p>
      )}

      <ul data-tut="cocina.dietas.lista" className="space-y-2">
        {dietas.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setSelId(d.id ?? null)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-start hover:bg-white/10 transition"
            >
              <Portada
                foto={d.foto}
                url={urlImagenDieta(d)}
                emoji={emojiDieta(d, recetas)}
                nombre={d.nombre}
                className="h-12 w-12 shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white/90 truncate">{d.nombre}</p>
                {d.descripcion && <p className="text-xs text-white/50 line-clamp-2">{d.descripcion}</p>}
                <p className="text-xs text-white/40 mt-0.5">
                  {t('cocina.dieta.nRecetas', `${d.recetaIds.length} recetas`, { n: String(d.recetaIds.length) })}
                  {d.calorias ? ` · ${d.calorias} kcal` : ''}
                </p>
                <ChipsReparto dieta={d} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DetalleDieta({
  dieta,
  recetas,
  onVolver,
  onEditar,
}: {
  dieta: DietaGuardada
  recetas: Receta[]
  onVolver: () => void
  onEditar: () => void
}) {
  const t = useT()
  const [aplicado, setAplicado] = useState(false)
  const [listaGenerada, setListaGenerada] = useState(false)
  const [recetaAbierta, setRecetaAbierta] = useState<Receta | null>(null)

  const recetasDieta = recetas.filter((r) => r.id != null && dieta.recetaIds.includes(r.id))
  const tieneMetas = dieta.calorias != null || dieta.proteinas != null

  if (recetaAbierta) {
    return (
      <DetalleReceta
        receta={recetaAbierta}
        onVolver={() => setRecetaAbierta(null)}
        etiquetaVolver={`‹ ${dieta.nombre}`}
      />
    )
  }

  const aplicarObjetivos = async () => {
    await aplicarObjetivosDieta(dieta)
    setAplicado(true)
    setTimeout(() => setAplicado(false), 2500)
  }

  const generarLista = async () => {
    if (recetasDieta.length === 0) return
    const creadoEn = new Date().toISOString()
    const listaId = await listasCompraRepo.add({
      nombre: `${t('cocina.dieta.listaPrefijo', 'Dieta')}: ${dieta.nombre}`,
      creadoEn,
    })
    for (const r of recetasDieta) {
      for (const ing of r.ingredientes) {
        await itemsCompraRepo.add({
          nombre: ing,
          categoria: adivinarCategoria(ing),
          comprado: false,
          creadoEn,
          listaId,
        })
      }
    }
    setListaGenerada(true)
    setTimeout(() => setListaGenerada(false), 2500)
  }

  const eliminar = async () => {
    if (dieta.id) await dietasGuardadasRepo.remove(dieta.id)
    onVolver()
  }

  const cambiarFoto = async (foto: Blob | undefined) => {
    if (dieta.id) await dietasGuardadasRepo.update(dieta.id, { foto })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {t('cocina.dieta.volver', '‹ Dietas')}
        </button>
        <button
          type="button"
          onClick={onEditar}
          className="ms-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          {t('cocina.rec.editar', 'Editar')}
        </button>
        <button
          type="button"
          onClick={eliminar}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
        >
          {t('chat.eliminar', 'Eliminar')}
        </button>
      </div>

      <ImagenCocina
        foto={dieta.foto}
        url={urlImagenDieta(dieta)}
        prompt={promptDieta(dieta)}
        emoji={emojiDieta(dieta, recetas)}
        nombre={dieta.nombre}
        onCambiar={cambiarFoto}
      />

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-lg font-bold text-white/90">{dieta.nombre}</p>
        {dieta.descripcion && <p className="mt-1 text-sm text-white/60">{dieta.descripcion}</p>}
        {tieneMetas && (
          <>
            <p className="mt-3 text-sm">
              {dieta.calorias != null && <span className="font-semibold text-amber-400">{dieta.calorias} kcal</span>}
              <span className="text-white/40 text-xs">
                {dieta.proteinas != null ? ` · P ${dieta.proteinas}g` : ''}
                {dieta.carbohidratos != null ? ` · C ${dieta.carbohidratos}g` : ''}
                {dieta.grasas != null ? ` · G ${dieta.grasas}g` : ''}
              </span>
            </p>
            <BarraReparto dieta={dieta} />
            <button
              type="button"
              onClick={aplicarObjetivos}
              className="ui-accent-bg mt-3 w-full rounded-xl py-2 text-sm font-bold hover:brightness-110"
            >
              {aplicado
                ? t('cocina.dieta.aplicado', '✓ Objetivos actualizados en Metas')
                : t('cocina.dieta.aplicar', 'Aplicar como mis objetivos')}
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold"><Icono nombre="tab-recetas" /> {t('cocina.dieta.recetas', 'Recetas de la dieta')}</p>
          {recetasDieta.length > 0 && (
            <button
              type="button"
              onClick={generarLista}
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              {listaGenerada
                ? t('cocina.dieta.listaGenerada', '✓ Guardada en Listas')
                : <><Icono nombre="tab-compras" /> {t('cocina.dieta.generarLista', 'Generar lista de compras')}</>}
            </button>
          )}
        </div>
        {recetasDieta.length === 0 ? (
          <p className="text-sm text-white/40">{t('cocina.dieta.sinRecetas', 'Esta dieta no tiene recetas asociadas.')}</p>
        ) : (
          <ul className="space-y-1">
            {recetasDieta.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setRecetaAbierta(r)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-white/5"
                >
                  <span className="text-xl"><Icono emoji={r.emoji} /></span>
                  <span className="flex-1 min-w-0 truncate text-white/85">{r.nombre}</span>
                  {r.calorias > 0 && <span className="text-xs text-white/40">{r.calorias} kcal</span>}
                  <span className="text-white/30">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** El reparto calórico de la dieta: una barra de tres tramos con sus píldoras. */
function BarraReparto({ dieta }: { dieta: DietaGuardada }) {
  const t = useT()
  const tramos = tramosReparto(dieta, t)
  if (!tramos) return null

  return (
    <div className="mt-3">
      <p className="text-[10px] text-white/45">{t('cocina.dieta.reparto', 'Reparto de macros')}</p>
      <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-black/40">
        {tramos.map((x) => (
          <div key={x.clave} style={{ width: `${x.pct}%`, background: COLOR_MACRO[x.clave] }} />
        ))}
      </div>
      <ChipsReparto dieta={dieta} />
    </div>
  )
}

function FormDieta({
  dieta,
  recetas,
  bloqueIA,
  onCerrar,
}: {
  dieta: DietaGuardada | null
  recetas: Receta[]
  /** Opción «con IA» del alta: la arma DietasTab (estados y créditos viven allá). */
  bloqueIA?: ReactNode
  onCerrar: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(dieta?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(dieta?.descripcion ?? '')
  const [calorias, setCalorias] = useState(String(dieta?.calorias || ''))
  const [proteinas, setProteinas] = useState(String(dieta?.proteinas || ''))
  const [carbos, setCarbos] = useState(String(dieta?.carbohidratos || ''))
  const [grasas, setGrasas] = useState(String(dieta?.grasas || ''))
  const [recetaIds, setRecetaIds] = useState<number[]>(dieta?.recetaIds ?? [])
  const [buscaReceta, setBuscaReceta] = useState('')

  const toggleReceta = (id: number) => {
    setRecetaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // El buscador solo recorta la lista visible: lo YA palomeado no se pierde al filtrar.
  const q = normalizar(buscaReceta.trim())
  const recetasVisibles = !q
    ? recetas
    : recetas.filter(
        (r) =>
          normalizar(r.nombre).includes(q) ||
          r.etiquetas.some((e) => normalizar(e).includes(q)) ||
          (r.carpeta ? normalizar(r.carpeta).includes(q) : false),
      )

  const opcional = (v: string) => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

  const num = (v: string) => parseFloat(v) || 0
  const kcal = num(calorias)
  const reparto = repartoMacros(num(proteinas), num(carbos), num(grasas), kcal)

  /** Escribir un % manda: recalcula los gramos de ese macro sobre las kcal. */
  const ponerPct = (setter: (v: string) => void, kcalPorGramo: 4 | 9) => (v: string) => {
    setter(String(gramosDesdePct(kcal, num(v), kcalPorGramo)))
  }

  const auto303040 = () => {
    setProteinas(String(gramosDesdePct(kcal, 30, 4)))
    setCarbos(String(gramosDesdePct(kcal, 40, 4)))
    setGrasas(String(gramosDesdePct(kcal, 30, 9)))
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      calorias: opcional(calorias),
      proteinas: opcional(proteinas),
      carbohidratos: opcional(carbos),
      grasas: opcional(grasas),
      recetaIds,
    }
    // La foto solo viaja al crear: si viene de la IA es su portada recién hecha,
    // y al editar una dieta guardada mandarla sería borrar la que ya tiene.
    if (dieta?.id) await dietasGuardadasRepo.update(dieta.id, datos)
    else await dietasGuardadasRepo.add({ ...datos, foto: dieta?.foto, creadoEn: new Date().toISOString() })
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
          {dieta ? t('cocina.dieta.editarTitulo', 'Editar dieta') : t('cocina.dieta.nuevaTitulo', 'Nueva dieta')}
        </p>
      </div>

      {bloqueIA}

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        {/* Portada recién generada por la IA (aún sin guardar): que se vea lo que
            se va a guardar. La de una dieta ya guardada se cambia en su detalle. */}
        {!dieta?.id && dieta?.foto && (
          <Portada
            foto={dieta.foto}
            emoji="🥗"
            nombre={nombre}
            className="aspect-video w-full rounded-lg border border-white/10"
            tamEmoji="text-5xl"
          />
        )}
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t('cocina.dieta.phNombre', 'Nombre de la dieta')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder={t('cocina.dieta.phDescripcion', 'Descripción (opcional)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/45">{t('cocina.dieta.metasOpc', 'Metas opcionales (se pueden aplicar a tus objetivos)')}</p>
          <button
            type="button"
            onClick={auto303040}
            disabled={kcal <= 0}
            className="text-[10px] font-semibold text-amber-400 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {t('cocina.metas.auto', 'Auto 30/40/30')}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CampoNum label="kcal" value={calorias} onChange={setCalorias} />
          <CampoNum label={t('cocina.dieta.gProt', 'P (g)')} value={proteinas} onChange={setProteinas} />
          <CampoNum label={t('cocina.dieta.gCarb', 'C (g)')} value={carbos} onChange={setCarbos} />
          <CampoNum label={t('cocina.dieta.gGras', 'G (g)')} value={grasas} onChange={setGrasas} />
        </div>
        {/* Los % son la otra cara de los gramos: escribir aquí los recalcula sobre
            las kcal de la dieta, que es como se piensan los planes (30/40/30). */}
        <div className="grid grid-cols-4 gap-2">
          <span className="self-end pb-2 text-[10px] text-white/45">
            {t('cocina.dieta.reparto', 'Reparto de macros')}
          </span>
          <CampoNum
            label="P %"
            value={reparto ? String(reparto.proteinas) : ''}
            onChange={ponerPct(setProteinas, 4)}
            disabled={kcal <= 0}
          />
          <CampoNum
            label="C %"
            value={reparto ? String(reparto.carbohidratos) : ''}
            onChange={ponerPct(setCarbos, 4)}
            disabled={kcal <= 0}
          />
          <CampoNum
            label="G %"
            value={reparto ? String(reparto.grasas) : ''}
            onChange={ponerPct(setGrasas, 9)}
            disabled={kcal <= 0}
          />
        </div>
        <p className="text-[10px] text-white/40">
          {kcal <= 0
            ? t('cocina.dieta.pctSinKcal', 'Pon las calorías para repartirlas en porcentajes.')
            : t('cocina.dieta.pctSuma', `Los macros suman ${(reparto?.proteinas ?? 0) + (reparto?.carbohidratos ?? 0) + (reparto?.grasas ?? 0)}% de las calorías`, {
                n: String((reparto?.proteinas ?? 0) + (reparto?.carbohidratos ?? 0) + (reparto?.grasas ?? 0)),
              })}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-sm font-semibold">{t('cocina.dieta.elegirRecetas', 'Recetas de la dieta')}</p>
        {recetas.length === 0 ? (
          <p className="text-xs text-white/40">{t('cocina.dieta.sinRecetario', 'Aún no tienes recetas. Crea recetas en la pestaña Recetas.')}</p>
        ) : (
          <>
            <input
              value={buscaReceta}
              onChange={(e) => setBuscaReceta(e.target.value)}
              placeholder={t('cocina.rec.buscar', 'Buscar receta o etiqueta...')}
              className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-white/30"
            />
            {recetasVisibles.length === 0 && (
              <p className="text-xs text-white/40">{t('cocina.rec.sinResultados', 'Ninguna receta coincide con la búsqueda.')}</p>
            )}
          <ul className="space-y-1">
            {recetasVisibles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => r.id != null && toggleReceta(r.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-white/5"
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${
                      r.id != null && recetaIds.includes(r.id)
                        ? 'bg-emerald-600 border-emerald-500 texto-cta'
                        : 'border-white/25'
                    }`}
                  >
                    {r.id != null && recetaIds.includes(r.id) ? '✓' : ''}
                  </span>
                  <span className="text-lg"><Icono emoji={r.emoji} /></span>
                  <span className="flex-1 min-w-0 truncate text-white/85">{r.nombre}</span>
                  {r.carpeta && <span className="text-[10px] text-white/40">{r.carpeta}</span>}
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      <button
        type="submit"
        className="ui-accent-bg w-full rounded-xl py-2.5 font-bold hover:brightness-110"
      >
        {t('cocina.dieta.guardar', 'Guardar dieta')}
      </button>
    </form>
  )
}

function CampoNum({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none disabled:opacity-40"
      />
    </label>
  )
}
