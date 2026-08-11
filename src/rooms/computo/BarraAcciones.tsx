import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * La barra de acciones de la hoja. En móvil los botones no caben en una línea,
 * así que la fila hace scroll lateral en vez de envolverse: envuelta, la rejilla
 * bailaría hacia abajo cada vez que aparece o desaparece un botón.
 */
export function BarraAcciones({
  puedeDeshacer,
  puedeRehacer,
  hayRecorte,
  moviendo,
  onDeshacer,
  onRehacer,
  onCopiar,
  onCortar,
  onPegar,
  onMover,
  onBorrar,
  onGraficar,
}: {
  puedeDeshacer: boolean
  puedeRehacer: boolean
  hayRecorte: boolean
  /** La selección está «en la mano» esperando destino. */
  moviendo: boolean
  onDeshacer: () => void
  onRehacer: () => void
  onCopiar: () => void
  onCortar: () => void
  onPegar: () => void
  onMover: () => void
  onBorrar: () => void
  /** Crea una gráfica con el rango seleccionado. */
  onGraficar: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5" data-tut="computo.hojas.acciones">
      <Boton
        icono="deshacer"
        etiqueta={t('computo.hojas.deshacer', 'Deshacer')}
        onClick={onDeshacer}
        deshabilitado={!puedeDeshacer}
      />
      <Boton
        icono="rehacer"
        etiqueta={t('computo.hojas.rehacer', 'Rehacer')}
        onClick={onRehacer}
        deshabilitado={!puedeRehacer}
      />
      <Separador />
      <Boton icono="duplicar" etiqueta={t('computo.hojas.copiar', 'Copiar')} onClick={onCopiar} />
      <Boton icono="cortar" etiqueta={t('computo.hojas.cortar', 'Cortar')} onClick={onCortar} />
      <Boton
        icono="pegar"
        etiqueta={t('computo.hojas.pegar', 'Pegar')}
        onClick={onPegar}
        activo={hayRecorte}
      />
      <Boton
        icono="mover"
        etiqueta={moviendo ? t('computo.hojas.moverDestino', 'Toca el destino') : t('computo.hojas.mover', 'Mover')}
        onClick={onMover}
        activo={moviendo}
      />
      <Separador />
      <Boton icono="grafica" etiqueta={t('computo.hojas.graficar', 'Graficar la selección')} onClick={onGraficar} />
      <Separador />
      <Boton icono="basura" etiqueta={t('computo.hojas.borrarCeldas', 'Borrar')} onClick={onBorrar} />
    </div>
  )
}

const Separador = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />

function Boton({
  icono,
  etiqueta,
  onClick,
  deshabilitado = false,
  activo = false,
}: {
  icono: NombreIcono
  etiqueta: string
  onClick: () => void
  deshabilitado?: boolean
  activo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      className={`shrink-0 rounded-lg px-2 py-1.5 text-xs transition disabled:opacity-30 ${
        activo ? 'ui-accent-bg' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
