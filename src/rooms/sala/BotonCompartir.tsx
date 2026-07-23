import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { compartirTexto } from '../../core/compartir'

/** Botón "Compartir" con feedback (✓ Copiado) y respaldo manual si el portapapeles falla. */
export function BotonCompartir({ titulo, texto }: { titulo: string; texto: string }) {
  const t = useT()
  const [compartido, setCompartido] = useState(false)
  const [textoManual, setTextoManual] = useState<string | null>(null)

  const compartir = async () => {
    const r = await compartirTexto(titulo, texto)
    if (r.tipo === 'copiado') {
      setCompartido(true)
      setTimeout(() => setCompartido(false), 2000)
    } else if (r.tipo === 'manual') {
      setTextoManual(r.texto)
    }
  }

  return (
    <>
      <button
        onClick={() => void compartir()}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/15"
      >
        {compartido ? (
          <><Icono nombre="confirmar" /> {t('sala.hoja.copiado', 'Copiado')}</>
        ) : (
          <><Icono nombre="compartir" /> {t('sala.hoja.compartir', 'Compartir')}</>
        )}
      </button>
      {textoManual && (
        <div className="w-full space-y-1.5 rounded-lg border border-white/10 bg-black/25 p-2.5">
          <p className="text-[11px] text-white/50">
            {t('sala.hoja.copiarManual', 'No se pudo copiar solo. Selecciona el texto y cópialo (Ctrl+C):')}
          </p>
          <textarea
            readOnly
            value={textoManual}
            rows={4}
            onFocus={(e) => e.currentTarget.select()}
            ref={(el) => el?.focus()}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-[11px] text-white/80 outline-none"
          />
          <button
            onClick={() => setTextoManual(null)}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/15"
          >
            {t('sala.hoja.cerrar', 'Cerrar')}
          </button>
        </div>
      )}
    </>
  )
}
