import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { claveLS } from '../edicion'
import { useSesion } from '../cuenta/sesionStore'
import { sincronizar } from '../data/sync/motor'
import { db } from '../data/db'
import { borrarProbar, existePrueba, migrarPruebaALaCasa } from '../../probar/modo'
import { useBienvenida, LS_BIENVENIDA } from './bienvenidaStore'

/**
 * Conversión del modo probar: el visitante creó su cuenta y pagó, y su casa de
 * prueba sigue en la BD paralela. Antes del wizard se le ofrece recuperarla o
 * empezar de cero con la bienvenida. Lo abre `evaluarPrimeraVez()` SOLO con la
 * casa real vacía y la marca `mh.probar.sucio` puesta.
 *
 * Al montar, con plan de sync vigente, primero baja lo que la cuenta ya tenga
 * en la nube: si trae casa (cuenta veterana en dispositivo nuevo), la prueba se
 * descarta sin ofrecer — recuperarla encima duplicaría la casa de la nube.
 */
export function RecuperarPrueba() {
  const t = useT()
  const [fase, setFase] = useState<'comprobando' | 'elegir' | 'migrando'>('comprobando')

  useEffect(() => {
    let vivo = true
    const comprobar = async () => {
      if (!(await existePrueba())) {
        // El navegador purgó la BD de prueba: no queda nada que recuperar.
        await borrarProbar()
        if (vivo) useBienvenida.getState().abrir()
        return
      }
      const { plan } = useSesion.getState()
      if (plan === 'pro' || plan === 'trial') {
        await sincronizar(true)
        if ((await db.objetosCuarto.count()) > 0) {
          localStorage.setItem(claveLS(LS_BIENVENIDA), '1')
          await borrarProbar()
          // Los stores de la casa solo leen al arrancar: la casa de la nube
          // necesita la recarga para pintarse.
          location.reload()
          return
        }
      }
      if (vivo) setFase('elegir')
    }
    void comprobar()
    return () => {
      vivo = false
    }
  }, [])

  const recuperar = async () => {
    setFase('migrando')
    await migrarPruebaALaCasa()
  }

  const empezarDeNuevo = async () => {
    await borrarProbar()
    useBienvenida.getState().abrir()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="ui-panel ui-pop w-full max-w-sm space-y-2 rounded-2xl border border-white/10 p-5 shadow-2xl">
        {fase === 'elegir' ? (
          <>
            <h2 className="text-sm font-bold text-white/90">
              {t('probar.conv.titulo', '¡Tu casa ya es tuya!')}
            </h2>
            <p className="text-xs leading-snug text-white/60">
              {t(
                'probar.conv.cuerpo',
                'Guardamos lo que hiciste mientras probabas la app. ¿Quieres recuperarlo, o prefieres empezar de cero con la bienvenida?',
              )}
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => void recuperar()}
                className="ui-accent-bg block w-full rounded-md px-2 py-1.5 text-center text-xs font-bold"
              >
                {t('probar.conv.recuperar', 'Recuperar lo que hice en la prueba')}
              </button>
              <button
                type="button"
                onClick={() => void empezarDeNuevo()}
                className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
              >
                {t('probar.conv.denuevo', 'Empezar de cero con la bienvenida')}
              </button>
            </div>
          </>
        ) : (
          <p className="py-2 text-center text-xs text-white/60">
            {fase === 'migrando'
              ? t('probar.conv.migrando', 'Recuperando tu casa…')
              : t('probar.conv.comprobando', 'Preparando tu casa…')}
          </p>
        )}
      </div>
    </div>
  )
}
