import { useState } from 'react'
import { rutinasCardioRepo } from '../../core/data/repository'
import { CatalogoCardio } from './CatalogoCardio'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'
import { nombreEjercicio } from './nombres'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { acento } from '../_shared/acento'
import { C_CARDIO } from './constantes'

/**
 * Submenú "Catálogo" de resistencia: se arma una rutina tocando actividades del
 * catálogo y se guarda como plantilla reutilizable (aparece luego en Rutinas).
 * El orden de la lista es el orden de los tramos al registrar la sesión.
 */
export function CrearRutinaCardio() {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [duracion, setDuracion] = useState('30')
  const [ejercicios, setEjercicios] = useState<string[]>([])
  const imgPorClave = useImagenesPorClave()

  const agregar = (nombreEj: string) => {
    setEjercicios((prev) =>
      prev.some((e) => normalizarEjercicio(e) === normalizarEjercicio(nombreEj))
        ? prev
        : [...prev, nombreEj],
    )
  }

  const quitar = (i: number) => setEjercicios((prev) => prev.filter((_, idx) => idx !== i))

  const guardar = async () => {
    if (ejercicios.length === 0) return
    await rutinasCardioRepo.add({
      nombre: nombre.trim() || t('ejercicio.rutina.miRutina', 'Mi rutina'),
      duracionMin: parseInt(duracion, 10) || 30,
      ejercicios,
      creadoEn: new Date().toISOString(),
    })
    setNombre('')
    setDuracion('30')
    setEjercicios([])
  }

  return (
    <div className="space-y-4">
      <CatalogoCardio onAgregar={agregar} />

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
        <label className="block text-xs font-semibold text-white/70">
          {t('ejercicio.duracion', 'Duración (min)')}
          <input
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            className="mt-0.5 w-24 rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
          />
        </label>

        {ejercicios.length === 0 ? (
          <p className="text-xs text-white/40">
            {t('ejercicio.cardio.crearVacio', 'Toca actividades del catálogo de arriba para agregarlas.')}
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
                  hoverBorde="hover:border-sky-500/50"
                  tamano="sm"
                />
                <span className="flex-1 truncate text-white/85">{nombreEjercicio(t, e)}</span>
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
          style={acento(C_CARDIO)}
        >
          {t('ejercicio.crearRutina.guardar', 'Guardar rutina')}
        </button>
      </div>
    </div>
  )
}
