import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useState } from 'react'
import type { ImagenEjercicio } from '../../core/data/db'
import { iaHabilitada } from '../../core/edicion'
import { normalizarEjercicio } from './stats'
import { urlImagenPreset } from './imagenesPreset'
import { imagenIaActiva, generarImagenEjercicio, guardarImagenEjercicio } from './imagenIA'
import { costoOperacion } from '../../core/cuenta/catalogoIA'
import { Creditos } from '../../core/ui/Creditos'
import { useAjustes } from '../../core/state/ajustesStore'
import { OP_LOTE_IMAGENES } from './costosIA'

interface EjercicioMin {
  nombre: string
  descripcion?: string
}

/**
 * Atajo del catálogo para llenar de golpe las imágenes que falten en el grupo
 * actual. El proveedor y la API key son los que ya está usando el chat (no se
 * configuran aquí); cada miniatura genera la suya por separado.
 */
const ACENTOS = { violet: 'bg-violet-600', orange: 'bg-orange-600', sky: 'bg-sky-600' }

export function GenerarImagenesBar({
  ejercicios,
  imgPorClave,
  accent,
}: {
  ejercicios: EjercicioMin[]
  imgPorClave: Map<string, ImagenEjercicio>
  accent: keyof typeof ACENTOS
}) {
  const t = useT()
  const [generando, setGenerando] = useState(false)
  const [progreso, setProgreso] = useState<{ hechas: number; fallidas: number; total: number } | null>(null)
  const calidadImagen = useAjustes((s) => s.calidadImagen)

  const btnAcc = ACENTOS[accent]

  // Los que ya traen ilustración de fábrica no cuentan como faltantes.
  const faltantes = useMemo(
    () =>
      ejercicios.filter(
        (e) => !imgPorClave.get(normalizarEjercicio(e.nombre)) && !urlImagenPreset(e.nombre),
      ),
    [ejercicios, imgPorClave],
  )

  const generarFaltantes = async () => {
    if (generando || faltantes.length === 0) return
    // El total, no un «puede tener costo»: es la operación más cara de la app y
    // con 40 ejercicios se lleva medio pool del mes.
    const creditos = costoOperacion(OP_LOTE_IMAGENES, { n: faltantes.length, calidad: calidadImagen })
    if (
      !window.confirm(
        t(
          'ejercicio.confirmarGenerarImagenes',
          'Se generarán {n} imágenes y costará {c} créditos. ¿Continuar?',
          { n: String(faltantes.length), c: String(creditos) },
        ),
      )
    ) {
      return
    }
    setGenerando(true)
    let hechas = 0
    let fallidas = 0
    setProgreso({ hechas, fallidas, total: faltantes.length })
    for (const ej of faltantes) {
      try {
        const blob = await generarImagenEjercicio(ej.nombre, ej.descripcion)
        await guardarImagenEjercicio(ej.nombre, imgPorClave.get(normalizarEjercicio(ej.nombre)), blob)
        hechas++
      } catch (e) {
        console.warn('[MPH] Falló generar imagen de', ej.nombre, e)
        fallidas++
      }
      setProgreso({ hechas, fallidas, total: faltantes.length })
    }
    setGenerando(false)
    setTimeout(() => setProgreso(null), 5000)
  }

  // Generar imágenes es exclusivo de Pro: en gratis no se muestra.
  if (!iaHabilitada()) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={generarFaltantes}
        disabled={!imagenIaActiva() || faltantes.length === 0 || generando}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold texto-cta disabled:opacity-40 ${btnAcc}`}
      >
        {generando
          ? `Generando ${progreso?.hechas ?? 0}/${progreso?.total ?? faltantes.length}…`
          : <><Icono nombre="brillo" /> {t('ejercicio.img.generar', 'Generar faltantes ({n})', { n: String(faltantes.length) })}</>}
      </button>
      {faltantes.length > 0 && !generando && (
        <Creditos op={OP_LOTE_IMAGENES} ctx={{ n: faltantes.length }} />
      )}
      {progreso && !generando && (
        <span className="text-[11px] text-white/50">
          {t('ejercicio.img.listas', 'Listas:')} {progreso.hechas}
          {progreso.fallidas > 0 ? ` · ${progreso.fallidas} fallaron` : ''}
        </span>
      )}
    </div>
  )
}
