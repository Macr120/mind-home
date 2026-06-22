import { useEffect, useState } from 'react'
import { useDiseño, objetosMapa } from '../../state/disenoStore'
import type { ObjetoCuarto } from '../../data/db'
import { rooms } from '../../registry'
import { MODELOS, recursosModelables } from '../../house/modelosRecursos'
import { RECURSOS, recursoIdEnTema } from '../../house/recursos'
import { CATALOGO } from '../../house/catalogo'
import { getTema } from '../../house/temas'
import { MiniaturaModelo } from '../../house/Miniatura'
import { PISOS } from '../../house/pisos'
import { TECHOS } from '../../house/techos'
import { TIPOS_MURO, TIPOS_PUERTA, TIPOS_VENTANA_FORMA } from '../../house/murosPuertas'
import { useT } from '../../i18n/useT'

const nombreRecurso = (id: number) =>
  RECURSOS.find((r) => r.id === id)?.nombre ?? `Recurso ${id}`

function infoObjeto(o: ObjetoCuarto): { icon: string; nombre: string } {
  if (o.tipo.startsWith('recurso:')) {
    const id = Number(o.tipo.slice('recurso:'.length))
    return { icon: MODELOS[id]?.icon ?? '📦', nombre: nombreRecurso(id) }
  }
  const item = CATALOGO.find((i) => i.id === o.tipo)
  if (item) return { icon: item.icon, nombre: item.nombre }
  return { icon: '🪑', nombre: 'Objeto' }
}

/** Categorías del inventario (pestañas). */
type CatId = 'objetos' | 'pisos' | 'techos' | 'texturas' | 'muros' | 'puertas' | 'ventanas'
const CATEGORIAS: { id: CatId; icon: string; label: string }[] = [
  { id: 'objetos', icon: '🪑', label: 'Objetos' },
  { id: 'pisos', icon: '🟫', label: 'Pisos' },
  { id: 'techos', icon: '🏠', label: 'Techos' },
  { id: 'texturas', icon: '🖼️', label: 'Texturas' },
  { id: 'muros', icon: '🧱', label: 'Muros' },
  { id: 'puertas', icon: '🚪', label: 'Puertas' },
  { id: 'ventanas', icon: '🪟', label: 'Ventanas' },
]

/**
 * Inventario y catálogo del editor de mapa, por categorías:
 * - Objetos: se colocan LIBRES sobre el mapa y se arrastran a donde sea.
 * - Pisos / Techos / Texturas: al elegirlos se aplican a TODA la casa.
 * - Muros / Puertas / Ventanas: catálogo de referencia (se aplican al editar un
 *   cuarto, por arista, con el engrane ⚙️).
 */
