import { useEffect, useState } from 'react'
import { hostDe, sitioDe } from '../navegador/dominio'
import { useAjustesNav } from '../navegador/ajustes'
import { useNavegador, type Pestana } from '../state/navegadorStore'
import { FaviconSitio } from './navegador/FaviconSitio'
import { confirmar, useConfirmar } from '../state/confirmarStore'
import { useEnlaceObjeto } from '../state/enlaceObjetoStore'
import { useFoco } from '../state/focoStore'
import { escribiendoEnCampo } from '../house/movement'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/**
 * La tira del navegador embebido, al PIE de la pantalla (debajo del chat):
 * atrás / adelante / recargar, las pestañas, «+» y el menú ⋮. La página la
 * pinta el shell en una vista NATIVA que tapa el DOM desde arriba hasta el
 * borde superior del chat; aquí solo viven los controles. No hay barra de
 * dirección: la URL o la búsqueda se escriben en el chat (modo web).
 *
 * Montada siempre en App.tsx (escritorio): los oyentes del shell tienen que
 * estar aunque el navegador esté cerrado.
 */
export function TiraNavegador() {
  const abierto = useNavegador((s) => s.abierto)

  // Lo que cuenta el shell entra por eventos del DOM que reemite la precarga —
  // mismo contrato que el deep link.
  useEffect(() => {
    const st = () => useNavegador.getState()
    const oyentes: [string, (d: never) => void][] = [
      ['mph:nav-pestana', (d) => st().alPestana(d)],
      ['mph:nav-activa', (d) => st().alActiva(d)],
      ['mph:nav-navego', (d) => st().alNavegar(d)],
      ['mph:nav-titulo', (d) => st().alTitulo(d)],
      ['mph:nav-favicon', (d) => st().alFavicon(d)],
      ['mph:nav-audible', (d) => st().alAudible(d)],
      ['mph:nav-dormida', (d) => st().alDormida(d)],
      ['mph:nav-actividad', (d) => st().alActividad(d)],
      ['mph:nav-cerrado', (d) => st().alCerrado(d)],
      ['mph:nav-bloqueado', (d) => st().alBloqueado(d)],
      ['mph:nav-atajo', (d: { accion: string }) => st().atajo(d.accion)],
    ]
    const manejadores = oyentes.map(([canal, fn]) => {
      const h = (e: Event) => fn((e as CustomEvent).detail as never)
      window.addEventListener(canal, h)
      return [canal, h] as const
    })
    return () => {
      for (const [canal, h] of manejadores) window.removeEventListener(canal, h)
    }
  }, [])

  // La vista nativa no sigue a la ventana sola: renovar los bounds al redimensionar.
  useEffect(() => {
    if (!abierto) return
    const al = () => useNavegador.getState().reencuadrar()
    window.addEventListener('resize', al)
    return () => window.removeEventListener('resize', al)
  }, [abierto])

  // Atajos con el foco en la APP (dentro de la página los ve el shell y los reenvía).
  useEffect(() => {
    if (!abierto) return
    const alTecla = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      let accion: string | null = null
      if (ctrl && !e.shiftKey && k === 't') accion = 'nueva'
      else if (ctrl && k === 'w') accion = 'cerrar'
      else if (ctrl && e.key === 'Tab') accion = e.shiftKey ? 'anterior' : 'siguiente'
      else if (ctrl && k === 'l') accion = 'direccion'
      else if (ctrl && /^[1-8]$/.test(e.key)) accion = `ir:${e.key}`
      else if (e.altKey && e.key === 'ArrowLeft' && !escribiendoEnCampo()) accion = 'atras'
      else if (e.altKey && e.key === 'ArrowRight' && !escribiendoEnCampo()) accion = 'adelante'
      else if (e.key === 'F5') accion = 'recargar'
      if (!accion) return
      e.preventDefault()
      useNavegador.getState().atajo(accion)
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierto])

  // Diálogos de la app que tienen que verse POR ENCIMA de la página: mientras
  // estén, la vista nativa se esconde (si no, quedan debajo).
  const confirmando = useConfirmar((s) => !!s.pendiente)
  const enlaceAbierto = useEnlaceObjeto((s) => s.objetoId != null)
  useEffect(() => {
    useNavegador.getState().setOculto('dialogo', confirmando || enlaceAbierto)
  }, [confirmando, enlaceAbierto])

  if (!abierto) return null
  return <Tira />
}

