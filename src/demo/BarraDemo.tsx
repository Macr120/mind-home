import { useState } from 'react'
import { esDemoAutor } from '../core/edicion'
import { useT } from '../core/i18n/useT'
import { Icono } from '../core/ui/iconos/Icono'
import { puedeMostrarPagos } from '../core/plataforma'
import { URL_WEB as urlWeb } from '../core/cuenta/urlWeb'
import { reiniciarDemo, salirDemo } from './modo'
import { descartarSandbox, useSandboxDemo } from './sandbox'

/**
 * Píldora persistente de la casa demo (montada en App solo con `esDemo()`):
 * recuerda dónde estás y ofrece salir, suscribirse y reiniciar el contenido.
 * En modo AUTOR (solo dev) marca el estado y ofrece exportar `casa.json`.
 */
export function BarraDemo() {
  const t = useT()
  const [abierta, setAbierta] = useState(false)
  const [exportando, setExportando] = useState(false)
  const sucio = useSandboxDemo((s) => s.sucio)

  const exportar = async () => {
    if (exportando) return
    setExportando(true)
    try {
      const { descargarCasaJson } = await import('./exportarCasa')
      await descargarCasaJson()
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="pointer-events-auto fixed left-1/2 top-2 z-[45] -translate-x-1/2">
      <div className="ui-panel-glass flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="text-[11px] font-bold text-white/85"
        >
          {t('demo.barra.titulo', 'Casa demo')}
          <span className={`ml-1 inline-block text-[8px] transition-transform ${abierta ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {esDemoAutor() && (
          <span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            {t('demo.autor.chip', 'Modo autor')}
          </span>
        )}
        {abierta && esDemoAutor() && (
          <button
            type="button"
            onClick={() => void exportar()}
            disabled={exportando}
            className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/30 disabled:opacity-50"
          >
            {t('demo.autor.exportar', 'Exportar casa.json')}
          </button>
        )}
        {abierta && (
          <>
            {puedeMostrarPagos() && urlWeb && (
              <a
                href={urlWeb}
                target="_blank"
                rel="noreferrer"
                className="ui-accent-bg rounded-full px-2 py-0.5 text-[11px] font-bold"
              >
                {t('demo.aviso.cta', 'Quiero mi propia casa')}
              </a>
            )}
            {/* Solo tras tocar el editor: la casa demo tiene cambios que tirar. */}
            {sucio && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      t(
                        'demo.sandbox.descartarConfirma',
                        '¿Descartar tus cambios? La casa demo vuelve a su estado original.',
                      ),
                    )
                  ) {
                    descartarSandbox()
                  }
                }}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
              >
                <Icono nombre="deshacer" /> {t('demo.sandbox.descartar', 'Descartar mis cambios')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm(t('demo.reiniciar.confirma', '¿Reiniciar la demo? La casa de Pep@ se vuelve a construir desde cero.'))) {
                  void reiniciarDemo()
                }
              }}
              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
            >
              {t('demo.reiniciar', 'Reiniciar')}
            </button>
            <button
              type="button"
              onClick={() => salirDemo()}
              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
            >
              {t('demo.salir', 'Salir de la demo')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
