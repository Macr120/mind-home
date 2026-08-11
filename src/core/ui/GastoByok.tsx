import { useGastoByok, totalGastoByok, type CategoriaGastoByok } from '../cuenta/gastoByok'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

const ICONO_CATEGORIA: Record<CategoriaGastoByok, NombreIcono> = {
  chat: 'chat',
  imagen: 'imagen',
  modelo3d: 'cuarto-bodega',
  voz: 'microfono',
  tts: 'bocina',
}

/** 4 decimales si es menor a un centavo (si no, se ve como $0.00); si no, 2. */
function formatoUsd(monto: number): string {
  return monto < 0.01 ? `$${monto.toFixed(4)}` : `$${monto.toFixed(2)}`
}

/**
 * Medidor de gasto BYOK: lo que le han costado al usuario, en dólares reales,
 * las llamadas hechas con su propia clave (`useGastoByok`). Oculto si no hay
 * nada que mostrar. `compacto` = una línea (panel ⚙️ del chat); si no, el
 * desglose completo con botón de reinicio (Configuraciones → Cuenta).
 */
export function GastoByok({ compacto = false }: { compacto?: boolean }) {
  const t = useT()
  const gasto = useGastoByok((s) => s.gasto)
  const reiniciar = useGastoByok((s) => s.reiniciar)
  const total = totalGastoByok(gasto)
  if (total <= 0) return null

  const categorias = (Object.keys(gasto) as CategoriaGastoByok[]).filter((c) => gasto[c] > 0)
  const ETIQUETAS: Record<CategoriaGastoByok, string> = {
    chat: t('gastoByok.chat', 'Chat'),
    imagen: t('gastoByok.imagen', 'Imágenes'),
    modelo3d: t('gastoByok.modelo3d', 'Modelos 3D'),
    voz: t('gastoByok.voz', 'Dictado'),
    tts: t('gastoByok.tts', 'Voz con IA'),
  }

  if (compacto) {
    return (
      <p
        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/35"
        title={t('gastoByok.ayuda', 'Lo que han costado tus llamadas con tu propia clave, por tipo.')}
      >
        <span className="text-white/45">
          <Icono nombre="moneda" /> {t('gastoByok.total', 'Gastado con tu clave: {monto}', { monto: formatoUsd(total) })}
        </span>
        {categorias.map((c) => (
          <span key={c} className="tabular-nums">
            <Icono nombre={ICONO_CATEGORIA[c]} /> {formatoUsd(gasto[c])}
          </span>
        ))}
      </p>
    )
  }

  return (
    <div className="space-y-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('gastoByok.titulo', 'Gasto con tu propia clave')}
        </p>
        <button
          type="button"
          onClick={() => reiniciar()}
          className="text-[10px] text-white/35 underline-offset-2 transition hover:text-white/60 hover:underline"
        >
          {t('gastoByok.reiniciar', 'Reiniciar')}
        </button>
      </div>
      <div className="space-y-1">
        {categorias.map((c) => (
          <div key={c} className="flex items-center gap-2 text-[11px]">
            <span className="text-white/60">
              <Icono nombre={ICONO_CATEGORIA[c]} />
            </span>
            <span className="flex-1 truncate text-white/60">{ETIQUETAS[c]}</span>
            <span className="tabular-nums text-white/75">{formatoUsd(gasto[c])}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[11px] font-semibold">
        <span className="text-white/60">{t('gastoByok.totalLabel', 'Total')}</span>
        <span className="tabular-nums text-white/85">{formatoUsd(total)}</span>
      </div>
      <p className="text-[10px] leading-relaxed text-white/35">
        {t('gastoByok.nota', 'Estimado, no exacto — revisa tu cuenta del proveedor para el monto real.')}
      </p>
    </div>
  )
}
