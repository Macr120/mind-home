import { useState } from 'react'
import { rutinasRepo, useEjecucionesDeFecha } from '../data/repository'
import { getPlantilla } from '../registry'
import { debeAvisar, hoyISO, togglePaso } from '../rutinas'
import { lanzarIntencionApp } from '../state/intencionApp'
import { useT } from '../i18n/useT'
import { BannerAviso } from './BannerAviso'

/**
 * El aviso de una actividad agendada, dentro de su propia app: llegó su hora y
 * sigue sin hacerse. Ofrece registrarla de un toque o saltar a donde se captura.
 *
 * Hace falta sí o sí, y no lo cubre la notificación del navegador: la burbuja de
 * la mascota no se pinta con un cuarto abierto (`App.tsx` la monta con
 * `!activeRoom`), que es justo donde estás cuando usas la app.
 *
 * Se gatea con `debeAvisar` (o sea `Rutina.avisar`) y NO con `avisoActivo`/`notif`:
 * `mh.notif` nace apagado, así que colgarlo de ahí dejaría el interruptor
 * «Avisarme» sin efecto hasta que el usuario encontrara Configuraciones. Esos
 * ajustes gobiernan el canal del navegador; esto es el chrome de la app.
 */

/** Cuánto after de su hora sigue teniendo sentido interrumpir (minutos). */
const VENTANA_TARDE_MIN = 120

function toca(hora: string): boolean {
  const ahora = new Date()
  const delta =
    ahora.getHours() * 60 + ahora.getMinutes() - (Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)))
  return delta >= 0 && delta <= VENTANA_TARDE_MIN
}

export function AvisoActividadBanner({ plantillaId }: { plantillaId: string }) {
  const t = useT()
  const rutinas = rutinasRepo.useAll()
  const ejecuciones = useEjecucionesDeFecha(hoyISO())
  const [descartados, setDescartados] = useState<Set<number>>(new Set())

  const pendientes = (rutinas ?? []).filter(
    (r) =>
      r.plantillaId === plantillaId &&
      r.hora &&
      r.id != null &&
      !descartados.has(r.id) &&
      toca(r.hora) &&
      debeAvisar(r, ejecuciones),
  )
  if (pendientes.length === 0) return null

  // Uno a la vez: dos banners apilados sobre la app son ruido, no un aviso.
  const rutina = pendientes[0]
  const color = getPlantilla(plantillaId)?.color ?? '#34d399'
  const paso = rutina.pasos[0]
  const descartar = () => setDescartados((s) => new Set([...s, rutina.id!]))

  return (
    <div className="px-4 pt-3">
      <BannerAviso
        icono="alarma"
        titulo={`${rutina.emoji} ${rutina.nombre}`}
        cuerpo={t('avisoAct.cuerpo', 'Es la hora ({hora}).', { hora: rutina.hora ?? '' })}
        color={color}
        ok={t('avisoAct.ahoraNo', 'Ahora no')}
        onCerrar={descartar}
        acciones={
          <div className="flex shrink-0 items-center gap-1.5">
            {paso?.esquemaId ? (
              <button
                type="button"
                onClick={() => {
                  void togglePaso(rutina, 0)
                  descartar()
                }}
                className="rounded-lg px-3 py-1 text-xs font-bold texto-cta transition hover:brightness-110"
                style={{ background: color }}
              >
                {paso.titulo}
              </button>
            ) : null}
            {/* La sección la puso la actividad al agendarse: el núcleo no sabe
                que la captura de cocina vive en «diario». */}
            {rutina.seccion && (
              <button
                type="button"
                onClick={() => {
                  lanzarIntencionApp({ appId: plantillaId, seccion: rutina.seccion })
                  descartar()
                }}
                className="rounded-lg border border-white/15 px-3 py-1 text-xs font-bold text-white/70 transition hover:text-white"
              >
                {t('avisoAct.ir', 'Ir a registrar')}
              </button>
            )}
          </div>
        }
      />
    </div>
  )
}
