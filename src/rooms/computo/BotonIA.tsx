import { iaActiva } from '../../core/chat/ia'
import type { OperacionIA } from '../../core/cuenta/catalogoIA'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * El botón de una microtarea de IA, con su precio, su aviso y su error.
 *
 * Sin IA configurada NO se esconde: se ve deshabilitado y debajo dice dónde se
 * activa. Ocultarlo es lo que hacía que nadie supiera que la función existía —y
 * lo que llevó a buscar el interruptor por toda la app sin encontrarlo.
 */
export function BotonIA({
  op,
  etiqueta,
  generando,
  deshabilitado = false,
  error,
  onClick,
}: {
  op: OperacionIA
  etiqueta: string
  generando: boolean
  deshabilitado?: boolean
  error?: string
  onClick: () => void
}) {
  const t = useT()
  // Se relee en cada render: la clave puede haberse puesto mientras tanto.
  const activa = iaActiva()

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          disabled={!activa || deshabilitado || generando}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-40"
        >
          {generando ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
          ) : (
            <Icono nombre="brillo" />
          )}
          {generando ? t('computo.ia.pensando', 'Pensando…') : etiqueta}
        </button>
        <Creditos op={op} />
      </div>
      {!activa && (
        <p className="text-[11px] text-white/40">
          {t('computo.ia.sinIa', 'Para usar la IA, actívala en Configuraciones › IA: activar y precios.')}
        </p>
      )}
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  )
}
