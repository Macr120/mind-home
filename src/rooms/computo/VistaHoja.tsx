import { useHoja } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'

/**
 * Asomo a una hoja de cálculo: su esquina superior izquierda, con los valores
 * ya calculados que quedaron en caché. Sirve para reconocerla desde la entrada
 * de la enciclopedia que la usa de material, no para editarla (eso es la
 * rejilla de verdad, que vive en este mismo cuarto).
 *
 * Se registra en diferido desde `index.tsx` (ver `core/materialApps.ts`).
 */

const FILAS = 6
const COLS = 5
const LETRAS = ['A', 'B', 'C', 'D', 'E']

export default function VistaHoja({ id }: { id: number }) {
  const t = useT()
  const hoja = useHoja(id)
  if (!hoja) return null

  const filas = Math.min(FILAS, hoja.filas)
  const cols = Math.min(COLS, hoja.cols)
  const texto = (fila: number, col: number) => {
    const c = hoja.celdas[`${LETRAS[col]}${fila + 1}`]
    if (!c) return ''
    if (c.error) return c.error
    return String(c.valor ?? c.crudo)
  }

  const vacia = Object.keys(hoja.celdas).length === 0
  if (vacia) {
    return (
      <p className="text-[11px] text-white/35">{t('computo.vista.vacia', 'La hoja aún está vacía.')}</p>
    )
  }

  return (
    <table className="w-full table-fixed border-collapse text-[10px]">
      <tbody>
        {Array.from({ length: filas }, (_, f) => (
          <tr key={f}>
            {Array.from({ length: cols }, (_, c) => (
              <td
                key={c}
                className="truncate border border-white/10 px-1 py-0.5 text-white/70"
                title={texto(f, c)}
              >
                {texto(f, c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
