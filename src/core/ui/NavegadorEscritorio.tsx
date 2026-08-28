import { useEffect, useState } from 'react'
import { useNavegador } from '../state/navegadorStore'
import { hostDe, faviconDe } from '../enlaces'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/**
 * La barra del navegador embebido del escritorio. La página la pinta el shell
 * en una vista NATIVA que tapa toda la ventana salvo esta franja superior
 * (`BARRA_NAVEGADOR`): aquí solo viven los controles y el rótulo. Montado
 * siempre en App.tsx (escritorio): los oyentes del shell tienen que estar
 * aunque el navegador esté cerrado.
 */
export function NavegadorEscritorio() {
  const abierto = useNavegador((s) => s.abierto)

  // Lo que cuenta el shell (navegó, título nuevo, se cerró solo) entra por
  // eventos del DOM que reemite la precarga — mismo contrato que el deep link.
  useEffect(() => {
    const alNavego = (e: Event) => useNavegador.getState().alNavegar((e as CustomEvent).detail)
    const alTitulo = (e: Event) => useNavegador.getState().alTitulo((e as CustomEvent).detail)
    const alCerrado = () => useNavegador.getState().alCerrarShell()
    window.addEventListener('mph:nav-navego', alNavego)
    window.addEventListener('mph:nav-titulo', alTitulo)
    window.addEventListener('mph:nav-cerrado', alCerrado)
    return () => {
      window.removeEventListener('mph:nav-navego', alNavego)
      window.removeEventListener('mph:nav-titulo', alTitulo)
      window.removeEventListener('mph:nav-cerrado', alCerrado)
    }
  }, [])

  // La vista nativa no sigue a la ventana sola: renovar los bounds al redimensionar.
  useEffect(() => {
    if (!abierto) return
    const al = () => useNavegador.getState().reencuadrar()
    window.addEventListener('resize', al)
    return () => window.removeEventListener('resize', al)
  }, [abierto])

  if (!abierto) return null
  return <Barra />
}

function Barra() {
  const t = useT()
  const url = useNavegador((s) => s.url)
  const titulo = useNavegador((s) => s.titulo)
  const atras = useNavegador((s) => s.atras)
  const adelante = useNavegador((s) => s.adelante)
  const cerrar = useNavegador((s) => s.cerrar)
  const host = hostDe(url)

  const abrirEnSistema = () => {
    // El shell deniega la ventana y la manda al navegador del sistema.
    window.open(url, '_blank', 'noopener')
    void cerrar()
  }

  return (
    <div className="ui-panel absolute inset-x-0 top-0 z-[60] flex h-12 items-center gap-1 border-b border-white/10 px-2 shadow-lg">
      <BotonBarra
        icono="volver"
        titulo={t('enlace.atras', 'Atrás')}
        deshabilitado={!atras}
        onClick={() => void window.mph?.navegador?.atras()}
      />
      <BotonBarra
        icono="siguiente"
        titulo={t('enlace.adelante', 'Adelante')}
        deshabilitado={!adelante}
        onClick={() => void window.mph?.navegador?.adelante()}
      />
      <BotonBarra
        icono="rotar-der"
        titulo={t('enlace.recargar', 'Recargar')}
        onClick={() => void window.mph?.navegador?.recargar()}
      />
      <div className="mx-2 flex min-w-0 flex-1 items-center justify-center gap-2">
        <FaviconBarra key={host} url={url} />
        <span className="truncate text-sm font-semibold text-white/85">{titulo || host}</span>
        {/* Siempre el dominio real a la vista, diga lo que diga el título. */}
        <span className="hidden shrink-0 text-[11px] font-medium text-white/40 sm:inline">{host}</span>
      </div>
      <BotonBarra icono="compartir" titulo={t('enlace.abrirSistema', 'Abrir en tu navegador')} onClick={abrirEnSistema} />
      <BotonBarra icono="cerrar" titulo={t('rutinas.cerrar', 'Cerrar')} onClick={() => void cerrar()} />
    </div>
  )
}

function BotonBarra({
  icono,
  titulo,
  onClick,
  deshabilitado,
}: {
  icono: NombreIcono
  titulo: string
  onClick: () => void
  deshabilitado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={titulo}
      aria-label={titulo}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/12 hover:text-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Icono nombre={icono} />
    </button>
  )
}

/** Favicon del dominio en la barra; el icono de enlace si no carga. */
function FaviconBarra({ url }: { url: string }) {
  const [fallo, setFallo] = useState(false)
  const src = faviconDe(url)
  if (!src || fallo) {
    return (
      <span className="text-sm leading-none text-white/60">
        <Icono nombre="vincular" />
      </span>
    )
  }
  return (
    <img src={src} alt="" aria-hidden draggable={false} className="h-4 w-4 shrink-0 rounded" onError={() => setFallo(true)} />
  )
}
