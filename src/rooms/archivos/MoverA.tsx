import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { CarpetaArchivo } from '../../core/data/db'
import { BotonPrimario, BotonSecundario, Modal } from '../_shared/ui'
import { COLOR } from './constantes'
import { DESTINO_MIA, destinoCarpeta, destinoCuarto, type CuartoArchivo } from './modelo'

interface Nodo {
  destino: string
  nombre: string
  icono: NombreIcono
  hijos: CarpetaArchivo[]
}

/**
 * «Mover a…» con el árbol de carpetas (Mi Archivo y los cuartos), plegable como
 * el de Drive. `excluir` son las carpetas que se mueven con toda su
 * descendencia: una carpeta no cabe dentro de sí misma.
 */
export function MoverA({
  carpetas,
  cuartos,
  carpetasDeCuarto,
  excluir,
  onElegir,
  onCerrar,
}: {
  carpetas: CarpetaArchivo[]
  cuartos: CuartoArchivo[]
  /** Ids de las carpetas reales de cada cuarto (sus hijas cuelgan del cuarto). */
  carpetasDeCuarto: Map<string, number[]>
  excluir: Set<number>
  onElegir: (destino: string) => void
  onCerrar: () => void
}) {
  const t = useT()
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set([DESTINO_MIA]))
  const [elegido, setElegido] = useState<string | null>(null)
  const deCuarto = new Set([...carpetasDeCuarto.values()].flat())
  const hijasDe = (padres: (number | null)[]) =>
    carpetas
      .filter((c) => c.id != null && !excluir.has(c.id) && !deCuarto.has(c.id) && padres.includes(c.padreId))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const raices: Nodo[] = [
    { destino: DESTINO_MIA, nombre: t('archivos.raiz', 'Mi Archivo'), icono: 'nube', hijos: hijasDe([null]) },
    ...cuartos.map((c) => ({
      destino: destinoCuarto(c.cuarto.id),
      nombre: c.nombre,
      icono: 'cuartos' as NombreIcono,
      hijos: hijasDe(carpetasDeCuarto.get(c.cuarto.id) ?? []),
    })),
  ]

  const alternar = (d: string) =>
    setAbiertos((s) => {
      const n = new Set(s)
      if (n.has(d)) n.delete(d)
      else n.add(d)
      return n
    })

  const fila = (n: Nodo, nivel: number) => {
    const abierto = abiertos.has(n.destino)
    return (
      <li key={n.destino}>
        <div
          className={`flex items-center gap-1 rounded-lg pe-2 ${elegido === n.destino ? 'bg-white/15' : 'hover:bg-white/5'}`}
          style={{ paddingInlineStart: `${nivel * 16}px` }}
        >
          <button
            type="button"
            onClick={() => alternar(n.destino)}
            aria-label={abierto ? t('archivos.plegar', 'Plegar') : t('archivos.desplegar', 'Desplegar')}
            className={`grid h-7 w-6 place-items-center text-white/50 ${n.hijos.length ? '' : 'invisible'}`}
          >
            <Icono nombre={abierto ? 'desplegado' : 'plegado'} />
          </button>
          <button type="button" onClick={() => setElegido(n.destino)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm">
            <Icono nombre={n.icono} className="text-white/70" />
            <span className="truncate">{n.nombre}</span>
          </button>
        </div>
        {abierto && n.hijos.length > 0 && (
          <ul>
            {n.hijos.map((c) =>
              fila({ destino: destinoCarpeta(c.id!), nombre: c.nombre, icono: 'carpeta', hijos: hijasDe([c.id!]) }, nivel + 1),
            )}
          </ul>
        )}
      </li>
    )
  }

  return (
    <Modal titulo={t('archivos.moverA', 'Mover a…')} onCerrar={onCerrar}>
      <ul className="max-h-[50vh] overflow-y-auto">{raices.map((r) => fila(r, 0))}</ul>
      <div className="flex justify-end gap-2">
        <BotonSecundario pequeno onClick={onCerrar}>
          {t('archivos.cancelar', 'Cancelar')}
        </BotonSecundario>
        <BotonPrimario pequeno app={COLOR} disabled={!elegido} onClick={() => elegido && onElegir(elegido)}>
          <Icono nombre="mover" /> {t('archivos.moverAqui', 'Mover aquí')}
        </BotonPrimario>
      </div>
    </Modal>
  )
}
