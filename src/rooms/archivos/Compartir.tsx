import { useEffect, useState } from 'react'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { compartirArchivo, enlacesDe, revocarEnlace, urlDeEnlace, type EnlaceArchivo } from '../../core/cuenta/almacen'
import { BotonPrimario, BotonSecundario, Modal, Spinner } from '../_shared/ui'
import { COLOR } from './constantes'
import { mensajeDeError } from './acciones'

const DURACIONES = [1, 7, 30] as const

/**
 * Compartir un archivo con un enlace: quien lo abre no necesita cuenta y solo
 * ve ESE archivo (la página vive en la web, `mindhaos.com/d/<token>`). Aquí se
 * crean, copian y quitan; mandarlo a la papelera también los quita.
 */
export function Compartir({ clave, nombre, onCerrar }: { clave: string; nombre: string; onCerrar: () => void }) {
  const t = useT()
  const [dias, setDias] = useState<(typeof DURACIONES)[number]>(7)
  const [enlaces, setEnlaces] = useState<EnlaceArchivo[] | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recargar = () =>
    enlacesDe(clave)
      .then(setEnlaces)
      .catch((e) => setError(mensajeDeError(e)))

  useEffect(() => {
    void recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir: el diálogo es de UNA clave
  }, [])

  const intentar = async (f: () => Promise<void>) => {
    setOcupado(true)
    setError(null)
    try {
      await f()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const copiar = async (token: string) => {
    const url = urlDeEnlace(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(token)
    } catch {
      // Sin permiso de portapapeles: la hoja de compartir del sistema, si hay.
      if (navigator.share) await navigator.share({ title: nombre, url }).catch(() => undefined)
    }
  }

  const crear = () =>
    intentar(async () => {
      const { token } = await compartirArchivo(clave, nombre, dias)
      await recargar()
      await copiar(token)
    })

  return (
    <Modal titulo={t('archivos.compartir.titulo', 'Compartir «{nombre}»', { nombre })} onCerrar={onCerrar}>
      <p className="text-xs text-white/60">
        {t('archivos.compartir.aviso', 'Cualquiera con el enlace puede bajar este archivo hasta que venza, sin necesidad de cuenta.')}
      </p>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-white/70">{t('archivos.compartir.duracion', 'El enlace dura')}</p>
        <div className="flex gap-1.5">
          {DURACIONES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDias(d)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition ${
                dias === d ? 'border-sky-400/70 bg-sky-400/15 font-semibold' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {d === 1 ? t('archivos.compartir.unDia', '1 día') : t('archivos.compartir.dias', '{n} días', { n: d })}
            </button>
          ))}
        </div>
      </div>
      <BotonPrimario app={COLOR} disabled={ocupado} onClick={() => void crear()} className="w-full">
        <Icono nombre="vincular" /> {t('archivos.compartir.crear', 'Crear enlace y copiarlo')}
      </BotonPrimario>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-white/70">{t('archivos.compartir.activos', 'Enlaces activos')}</p>
        {enlaces == null ? (
          <Spinner etiqueta={t('archivos.cargando', 'Cargando…')} />
        ) : !enlaces.length ? (
          <p className="text-xs text-white/45">{t('archivos.compartir.ninguno', 'Este archivo no está compartido.')}</p>
        ) : (
          enlaces.map((e) => (
            <div key={e.token} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{urlDeEnlace(e.token).replace(/^https?:\/\//, '')}</span>
                <span className="block text-[11px] text-white/45">
                  {t('archivos.compartir.vence', 'Vence el {fecha} · {n} descargas', {
                    fecha: new Date(e.expira_en).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' }),
                    n: e.descargas,
                  })}
                </span>
              </span>
              <BotonSecundario pequeno onClick={() => void copiar(e.token)}>
                <Icono nombre={copiado === e.token ? 'confirmar' : 'vincular'} />{' '}
                {copiado === e.token ? t('archivos.compartir.copiado', 'Copiado') : t('archivos.compartir.copiar', 'Copiar')}
              </BotonSecundario>
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void intentar(async () => {
                    await revocarEnlace(e.token)
                    await recargar()
                  })
                }
                aria-label={t('archivos.compartir.quitar', 'Dejar de compartir')}
                title={t('archivos.compartir.quitar', 'Dejar de compartir')}
                className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-red-300"
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
