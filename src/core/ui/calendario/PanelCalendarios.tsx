import { useState } from 'react'
import { Modal } from '../../../rooms/_shared/ui'
import { mensajeErrorEspacio, salir as salirDelEspacio } from '../../espacios/api'
import { crearCalendario, useCalendariosCompartidos } from '../../espacios/calendario'
import { refrescarEspacios } from '../../espacios/conectar'
import { useEspaciosStore } from '../../espacios/espaciosStore'
import { etiquetaRol } from '../../espacios/ui/PanelCompartir'
import { useT } from '../../i18n/useT'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { COLORES_RUTINA } from '../coloresRutina'
import { Icono } from '../iconos/Icono'

/**
 * «Mis calendarios»: el personal de siempre y los que se comparten con familia
 * o amigos. Se abre desde la cabecera del calendario, junto a «+ Nueva».
 *
 * Aquí solo se crean, se comparten y se abandonan. Quién puede entrar, los dos
 * enlaces y las invitaciones viven en `PanelCompartir`, que es el mismo panel
 * de todo lo compartido (documentos, dibujos, audio y video).
 */
export function PanelCalendarios({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const calendarios = useCalendariosCompartidos()
  const [color, setColor] = useState(COLORES_RUTINA[1])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  /** Un solo sitio para el «ocupado» y el error traducido. */
  const accion = async (fn: () => Promise<void>) => {
    setOcupado(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(mensajeErrorEspacio(e, t))
    } finally {
      setOcupado(false)
    }
  }

  const nuevo = () =>
    accion(async () => {
      const titulo = await pedirTexto({
        titulo: t('esp.cal.nuevo', 'Nuevo calendario compartido'),
        mensaje: t('esp.cal.nuevoMsg', 'Ponle nombre: «Familia», «Viaje a la playa»…'),
        textoOk: t('esp.panel.guardar', 'Guardar'),
      })
      if (titulo == null) return
      const espacio = await crearCalendario(titulo.slice(0, 80), color)
      // Recién creado no tiene a nadie: lo que toca es repartir el enlace.
      useEspaciosStore.getState().abrirCompartir(espacio.espacioId)
    })

  const salir = (id: string) =>
    accion(async () => {
      const si = await confirmar({
        titulo: t('esp.cal.salir', 'Salir del calendario'),
        mensaje: t('esp.panel.salir.pregunta', 'Dejarás de ver esto. ¿Salir?'),
        textoOk: t('esp.cal.salir', 'Salir del calendario'),
        peligro: true,
      })
      if (!si) return
      await salirDelEspacio(id)
      // El motor borra las filas locales al enterarse (evento `borrado`).
      await refrescarEspacios()
    })

  return (
    // El calendario que hay debajo cierra al hacer clic en su fondo: sin esto,
    // cerrar este panel lo cerraría también (igual que `DetalleRutina`).
    <div onClick={(e) => e.stopPropagation()}>
      <Modal titulo={t('esp.cal.titulo', 'Mis calendarios')} onCerrar={onCerrar}>
        <div className="space-y-2">
          {/* El de siempre: ni se comparte ni se abandona. */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORES_RUTINA[0] }} />
            <span className="min-w-0 flex-1 truncate text-sm">{t('esp.cal.mio', 'Mi calendario')}</span>
          </div>

          {calendarios.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{c.titulo}</span>
                <span className="block truncate text-[10px] text-white/45">
                  {etiquetaRol(c.rol, t)} ·{' '}
                  {c.nMiembros === 1
                    ? t('esp.cal.miembro', '1 persona')
                    : t('esp.cal.miembros', '{n} personas', { n: c.nMiembros })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => useEspaciosStore.getState().abrirCompartir(c.id)}
                title={t('esp.cal.compartir', 'Compartir')}
                className="rounded-lg px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <Icono nombre="compartir" />
              </button>
              {c.rol !== 'dueno' && (
                <button
                  type="button"
                  onClick={() => void salir(c.id)}
                  disabled={ocupado}
                  title={t('esp.cal.salir', 'Salir del calendario')}
                  className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-red-400"
                >
                  <Icono nombre="quitar" />
                </button>
              )}
            </div>
          ))}

          {/* Uno nuevo: primero su color, luego el nombre. */}
          <div className="space-y-2 rounded-xl border border-white/10 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
              {t('esp.cal.color', 'Color')}
            </p>
            <div className="flex items-center gap-1.5">
              {COLORES_RUTINA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={`h-6 w-6 rounded-full border-2 transition ${
                    color === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void nuevo()}
              disabled={ocupado}
              className="w-full rounded-lg border border-dashed border-white/20 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <Icono nombre="agregar" /> {t('esp.cal.nuevo', 'Nuevo calendario compartido')}
            </button>
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
      </Modal>
    </div>
  )
}
