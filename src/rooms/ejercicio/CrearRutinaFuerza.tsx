import { useState } from 'react'
import { rutinasFuerzaRepo } from '../../core/data/repository'
import { CatalogoFuerza } from './CatalogoFuerza'
import { useImagenesPorClave } from './imagenIA'
import { MiniaturaEjercicio } from './MiniaturaEjercicio'
import { normalizarEjercicio } from './stats'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * Submenú "Catálogo": se arma una rutina propia tocando ejercicios de la
 * pirámide y se guarda como plantilla reutilizable (aparece luego en Rutinas).
 */
export function CrearRutinaFuerza() {
  const t = useT()
  const [nombre, setNombre] = useState('')
  const [duracion, setDuracion] = useState('45')
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

  const usarComoBase = (rutina: { nombre: string; duracionMin: number; ejercicios?: string[] }) => {
    if (!nombre.trim()) setNombre(rutina.nombre)
    setDuracion(String(rutina.duracionMin))
    if (rutina.ejercicios?.length) setEjercicios(rutina.ejercicios)
  }

  const guardar = async () => {
    if (ejercicios.length === 0) return
    await rutinasFuerzaRepo.add({
      nombre: nombre.trim() || t('ejercicio.rutina.miRutina', 'Mi rutina'),
      duracionMin: parseInt(duracion, 10) || 45,
      ejercicios,
      creadoEn: new Date().toISOString(),
    })
    setNombre('')
    setDuracion('45')
    setEjercicios([])
  }

  return (
    <div className="space-y-4">
      <CatalogoFuerza onAgregar={agregar} onUsarRutina={usarComoBase} />

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
            {t('ejercicio.crearRutina.vacio', 'Toca ejercicios del catálogo de arriba para agregarlos.')}
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
                  hoverBorde="hover:border-orange-500/50"
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
          className="w-full rounded-xl py-2.5 font-bold bg-orange-600 texto-cta disabled:opacity-40"
        >
          {t('ejercicio.crearRutina.guardar', 'Guardar rutina')}
        </button>
      </div>
    </div>
  )
}
