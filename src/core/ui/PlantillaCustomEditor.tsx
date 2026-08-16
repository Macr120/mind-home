import { useState } from 'react'
import type { BloqueDef, PlantillaCustom, SeccionDef, TipoBloque } from '../data/db'
import { usePlantillasCustom } from '../state/plantillasCustomStore'
import { useGruposPlantilla, nombreCarpeta } from '../state/gruposPlantillaStore'
import { conSeccionNueva, menusRaiz, nuevoId, sinSeccion, submenusDe } from '../plantillaSecciones'
import { emojiTipo, nombreTipoDe, PaletaTipos } from './paletaBloques'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const EMOJIS = ['🧩', '📌', '🗂️', '🎯', '🧠', '💡', '🛒', '🐾', '🌱', '🎁', '🔧', '⭐']
const COLORES = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#a78bfa', '#f87171']

const inputMenuCls =
  'min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm font-semibold outline-none focus:border-white/30'
const btnIconoCls = 'rounded px-1 text-white/40 transition hover:text-white/80 disabled:opacity-20'

/**
 * Modal de creación/edición de una plantilla personalizada: nombre, emoji,
 * color, los menús (pestañas) de la app y las herramientas (bloques) que van
 * dentro de cada uno. Sin menús, la app es una sola pantalla con todo apilado.
 * Los ids de bloque y de menú NO se regeneran al editar (conservan datos,
 * tools de IA y deep links).
 */
