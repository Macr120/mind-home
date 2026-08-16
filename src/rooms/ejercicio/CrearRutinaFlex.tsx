import { useState } from 'react'
import { rutinasFlexRepo } from '../../core/data/repository'
import { CatalogoFlex } from './CatalogoFlex'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import { C_FLEX } from './constantes'

// Tiempo por defecto de cada postura al crear una rutina (segundos).
const SEG_POR_POSTURA = 30

/**
 * Submenú "Catálogo" de flexibilidad: se arma una rutina tocando posturas del
 * catálogo por enfoque (estructura igual a fuerza) y se guarda como plantilla.
 * La duración es la suma de las posturas (30s c/u), no se escribe a mano.
 */
export function CrearRutinaFlex() {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [enfoque, setEnfoque] = useState('')
  const [ejercicios, setEjercicios] = useState<string[]>([])
  const imgPorClave = useImagenesPorClave()

  const sumaSeg = ejercicios.length * SEG_POR_POSTURA
  const fmtSuma = `${Math.floor(sumaSeg / 60)}:${String(sumaSeg % 60).padStart(2, '0')}`

  const agregar = (nombreEj: string, grupoLabel: string) => {
    setEjercicios((prev) =>
      prev.some((e) => normalizarEjercicio(e) === normalizarEjercicio(nombreEj))
        ? prev
        : [...prev, nombreEj],
    )
    if (!enfoque) setEnfoque(grupoLabel)
  }

  const quitar = (i: number) => setEjercicios((prev) => prev.filter((_, idx) => idx !== i))

  const guardar = async () => {
    if (ejercicios.length === 0) return
    await rutinasFlexRepo.add({
      nombre: nombre.trim() || t('ejercicio.rutina.miRutina', 'Mi rutina'),
      duracionMin: Math.max(1, Math.round(sumaSeg / 60)),
      enfoque: enfoque || undefined,
      ejercicios,
      creadoEn: new Date().toISOString(),
    })
    setNombre('')
    setEnfoque('')
    setEjercicios([])
  }

  return (
    <div className="space-y-4">
      <CatalogoFlex onAgregar={agregar} />

      <div className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
        <p className="text-base font-bold">
          <Icono nombre="lista" /> {t('ejercicio.crearRutina.titulo', 'Crear rutina')}
        </p>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          placeholder={t('ejercicio.crearRutina.ph.nombre', 'Nombre de la rutina')}
        />

        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
          <span className="text-xs font-semibold text-white/70">
            {t('ejercicio.flex.suma', 'Suma de los ejercicios')}
          </span>
          <span className="text-base font-bold text-violet-400">{fmtSuma}</span>
        </div>

        {ejercicios.length === 0 ? (
          <p className="text-xs text-white/40">
            {t('ejercicio.crearRutina.vacio', 'Toca posturas del catálogo de arriba para agregarlas.')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {ejercicios.map((e, i) => (
              <li
                key={`${e}-${i}`}
                className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5 text-sm"
              >
                <span className="text-white/40">{i + 1}.</span>
                <MiniaturaEjercicio
                  nombre={e}
                  registro={imgPorClave.get(normalizarEjercicio(e))}
                  hoverBorde="hover:border-violet-500/50"
                  tamano="sm"
                />
                <span className="flex-1 truncate text-white/85">{e}</span>
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  className="text-white/30 hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={guardar}
          disabled={ejercicios.length === 0}
          className="ui-accent-bg w-full rounded-xl py-2.5 font-bold disabled:opacity-40"
          style={acento(C_FLEX)}
        >
          {t('ejercicio.crearRutina.guardar', 'Guardar rutina')}
        </button>
      </div>
    </div>
  )
}
