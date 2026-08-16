import { useMemo, useState } from 'react'
import type { MediaArchivo } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { COLOR, getTipoMedia } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { FormularioMedia } from './FormularioMedia'
import { TarjetaMedia } from './TarjetaMedia'
import { BotonPortadasLote } from './BotonPortadasLote'
import { Archivador, CarpetasPorEtiqueta } from '../_shared/Archivador'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { ejemploEntretenimiento } from './ejemplos'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

type Agrupacion = 'genero' | 'tipo' | 'autor' | 'fecha'

const AGRUPACIONES: { id: Agrupacion; clave: string; etiqueta: string }[] = [
  { id: 'genero', clave: 'entre.arch.porGenero', etiqueta: 'Por género' },
  { id: 'tipo', clave: 'entre.arch.porTipo', etiqueta: 'Por categoría' },
  { id: 'autor', clave: 'entre.arch.porAutor', etiqueta: 'Por autor' },
  { id: 'fecha', clave: 'entre.arch.porFecha', etiqueta: 'Por fecha' },
]

/**
 * Orden manual de los géneros. Es una preferencia de presentación, no contenido:
 * vive en localStorage (con el namespace del demo) en vez de en una tabla.
 */
const LS_ORDEN_GENEROS = claveLS('mh-entre-orden-generos')

function leerOrdenGeneros(): string[] {
  try {
    const crudo = localStorage.getItem(LS_ORDEN_GENEROS)
    const lista: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function ArchivoTab({ items }: { items: MediaArchivo[] }) {
  const t = useT()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<MediaArchivo | null>(null)
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('genero')
  const [ordenGeneros, setOrdenGeneros] = useState<string[]>(leerOrdenGeneros)

  const lista = useMemo(() => [...items].sort((a, b) => b.fecha.localeCompare(a.fecha)), [items])

  const guardarOrden = (titulos: string[]) => {
    setOrdenGeneros(titulos)
    localStorage.setItem(LS_ORDEN_GENEROS, JSON.stringify(titulos))
  }

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

  const tarjeta = (item: MediaArchivo) => (
    <div data-tut={`entretenimiento.archivo.item.${item.id}`}>
      <TarjetaMedia
        item={item}
        onEditar={() => setEditando(item)}
        onEliminar={() => item.id && mediaArchivoRepo.remove(item.id)}
      />
    </div>
  )

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
          <div data-tut="entretenimiento.archivo.agrupar">
            <PestanasCarpeta
              items={AGRUPACIONES.map((a) => ({ id: a.id, labelEs: a.etiqueta, clave: a.clave }))}
              activo={agrupacion}
              onCambio={setAgrupacion}
              color={COLOR}
              variante="sub"
              nivel={2}
            />
          </div>
        )}
      </div>

      {lista.length > 0 && <BotonPortadasLote items={lista} />}

      {agrupacion === 'genero' && (
        <p className="text-[11px] text-white/35">
          {t('entre.arch.arrastraGeneros', 'Arrastra las carpetas para poner tus géneros en el orden que quieras.')}
        </p>
      )}

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
          orden={ordenGeneros}
          onReordenar={guardarOrden}
        >
          {tarjeta}
        </CarpetasPorEtiqueta>
      ) : agrupacion === 'tipo' ? (
        <CarpetasPorEtiqueta
          items={lista}
          etiqueta={(item) => t(`entre.tipo.${item.tipo}`, getTipoMedia(item.tipo).label)}
          clave={(item) => item.id ?? item.titulo}
          sinEtiqueta={t('entre.arch.sinTipo', 'Sin categoría')}
        >
          {tarjeta}
        </CarpetasPorEtiqueta>
      ) : agrupacion === 'autor' ? (
        <CarpetasPorEtiqueta
          items={lista}
          etiqueta={(item) => item.autor ?? ''}
          clave={(item) => item.id ?? item.titulo}
          sinEtiqueta={t('entre.arch.sinAutor', 'Sin autor')}
        >
          {tarjeta}
        </CarpetasPorEtiqueta>
      ) : (
        <Archivador items={lista} fecha={(item) => item.fecha} clave={(item) => item.id ?? item.titulo}>
          {tarjeta}
        </Archivador>
      )}

      <BarraEjemplo paquete={ejemploEntretenimiento} />
    </div>
  )
}
