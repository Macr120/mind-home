import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'
import {
  alternarFondoEscritorio,
  hayFondoEscritorio,
  moverFondoEscritorio,
  pantallasEscritorio,
  vistaFondoEscritorio,
  type PantallaEscritorio,
} from '../../plataforma'
import {
  alternarExtraFondo,
  EXTRAS_FONDO,
  leerExtrasFondo,
  moverExtraFondo,
  type ExtrasFondo,
  type PanelFondo,
  type SitioFondo,
} from '../../fondoExtras'

/**
 * La casa como fondo de pantalla. Vive en su propia sección de Configuraciones
 * —y no dentro de «Interfaz e idioma»— porque no es un ajuste de la interfaz:
 * enciende una VENTANA APARTE, con su monitor, sus paneles y su encuadre.
 *
 * Solo existe en el escritorio: en el navegador y en el teléfono
 * `hayFondoEscritorio()` es falso y `EditPanel` ni siquiera pinta el grupo.
 */
export function EditorFondoEscritorioSection() {
  return <FondoDeEscritorio />
}

/**
 * La casa como fondo de pantalla, solo en el escritorio (Windows y macOS): en el
 * navegador y en el teléfono `hayFondoEscritorio()` es falso y esto no existe.
 *
 * El fondo es una VENTANA APARTE que abre el shell, no una vista de esta: pinta
 * solo el mapa —sin HUD ni controles, lo decide `esModoFondo()` en App.tsx— y
 * nace con la casa tal y como está en el momento de encenderla.
 */
/** Dónde se recuerda el monitor elegido para el fondo. */
const CLAVE_PANTALLA = 'mph.fondoPantalla'

/**
 * Los ocho sitios, puestos en la rejilla de tres por tres de la vista previa.
 * El centro se queda vacío a propósito: ahí está la casa.
 */
const SITIOS: SitioFondo[] = ['arribaIzq', 'arriba', 'arribaDer', 'izq', 'der', 'abajoIzq', 'abajo', 'abajoDer']

const REJILLA: (SitioFondo | null)[][] = [
  ['arribaIzq', 'arriba', 'arribaDer'],
  ['izq', null, 'der'],
  ['abajoIzq', 'abajo', 'abajoDer'],
]

/** Dónde se pega la pastilla de cada sitio dentro de la vista previa. */
const MINI: Record<SitioFondo, string> = {
  arribaIzq: 'left-1 top-1 items-start',
  arriba: 'left-1/2 top-1 -translate-x-1/2 items-center',
  arribaDer: 'right-1 top-1 items-end',
  izq: 'left-1 top-1/2 -translate-y-1/2 items-start',
  der: 'right-1 top-1/2 -translate-y-1/2 items-end',
  abajoIzq: 'bottom-1 left-1 items-start',
  abajo: 'bottom-1 left-1/2 -translate-x-1/2 items-center',
  abajoDer: 'bottom-1 right-1 items-end',
}

/** El tercio que se resalta mientras se arrastra un panel hacia él. */
const ZONA: Record<SitioFondo, string> = {
  arribaIzq: 'left-0 top-0 h-1/3 w-1/3',
  arriba: 'left-1/3 top-0 h-1/3 w-1/3',
  arribaDer: 'right-0 top-0 h-1/3 w-1/3',
  izq: 'left-0 top-1/3 h-1/3 w-1/3',
  der: 'right-0 top-1/3 h-1/3 w-1/3',
  abajoIzq: 'bottom-0 left-0 h-1/3 w-1/3',
  abajo: 'bottom-0 left-1/3 h-1/3 w-1/3',
  abajoDer: 'bottom-0 right-0 h-1/3 w-1/3',
}

