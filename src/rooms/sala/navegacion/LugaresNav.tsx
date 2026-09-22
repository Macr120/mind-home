import { useState } from 'react'
import type { LugarNav, PuntoNav } from '../../../core/data/db'
import { VACIO, lugaresNavRepo } from '../../../core/data/repository'
import { useT } from '../../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../../core/state/confirmarStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'

/**
 * Lugares guardados de «Cómo llegar»: los sitios a los que vuelves, con su
 * icono. Se guardan desde el origen o el destino de la búsqueda y se usan al
 * revés —tocarlos rellena un extremo del trayecto— o desde el buscador, que
 * los ofrece antes que nada.
 */

/** Iconos entre los que elige el usuario: del catálogo, no emojis sueltos, para que sigan el estilo de la interfaz. */
export const ICONOS_LUGAR: NombreIcono[] = [
  'pin',
  'casa',
  'maletin',
  'corazon',
  'estrella',
  'comida',
  'bebida',
  'canasta',
  'hospital',
  'deportes',
  'cultura',
  'playa',
  'hotel',
  'ciudad',
  'flor',
  'libro',
]

const icono = (l: LugarNav) => (ICONOS_LUGAR.includes(l.icono as NombreIcono) ? (l.icono as NombreIcono) : 'pin')

interface Props {
  /** Punto que se puede guardar ahora mismo (el destino, o el origen si no hay). */
  candidato: PuntoNav | null
  onUsar: (cual: 'origen' | 'destino', p: PuntoNav) => void
}

export function LugaresNav({ candidato, onUsar }: Props) {
  const t = useT()
  const lugares = lugaresNavRepo.useAll() ?? VACIO
  const [editando, setEditando] = useState<number | null>(null)

  const guardar = async () => {
    if (!candidato) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.guardarLugar', 'Guardar lugar'),
      mensaje: t('sala.nav.guardarLugarMensaje', 'Ponle un nombre corto: saldrá al escribir en el buscador.'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: candidato.nombre,
    })
    if (!nombre) return
    await lugaresNavRepo.add({
      nombre,
      icono: 'pin',
      lat: candidato.lat,
      lng: candidato.lng,
      creadoEn: new Date().toISOString(),
    })
  }

  const renombrar = async (l: LugarNav) => {
    if (l.id == null) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.renombrarLugar', 'Cambiar el nombre'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: l.nombre,
    })
    if (nombre) await lugaresNavRepo.update(l.id, { nombre })
  }

  const borrar = async (l: LugarNav) => {
    if (l.id == null) return
    const ok = await confirmar({
      titulo: t('sala.nav.borrarLugar', '¿Borrar este lugar guardado?'),
      mensaje: l.nombre,
      textoOk: t('sala.nav.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await lugaresNavRepo.remove(l.id)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h4 className="flex-1 text-xs font-bold uppercase tracking-wide text-white/50">
          <Icono nombre="pin" /> {t('sala.nav.lugares', 'Lugares guardados')}
        </h4>
        {candidato && (
          <button
            type="button"
            onClick={() => void guardar()}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10"
          >
            <Icono nombre="agregar" /> {t('sala.nav.guardarLugar', 'Guardar lugar')}
          </button>
        )}
      </div>

      {lugares.length === 0 ? (
        <p className="text-xs text-white/40">
          {t('sala.nav.lugaresVacio', 'Guarda los sitios a los que vuelves: casa, trabajo, el gimnasio.')}
        </p>
      ) : (
        lugares.map((l) => (
          <div key={l.id} className="rounded-lg border border-white/10 bg-white/5">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => setEditando((v) => (v === l.id ? null : (l.id ?? null)))}
                title={t('sala.nav.cambiarIcono', 'Cambiar el icono')}
                aria-label={t('sala.nav.cambiarIcono', 'Cambiar el icono')}
                className="rounded-md p-1 text-teal-300 hover:bg-white/10"
              >
                <Icono nombre={icono(l)} />
              </button>
              <button
                type="button"
                onClick={() => onUsar('destino', { nombre: l.nombre, lat: l.lat, lng: l.lng })}
                className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-accent"
                title={t('sala.nav.comoDestino', 'Ir hasta aquí')}
              >
                {l.nombre}
              </button>
              <button
                type="button"
                onClick={() => onUsar('origen', { nombre: l.nombre, lat: l.lat, lng: l.lng })}
                title={t('sala.nav.comoOrigen', 'Salir de aquí')}
                aria-label={t('sala.nav.comoOrigen', 'Salir de aquí')}
                className="rounded-md p-1 text-white/40 hover:text-emerald-300"
              >
                <Icono nombre="ubicacion" />
              </button>
              <button
                type="button"
                onClick={() => void renombrar(l)}
                title={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                aria-label={t('sala.nav.renombrarLugar', 'Cambiar el nombre')}
                className="rounded-md p-1 text-white/40 hover:text-white"
              >
                <Icono nombre="editar" />
              </button>
              <button
                type="button"
                onClick={() => void borrar(l)}
                title={t('sala.nav.borrar', 'Borrar')}
                aria-label={t('sala.nav.borrar', 'Borrar')}
                className="rounded-md p-1 text-white/40 hover:text-red-300"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>

            {editando === l.id && (
              <div className="flex flex-wrap gap-1 border-t border-white/10 px-2 py-1.5">
                {ICONOS_LUGAR.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (l.id != null) void lugaresNavRepo.update(l.id, { icono: n })
                      setEditando(null)
                    }}
                    aria-pressed={icono(l) === n}
                    className={`rounded-md p-1.5 text-sm transition ${
                      icono(l) === n ? 'ui-accent-bg' : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icono nombre={n} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
