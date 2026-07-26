import { useMemo, useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { COLOR } from './constantes'
import { FormularioMedia } from './FormularioMedia'
import { TarjetaMedia } from './TarjetaMedia'
import { Archivador, CarpetasPorEtiqueta } from '../_shared/Archivador'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

type Agrupacion = 'fecha' | 'genero'

export function ArchivoTab({ items }: { items: MediaArchivo[] }) {
  const t = useT()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<MediaArchivo | null>(null)
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('fecha')

  const lista = useMemo(() => [...items].sort((a, b) => b.fecha.localeCompare(a.fecha)), [items])

  if (editando) {
    return (
      <FormularioMedia
        inicial={editando}
        onGuardado={() => setEditando(null)}
        onCancelar={() => setEditando(null)}
      />
    )
  }

  const countText = lista.length === 1
    ? `1 ${t('entre.arch.entrada', 'entrada')}`
    : `${lista.length} ${t('entre.arch.entradas', 'entradas')}`

  return (
    <div className="space-y-4" data-tut="entretenimiento.archivo.lista">
      <button
        type="button"
        onClick={() => setMostrarForm((v) => !v)}
        className="w-full rounded-xl py-2.5 font-bold text-black hover:opacity-90"
        style={{ background: COLOR }}
      >
        {mostrarForm ? (
          t('entre.arch.ocultar', 'Ocultar formulario')
        ) : (
          <><Icono nombre="agregar" /> {t('entre.arch.añadir', 'Añadir título')}</>
        )}
      </button>

      {mostrarForm && (
        <FormularioMedia
          onGuardado={() => setMostrarForm(false)}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/40">{countText}</p>
        {lista.length > 0 && (
          <div className="flex gap-1.5">
            {(
              [
                ['fecha', 'entre.arch.porFecha', 'Por fecha'],
                ['genero', 'entre.arch.porGenero', 'Por género'],
              ] as const
            ).map(([id, key, fallback]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAgrupacion(id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  agrupacion === id ? 'text-black' : 'bg-white/10 hover:bg-white/20'
                }`}
                style={agrupacion === id ? { background: COLOR } : undefined}
              >
                {t(key, fallback)}
              </button>
            ))}
          </div>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/40 text-sm">
          {t('entre.arch.vacio', 'Tu archivo está vacío. Añade la primera película, serie, libro o videojuego.')}
        </div>
      ) : agrupacion === 'genero' ? (
        <CarpetasPorEtiqueta
          items={lista}
          etiqueta={(item) => item.genero}
          clave={(item) => item.id ?? item.titulo}
          sinEtiqueta={t('entre.arch.sinGenero', 'Sin género')}
        >
          {(item) => (
            <TarjetaMedia
              item={item}
              onEditar={() => setEditando(item)}
              onEliminar={() => item.id && mediaArchivoRepo.remove(item.id)}
            />
          )}
        </CarpetasPorEtiqueta>
      ) : (
        <Archivador items={lista} fecha={(item) => item.fecha} clave={(item) => item.id ?? item.titulo}>
          {(item) => (
            <TarjetaMedia
              item={item}
              onEditar={() => setEditando(item)}
              onEliminar={() => item.id && mediaArchivoRepo.remove(item.id)}
            />
          )}
        </Archivador>
      )}
    </div>
  )
}