function FondoDeEscritorio() {
  const t = useT()
  const [puesto, setPuesto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [vista, setVista] = useState<string | null>(null)
  const [extras, setExtras] = useState<ExtrasFondo>(() => leerExtrasFondo())
  const caja = useRef<HTMLDivElement>(null)
  const inicio = useRef<{ x: number; y: number } | null>(null)
  const [llevando, setLlevando] = useState<PanelFondo | null>(null)
  const [destino, setDestino] = useState<SitioFondo | null>(null)
  const [pantallas, setPantallas] = useState<PantallaEscritorio[]>([])
  // En qué monitor va. Se guarda aquí, junto al resto de ajustes del fondo; el
  // shell lo recuerda además por su cuenta, para cuando arranca en modo fondo
  // sin que nadie se lo diga.
  const [pantalla, setPantalla] = useState<string>(() => {
    try {
      return localStorage.getItem(CLAVE_PANTALLA) ?? 'todas'
    } catch {
      return 'todas'
    }
  })

  useEffect(() => {
    void pantallasEscritorio().then(setPantallas)
  }, [])

  const nombre = (cual: PanelFondo) =>
    ({
      hora: t('fondo.p.hora', 'Hora'),
      clima: t('fondo.p.clima', 'Clima'),
      musica: t('fondo.p.musica', 'Música'),
      recursos: t('fondo.p.recursos', 'Sistema'),
    })[cual]

  /** En qué tercio de la vista previa está el puntero; null si es el centro. */
  const zonaDe = (e: React.PointerEvent): SitioFondo | null => {
    const r = caja.current?.getBoundingClientRect()
    if (!r) return null
    const col = Math.min(2, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 3)))
    const fil = Math.min(2, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * 3)))
    return REJILLA[fil][col]
  }

  if (!hayFondoEscritorio()) return null

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const refrescar = async () => setVista(await vistaFondoEscritorio())

  const alternar = async () => {
    if (ocupado) return
    setOcupado(true)
    try {
      const ahora = await alternarFondoEscritorio(pantalla)
      setPuesto(ahora)
      if (!ahora) {
        setVista(null)
        return
      }
      // La casa 3D tarda en montar: capturar antes daría una foto en negro.
      // Dos tomas porque la primera suele pillarla a medio dibujar; la segunda
      // ya es lo que se queda detrás de las ventanas.
      await esperar(2500)
      await refrescar()
      await esperar(3500)
      await refrescar()
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Cambiar de monitor obliga a rehacer la ventana: nace con el tamaño de su
   * pantalla y el helper la cuelga ahí. Así que si el fondo está puesto, se
   * apaga y se vuelve a encender en la nueva.
   */
  const elegirPantalla = async (id: string) => {
    if (ocupado || id === pantalla) return
    setPantalla(id)
    try {
      localStorage.setItem(CLAVE_PANTALLA, id)
    } catch {
      /* sin almacenamiento vale la elección de esta sesión */
    }
    if (!puesto) return
    setOcupado(true)
    try {
      await alternarFondoEscritorio()
      await esperar(400)
      await alternarFondoEscritorio(id)
      await esperar(2500)
      await refrescar()
      await esperar(3500)
      await refrescar()
    } finally {
      setOcupado(false)
    }
  }

  /** Un toque de flecha: la octava parte de la pantalla. */
  const PASO = 0.125

  /** Manda el movimiento al fondo y vuelve a fotografiarlo. */
  const mover = async (d: { fx?: number; fy?: number; zoom?: number }) => {
    if (ocupado) return
    setOcupado(true)
    try {
      await moverFondoEscritorio(d)
      await esperar(500)
      await refrescar()
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Arrastrar la vista previa mueve el encuadre del fondo. El arrastre viaja en
   * FRACCIÓN de la caja (−1..1) y no en píxeles: así el paso no depende de lo
   * grande que sea la vista previa ni de la resolución de la pantalla.
   */
  const alSoltar = async (e: React.PointerEvent<HTMLDivElement>) => {
    const desde = inicio.current
    inicio.current = null
    const r = caja.current?.getBoundingClientRect()
    if (!desde || !r || ocupado) return
    const fx = (e.clientX - desde.x) / Math.max(1, r.width)
    const fy = (e.clientY - desde.y) / Math.max(1, r.height)
    if (Math.abs(fx) < 0.01 && Math.abs(fy) < 0.01) return
    setOcupado(true)
    try {
      await moverFondoEscritorio({ fx, fy })
      await esperar(500)
      await refrescar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    // Sin rótulo propio: el título de la sección de Configuraciones ya lo dice.
    <div className="space-y-1.5">

      {puesto && (
        <>
          <div
            ref={caja}
            onPointerDown={(e) => {
              inicio.current = { x: e.clientX, y: e.clientY }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerUp={(e) => void alSoltar(e)}
            className={`relative aspect-video w-full cursor-grab overflow-hidden rounded-md border border-white/10 bg-black/40 active:cursor-grabbing ${
              ocupado ? 'opacity-60' : ''
            }`}
          >
            {vista ? (
              <img src={vista} alt="" draggable={false} className="h-full w-full select-none object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-white/40">…</div>
            )}

            {/* La zona donde caería lo que se arrastra, debajo de las pastillas
                para no taparlas. */}
            {llevando && destino && (
              <div className={`pointer-events-none absolute border border-accent/70 bg-accent/20 ${ZONA[destino]}`} />
            )}

            {/* Los paneles encendidos, cada uno en su sitio y arrastrable a
                cualquiera de los otros siete. Es la MISMA rejilla que usa el
                fondo, así que lo que se ve aquí es dónde van a salir. */}
            {SITIOS.map((sitio) => {
              const aqui = EXTRAS_FONDO.filter((cual) => extras[cual] && extras.sitios[cual] === sitio)
              if (aqui.length === 0) return null
              return (
                <div key={sitio} className={`absolute flex flex-col gap-0.5 ${MINI[sitio]}`}>
                  {aqui.map((cual) => (
                    <button
                      key={cual}
                      type="button"
                      title={t('ajustes.fondoPanelArrastra', 'Arrastra cada panel a la esquina o al lado donde lo quieras.')}
                      // El stopPropagation es lo que separa los dos arrastres:
                      // sin él la caja captura el puntero y mover una pastilla
                      // movería además el encuadre de la casa.
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setLlevando(cual)
                        setDestino(sitio)
                      }}
                      onPointerMove={(e) => {
                        if (llevando !== cual) return
                        setDestino(zonaDe(e))
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation()
                        const cae = zonaDe(e)
                        setLlevando(null)
                        setDestino(null)
                        if (!cae || cae === sitio) return
                        setExtras(moverExtraFondo(cual, cae))
                        if (puesto) void esperar(900).then(refrescar)
                      }}
                      className={`cursor-grab rounded border px-1.5 py-0.5 text-[10px] leading-tight backdrop-blur-sm transition active:cursor-grabbing ${
                        llevando === cual
                          ? 'border-accent bg-accent/30 text-white'
                          : 'border-white/25 bg-black/45 text-white/85 hover:border-white/50'
                      }`}
                    >
                      {nombre(cual)}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* El encuadre, FUERA de la foto: dentro tapaba justo la casa, y ahora
              además se pelearía con las pastillas de los paneles. */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <BotonFondo etiqueta={t('nav3d.alejar', 'Alejar')} icono="quitar" alPulsar={() => mover({ zoom: 0.85 })} />
              <BotonFondo etiqueta={t('nav3d.acercar', 'Acercar')} icono="agregar" alPulsar={() => mover({ zoom: 1.18 })} />
            </div>
            {/* La flecha mueve la CASA hacia ese lado, igual que arrastrar la
                vista previa: es lo que uno espera mirando la foto. */}
            <div className="flex gap-1">
              <BotonFondo etiqueta={t('ajustes.fondoIzquierda', 'Mover a la izquierda')} icono="izquierda" alPulsar={() => mover({ fx: -PASO })} />
              <BotonFondo etiqueta={t('ajustes.fondoArriba', 'Mover arriba')} icono="subir" alPulsar={() => mover({ fy: -PASO })} />
              <BotonFondo etiqueta={t('ajustes.fondoAbajo', 'Mover abajo')} icono="bajar" alPulsar={() => mover({ fy: PASO })} />
              <BotonFondo etiqueta={t('ajustes.fondoDerecha', 'Mover a la derecha')} icono="derecha" alPulsar={() => mover({ fx: PASO })} />
            </div>
          </div>
        </>
      )}

      {pantallas.length > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('ajustes.fondoDonde', 'En qué pantalla')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[{ id: 'todas', etiqueta: t('ajustes.fondoTodasPantallas', 'Todas') }].concat(
              pantallas.map((p, i) => ({
                id: p.id,
                etiqueta: p.nombre || `${t('ajustes.fondoPantalla', 'Pantalla')} ${i + 1}`,
              })),
            ).map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                onClick={() => void elegirPantalla(id)}
                disabled={ocupado}
                className={`rounded-md border px-2.5 py-1.5 text-sm transition disabled:opacity-50 ${
                  pantalla === id
                    ? 'border-accent bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void alternar()}
        disabled={ocupado}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition disabled:opacity-50 ${
          puesto
            ? 'border-accent bg-white/10 text-white'
            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
        }`}
      >
        <span>
          {puesto
            ? t('ajustes.fondoQuitar', 'Quitar la casa del escritorio')
            : t('ajustes.fondoPoner', 'Poner la casa de fondo')}
        </span>
        <Icono nombre="paleta" className="h-4 w-4 opacity-70" />
      </button>

      {/* Los paneles opcionales. Escribir en `fondoExtras` avisa solo a la
          ventana del fondo (evento `storage` del origen compartido); aquí solo
          queda refrescar la foto para que la vista previa lo enseñe. */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.fondoPaneles', 'Paneles sobre el fondo')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {EXTRAS_FONDO.map((cual) => {
            const activo = extras[cual]
            return (
              <button
                key={cual}
                type="button"
                onClick={() => {
                  setExtras(alternarExtraFondo(cual))
                  if (puesto) void esperar(900).then(refrescar)
                }}
                className={`rounded-md border px-2.5 py-1.5 text-sm transition ${
                  activo
                    ? 'border-accent bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {nombre(cual)}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] leading-snug text-white/45">
        {puesto
          ? `${t('ajustes.fondoArrastra', 'Arrastra la vista previa para centrar la casa.')} ${t(
              'ajustes.fondoPanelArrastra',
              'Arrastra cada panel a la esquina o al lado donde lo quieras.',
            )}`
          : t(
              'ajustes.fondoNota',
              'Detrás de tus ventanas se ve solo el mapa, sin controles. Se abre con tu casa tal y como está ahora.',
            )}
      </p>
    </div>
  )
}

/** Un botón cuadrado de los que van SOBRE la vista previa del fondo. */
function BotonFondo({
  etiqueta,
  icono,
  alPulsar,
}: {
  etiqueta: string
  icono: NombreIcono
  alPulsar: () => void
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      // El contenedor captura el puntero para el arrastre: sin esto, pulsar un
      // botón contaría además como un arrastre de cero píxeles.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={alPulsar}
      className="flex h-6 w-6 items-center justify-center rounded border border-white/15 bg-black/45 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
    >
      <Icono nombre={icono} className="h-3.5 w-3.5" />
    </button>
  )
}
