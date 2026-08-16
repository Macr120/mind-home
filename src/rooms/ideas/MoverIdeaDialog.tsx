import { useMemo } from 'react'
import type { CarpetaIdea } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { COLOR } from './constantes'

/**
 * Elegir la carpeta de una idea suelta: el árbol de carpetas como lista
 * sangrada, con la raíz del diario arriba. Mismo criterio que el diálogo de
 * mover entradas de la biblioteca: una lista se toca bien con el pulgar y el
 * árbol vive dentro de un panel con scroll.
 */
export function MoverIdeaDialog({
  carpetas,
  actual,
  titulo,
  onElegir,
  onCerrar,
}: {
  carpetas: CarpetaIdea[]
  /** Carpeta donde está la idea ahora ('' = suelta en la raíz). */
  actual: string
  titulo: string
  onElegir: (carpetaId: string) => void
  onCerrar: () => void
}) {
  const t = useT()

  const filas = useMemo(() => {
    const hijasDe = new Map<string, CarpetaIdea[]>()
    for (const c of carpetas) {
      const clave = c.padreId ?? ''
      hijasDe.set(clave, [...(hijasDe.get(clave) ?? []), c])
    }
    for (const lista of hijasDe.values()) {
      lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    }
    // `vistas` acota la recursión: una carpeta que acabe siendo su propia
    // ancestra (fusión rara de dos dispositivos) colgaría infinito.
    const vistas = new Set<string>()
    const salida: { carpeta: CarpetaIdea; prof: number }[] = []
    const bajar = (c: CarpetaIdea, prof: number) => {
      if (vistas.has(c.carpetaId)) return
      vistas.add(c.carpetaId)
      salida.push({ carpeta: c, prof })
      for (const h of hijasDe.get(c.carpetaId) ?? []) bajar(h, prof + 1)
    }
    for (const c of hijasDe.get('') ?? []) bajar(c, 0)
    return salida
  }, [carpetas])

  const fila = 'flex w-full items-center gap-1.5 rounded-lg py-1.5 pe-2 text-start text-xs transition'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">
            <Icono nombre="carpeta" /> {titulo}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
            title={t('ideas.mover.cerrar', 'Cerrar')}
            aria-label={t('ideas.mover.cerrar', 'Cerrar')}
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => onElegir('')}
            className={`${fila} ps-2 ${actual === '' ? 'text-black' : 'font-semibold text-white/85 hover:bg-white/10'}`}
            style={actual === '' ? { background: COLOR } : undefined}
          >
            <Icono nombre="lluvia" />
            <span className="min-w-0 truncate">{t('ideas.mover.raiz', 'Suelta en el diario')}</span>
          </button>
          {filas.map(({ carpeta, prof }) => {
            const activa = actual === carpeta.carpetaId
            return (
              <button
                key={carpeta.carpetaId}
                type="button"
                onClick={() => onElegir(carpeta.carpetaId)}
                style={{ paddingLeft: `${0.5 + prof * 0.9}rem`, background: activa ? COLOR : undefined }}
                className={`${fila} ${activa ? 'text-black' : 'text-white/75 hover:bg-white/10'}`}
              >
                <Icono emoji={carpeta.emoji ?? '📁'} />
                <span className="min-w-0 truncate">{carpeta.nombre}</span>
              </button>
            )
          })}
        </div>

        {carpetas.length === 0 && (
          <p className="border-t border-white/10 pt-2 text-[10px] leading-relaxed text-white/35">
            {t('ideas.mover.sinCarpetas', 'Aún no tienes carpetas: créalas en la vista Carpetas del diario.')}
          </p>
        )}
      </div>
    </div>
  )
}
