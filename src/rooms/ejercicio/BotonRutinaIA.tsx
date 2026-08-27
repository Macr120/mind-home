import { useState, type ReactNode } from 'react'
import { iaActiva } from '../../core/chat/ia'
import type { TipoEntrenamiento } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import type { GrupoCatalogo } from './catalogo'
import { OP_RUTINA } from './costosIA'
import { crearRutinaIA, type RutinaIA } from './rutinaIA'

/**
 * El ✨ de «Crear rutina»: la IA escribe la rutina AQUÍ, en la app, y no como
 * una misión del calendario. No guarda nada — la deja puesta en el formulario
 * para revisarla y darle a «Guardar rutina», que es donde el usuario decide.
 *
 * El campo del nombre entra como `children`: el disparador es un botón chico a
 * su derecha (pedirle la rutina a la IA es un atajo del alta, no otro CTA) y el
 * formulario de la petición se despliega justo debajo de esa fila.
 */
export function BotonRutinaIA({
  tipo,
  catalogo,
  color,
  onGenerada,
  children,
}: {
  tipo: TipoEntrenamiento
  /** Catálogo vivo de la modalidad: la IA copia de aquí los nombres. */
  catalogo: GrupoCatalogo[]
  color: string
  onGenerada: (r: RutinaIA) => void
  /** El campo del nombre de la rutina, al que se pega el botón. */
  children: ReactNode
}) {
  const t = useT()
  const [peticion, setPeticion] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const activa = iaActiva()

  const generar = async () => {
    const texto = (peticion ?? '').trim()
    if (!texto || generando) return
    setGenerando(true)
    setError('')
    try {
      onGenerada(await crearRutinaIA(texto, tipo, catalogo))
      setPeticion(null)
    } catch {
      setError(t('ejercicio.rutinaIA.error', 'No se pudo crear la rutina. Inténtalo otra vez.'))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={() => setPeticion((v) => (v === null ? '' : null))}
          disabled={!activa}
          title={
            activa
              ? t('ejercicio.rutinaIA.boton', 'Con IA')
              : t('ejercicio.rutinaIA.sinClave', 'Configura la IA en el chat para que te escriba rutinas.')
          }
          className={`shrink-0 rounded-lg border px-2.5 py-2 text-sm disabled:opacity-40 ${
            peticion !== null
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
          style={peticion !== null ? acento(color) : { color }}
        >
          <Icono nombre="brillo" />
        </button>
      </div>
      {peticion !== null && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <input
            autoFocus
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            placeholder={t('ejercicio.rutinaIA.ph', '¿Qué rutina quieres? Ej: pecho y tríceps en 45 min')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          />
          <button
            type="button"
            onClick={generar}
            disabled={!peticion.trim() || generando}
            className="ui-accent-bg w-full rounded-lg py-2 text-sm font-bold hover:brightness-110 disabled:opacity-40"
            style={acento(color)}
          >
            {generando
              ? t('ejercicio.rutinaIA.generando', 'Armando la rutina…')
              : t('ejercicio.rutinaIA.generar', 'Escribir rutina')}
          </button>
          <div className="flex items-center gap-2">
            <Creditos op={OP_RUTINA} />
            <span className="text-[10px] text-white/40">
              {t('ejercicio.rutinaIA.nota', 'Cae en el formulario: revísala y guárdala.')}
            </span>
          </div>
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>
      )}
    </>
  )
}
