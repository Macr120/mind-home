import { useEffect, useState } from 'react'
import { useT, type TFunc } from '../i18n/useT'
import type { NombreIcono } from '../ui/iconos/catalogo'
import { BannerAviso } from '../ui/BannerAviso'
import { useHouse } from '../state/houseStore'
import { useAjustes } from '../state/ajustesStore'
import { TEMAS_UI, modoBase } from '../ui/temasUI'
import { tomarHuboRegistro } from '../state/registroSesion'
import { festejarAleatorio } from './festejo'
import { marcarSisifoVisto, useSisifo, type LogroNuevo } from './sisifo'
import { INSIGNIAS, RANGOS, nombreInsignia, nombreRango } from './sisifoData'

/** Acento del tema de interfaz activo (valor literal: `BannerAviso` lo usa con sufijo de opacidad). */
function useColorAcento(): string {
  const temaUI = useAjustes((s) => s.temaUI)
  const modoUI = useAjustes((s) => s.modoUI)
  const tema = TEMAS_UI.find((t) => t.id === temaUI) ?? TEMAS_UI[0]
  return tema.vars[modoBase(modoUI)]['--ui-accent']
}

/** Texto/ícono del aviso según el tipo de logro (el color siempre es el acento del tema). */
function mensajeLogro(logro: LogroNuevo, t: TFunc): { icono: NombreIcono; titulo: string; cuerpo: string } {
  if (logro.tipo === 'estrella') {
    return {
      icono: 'estrella',
      titulo: t('sisifo.aviso.estrella.titulo', '¡Coronaste la montaña!'),
      cuerpo: t('sisifo.aviso.estrella.cuerpo', 'Ganaste una estrella permanente. El ascenso vuelve a empezar.'),
    }
  }
  if (logro.tipo === 'rango') {
    const r = RANGOS[logro.rango - 1]
    return {
      icono: 'montaña',
      titulo: t('sisifo.aviso.rango.titulo', '¡Subiste de rango!'),
      cuerpo: t('sisifo.aviso.rango.cuerpo', 'Ahora eres {nombre}.', { nombre: nombreRango(r) }),
    }
  }
  const b = INSIGNIAS[logro.insignia - 1]
  return {
    icono: 'gema',
    titulo: t('sisifo.aviso.insignia.titulo', '¡Nueva insignia!'),
    cuerpo: nombreInsignia(b),
  }
}

/**
 * Dos festejos del personaje, montado siempre (no lazy, reacciona sin acción del usuario):
 * 1) Al ganar rango/insignia/estrella: notificación; al cerrarla, movimiento aleatorio.
 * 2) Al salir de un cuarto donde se registró algo: el mismo movimiento, sin notificación.
 */
export function SisifoFestejo() {
  const t = useT()
  const vista = useSisifo()
  const acento = useColorAcento()

  // Festejo en silencio al salir de un cuarto donde se guardó algo nuevo.
  useEffect(
    () =>
      useHouse.subscribe((s, prev) => {
        if (!prev.activeRoom && s.activeRoom) {
          tomarHuboRegistro() // entra limpio: no arrastra registros de antes de esta visita
        } else if (prev.activeRoom && !s.activeRoom) {
          if (tomarHuboRegistro()) festejarAleatorio()
        }
      }),
    [],
  )

  // Notificación de rango/insignia/estrella: se descarta por clave para no
  // reabrirse mientras `marcarSisifoVisto` todavía viaja a la base de datos.
  const [descartado, setDescartado] = useState<string | null>(null)
  const logro = vista?.nuevoLogro ?? null
  const clave = logro ? `${logro.tipo}:${logro.tipo === 'rango' ? logro.rango : logro.tipo === 'insignia' ? logro.insignia : ''}` : null

  if (!logro || !vista || clave === descartado) return null

  const cerrar = () => {
    setDescartado(clave)
    void marcarSisifoVisto(vista.insignias)
    festejarAleatorio()
  }

  const msg = mensajeLogro(logro, t)
  return (
    <div className="safe-sup fixed inset-x-0 top-4 z-[65] flex justify-center px-4">
      <div className="w-full max-w-sm">
        <BannerAviso
          icono={msg.icono}
          titulo={msg.titulo}
          cuerpo={msg.cuerpo}
          color={acento}
          ok={t('sisifo.aviso.genial', '¡Genial!')}
          onCerrar={cerrar}
        />
      </div>
    </div>
  )
}
