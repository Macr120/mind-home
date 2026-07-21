import { useState } from 'react'
import type { PerfilIdioma, TipoTarjeta } from '../../core/data/db'
import { tarjetasIdiomaRepo, temasIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { COLOR, NIVELES, TIPOS_TARJETA } from './constantes'
import { TEMARIO } from './temario'
import { hoyISO } from './stats'

export interface TarjetaFormInicial {
  termino: string
  traduccion: string
  ejemplo?: string
  tipo: TipoTarjeta
  nivel: string
  temaId?: string
}

/**
 * Modal de crear/editar una tarjeta de vocabulario. Lo usan la captura manual,
 * la edición desde la lista y el fallback cuando la IA no pudo extraer.
 * Editar NO toca el estado SRS (caja/próximo repaso).
 */
export function TarjetaForm({ perfil, inicial, tarjetaId, aviso, onCerrar }: {
  perfil: PerfilIdioma
  inicial: TarjetaFormInicial
  /** Si viene, se edita esa tarjeta en vez de crear una nueva. */
  tarjetaId?: number
  aviso?: string
  onCerrar: () => void
}) {
  const t = useT()
  const [termino, setTermino] = useState(inicial.termino)
  const [traduccion, setTraduccion] = useState(inicial.traduccion)
  const [ejemplo, setEjemplo] = useState(inicial.ejemplo ?? '')
  const [tipo, setTipo] = useState<TipoTarjeta>(inicial.tipo)
  const [nivel, setNivel] = useState(inicial.nivel)
  const [temaId, setTemaId] = useState(inicial.temaId ?? '')

  const nodos = (temasIdiomaRepo.useAll() ?? []).filter((n) => n.idiomaId === perfil.id)
  const puedeGuardar = termino.trim() !== '' && traduccion.trim() !== ''

  const guardar = async () => {
    if (!puedeGuardar || perfil.id == null) return
    const datos = {
      termino: termino.trim(),
      traduccion: traduccion.trim(),
      ejemplo: ejemplo.trim() || undefined,
      tipo,
      nivel,
      temaId: temaId || undefined,
    }
    if (tarjetaId != null) {
      await tarjetasIdiomaRepo.update(tarjetaId, datos)
    } else {
      await tarjetasIdiomaRepo.add({
        ...datos,
        idiomaId: perfil.id,
        caja: 0,
        proximaISO: hoyISO(),
        fuente: 'manual',
        creadoEn: new Date().toISOString(),
      })
    }
    onCerrar()
  }

  const labelCampo = 'text-[10px] uppercase tracking-wide text-white/40'
  const inputBase =
    'w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {tarjetaId != null
              ? t('idiomas.form.editar', 'Editar tarjeta')
              : t('idiomas.form.nueva', 'Nueva tarjeta')}
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {aviso && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
            {aviso}
          </p>
        )}

        <div className="space-y-1">
          <p className={labelCampo}>{t('idiomas.form.termino', 'Término (en {idioma})', { idioma: perfil.nombre })}</p>
          <input
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="serendipity"
            className={inputBase}
          />
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('idiomas.form.traduccion', 'Traducción')}</p>
          <input
            value={traduccion}
            onChange={(e) => setTraduccion(e.target.value)}
            placeholder={t('idiomas.form.traduccionPh', 'serendipia, hallazgo afortunado')}
            className={inputBase}
          />
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('idiomas.form.ejemplo', 'Frase de ejemplo (para el ejercicio de completar)')}</p>
          <textarea
            value={ejemplo}
            onChange={(e) => setEjemplo(e.target.value)}
            rows={2}
            placeholder={t('idiomas.form.ejemploPh', 'Una frase en el idioma que use el término.')}
            className={`${inputBase} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className={labelCampo}>{t('idiomas.form.tipo', 'Tipo')}</p>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTarjeta)} className={inputBase}>
              {TIPOS_TARJETA.map((x) => (
                <option key={x.id} value={x.id}>
                  {t(`idiomas.tipo.${x.id}`, x.labelEs)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <p className={labelCampo}>{t('idiomas.form.nivel', 'Nivel')}</p>
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputBase}>
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <p className={labelCampo}>{t('idiomas.form.tema', 'Tema del temario')}</p>
          <select value={temaId} onChange={(e) => setTemaId(e.target.value)} className={inputBase}>
            <option value="">{t('idiomas.form.sinTema', '— Ninguno —')}</option>
            {TEMARIO.map((n) => (
              <optgroup key={n.nivel} label={`${n.nivel} · ${n.titulo}`}>
                {n.temas.map((tema) => (
                  <option key={tema.id} value={tema.id}>
                    {tema.titulo}
                  </option>
                ))}
              </optgroup>
            ))}
            {nodos.length > 0 && (
              <optgroup label={t('idiomas.form.temasDesbloq', 'Desbloqueados')}>
                {nodos.map((n) => (
                  <option key={n.temaId} value={n.temaId}>
                    {n.titulo}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            {t('idiomas.form.cancelar', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={!puedeGuardar}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            style={{ background: COLOR }}
          >
            {t('idiomas.form.guardar', 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}
