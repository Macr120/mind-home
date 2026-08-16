import { useState } from 'react'
import type { BloqueDef, PlantillaCustom, SeccionDef, TipoBloque } from '../../core/data/db'
import { usePlantillasCustom } from '../../core/state/plantillasCustomStore'
import { confirmar } from '../../core/state/confirmarStore'
import {
  conSeccionNueva,
  menusRaiz,
  nuevoId,
  raizDe,
  sinSeccion,
  submenusDe,
} from '../../core/plantillaSecciones'
import { emojiTipo, nombreTipoDe, PaletaTipos } from '../../core/ui/paletaBloques'
import { Icono } from '../../core/ui/iconos/Icono'
import { useT } from '../../core/i18n/useT'

/**
 * Edición en el sitio de una plantilla personalizada: crear/renombrar/borrar
 * menús y herramientas sin salir de la app. Cada acción guarda al instante
 * (el store escribe en la BD y republica al registry), a diferencia del editor
 * del catálogo, que acumula los cambios hasta pulsar Guardar.
 */

const btnCls =
  'shrink-0 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/5'
const btnIconoCls = 'rounded px-1 text-white/40 transition hover:text-white/80 disabled:opacity-20'

/** Barra de edición: menús de la pestaña activa y alta de herramientas. */
export function BarraEdicion({
  def,
  activa,
  onIrA,
}: {
  def: PlantillaCustom
  activa: string
  onIrA: (id: string) => void
}) {
  const t = useT()
  const guardar = usePlantillasCustom((s) => s.guardar)
  const [paleta, setPaleta] = useState(false)

  const secciones = def.secciones ?? []
  const raices = menusRaiz(secciones)
  const raizActiva = raizDe(def, activa)
  // Si la pestaña activa es un submenú, su menú padre también se edita aquí: un
  // menú que repartió todo en submenús deja de ser seleccionable en el riel.
  const enEdicion = [raizActiva, activa]
    .filter((id, i, ids) => id && ids.indexOf(id) === i)
    .map((id) => secciones.find((s) => s.id === id))
    .filter((s) => s != null)

  const aplicar = (patch: Partial<PlantillaCustom>) => void guardar({ ...def, ...patch })

  const agregarMenu = (padreId?: string) => {
    const hermanos = padreId ? submenusDe(secciones, padreId) : raices
    const nombre = padreId
      ? t('plantillaCustom.submenuNuevo', 'Submenú {n}', { n: hermanos.length + 1 })
      : t('plantillaCustom.menuNuevo', 'Menú {n}', { n: hermanos.length + 1 })
    const d = conSeccionNueva({ secciones, bloques: def.bloques }, nombre, padreId)
    aplicar({ secciones: d.secciones, bloques: d.bloques })
    onIrA(d.id)
  }

  const borrarMenu = async (menu: SeccionDef) => {
    const ok = await confirmar({
      titulo: t('plantillaCustom.borrarMenuTitulo', 'Borrar «{nombre}»', { nombre: menu.nombre }),
      mensaje: t('plantillaCustom.borrarMenuMsj', 'Sus herramientas pasan al primer menú, con sus datos.'),
      textoOk: t('plantillaCustom.borrar', 'Borrar'),
      peligro: true,
    })
    if (!ok) return
    const d = sinSeccion({ secciones, bloques: def.bloques }, menu.id)
    aplicar({ secciones: d.secciones.length ? d.secciones : undefined, bloques: d.bloques })
    onIrA(menusRaiz(d.secciones)[0]?.id ?? '')
  }

  const agregarBloque = (tipo: TipoBloque) => {
    aplicar({
      bloques: [
        ...def.bloques,
        { id: nuevoId('b'), tipo, titulo: nombreTipoDe(t, tipo), seccionId: activa || undefined },
      ],
    })
    setPaleta(false)
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-white/15 bg-black/20 p-2.5">
      {enEdicion.map((menu) => (
        <div key={menu.id} className={`flex items-center gap-1.5 ${menu.padreId ? 'ps-4' : ''}`}>
          <input
            // key: al cambiar de pestaña el campo tiene que releer el valor.
            key={`e${menu.id}`}
            defaultValue={menu.emoji ?? ''}
            onBlur={(e) =>
              aplicar({
                secciones: secciones.map((s) =>
                  s.id === menu.id ? { ...s, emoji: e.target.value || undefined } : s,
                ),
              })
            }
            maxLength={4}
            title={t('plantillaCustom.menuEmoji', 'Emoji del menú (opcional)')}
            className="h-8 w-10 shrink-0 rounded-md border border-white/10 bg-black/30 text-center text-base outline-none focus:border-white/30"
          />
          <input
            key={`n${menu.id}`}
            defaultValue={menu.nombre}
            onBlur={(e) =>
              aplicar({
                secciones: secciones.map((s) =>
                  s.id === menu.id ? { ...s, nombre: e.target.value.trim() || s.nombre } : s,
                ),
              })
            }
            placeholder={t('plantillaCustom.menuNombrePh', 'Nombre del menú')}
            maxLength={24}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm font-semibold outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={() => void borrarMenu(menu)}
            title={t('plantillaCustom.borrarMenu', 'Borrar menú (sus bloques pasan al primero)')}
            className="rounded px-1 text-white/40 transition hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => agregarMenu()} className={btnCls}>
          ＋ {t('plantillaCustom.agregarMenu', 'Menú')}
        </button>
        {raizActiva && (
          <button type="button" onClick={() => agregarMenu(raizActiva)} className={btnCls}>
            ＋ {t('plantillaCustom.submenu', 'Submenú')}
          </button>
        )}
        {!paleta && (
          <button type="button" onClick={() => setPaleta(true)} className={btnCls}>
            ＋ {t('plantillaCustom.agregarAqui', 'Agregar herramienta')}
          </button>
        )}
      </div>

      {paleta && <PaletaTipos onElegir={agregarBloque} />}
    </div>
  )
}

/** Cabecera de un bloque en modo edición: título editable, orden y borrado. */
export function CabeceraBloqueEdicion({
  def,
  bloque,
  primero,
  ultimo,
}: {
  def: PlantillaCustom
  bloque: BloqueDef
  primero: boolean
  ultimo: boolean
}) {
  const t = useT()
  const guardar = usePlantillasCustom((s) => s.guardar)

  const aplicar = (bloques: BloqueDef[]) => void guardar({ ...def, bloques })

  /** Intercambia con el vecino DEL MISMO menú: los de otras pestañas se saltan. */
  const mover = (dir: -1 | 1) => {
    const bs = [...def.bloques]
    const i = bs.findIndex((b) => b.id === bloque.id)
    let j = i + dir
    while (j >= 0 && j < bs.length && bs[j].seccionId !== bs[i].seccionId) j += dir
    if (j < 0 || j >= bs.length) return
    ;[bs[i], bs[j]] = [bs[j], bs[i]]
    aplicar(bs)
  }

  const borrar = async () => {
    const ok = await confirmar({
      titulo: t('plantillaCustom.borrarBloqueTitulo', 'Borrar «{nombre}»', { nombre: bloque.titulo }),
      mensaje: t('plantillaCustom.borrarBloqueMsj', 'Se borra la herramienta con todo lo que guardaste en ella.'),
      textoOk: t('plantillaCustom.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) aplicar(def.bloques.filter((b) => b.id !== bloque.id))
  }

  return (
    <div className="mb-3 flex items-center gap-1.5">
      <span className="shrink-0 text-base">
        <Icono emoji={emojiTipo(bloque.tipo)} />
      </span>
      <input
        key={bloque.id}
        defaultValue={bloque.titulo}
        onBlur={(e) =>
          aplicar(
            def.bloques.map((b) =>
              b.id === bloque.id ? { ...b, titulo: e.target.value.trim() || b.titulo } : b,
            ),
          )
        }
        maxLength={40}
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm font-bold outline-none focus:border-white/30"
      />
      <button type="button" onClick={() => mover(-1)} disabled={primero} className={btnIconoCls}>
        ▲
      </button>
      <button type="button" onClick={() => mover(1)} disabled={ultimo} className={btnIconoCls}>
        ▼
      </button>
      <button
        type="button"
        onClick={() => void borrar()}
        title={t('plantillaCustom.borrarBloqueAhora', 'Borrar la herramienta y sus datos')}
        className="rounded px-1 text-white/40 transition hover:text-red-400"
      >
        ✕
      </button>
    </div>
  )
}