function Tira() {
  const t = useT()
  const pestanas = useNavegador((s) => s.pestanas)
  const activaId = useNavegador((s) => s.activaId)
  const activa = pestanas.find((p) => p.id === activaId)
  const sinRegistro = useAjustesNav((s) => s.sinRegistro)
  const [menu, setMenu] = useState(false)

  // El menú se despliega hacia arriba, sobre la página: mientras esté, la página se esconde.
  useEffect(() => {
    if (!menu) return
    useNavegador.getState().setOculto('menu', true)
    const cerrar = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-nav-menu]')) setMenu(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', tecla)
      // También al desmontarse la tira con el menú abierto (cerrar desde el propio menú).
      useNavegador.getState().setOculto('menu', false)
    }
  }, [menu])

  const abrirEnSistema = () => {
    // El shell deniega la ventana y la manda al navegador del sistema.
    if (activa) window.open(activa.url, '_blank', 'noopener')
    setMenu(false)
  }

  return (
    <div
      data-tut="nav.tira"
      className="ui-panel absolute inset-x-0 bottom-0 z-[60] flex h-12 items-center gap-1 border-t border-white/10 px-2 shadow-lg"
    >
      <BotonTira
        icono="volver"
        titulo={t('enlace.atras', 'Atrás')}
        deshabilitado={!activa?.atras}
        onClick={() => void window.mph?.navegador?.atras()}
      />
      <BotonTira
        icono="siguiente"
        titulo={t('enlace.adelante', 'Adelante')}
        deshabilitado={!activa?.adelante}
        onClick={() => void window.mph?.navegador?.adelante()}
      />
      <BotonTira
        icono="rotar-der"
        titulo={t('enlace.recargar', 'Recargar')}
        onClick={() => void window.mph?.navegador?.recargar()}
      />

      {sinRegistro && (
        <span
          className="shrink-0 px-1 text-sm leading-none text-amber-300"
          title={t('nav.tira.sinRegistro', 'Sin registro: no se apuntan páginas ni visitas')}
          aria-label={t('nav.tira.sinRegistro', 'Sin registro: no se apuntan páginas ni visitas')}
        >
          <Icono nombre="escudo" />
        </span>
      )}

      {/* Las pestañas: desplazables si no caben; la activa resaltada. */}
      <div role="tablist" className="sin-deslizador mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {pestanas.map((p) => (
          <PestanaItem key={p.id} pestana={p} activa={p.id === activaId} />
        ))}
      </div>

      <ChipFoco />

      <BotonTira
        icono="agregar"
        titulo={t('nav.nuevaPestana', 'Nueva pestaña (Ctrl+T): escribe la dirección o la búsqueda en el chat')}
        onClick={() => useNavegador.getState().nuevaPestana()}
      />

      <div className="relative" data-nav-menu>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          title={t('nav.masOpciones', 'Más opciones')}
          aria-label={t('nav.masOpciones', 'Más opciones')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg leading-none text-white/80 transition hover:bg-white/12 hover:text-white active:scale-95 ${
            menu ? 'bg-white/12' : ''
          }`}
        >
          ⋮
        </button>
        {menu && (
          <div className="ui-panel-glass absolute bottom-full end-0 mb-2 w-60 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md">
            <OpcionMenu
              icono="lista"
              texto={t('nav.panel.historial', 'Historial')}
              onClick={() => {
                setMenu(false)
                useNavegador.getState().pedirPanel('historial')
              }}
            />
            <OpcionMenu icono="compartir" texto={t('enlace.abrirSistema', 'Abrir en tu navegador')} onClick={abrirEnSistema} />
            <OpcionMenu
              icono="escudo"
              texto={sinRegistro ? t('nav.tira.conRegistro', 'Volver a registrar') : t('nav.tira.activarSinRegistro', 'Sin registro')}
              onClick={() => {
                setMenu(false)
                useAjustesNav.getState().setSinRegistro(!sinRegistro)
              }}
            />
            <OpcionMenu
              icono="cerrar"
              texto={t('nav.cerrarTodo', 'Cerrar el navegador')}
              onClick={() => {
                setMenu(false)
                void useNavegador.getState().cerrar()
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** El reloj, fuera del componente: el lint de pureza de React no deja llamarlo en render. */
const ahoraMs = () => Date.now()

/** Cuenta atrás del modo foco; tocarla lo termina antes (con confirmación). */
function ChipFoco() {
  const t = useT()
  const hasta = useFoco((s) => s.hasta)
  const [ahora, setAhora] = useState(ahoraMs)
  useEffect(() => {
    if (!hasta) return
    const id = setInterval(() => setAhora(ahoraMs()), 1000)
    return () => clearInterval(id)
  }, [hasta])
  if (!hasta) return null
  const restante = Math.max(0, hasta - ahora)
  const mm = Math.floor(restante / 60_000)
  const ss = Math.floor((restante % 60_000) / 1000)
  const terminar = async () => {
    const ok = await confirmar({
      titulo: t('nav.foco.titulo', 'Modo foco'),
      mensaje: t('nav.foco.terminarPregunta', '¿Terminar el modo foco antes de tiempo?'),
      textoOk: t('nav.foco.terminar', 'Terminar'),
    })
    if (ok) useFoco.getState().terminar('manual')
  }
  return (
    <button
      type="button"
      onClick={() => void terminar()}
      className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-amber-400/15 px-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
      title={t('nav.foco.restante', 'Modo foco: {m} min restantes', { m: mm + (ss > 0 ? 1 : 0) })}
    >
      <Icono nombre="objetivo" />
      <span className="tabular-nums">
        {mm}:{String(ss).padStart(2, '0')}
      </span>
    </button>
  )
}

function PestanaItem({ pestana, activa }: { pestana: Pestana; activa: boolean }) {
  const t = useT()
  const nombre = pestana.titulo || hostDe(pestana.url)
  const excedido = useNavegador((s) => s.excedidos.includes(`sitio:${sitioDe(pestana.url)}`))
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      title={`${nombre} · ${hostDe(pestana.url)}`}
      onClick={() => useNavegador.getState().activar(pestana.id)}
      // Clic con la rueda cierra, como en cualquier navegador.
      onAuxClick={(e) => {
        if (e.button === 1) useNavegador.getState().cerrarPestana(pestana.id)
      }}
      className={`group flex h-9 min-w-0 max-w-52 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs transition ${
        activa ? 'bg-white/15 text-white/90' : 'text-white/60 hover:bg-white/10 hover:text-white/85'
      } ${pestana.dormida ? 'opacity-60' : ''}`}
    >
      <FaviconSitio url={pestana.url} />
      <span className="truncate">{nombre}</span>
      {excedido && (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-red-400"
          title={t('nav.limite.excedido', 'Pasaste tu límite diario en este sitio')}
          aria-label={t('nav.limite.excedido', 'Pasaste tu límite diario en este sitio')}
        />
      )}
      {pestana.audible && (
        <span className="shrink-0 text-[10px] leading-none" title={t('nav.sonando', 'Sonando')} aria-label={t('nav.sonando', 'Sonando')}>
          <Icono nombre="bocina" />
        </span>
      )}
      <span
        role="button"
        tabIndex={-1}
        title={t('nav.cerrarPestana', 'Cerrar pestaña (Ctrl+W)')}
        aria-label={t('nav.cerrarPestana', 'Cerrar pestaña (Ctrl+W)')}
        onClick={(e) => {
          e.stopPropagation()
          useNavegador.getState().cerrarPestana(pestana.id)
        }}
        className="ms-0.5 shrink-0 rounded-md px-1 text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-white/15 hover:text-white/90 aria-selected:opacity-100"
      >
        ✕
      </span>
    </button>
  )
}

function BotonTira({
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

function OpcionMenu({ icono, texto, onClick }: { icono: NombreIcono; texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm text-white/85 transition hover:bg-white/10"
    >
      <span className="w-5 text-center text-base leading-none">
        <Icono nombre={icono} />
      </span>
      <span className="min-w-0 flex-1 truncate">{texto}</span>
    </button>
  )
}
