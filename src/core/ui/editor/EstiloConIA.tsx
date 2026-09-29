import { useState } from 'react'
import { iaActiva } from '../../chat/ia'
import { generarTemaIA } from '../../house/estiloIA'
import { useDiseño } from '../../state/disenoStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { Creditos } from '../Creditos'
import { OP_ESTILO_IA } from '../../cuenta/catalogoNucleo'

/** Ideas de estilo para llenar el campo de un toque. */
const SUGERENCIAS = [
  { clave: 'realista', es: 'fotorrealista y cálido' },
  { clave: 'maqueta', es: 'maqueta de arquitecto' },
  { clave: 'acuarela', es: 'acuarela suave' },
  { clave: 'nordica', es: 'cabaña nórdica al atardecer' },
  { clave: 'nocheNeon', es: 'noche cyberpunk con neones' },
]

/**
 * La IA como directora de arte: describe un estilo y nace un tema nuevo de la
 * casa (colores, luz, niebla, estilo de render y efectos), que queda puesto y
 * se retoca o se borra como cualquier otro.
 */
export function EstiloConIA() {
  const t = useT()
  const crearTema = useDiseño((s) => s.crearTema)
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const hayIa = iaActiva()
  const puedeGenerar = hayIa && !generando && descripcion.trim().length > 0

  const generar = async () => {
    if (!puedeGenerar) return
    setError('')
    setGenerando(true)
    try {
      await crearTema(await generarTemaIA(descripcion.trim()))
      setDescripcion('')
    } catch (e) {
      console.warn('[MPH] No se pudo crear el tema con IA:', e)
      setError(t('editor.estiloIA.error', 'No se pudo crear el tema. Prueba con otra descripción.'))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="rounded-lg border border-violet-400/25 bg-violet-400/[0.06] p-2.5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400/80 transition hover:text-violet-400"
      >
        <Icono nombre="brillo" />
        <span className="flex-1 text-start">{t('editor.estiloIA.titulo', 'Crear un tema con IA')}</span>
        <Creditos op={OP_ESTILO_IA} />
        <span className="text-[11px]">{abierto ? '▾' : '▸'}</span>
      </button>

      {abierto && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void generar()
            }}
            placeholder={t('editor.estiloIA.placeholder', 'Describe el estilo de tu casa…')}
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white/85 outline-none placeholder:text-white/25 focus:border-violet-400/50"
          />

          <div className="flex flex-wrap gap-1">
            {SUGERENCIAS.map((s) => (
              <button
                key={s.clave}
                type="button"
                onClick={() => setDescripcion(t(`editor.estiloIA.sug.${s.clave}`, s.es))}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/55 transition hover:bg-white/10 hover:text-white/80"
              >
                {t(`editor.estiloIA.sug.${s.clave}`, s.es)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void generar()}
            disabled={!puedeGenerar}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 py-1.5 text-[11px] font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
          >
            {generando ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
                {t('editor.estiloIA.generando', 'Diseñando…')}
              </>
            ) : (
              <>
                <Icono nombre="brillo" />
                {t('editor.estiloIA.generar', 'Crear tema')}
              </>
            )}
          </button>

          <p className="text-[10px] leading-snug text-white/40">
            {hayIa
              ? t('editor.estiloIA.nota', 'Se crea un tema nuevo y se pone en la casa; luego puedes retocarlo o borrarlo.')
              : t('editor.estiloIA.sinIa', 'Configura la IA en el chat para crear temas.')}
          </p>
          {error && <p className="text-[10px] leading-snug text-red-300">{error}</p>}
        </div>
      )}
    </div>
  )
}