export function EditorInventarioSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const [cat, setCat] = useState<CatId>('objetos')
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const techoTipo = useDiseño((s) => s.techoTipo)
  const setTechoTipo = useDiseño((s) => s.setTechoTipo)
  const objetos = useDiseño((s) => s.objetos)
  const addObjetoMapa = useDiseño((s) => s.addObjetoMapa)
  const removeObjeto = useDiseño((s) => s.removeObjeto)
  const seleccion = useDiseño((s) => s.seleccion)
  const toggleSeleccion = useDiseño((s) => s.toggleSeleccion)
  const clearSeleccion = useDiseño((s) => s.clearSeleccion)
  const agrupar = useDiseño((s) => s.agrupar)
  const desagrupar = useDiseño((s) => s.desagrupar)
  const enMapa = objetosMapa(objetos)

  // Limpiar selección al entrar al inventario.
  useEffect(() => { clearSeleccion() }, [clearSeleccion])

  const texturas = PISOS.filter((p) => p.textura)

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.inv.titulo', 'Inventario y catálogo')}</p>}

      {/* Pestañas de categoría */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
              cat === c.id
                ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40'
                : 'bg-white/5 text-white/55 hover:bg-white/10'
            }`}
          >
            {c.icon} {t(`editor.inv.cat.${c.id}`, c.label)}
          </button>
        ))}
      </div>

      {/* ── Objetos: se colocan sobre el mapa ───────────────────────────────── */}
      {cat === 'objetos' && (
        <div className="space-y-3">
          <p className="text-[11px] leading-snug text-white/45">
            {t('editor.inv.desc', 'Elige un objeto: aparece sobre el mapa y lo arrastras a donde quieras.')}
          </p>

          {rooms.map((r) => {
            const ids = recursosModelables(r.id).filter((id) =>
              recursoIdEnTema(id, tema?.id ?? null),
            )
            if (ids.length === 0) return null
            return (
              <div key={r.id}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {r.icon} {(r.nombre ?? '').split(' · ')[0]}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ids.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => addObjetoMapa(`recurso:${id}`, MODELOS[id].defaultColor)}
                      className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px] transition hover:bg-white/10"
                      title={nombreRecurso(id)}
                    >
                      <MiniaturaModelo
                        tipo={`recurso:${id}`}
                        color={MODELOS[id].defaultColor}
                        tema={tema}
                        className="h-11 w-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t('editor.inv.deco', '🎨 Decoración genérica')}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {CATALOGO.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addObjetoMapa(item.id, item.defaultColor)}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px] transition hover:bg-white/10"
                  title={item.nombre}
                >
                  <MiniaturaModelo
                    tipo={item.id}
                    color={item.defaultColor}
                    tema={tema}
                    className="h-11 w-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {enMapa.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t('editor.inv.mapa', `Sobre el mapa (${enMapa.length})`, { n: String(enMapa.length) })}
              </p>
              <div className="space-y-1.5">
                {enMapa.map((o) => {
                  const info = infoObjeto(o)
                  const enSel = o.id != null && seleccion.includes(o.id)
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition-colors ${enSel ? 'ring-1 ring-emerald-400/40' : ''}`}
                    >
                      {o.grupoId ? (
                        <button
                          onClick={() => desagrupar(o.grupoId!)}
                          className="flex-shrink-0 text-[10px] font-bold text-emerald-400/80 transition hover:text-emerald-400"
                          title={t('editor.inv.desagrupar', 'Desagrupar')}
                        >
                          🔗
                        </button>
                      ) : (
                        <input
                          type="checkbox"
                          checked={enSel}
                          onChange={() => o.id != null && toggleSeleccion(o.id)}
                          className="flex-shrink-0 accent-emerald-400 cursor-pointer"
                        />
                      )}
                      <span>{info.icon}</span>
                      <span className="truncate text-white/70">{info.nombre}</span>
                      <button
                        onClick={() => o.id && removeObjeto(o.id)}
                        className="ml-auto text-white/30 hover:text-red-400"
                        title={t('editor.inv.quitar', 'Quitar')}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
              {seleccion.length >= 2 && (
                <button
                  onClick={agrupar}
                  className="mt-2 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-400/20"
                >
                  {t('editor.inv.agrupar', `🔗 Agrupar seleccionados (${seleccion.length})`, { n: String(seleccion.length) })}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Pisos: edición por celda en Planos ─────────────────────────────── */}
      {cat === 'pisos' && (
        <div className="space-y-2">
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'editor.inv.pisos.planos',
              'Los pisos exteriores e interiores se editan en Editar mapa → Planos → capa Pisos. Marca varias celdas exteriores o selecciona un cuarto.',
            )}
          </p>
        </div>
      )}

      {/* ── Techos: se aplican a toda la casa ───────────────────────────────── */}
      {cat === 'techos' && (
        <div className="space-y-2">
          <p className="text-[11px] leading-snug text-white/45">
            {t('editor.inv.techos.desc', 'Elige un techo para aplicarlo a toda la casa.')}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {TECHOS.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTechoTipo(th.id)}
                title={th.nombre}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] transition ${
                  techoTipo === th.id ? 'bg-emerald-400/10 ring-1 ring-emerald-400/60' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span
                  className="flex h-11 w-full items-center justify-center rounded-md text-xl"
                  style={{ background: th.color }}
                >
                  {th.emoji}
                </span>
                <span className="w-full truncate text-center text-white/60">{th.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Texturas: vista previa; aplicación en Planos ───────────────────── */}
      {cat === 'texturas' && (
        <div className="space-y-2">
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'editor.inv.texturas.planos',
              'Catálogo de texturas. Aplícalas en Planos → Pisos al seleccionar celdas o cuartos.',
            )}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {texturas.map((p) => (
              <div
                key={p.id}
                title={p.nombre}
                className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px]"
              >
                <img
                  src={`/textures/floors/${p.textura}_color.jpg`}
                  alt={p.nombre}
                  loading="lazy"
                  className="h-11 w-full rounded-md object-cover opacity-80"
                />
                <span className="w-full truncate text-center text-white/60">{p.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Muros / Puertas / Ventanas: catálogo de referencia ──────────────── */}
      {(cat === 'muros' || cat === 'puertas' || cat === 'ventanas') && (
        <div className="space-y-2">
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'editor.inv.aristas.desc',
              'Catálogo de referencia. Se aplican al editar un cuarto (⚙️), por arista.',
            )}
          </p>

          {cat === 'muros' && (
            <div className="grid grid-cols-3 gap-1.5">
              {TIPOS_MURO.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px]"
                  title={m.nombre}
                >
                  <span className="h-11 w-full rounded-md" style={{ background: m.preview }} />
                  <span className="w-full truncate text-center text-white/60">{m.nombre}</span>
                </div>
              ))}
            </div>
          )}

          {cat === 'puertas' && (
            <div className="grid grid-cols-3 gap-1.5">
              {TIPOS_PUERTA.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px]"
                  title={p.nombre}
                >
                  <span className="h-11 w-full rounded-md" style={{ background: p.preview }} />
                  <span className="w-full truncate text-center text-white/60">{p.nombre}</span>
                </div>
              ))}
            </div>
          )}

          {cat === 'ventanas' && (
            <div className="grid grid-cols-3 gap-1.5">
              {TIPOS_VENTANA_FORMA.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-white/5 py-1 text-[10px]"
                  title={v.nombre}
                >
                  <span className="flex h-11 w-full items-center justify-center">
                    <span
                      className={`h-7 w-7 bg-sky-300/70 ${v.id === 'circulo' ? 'rounded-full' : 'rounded-sm'}`}
                    />
                  </span>
                  <span className="w-full truncate text-center text-white/60">{v.nombre}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
