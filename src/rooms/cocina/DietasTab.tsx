import { useState } from 'react'
import type { DietaGuardada, Receta } from '../../core/data/db'
import {
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  perfilNutricionRepo,
  recetasRepo,
} from '../../core/data/repository'
import { crearDietaIA, crearRecetaIA } from './recetaIA'
import { iaActiva } from '../../core/chat/ia'
import { adivinarCategoria } from './categoriasCompra'
import { PERFIL_DEFECTO } from './constantes'
import { DetalleReceta } from './RecetasTab'
import { ImagenCocina } from './ImagenCocina'
import { Portada } from './Portada'
import { urlImagenDieta } from './imagenesPreset'
import { promptDieta } from './promptsFoto'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Las dietas no tienen emoji propio: usan el de su primera receta. */
function emojiDieta(dieta: DietaGuardada, recetas: Receta[]): string {
  const primera = recetas.find((r) => r.id != null && dieta.recetaIds.includes(r.id))
  return primera?.emoji ?? '🥗'
}

export function DietasTab({ dietas, recetas }: { dietas: DietaGuardada[]; recetas: Receta[] }) {
  const t = useT()
  const [selId, setSelId] = useState<number | null>(null)
  const [editando, setEditando] = useState<DietaGuardada | 'nueva' | null>(null)
  const [peticionIA, setPeticionIA] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [errorIA, setErrorIA] = useState('')

  const generar = async () => {
    const peticion = (peticionIA ?? '').trim()
    if (!peticion || generando) return
    setGenerando(true)
    setErrorIA('')
    try {
      const d = await crearDietaIA(peticion)
      // Las recetas sí se guardan: van al recetario, que es su sitio. La dieta
      // se abre en el formulario para que el usuario la revise antes.
      const creadas = await Promise.all(
        d.recetas.map(async (nombre) => {
          try {
            const r = await crearRecetaIA(nombre)
            return await recetasRepo.add({ ...r, fuente: 'ia', creadaEn: new Date().toISOString() })
          } catch {
            return null
          }
        }),
      )
      setEditando({
        nombre: d.nombre,
        descripcion: d.descripcion,
        calorias: d.calorias,
        proteinas: d.proteinas,
        carbohidratos: d.carbohidratos,
        grasas: d.grasas,
        recetaIds: creadas.filter((x): x is number => typeof x === 'number'),
        creadoEn: new Date().toISOString(),
      })
      setPeticionIA(null)
    } catch {
      setErrorIA(t('cocina.dieta.errorIA', 'No se pudo crear la dieta. Inténtalo otra vez.'))
    } finally {
      setGenerando(false)
    }
  }

  if (editando) {
    return (
      <FormDieta
        dieta={editando === 'nueva' ? null : editando}
        recetas={recetas}
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
      <div className="flex gap-2">
        {iaActiva() && (
          <button
            type="button"
            onClick={() => setPeticionIA((v) => (v === null ? '' : null))}
            className="flex-1 rounded-xl bg-amber-600 texto-cta py-2.5 text-sm font-bold hover:brightness-110"
          >
            <Icono nombre="brillo" /> {t('cocina.dieta.generarIA', 'Dieta con IA')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditando('nueva')}
          className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold hover:bg-white/15"
        >
          {t('cocina.dieta.nueva', 'Nueva dieta')}
        </button>
      </div>

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
            className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold texto-cta hover:brightness-110 disabled:opacity-40"
          >
            {generando
              ? t('cocina.dieta.generando', 'Armando tu dieta y sus recetas…')
              : t('cocina.dieta.generar', 'Crear dieta')}
          </button>
          {errorIA && <p className="text-xs text-amber-300">{errorIA}</p>}
        </div>
      )}

      {dietas.length === 0 && (
        <p className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/40">
          {t('cocina.dieta.vacio', 'No hay dietas. Crea una o usa las de ejemplo.')}
        </p>
      )}

      <ul className="space-y-2">
        {dietas.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setSelId(d.id ?? null)}
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left hover:bg-white/10 transition"
            >
              <Portada
                foto={d.foto}
                url={urlImagenDieta(d.nombre)}
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
    const datos: Record<string, number> = {}
    if (dieta.calorias != null) datos.calorias = dieta.calorias
    if (dieta.proteinas != null) datos.proteinas = dieta.proteinas
    if (dieta.carbohidratos != null) datos.carbohidratos = dieta.carbohidratos
    if (dieta.grasas != null) datos.grasas = dieta.grasas
    if (Object.keys(datos).length === 0) return
    const perfil = (await perfilNutricionRepo.list())[0]
    if (perfil?.id) await perfilNutricionRepo.update(perfil.id, datos)
    else await perfilNutricionRepo.add({ ...PERFIL_DEFECTO, ...datos })
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
          className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
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
        url={urlImagenDieta(dieta.nombre)}
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
            <button
              type="button"
              onClick={aplicarObjetivos}
              className="mt-3 w-full rounded-xl py-2 text-sm font-bold bg-amber-600 texto-cta hover:brightness-110"
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
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
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

function FormDieta({
  dieta,
  recetas,
  onCerrar,
}: {
  dieta: DietaGuardada | null
  recetas: Receta[]
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

  const toggleReceta = (id: number) => {
    setRecetaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const opcional = (v: string) => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
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
    if (dieta?.id) await dietasGuardadasRepo.update(dieta.id, datos)
    else await dietasGuardadasRepo.add({ ...datos, creadoEn: new Date().toISOString() })
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

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
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
        <p className="text-[10px] text-white/45">{t('cocina.dieta.metasOpc', 'Metas opcionales (se pueden aplicar a tus objetivos)')}</p>
        <div className="grid grid-cols-4 gap-2">
          <CampoNum label="kcal" value={calorias} onChange={setCalorias} />
          <CampoNum label="P" value={proteinas} onChange={setProteinas} />
          <CampoNum label="C" value={carbos} onChange={setCarbos} />
          <CampoNum label="G" value={grasas} onChange={setGrasas} />
        </div>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-sm font-semibold">{t('cocina.dieta.elegirRecetas', 'Recetas de la dieta')}</p>
        {recetas.length === 0 ? (
          <p className="text-xs text-white/40">{t('cocina.dieta.sinRecetario', 'Aún no tienes recetas. Crea recetas en la pestaña Recetas.')}</p>
        ) : (
          <ul className="space-y-1">
            {recetas.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => r.id != null && toggleReceta(r.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
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
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-xl py-2.5 font-bold bg-amber-600 texto-cta hover:brightness-110"
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
