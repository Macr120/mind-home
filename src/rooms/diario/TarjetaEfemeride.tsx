import { Icono } from '../../core/ui/iconos/Icono'
import { useState } from 'react'
import type { Efemeride } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { getTipoEfemeride } from './constantes'
import { ImagenNoticia } from './ImagenNoticia'
import { ProfundizarModal } from './ProfundizarModal'
import { vivo } from '../../core/ui/estilos'

/**
 * Tarjeta de efeméride: imagen arriba y texto abajo. Palabra y frase sin
 * imagen se vuelven tarjeta tipográfica (el texto grande hace de portada).
 */
export function TarjetaEfemeride({ efemeride }: { efemeride: Efemeride }) {
  const t = useT()
  const tipo = getTipoEfemeride(efemeride.tipo)
  const [sinImagen, setSinImagen] = useState(!efemeride.imagen)
  const [profundizar, setProfundizar] = useState(false)
  const [expandido, setExpandido] = useState(false)
  const tipografica = sinImagen && (efemeride.tipo === 'palabra' || efemeride.tipo === 'frase')

  const botonProfundizar = (
    <button
      type="button"
      onClick={() => setProfundizar(true)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-110"
      style={{ background: `${tipo.color}22`, color: tipo.color }}
    >
      <Icono nombre="cuarto-biblioteca" /> {t('diario.ef.profundizar', 'Profundizar en la biblioteca')}
    </button>
  )

  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
      {tipografica ? (
        <div
          className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ background: `linear-gradient(135deg, ${tipo.color}2e, ${tipo.color}0a)` }}
        >
          <p
            className={`texto-vivo font-bold ${efemeride.tipo === 'palabra' ? 'text-3xl' : 'text-base leading-snug'}`}
            style={vivo(tipo.color)}
          >
            {efemeride.titulo}
          </p>
          {efemeride.subtitulo && <p className="text-xs text-white/45">{efemeride.subtitulo}</p>}
        </div>
      ) : sinImagen ? (
        <div
          className="flex aspect-video items-center justify-center text-5xl"
          style={{ background: `linear-gradient(135deg, ${tipo.color}2e, ${tipo.color}0a)` }}
        >
          <Icono emoji={tipo.emoji} />
        </div>
      ) : (
        <ImagenNoticia
          src={efemeride.imagen!}
          color={tipo.color}
          onError={() => setSinImagen(true)}
        />
      )}
      <div className="space-y-2 p-3.5">
        <span
          className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold"
          style={{ background: `${tipo.color}33`, color: tipo.color }}
        >
          <Icono emoji={tipo.emoji} /> {t(`diario.ef.${tipo.id}`, tipo.label)}
        </span>
        {!tipografica && (
          <h3 className="text-sm font-bold leading-snug">
            {efemeride.titulo}
            {efemeride.anio && (
              <span className="ml-2 text-xs font-semibold text-white/40">{efemeride.anio}</span>
            )}
          </h3>
        )}
        {!tipografica && efemeride.subtitulo && (
          <p
            className={`text-xs font-semibold text-white/50 ${
              efemeride.tipo === 'especie' ? 'italic' : ''
            }`}
          >
            {efemeride.subtitulo}
          </p>
        )}
        {efemeride.texto ? (
          <>
            <p
              className={`text-[13px] leading-relaxed text-white/65 ${
                expandido ? 'whitespace-pre-line' : 'line-clamp-3'
              }`}
            >
              {efemeride.texto}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setExpandido((v) => !v)}
                className="text-xs font-semibold text-white/55 transition hover:text-white/85"
              >
                {expandido
                  ? t('diario.ef.leerMenos', 'Leer menos ▴')
                  : t('diario.ef.leerMas', 'Leer más ▾')}
              </button>
              {expandido && botonProfundizar}
            </div>
          </>
        ) : (
          botonProfundizar
        )}
      </div>
      {profundizar && (
        <ProfundizarModal efemeride={efemeride} onCerrar={() => setProfundizar(false)} />
      )}
    </article>
  )
}
