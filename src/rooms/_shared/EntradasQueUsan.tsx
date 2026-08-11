import { useState } from 'react'
import type { TipoMaterial } from '../../core/data/db'
import { VACIO, entradasBiblioRepo, materialEntradaRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'
import { useT } from '../../core/i18n/useT'
import { CAMPO_ID_MATERIAL } from '../../core/materialApps'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * El camino de VUELTA del material a la enciclopedia: si esta hoja, este mapa o
 * esta idea son material de estudio de alguna entrada de Biblioteca, aquí salen
 * sus enlaces para volver a ella.
 *
 * No importa nada del cuarto de Biblioteca: el enlace (`materialEntrada`) y las
 * entradas viven en `core/data`, y saltar es `abrirApp`. Si no hay ninguna
 * entrada que lo use, no se dibuja nada.
 */
export function EntradasQueUsan({
  tipo,
  id,
  className = '',
}: {
  tipo: TipoMaterial
  id: number | null | undefined
  className?: string
}) {
  const t = useT()
  const enlaces = materialEntradaRepo.useAll() ?? VACIO
  const entradas = entradasBiblioRepo.useAll() ?? VACIO
  const [aviso, setAviso] = useState<string | null>(null)

  if (id == null) return null
  const campo = CAMPO_ID_MATERIAL[tipo]
  const ids = new Set(enlaces.filter((e) => e.tipo === tipo && e[campo] === id).map((e) => e.entradaId))
  const usan = entradas.filter((e) => e.id != null && ids.has(e.id))
  if (usan.length === 0) return null

  const abrir = (entradaId: number) => {
    if (!abrirApp('biblioteca', 'enciclopedia', `entrada:${entradaId}`)) {
      setAviso(
        t('material.sinBiblioteca', 'Coloca el cuarto de la biblioteca en tu casa para abrir su enciclopedia.'),
      )
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[10px] uppercase tracking-wide text-white/40">
        {t('material.estudiasEn', 'Lo estudias en')}
      </span>
      {usan.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => abrir(e.id!)}
          className="flex max-w-[16rem] items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white/95"
          title={t('material.abrirEntrada', 'Abrir «{n}» en la enciclopedia', { n: e.titulo })}
        >
          <Icono nombre="cuarto-biblioteca" />
          <span className="min-w-0 truncate">{e.titulo}</span>
        </button>
      ))}
      {aviso && (
        <p className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200/90">
          {aviso}
        </p>
      )}
    </div>
  )
}
