import { useEffect, type ReactNode } from 'react'
import { hayBackend } from '../../../core/cuenta/supabase'
import { useSesion } from '../../../core/cuenta/sesionStore'
import type { PublicacionVideo } from '../../../core/data/db'
import { useT } from '../../../core/i18n/useT'
import { esAppNativa } from '../../../core/plataforma'
import { redesDisponibles } from '../../../core/redes/api'
import { useRedes } from '../../../core/redes/redesStore'
import { NOMBRE_RED, PLATAFORMAS, type Plataforma } from '../../../core/redes/tipos'
import { Icono } from '../../../core/ui/iconos/Icono'
import { LogoRed } from '../../../core/ui/logosMarca'
import { Modal } from '../../_shared/ui'
import type { AspectoVideo } from '../constantes'
import { soportaMp4 } from '../exportar'

export type OpcionExportar = 'archivo' | 'proyecto' | 'medios' | Plataforma

/**
 * El menú al pulsar «Exportar»: descargar (o compartir con la hoja del sistema
 * en la app de tienda), en el modo película llevar la animación a un proyecto
 * de video como clip o guardarla en Medios, y las cuatro redes, cada una con su estado. Un solo
 * botón en la cabecera, como CapCut: en móvil no cabe otro control.
 */
export function MenuExportar({
  onElegir,
  onCerrar,
  aspecto,
  publicaciones,
  conMedios = false,
}: {
  onElegir: (opcion: OpcionExportar) => void
  onCerrar: () => void
  aspecto: AspectoVideo
  publicaciones: PublicacionVideo[]
  conMedios?: boolean
}) {
  const t = useT()
  const usuario = useSesion((s) => s.usuario)
  const cuentas = useRedes((s) => s.cuentas)
  const cargado = useRedes((s) => s.cargado)
  const enCurso = useRedes((s) => s.trabajo?.estado === 'activo')
  const nativa = esAppNativa()
  const conBackend = hayBackend()
  const conSesion = redesDisponibles()
  const mp4 = soportaMp4()

  useEffect(() => {
    if (conSesion && !cargado) void useRedes.getState().refrescar()
  }, [conSesion, cargado])

  const loseta = (clave: string, icono: ReactNode, etiqueta: string, sub: string | null, o: { disabled?: boolean; title?: string; onClick: () => void }) => (
    <button
      key={clave}
      type="button"
      disabled={o.disabled}
      title={o.title}
      onClick={o.onClick}
      className="ui-boton flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1 text-[11px] transition hover:bg-white/10 disabled:opacity-30"
    >
      <span className="text-xl">{icono}</span>
      <span>{etiqueta}</span>
      {sub && <span className="text-[10px] text-white/45">{sub}</span>}
    </button>
  )

  return (
    <Modal titulo={t('video.publicar.menu.titulo', 'Exportar o publicar')} onCerrar={onCerrar} ancho="max-w-lg">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {loseta(
          'archivo',
          <Icono nombre={nativa ? 'compartir' : 'descargar'} />,
          nativa ? t('video.publicar.menu.compartir', 'Compartir con…') : t('video.publicar.menu.descargar', 'Descargar'),
          null,
          { onClick: () => onElegir('archivo') },
        )}
        {conMedios &&
          loseta(
            'proyecto',
            <Icono nombre="pelicula" />,
            t('video.pelicula.aProyecto', 'A un proyecto de video'),
            t('video.pelicula.aProyectoSub', 'Como clip en tu video'),
            { onClick: () => onElegir('proyecto') },
          )}
        {conMedios &&
          loseta(
            'medios',
            <Icono nombre="carpeta" />,
            t('video.pelicula.guardarMedios', 'Guardar en Medios'),
            t('video.pelicula.guardarMediosSub', 'Como clip para tus videos'),
            { onClick: () => onElegir('medios') },
          )}
        {conBackend &&
          PLATAFORMAS.map((p) => {
            const conectada = cuentas.some((c) => c.plataforma === p)
            const publicada = publicaciones.some((x) => x.plataforma === p && x.estado !== 'error')
            let bloqueo: string | null = null
            if (!conSesion) bloqueo = t('video.publicar.menu.sinSesion', 'Inicia sesión en Configuraciones → Cuenta para conectar tus redes.')
            else if (enCurso) bloqueo = t('video.publicar.menu.enCurso', 'Hay una publicación en curso')
            else if (p === 'instagram' && !mp4) bloqueo = t('video.publicar.menu.sinMp4', 'Necesita MP4: este dispositivo solo graba WebM')
            else if (p === 'instagram' && aspecto !== '9:16') bloqueo = t('video.publicar.menu.solo916', 'Solo en formato 9:16')
            const sub = publicada
              ? t('video.publicar.menu.yaPublicado', 'Ya publicado')
              : conectada
                ? t('video.publicar.menu.conectado', 'Conectado')
                : t('video.publicar.menu.conectar', 'Conectar')
            return loseta(p, <LogoRed plataforma={p} className="h-6 w-6" />, NOMBRE_RED[p], sub, {
              disabled: bloqueo != null,
              title: bloqueo ?? undefined,
              onClick: () => onElegir(p),
            })
          })}
      </div>
      {!conBackend && (
        <p className="text-xs text-white/45">
          {t('video.publicar.menu.sinBackend', 'Publicar en redes necesita la cuenta en la nube; aquí puedes descargar o compartir el archivo.')}
        </p>
      )}
      {conBackend && !conSesion && !usuario && (
        <p className="text-xs text-white/45">{t('video.publicar.menu.sinSesion', 'Inicia sesión en Configuraciones → Cuenta para conectar tus redes.')}</p>
      )}
    </Modal>
  )
}
