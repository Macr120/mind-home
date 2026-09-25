import type { MouseEvent, ReactNode } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { IconoCuarto } from '../../core/ui/IconoCuarto'
import { BotonPrimario } from '../_shared/ui'
import { COLOR } from './constantes'
import { DESTINO_DESTACADOS, DESTINO_MIA, DESTINO_PAPELERA, destinoCuarto, type CuartoArchivo, type Ubicacion } from './modelo'

interface Entrada {
  clave: string
  texto: string
  icono?: NombreIcono
  cuarto?: CuartoArchivo
  ir: Ubicacion
  destino?: string
  activa: boolean
}

/**
 * El menú de la izquierda, como el de Drive: «+ Nuevo», Mi Archivo, los cuartos
 * de la casa, Recientes, Destacados, Papelera y, al pie, el medidor. Cada
 * entrada que admite algo es destino de soltar (`data-destino`). En el teléfono
 * se vuelve una fila de chips con «Cuartos» agrupados.
 */
export function Lateral({
  ubi,
  ir,
  cuartos,
  hayOtras,
  resaltado,
  puedeSubir,
  onNuevo,
  medidor,
}: {
  ubi: Ubicacion
  ir: (u: Ubicacion) => void
  cuartos: CuartoArchivo[]
  hayOtras: boolean
  resaltado: string | null
  puedeSubir: boolean
  onNuevo: (e: MouseEvent<HTMLButtonElement>) => void
  medidor: ReactNode
}) {
  const t = useT()
  const en = (tipo: Ubicacion['tipo']) => ubi.tipo === tipo

  const arriba: Entrada = { clave: 'mia', texto: t('archivos.raiz', 'Mi Archivo'), icono: 'nube', ir: { tipo: 'mia', carpetaId: null }, destino: DESTINO_MIA, activa: en('mia') }
  const deCuartos: Entrada[] = cuartos.map((c) => ({
    clave: c.cuarto.id,
    texto: c.nombre,
    cuarto: c,
    ir: { tipo: 'cuarto', cuartoId: c.cuarto.id, carpetaId: null },
    destino: destinoCuarto(c.cuarto.id),
    activa: ubi.tipo === 'cuarto' && ubi.cuartoId === c.cuarto.id,
  }))
  const abajo: Entrada[] = [
    ...(hayOtras ? [{ clave: 'otras', texto: t('archivos.otras', 'Otras apps'), icono: 'rejilla' as NombreIcono, ir: { tipo: 'otras' } as Ubicacion, activa: en('otras') }] : []),
    { clave: 'recientes', texto: t('archivos.tab.recientes', 'Recientes'), icono: 'cronometro', ir: { tipo: 'recientes' }, activa: en('recientes') },
    { clave: 'destacados', texto: t('archivos.destacados', 'Destacados'), icono: 'estrella', ir: { tipo: 'destacados' }, destino: DESTINO_DESTACADOS, activa: en('destacados') },
    { clave: 'papelera', texto: t('archivos.papelera', 'Papelera'), icono: 'basura', ir: { tipo: 'papelera' }, destino: DESTINO_PAPELERA, activa: en('papelera') },
  ]

  const clases = (e: Entrada) =>
    `${e.activa ? 'bg-white/15 font-semibold text-white' : 'text-white/75 hover:bg-white/10'} ${
      e.destino && resaltado === e.destino ? 'ring-2 ring-emerald-400/80' : ''
    }`

  const fila = (e: Entrada, sangria = false) => (
    <button
      key={e.clave}
      type="button"
      data-destino={e.destino}
      onClick={() => ir(e.ir)}
      className={`flex w-full items-center gap-2.5 rounded-full py-1.5 pe-3 text-left text-sm transition ${sangria ? 'ps-6' : 'ps-3'} ${clases(e)}`}
    >
      {e.cuarto ? (
        <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded">
          <IconoCuarto cuarto={e.cuarto.cuarto} />
        </span>
      ) : (
        <Icono nombre={e.icono!} className="w-5 shrink-0 text-center" />
      )}
      <span className="truncate">{e.texto}</span>
    </button>
  )

  const chip = (e: Entrada) => (
    <button
      key={e.clave}
      type="button"
      data-destino={e.destino}
      onClick={() => ir(e.ir)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs transition ${clases(e)}`}
    >
      <Icono nombre={e.icono ?? 'cuartos'} /> {e.texto}
    </button>
  )

  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
        {puedeSubir && (
          <BotonPrimario app={COLOR} onClick={onNuevo} className="w-fit rounded-2xl! px-5 shadow-lg">
            <Icono nombre="agregar" /> {t('archivos.nuevo', 'Nuevo')}
          </BotonPrimario>
        )}
        <nav className="space-y-0.5">
          {fila(arriba)}
          <button
            type="button"
            onClick={() => ir({ tipo: 'cuartos' })}
            className={`flex w-full items-center gap-2.5 rounded-full py-1.5 ps-3 pe-3 text-left text-sm transition ${
              en('cuartos') ? 'bg-white/15 font-semibold text-white' : 'text-white/75 hover:bg-white/10'
            }`}
          >
            <Icono nombre="cuartos" className="w-5 shrink-0 text-center" />
            <span className="truncate">{t('archivos.cuartos', 'Cuartos')}</span>
          </button>
          {deCuartos.map((e) => fila(e, true))}
          {abajo.map((e) => fila(e))}
        </nav>
        <div className="mt-2 border-t border-white/10 pt-3">{medidor}</div>
      </aside>

      <div className="sin-deslizador -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden">
        {chip(arriba)}
        {chip({ clave: 'cuartos', texto: t('archivos.cuartos', 'Cuartos'), icono: 'cuartos', ir: { tipo: 'cuartos' }, activa: en('cuartos') || en('cuarto') })}
        {abajo.map(chip)}
      </div>
    </>
  )
}