export function PlantillaCustomEditor({
  inicial,
  onCerrar,
}: {
  inicial?: PlantillaCustom
  onCerrar: () => void
}) {
  const t = useT()
  const guardarPlantilla = usePlantillasCustom((s) => s.guardar)
  const grupos = useGruposPlantilla((s) => s.grupos)
  const moverAGrupo = useGruposPlantilla((s) => s.mover)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [icon, setIcon] = useState(inicial?.icon ?? EMOJIS[0])
  const [color, setColor] = useState(inicial?.color ?? COLORES[5])
  const [bloques, setBloques] = useState<BloqueDef[]>(inicial?.bloques ?? [])
  const [secciones, setSecciones] = useState<SeccionDef[]>(inicial?.secciones ?? [])
  /** Id del menú cuya paleta de herramientas está desplegada (solo una a la vez). */
  const [paletaEn, setPaletaEn] = useState<string | null>(null)
  const grupoActual = inicial ? grupos.find((g) => g.miembros.includes(inicial.id))?.id : undefined
  const [grupoId, setGrupoId] = useState<number | undefined>(grupoActual ?? grupos[0]?.id)

  const nombreTipo = (tipo: TipoBloque) => nombreTipoDe(t, tipo)

  const raices = menusRaiz(secciones)
  /** Menú efectivo de un bloque: el suyo si sigue vivo, si no el primero. */
  const menuDeBloque = (b: BloqueDef) =>
    b.seccionId && secciones.some((s) => s.id === b.seccionId) ? b.seccionId : raices[0]?.id
  const bloquesDeMenu = (id: string) => bloques.filter((b) => menuDeBloque(b) === id)

  const agregarBloque = (tipo: TipoBloque, seccionId?: string) =>
    setBloques((bs) => [...bs, { id: nuevoId('b'), tipo, titulo: '', seccionId }])

  const setBloque = (id: string, patch: Partial<BloqueDef>) =>
    setBloques((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const mover = (id: string, dir: -1 | 1) =>
    setBloques((bs) => {
      const i = bs.findIndex((b) => b.id === id)
      // El bloque de al lado puede ser de otro menú: busca el vecino del mismo.
      let j = i + dir
      while (j >= 0 && j < bs.length && menuDeBloque(bs[j]) !== menuDeBloque(bs[i])) j += dir
      if (j < 0 || j >= bs.length) return bs
      const copia = [...bs]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  const quitar = (id: string) => setBloques((bs) => bs.filter((b) => b.id !== id))

  const agregarMenu = (padreId?: string) => {
    const hermanos = padreId ? submenusDe(secciones, padreId) : raices
    const nombreMenu = padreId
      ? t('plantillaCustom.submenuNuevo', 'Submenú {n}', { n: hermanos.length + 1 })
      : t('plantillaCustom.menuNuevo', 'Menú {n}', { n: hermanos.length + 1 })
    const d = conSeccionNueva({ secciones, bloques }, nombreMenu, padreId)
    setSecciones(d.secciones)
    setBloques(d.bloques)
  }

  const setSeccion = (id: string, patch: Partial<SeccionDef>) =>
    setSecciones((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const moverSeccion = (id: string, dir: -1 | 1) =>
    setSecciones((ss) => {
      const s = ss.find((x) => x.id === id)
      if (!s) return ss
      const hermanos = ss.filter((x) => (x.padreId ?? '') === (s.padreId ?? ''))
      const pos = hermanos.indexOf(s)
      const destino = hermanos[pos + dir]
      if (!destino) return ss
      const i = ss.indexOf(s)
      const j = ss.indexOf(destino)
      const copia = [...ss]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  /** Borrar un menú NO borra bloques: se mudan al padre o al primer menú que quede. */
  const quitarSeccion = (id: string) => {
    const d = sinSeccion({ secciones, bloques }, id)
    setSecciones(d.secciones)
    setBloques(d.bloques)
  }

  /** Opciones del selector de menú de un bloque (submenús indentados). */
  const opcionesMenu = raices.flatMap((m) => [
    { id: m.id, etiqueta: `${m.emoji ? `${m.emoji} ` : ''}${m.nombre}` },
    ...submenusDe(secciones, m.id).map((s) => ({
      id: s.id,
      etiqueta: `— ${s.emoji ? `${s.emoji} ` : ''}${s.nombre}`,
    })),
  ])

  const valido = nombre.trim() !== '' && bloques.length > 0

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const id = inicial?.id ?? `custom-${Date.now()}`
    const vivas = new Set(secciones.map((s) => s.id))
    await guardarPlantilla({
      id,
      nombre: nombre.trim(),
      icon: icon.trim() || EMOJIS[0],
      color,
      bloques: bloques.map((b) => ({
        ...b,
        titulo: b.titulo.trim() || nombreTipo(b.tipo),
        // Nunca se guarda el id de un menú borrado.
        seccionId: b.seccionId && vivas.has(b.seccionId) ? b.seccionId : undefined,
      })),
      secciones: secciones.length
        ? secciones.map((s) => ({
            ...s,
            nombre: s.nombre.trim() || t('plantillaCustom.menuSinNombre', 'Menú'),
          }))
        : undefined,
      creadoEn: inicial?.creadoEn ?? new Date().toISOString(),
    })
    if (grupoId != null) await moverAGrupo(id, grupoId)
    onCerrar()
  }

  /** Lista de tarjetas de bloque de un menú (o todas, si la plantilla no usa menús). */
  const listaBloques = (bs: BloqueDef[]) => (
    <ul className="space-y-2">
      {bs.map((b, i) => (
        <li key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-base">
              <Icono emoji={emojiTipo(b.tipo)} />
            </span>
            <input
              value={b.titulo}
              onChange={(e) => setBloque(b.id, { titulo: e.target.value })}
              placeholder={nombreTipo(b.tipo)}
              maxLength={40}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
            />
            <button type="button" onClick={() => mover(b.id, -1)} disabled={i === 0} className={btnIconoCls}>
              ▲
            </button>
            <button
              type="button"
              onClick={() => mover(b.id, 1)}
              disabled={i === bs.length - 1}
              className={btnIconoCls}
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => quitar(b.id)}
              title={t('plantillaCustom.quitarBloque', 'Quitar (al guardar se borran sus datos)')}
              className="rounded px-1 text-white/40 transition hover:text-red-400"
            >
              ✕
            </button>
          </div>
          {opcionesMenu.length > 1 && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.menuBloque', 'Menú')}
              <select
                value={menuDeBloque(b)}
                onChange={(e) => setBloque(b.id, { seccionId: e.target.value })}
                className="min-w-0 flex-1 cursor-pointer rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm text-white/80 outline-none focus:border-white/30"
              >
                {opcionesMenu.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(b.tipo === 'contador' || b.tipo === 'progreso') && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.meta', 'Meta (opcional)')}
              <input
                type="number"
                min={1}
                value={b.meta ?? ''}
                onChange={(e) => setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })}
                className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
              />
            </label>
          )}
          {b.tipo === 'progreso' && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.unidad', 'Unidad (opcional)')}
              <input
                value={b.unidad ?? ''}
                onChange={(e) => setBloque(b.id, { unidad: e.target.value || undefined })}
                maxLength={8}
                placeholder={t('plantillaCustom.unidadPh', 'kg, $, págs…')}
                className="w-24 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
              />
            </label>
          )}
          {b.tipo === 'sesiones' && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.metaMin', 'Meta en minutos (opcional)')}
              <input
                type="number"
                min={1}
                value={b.meta ?? ''}
                onChange={(e) => setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })}
                className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
              />
            </label>
          )}
          {b.tipo === 'habito' && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.metaSemana', 'Veces por semana (opcional)')}
              <input
                type="number"
                min={1}
                max={7}
                value={b.meta ?? ''}
                onChange={(e) => setBloque(b.id, { meta: e.target.value ? Number(e.target.value) : undefined })}
                className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
              />
            </label>
          )}
          {b.tipo === 'cuenta' && (
            <label className="mt-2 flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.cuentaFecha', 'Fecha objetivo')}
              <input
                type="date"
                value={b.fecha ?? ''}
                onChange={(e) => setBloque(b.id, { fecha: e.target.value || undefined })}
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-white/30"
              />
            </label>
          )}
        </li>
      ))}
    </ul>
  )

  /** Botón «＋ Agregar herramienta» de un menú, que despliega la paleta ahí mismo. */
  const agregarEn = (seccionId: string) =>
    paletaEn === seccionId ? (
      <PaletaTipos
        anclas
        onElegir={(tipo) => {
          agregarBloque(tipo, seccionId)
          setPaletaEn(null)
        }}
      />
    ) : (
      <button
        type="button"
        onClick={() => setPaletaEn(seccionId)}
        className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-[11px] font-semibold text-white/50 transition hover:bg-white/5"
      >
        ＋ {t('plantillaCustom.agregarAqui', 'Agregar herramienta')}
      </button>
    )

  /** Un menú con su encabezado editable, sus bloques y sus submenús. */
  const grupoMenu = (s: SeccionDef, esSub: boolean) => {
    const hermanos = esSub ? submenusDe(secciones, s.padreId ?? '') : raices
    const pos = hermanos.findIndex((x) => x.id === s.id)
    const propios = bloquesDeMenu(s.id)
    return (
      <div
        key={s.id}
        className={`space-y-2 ${esSub ? 'ms-3 border-s border-white/10 ps-3' : 'rounded-xl border border-white/10 bg-black/20 p-2.5'}`}
      >
        <div className="flex items-center gap-1.5">
          <input
            value={s.emoji ?? ''}
            onChange={(e) => setSeccion(s.id, { emoji: e.target.value || undefined })}
            maxLength={4}
            title={t('plantillaCustom.menuEmoji', 'Emoji del menú (opcional)')}
            className="h-8 w-10 shrink-0 rounded-md border border-white/10 bg-black/30 text-center text-base outline-none focus:border-white/30"
          />
          <input
            value={s.nombre}
            onChange={(e) => setSeccion(s.id, { nombre: e.target.value })}
            placeholder={t('plantillaCustom.menuNombrePh', 'Nombre del menú')}
            maxLength={24}
            className={inputMenuCls}
          />
          <button
            type="button"
            onClick={() => moverSeccion(s.id, -1)}
            disabled={pos === 0}
            className={btnIconoCls}
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => moverSeccion(s.id, 1)}
            disabled={pos === hermanos.length - 1}
            className={btnIconoCls}
          >
            ▼
          </button>
          {!esSub && (
            <button
              type="button"
              onClick={() => agregarMenu(s.id)}
              title={t('plantillaCustom.agregarSubmenu', 'Submenú de este menú')}
              className="rounded px-1 text-white/40 transition hover:text-white/80"
            >
              ＋
            </button>
          )}
          <button
            type="button"
            onClick={() => quitarSeccion(s.id)}
            title={t('plantillaCustom.borrarMenu', 'Borrar menú (sus bloques pasan al primero)')}
            className="rounded px-1 text-white/40 transition hover:text-red-400"
          >
            ✕
          </button>
        </div>
        {propios.length > 0 && listaBloques(propios)}
        {agregarEn(s.id)}
        {!esSub && submenusDe(secciones, s.id).map((sub) => grupoMenu(sub, true))}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <form
        data-tut="plantilla.custom.editor"
        onSubmit={(e) => void guardar(e)}
        onClick={(e) => e.stopPropagation()}
        className="ui-panel ui-pop flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-base font-black text-white/90">
            {inicial
              ? t('plantillaCustom.editar', 'Editar plantilla')
              : t('plantillaCustom.crear', 'Crear plantilla')}
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="ms-auto rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div data-tut="plantilla.custom.identidad" className="min-h-0 space-y-4 overflow-y-auto p-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('plantillaCustom.nombrePh', 'Ej. Mudanza, plantas, mascota…')}
            maxLength={40}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`h-9 w-9 rounded-lg text-xl transition ${
                  icon === e ? 'bg-white/15 ring-2 ring-white/60' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              title={t('plantillaCustom.emojiLibre', 'Otro emoji')}
              className="h-9 w-12 rounded-lg border border-white/10 bg-black/30 text-center text-xl outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition ${
                  c === color ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f1115]' : 'hover:scale-110'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          {grupos.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-white/50">
              {t('plantillaCustom.grupo', 'Grupo')}
              <select
                value={grupoId ?? ''}
                onChange={(e) => setGrupoId(Number(e.target.value))}
                className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white/80 outline-none focus:border-white/30"
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji ? `${g.emoji} ` : ''}
                    {nombreCarpeta(t, g.nombre)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-xs text-white/50">
                {t('plantillaCustom.herramientas', 'Herramientas de la plantilla')}
              </p>
              <button
                type="button"
                data-tut="plantilla.custom.menus"
                onClick={() => agregarMenu()}
                title={t(
                  'plantillaCustom.menusAyuda',
                  'Reparte los bloques en pestañas. Sin menús, tu app es una sola pantalla.',
                )}
                className="ms-auto rounded-lg border border-dashed border-white/15 px-2 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/5"
              >
                ＋ {t('plantillaCustom.agregarMenu', 'Menú')}
              </button>
            </div>

            {raices.length === 0 && <PaletaTipos anclas onElegir={(tipo) => agregarBloque(tipo)} />}

            {bloques.length === 0 && raices.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-[11px] leading-relaxed text-white/45">
                {t(
                  'plantillaCustom.sinBloques',
                  'Agrega al menos una herramienta: serán las secciones de tu app.',
                )}
              </p>
            ) : (
              <div data-tut="plantilla.custom.bloques" className="mt-3 space-y-2">
                {raices.length === 0 ? listaBloques(bloques) : raices.map((s) => grupoMenu(s, false))}
              </div>
            )}
          </div>
        </div>

        <footer className="flex gap-2 border-t border-white/10 p-3">
          <button
            type="submit"
            data-tut="plantilla.custom.guardar"
            disabled={!valido}
            className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-default disabled:opacity-40"
          >
            {t('plantillaCustom.guardar', 'Guardar')}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            {t('plantillaCustom.cancelar', 'Cancelar')}
          </button>
        </footer>
      </form>
    </div>
  )
}
