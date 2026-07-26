import { useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { useT } from '../../i18n/useT'
import {
  borrarMetaConDescendencia,
  crearMeta,
  esMeta,
  hijasDe,
  profundidadDe,
  raizDe,
  toggleMeta,
} from '../../metas'
import { textoRepeticion } from '../../rutinas'
import { colorDe, colorPorProfundidad } from '../coloresRutina'
import { Icono } from '../iconos/Icono'
import { DetalleMeta } from '../metas/DetalleMeta'

/**
 * Lo que se despliega bajo una fila de la lista de Metas al tocar su nombre.
 *
 * Va aquí abajo y no en un recuadro flotante a propósito: es el mismo gesto del
 * cronograma (la meta se abre en su sitio, sin tapar lo demás) y así las dos
 * listas se manejan igual. Para una meta reusa `DetalleMeta` — literalmente el
 * mismo componente que el cronograma — y le suma sus sub-metas; una rutina
 * normal se edita con su propio editor, que es donde viven sus días y pasos.
 */
export function DespliegueFila({
  rutina,
  metas,
  onEditar,
  onIrACronograma,
  onCerrar,
}: {
  rutina: Rutina
  /** El árbol completo: hace falta para crear, borrar y listar sub-metas. */
  metas: Rutina[]
  onEditar: (r: Rutina) => void
  onIrACronograma: () => void
  /** Se llama al borrar, para que la lista deje de mostrar el despliegue. */
  onCerrar: () => void
}) {
  const t = useT()
  const [agregando, setAgregando] = useState(false)
  const [nombreHija, setNombreHija] = useState('')
  const meta = esMeta(rutina)
  const hijas = meta ? hijasDe(metas, rutina.id) : []

  const confirmarHija = () => {
    if (!nombreHija.trim() || rutina.id == null) return
    const colorPrincipal = colorDe(raizDe(metas, rutina))
    void crearMeta(metas, nombreHija, rutina, colorPorProfundidad(colorPrincipal, profundidadDe(metas, rutina) + 1))
    setNombreHija('')
  }

  const borrar = () => {
    if (rutina.id == null) return
    if (meta) {
      const msg = hijas.length
        ? t('cal.meta.borrarConHijas', '¿Borrar esta meta y todas sus sub-metas?')
        : t('cal.meta.borrar', '¿Borrar esta meta?')
      if (!window.confirm(msg)) return
      void borrarMetaConDescendencia(metas, rutina.id)
    } else {
      if (!window.confirm(t('rutinas.confirmarBorrar', '¿Borrar este evento?'))) return
      void rutinasRepo.remove(rutina.id)
    }
    onCerrar()
  }

  return (
    <div className="my-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="mb-1 flex flex-wrap items-center gap-1">
        {meta ? (
          <>
            <button
              type="button"
              onClick={() => setAgregando((v) => !v)}
              className={`px-1 text-[10px] font-medium transition ${
                agregando ? 'text-emerald-400' : 'text-white/40 hover:text-white/80'
              }`}
            >
              + {t('cal.meta.prefijoSub', 'sub') + t('cal.meta.sufijoMeta', 'meta')}
            </button>
            <button
              type="button"
              onClick={onIrACronograma}
              title={t('cal.meta.verEnCronograma', 'Ver en el Cronograma')}
              className="px-1 text-[10px] text-white/40 transition hover:text-white/80"
            >
              <Icono nombre="derecha" />
            </button>
          </>
        ) : (
          <>
            <span className="text-[10px] text-white/35">
              <Icono nombre="repetir" /> {textoRepeticion(rutina)}
            </span>
            <button
              type="button"
              onClick={() => onEditar(rutina)}
              title={t('rutinas.editar', 'Editar')}
              className="px-1 text-[10px] text-white/40 transition hover:text-white/80"
            >
              <Icono nombre="editar" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={borrar}
          title={t('rutinas.borrar', 'Borrar')}
          className="ml-auto px-1 text-[10px] text-white/30 transition hover:text-red-400"
        >
          <Icono nombre="basura" />
        </button>
      </div>

      {agregando && (
        <input
          autoFocus
          value={nombreHija}
          onChange={(e) => setNombreHija(e.target.value)}
          onBlur={() => {
            confirmarHija()
            setAgregando(false)
          }}
          // Enter deja la caja abierta: así se encadenan varias hermanas de un tirón.
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmarHija()
            else if (e.key === 'Escape') setAgregando(false)
          }}
          placeholder={t('cal.meta.nuevaHija', 'Sub-meta…')}
          className="mb-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[11px] text-white/90 placeholder:text-white/25 focus:outline-none"
        />
      )}

      {hijas.length > 0 && (
        <div className="mb-1 space-y-0.5">
          {hijas.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void toggleMeta(h)}
                title={t('cal.marcarHecho', 'Marcar como hecho')}
                className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border text-[9px] transition ${
                  h.completada
                    ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400'
                    : 'border-white/25 hover:border-white/50'
                }`}
              >
                {h.completada ? '✓' : ''}
              </button>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colorDe(h) }} />
              <span className={`min-w-0 flex-1 truncate text-[11px] text-white/75 ${h.completada ? 'line-through opacity-50' : ''}`}>
                {h.nombre}
              </span>
            </div>
          ))}
        </div>
      )}

      {meta ? (
        <DetalleMeta meta={rutina} />
      ) : (
        rutina.nota && (
          <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60">
            <Icono nombre="nota" /> {rutina.nota}
          </p>
        )
      )}
    </div>
  )
}
