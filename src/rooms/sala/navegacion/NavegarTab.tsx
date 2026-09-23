import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ItinerarioNav, LugarViaje, PiernaNav, PuntoNav, TrayectoViaje } from '../../../core/data/db'
import { VACIO, categoriasLugarRepo, lugaresNavRepo, trayectosViajeRepo } from '../../../core/data/repository'
import { localeActual, useT, type TFunc } from '../../../core/i18n/useT'
import { useAjustes } from '../../../core/state/ajustesStore'
import { useMascota } from '../../../core/state/mascotaStore'
import { confirmar, pedirTexto } from '../../../core/state/confirmarStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { BotonCompartir } from '../BotonCompartir'
import { BuscadorLugar } from './BuscadorLugar'
import { cacheVencida, claveConfigurada } from './config'
import { formatoDistancia, formatoDuracion, formatoHora, resumenPierna } from './formato'
import { obtenerPosicion, permisoGps } from './geo'
import { geocodificar, nombreDeCoords, planificar } from './here'
import { LugaresNav, pinDeLugar } from './LugaresNav'
import MapaCalles, { type PinLugar } from './MapaCalles'
import { COLOR_MODO, ICONO_MODO, MODOS_NAV, esCalle, familiaModo, iconoDireccion, type ModoNav } from './modos'
import { useOrdenRuta } from './ordenRuta'
import { usePrefsNavegacion } from './preferencias'
import { textoTrayecto } from './textoTrayecto'
import { useNavegacionViva, type Progreso } from './useNavegacionViva'

interface Props {
  lugares: LugarViaje[]
}

type Cuando = 'ahora' | 'salir' | 'llegar'

/** Lo mínimo que necesita cada columna (px) para que valga la pena partir la vista. */
const MIN_CONTROLES = 300
const MIN_MAPA = 240

/** Ahora, redondeado a los 5 minutos siguientes, en el formato de `datetime-local`. */
function horaInicial(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function hablar(texto: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = localeActual()
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

/** Tinta legible sobre el color de una línea (los amarillos piden negro). */
function tintaSobre(color: string): string {
  const hex = color.replace('#', '')
  if (hex.length < 6) return '#fff'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6 ? '#000' : '#fff'
}

const colorDe = (p: PiernaNav) => p.color ?? COLOR_MODO[familiaModo(p.modo)]

interface Instruccion {
  /** Cambia cuando cambia la maniobra: dispara la voz una sola vez. */
  clave: string
  icono: NombreIcono
  titulo: string
  detalle?: string
}

function instruccionDe(t: TFunc, it: ItinerarioNav, prog: Progreso, locale: string): Instruccion {
  if (prog.llegaste) {
    return { clave: 'fin', icono: 'confirmar', titulo: t('sala.nav.llegaste', 'Llegaste a tu destino') }
  }
  const pierna = it.piernas[prog.tramo]
  const siguiente = it.piernas[prog.tramo + 1]
  const despues = siguiente
    ? t('sala.nav.despues', 'Después: {texto}', { texto: resumenPierna(t, siguiente, locale) })
    : undefined
  const en = t('sala.nav.enM', 'En {d}', { d: formatoDistancia(prog.distanciaAlPaso, locale) })
  if (esCalle(pierna.modo)) {
    if (prog.paso != null && pierna.pasos) {
      const paso = pierna.pasos[prog.paso]
      return { clave: `${prog.tramo}/${prog.paso}`, icono: iconoDireccion(paso), titulo: `${en}: ${paso.texto}`, detalle: despues }
    }
    return {
      clave: `${prog.tramo}/fin`,
      icono: ICONO_MODO[familiaModo(pierna.modo)],
      titulo: `${en}: ${t('sala.nav.llegasA', 'Llegas a {lugar}', { lugar: pierna.a.nombre })}`,
      detalle: despues,
    }
  }
  const linea = pierna.linea ? `${pierna.linea}${pierna.destinoLinea ? ` → ${pierna.destinoLinea}` : ''}` : ''
  return {
    clave: `${prog.tramo}/t`,
    icono: ICONO_MODO[familiaModo(pierna.modo)],
    titulo: t('sala.nav.bajaEn', 'Baja en {lugar}', { lugar: pierna.a.nombre }),
    detalle: [linea, despues].filter(Boolean).join(' · ') || undefined,
  }
}

function BotonCampo({
  icono,
  titulo,
  activo,
  onClick,
}: {
  icono: NombreIcono
  titulo: string
  activo?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      className={`rounded-md p-1.5 text-sm transition ${activo ? 'text-accent bg-white/10' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
    >
      <Icono nombre={icono} />
    </button>
  )
}

/** Cadena de modos de un itinerario: [a pie 5 min] › [Metro 1] › [a pie 3 min]. */
function CadenaModos({ it, t }: { it: ItinerarioNav; t: TFunc }) {
  // Las caminatas de menos de dos minutos entre tramos no aportan nada a la vista rápida.
  const piezas = it.piernas.filter(
    (p) => it.piernas.length === 1 || familiaModo(p.modo) !== 'WALK' || p.duracion >= 120,
  )
  return (
    <div className="flex flex-wrap items-center gap-1">
      {piezas.map((p, i) => {
        const calle = esCalle(p.modo)
        const color = colorDe(p)
        return (
          <Fragment key={i}>
            {i > 0 && <span className="text-white/30">›</span>}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${calle ? 'bg-white/10' : ''}`}
              style={calle ? undefined : { background: color, color: tintaSobre(color) }}
            >
              <Icono nombre={ICONO_MODO[familiaModo(p.modo)]} />
              {calle ? formatoDuracion(t, p.duracion) : p.linea}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

/** Submenú «Cómo llegar»: planificador multimodal, mapa de calles y navegación en vivo. */
export default function NavegarTab({ lugares }: Props) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const locale = localeActual()
  const guardados = trayectosViajeRepo.useAll() ?? VACIO

  const [origen, setOrigen] = useState<PuntoNav | null>(null)
  const [destino, setDestino] = useState<PuntoNav | null>(null)
  // Arranca con las preferencias del ⚙ de «Tus lugares» (modos y voz).
  const [modos, setModos] = useState<ModoNav[]>(() => usePrefsNavegacion.getState().modos)
  // «Óptimo»: en vez de un modo, los compara todos y mezcla los itinerarios.
  // Viene marcado de fábrica (se cambia en el ⚙ de «Tus lugares»).
  const [optimo, setOptimo] = useState(() => usePrefsNavegacion.getState().optimo)
  const [cuando, setCuando] = useState<Cuando>('ahora')
  const [hora, setHora] = useState(horaInicial)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ItinerarioNav[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [eligiendo, setEligiendo] = useState<'origen' | 'destino' | null>(null)
  const [voz, setVoz] = useState(() => usePrefsNavegacion.getState().voz)
  const zona = usePrefsNavegacion((p) => p.zona)
  const setZona = usePrefsNavegacion((p) => p.setZona)
  const [guardadoOk, setGuardadoOk] = useState(false)
  // Cuánto tarda cada modo cuando se busca con uno solo: null = sin ruta.
  const [tiempos, setTiempos] = useState<Partial<Record<ModoNav, number | null>>>({})
  const [comparando, setComparando] = useState(false)
  const [cargandoTransporte, setCargandoTransporte] = useState(false)
  const ultimaVoz = useRef('')
  /** Descarta las comparaciones en vuelo cuando cambia la búsqueda. */
  const compara = useRef(0)

  const itSel = sel != null ? (resultados[sel] ?? null) : null
  const nav = useNavegacionViva(itSel)
  const navegando = nav.estado !== 'apagado'
  // Sesgo de las sugerencias. Sin él, HERE cae en la geocodificación plana, que
  // solo entiende direcciones: buscar «Zócalo» devolvía una calle de Tláhuac. Si
  // no hay GPS ni puntos elegidos, vale el último trayecto guardado o el primer
  // lugar de la sala con coordenadas: basta para que gane la ciudad del usuario.
  const lugarConCoords = lugares.find((l) => l.lat != null && l.lng != null)
  const cerca =
    nav.posicion ??
    origen ??
    destino ??
    zona ??
    guardados[0]?.origen ??
    (lugarConCoords?.lat != null && lugarConCoords.lng != null
      ? { lat: lugarConCoords.lat, lng: lugarConCoords.lng }
      : null)
  const conClave = claveConfigurada()

  // Reparto de la pantalla. Hace falta el ancho REAL del panel —en el menú del
  // chat es mucho más angosto que la ventana—, así que se mide en vez de
  // preguntarle a una media query.
  const caja = useRef<HTMLDivElement>(null)
  const [anchoCaja, setAnchoCaja] = useState(0)
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(() => setAnchoCaja(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const anchoMapa = usePrefsNavegacion((p) => p.anchoMapa)
  const setAnchoMapa = usePrefsNavegacion((p) => p.setAnchoMapa)
  const altoMapa = usePrefsNavegacion((p) => p.altoMapa)
  const setAltoMapa = usePrefsNavegacion((p) => p.setAltoMapa)
  const [arrastrando, setArrastrando] = useState(false)
  // Sin clave no hay mapa que poner al lado, así que tampoco hay dos columnas.
  const cabenDos = conClave && anchoCaja >= MIN_CONTROLES + MIN_MAPA
  // El reparto lo decide lo que le queda a CADA columna, no un ancho de pantalla
  // fijo: estirando el mapa hasta dejar los controles sin sitio, la vista vuelve
  // a una sola columna (y en un teléfono nunca se parte).
  const dosColumnas =
    cabenDos && (anchoCaja * (100 - anchoMapa)) / 100 >= MIN_CONTROLES && (anchoCaja * anchoMapa) / 100 >= MIN_MAPA
  const anchoControles = dosColumnas ? { width: `${100 - anchoMapa}%` } : undefined
  const tituloTirador = dosColumnas
    ? t('sala.nav.anchoMapa', 'Arrastra para cambiar el ancho del mapa')
    : cabenDos
      ? t('sala.nav.mapaAlLado', 'Arrastra hacia arriba para poner el mapa al lado')
      : t('sala.nav.altoMapa', 'Arrastra para cambiar el alto del mapa')
  /** Dónde empezó el arrastre, con qué alto, y el ancho de la última vez que hubo dos columnas. */
  const inicioTirador = useRef(0)
  const inicioAlto = useRef(0)
  const anchoPrevio = useRef(50)
  useEffect(() => {
    if (dosColumnas) anchoPrevio.current = anchoMapa
  }, [dosColumnas, anchoMapa])
  /**
   * Tirador del mapa. Con el mapa al lado es vertical y reparte el ancho: el mapa
   * se lleva lo que hay del puntero al borde exterior del panel. Con el mapa
   * debajo es horizontal: bajarlo lo hace más alto y subirlo lo devuelve al
   * costado —o lo encoge, si el panel es demasiado angosto para dos columnas—.
   */
  const moverTirador = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = caja.current
    if (!arrastrando || !el) return
    if (dosColumnas) {
      const r = el.getBoundingClientRect()
      const rtl = getComputedStyle(el).direction === 'rtl'
      setAnchoMapa((((rtl ? e.clientX - r.left : r.right - e.clientX) / r.width) * 100))
      return
    }
    const dy = e.clientY - inicioTirador.current
    if (dy < -16 && cabenDos) {
      setAnchoMapa(anchoPrevio.current)
      setArrastrando(false)
      return
    }
    // Con sitio para dos columnas, subir es para eso: el alto solo crece.
    if (dy > 0 || !cabenDos) setAltoMapa(inicioAlto.current + dy)
  }

  // Los lugares guardados también se ven en el mapa, con el pin de su categoría.
  const misLugares = lugaresNavRepo.useAll() ?? VACIO
  const categorias = categoriasLugarRepo.useAll() ?? VACIO
  const pines = useMemo<PinLugar[]>(
    () => misLugares.map((l) => ({ nombre: l.nombre, lat: l.lat, lng: l.lng, ...pinDeLugar(l, categorias) })),
    [misLugares, categorias],
  )

  const instruccion = useMemo(
    () => (itSel && nav.progreso ? instruccionDe(t, itSel, nav.progreso, locale) : null),
    [itSel, nav.progreso, t, locale],
  )

  // Voz: una vez por maniobra.
  useEffect(() => {
    if (!voz || !navegando || !instruccion || instruccion.clave === ultimaVoz.current) return
    ultimaVoz.current = instruccion.clave
    hablar(instruccion.titulo)
  }, [voz, navegando, instruccion])

  // El itinerario guardado es una caché de 30 días (condiciones del plan Base de HERE):
  // al cumplirse el plazo se suelta, y el trayecto se recalcula la próxima vez que se abra.
  useEffect(() => {
    for (const tr of guardados) {
      if (tr.id != null && tr.itinerario && cacheVencida(tr.creadoEn)) {
        void trayectosViajeRepo.update(tr.id, { itinerario: undefined })
      }
    }
  }, [guardados])

  // Con el permiso ya concedido, la posición se lee sola al abrir: sesga el
  // buscador desde la primera letra y no le pide nada a quien no lo ha dado.
  useEffect(() => {
    let vivo = true
    void (async () => {
      if ((await permisoGps()) !== 'granted') return
      try {
        const pos = await obtenerPosicion()
        if (vivo) setZona({ lat: pos.lat, lng: pos.lng })
      } catch {
        // Sin lectura se sigue con la zona guardada: esto es solo una pista.
      }
    })()
    return () => {
      vivo = false
    }
  }, [setZona])

  const limpiarResultados = () => {
    compara.current++
    setTiempos({})
    setComparando(false)
    setCargandoTransporte(false)
    setResultados([])
    setSel(null)
    setError(null)
    setAbiertos(new Set())
    nav.detener()
  }

  const fijar = (cual: 'origen' | 'destino', p: PuntoNav | null) => {
    ;(cual === 'origen' ? setOrigen : setDestino)(p)
    if (p) setZona({ lat: p.lat, lng: p.lng })
    limpiarResultados()
  }

  /** Pone el GPS en un extremo; devuelve el punto, o null si no se pudo leer. */
  const miUbicacion = async (cual: 'origen' | 'destino'): Promise<PuntoNav | null> => {
    setError(null)
    try {
      const pos = await obtenerPosicion()
      const p = { nombre: t('sala.nav.miUbicacion', 'Mi ubicación'), lat: pos.lat, lng: pos.lng }
      fijar(cual, p)
      return p
    } catch (e) {
      // Con el permiso ya concedido, un «denegado» viene del sistema operativo
      // (o de un navegador que se quedó con la respuesta vieja), no de la web.
      const codigo = (e as { code?: number }).code
      const permiso = codigo === 1 ? await permisoGps() : null
      setError(
        codigo !== 1
          ? t('sala.nav.sinGps', 'Tu dispositivo no comparte la ubicación ahora mismo.')
          : permiso === 'granted'
            ? t(
                'sala.nav.gpsSistema',
                'El navegador tiene permiso, pero el sistema no comparte la ubicación: revísala en los ajustes de privacidad y reinicia el navegador.',
              )
            : t('sala.nav.gpsDenegado', 'No se pudo leer tu ubicación: revisa el permiso del navegador o del sistema.'),
      )
      return null
    }
  }

  const invertir = () => {
    const o = origen
    setOrigen(destino)
    setDestino(o)
    limpiarResultados()
  }

  const tocarMapa = async ({ lat, lng }: { lat: number; lng: number }) => {
    if (!eligiendo) return
    const cual = eligiendo
    setEligiendo(null)
    fijar(cual, { nombre: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })
    const nombre = await nombreDeCoords(lat, lng, idioma)
    ;(cual === 'origen' ? setOrigen : setDestino)((p) => (p && p.lat === lat && p.lng === lng ? { ...p, nombre } : p))
  }

  const alternarModo = (m: ModoNav) => {
    // Saliendo de «Óptimo» se elige ese modo a secas, que es lo que se espera
    // al tocar «Auto» viniendo de la comparación.
    if (optimo) {
      setOptimo(false)
      setModos([m])
      return
    }
    setModos((ms) => (ms.includes(m) ? (ms.length > 1 ? ms.filter((x) => x !== m) : ms) : [...ms, m]))
    // Si hay una comparación en pantalla, tocar «Transporte público» es lo que
    // dispara su cálculo (ver `tiempoTransporte`).
    const hayComparacion = Object.keys(tiempos).length > 0
    if (m === 'transporte' && hayComparacion && tiempos.transporte === undefined && origen && destino) {
      void tiempoTransporte(origen, destino)
    }
  }

  const buscar = async (sobre?: { origen?: PuntoNav; destino?: PuntoNav; modos?: ModoNav[]; optimo?: boolean }) => {
    const o = sobre?.origen ?? origen
    const d = sobre?.destino ?? destino
    const ms = sobre?.modos ?? modos
    // El «óptimo» puede venir impuesto (la ruta que pide el chat siempre lo es):
    // el estado tarda un render en cuajar, así que manda el valor de la llamada.
    const opt = sobre?.optimo ?? optimo
    if (!o || !d || buscando) return
    if (sobre?.origen) setOrigen(sobre.origen)
    if (sobre?.optimo != null) setOptimo(sobre.optimo)
    setBuscando(true)
    limpiarResultados()
    try {
      if (opt) {
        const ids = MODOS_NAV.map((x) => x.id)
        const listas = await Promise.all(
          ids.map((m) => planificar({ origen: o, destino: d, modos: [m], cuando, hora, locale }).catch(() => [])),
        )
        const duraciones: Partial<Record<ModoNav, number | null>> = {}
        const mezcla: ItinerarioNav[] = []
        ids.forEach((m, i) => {
          const lista = [...listas[i]].sort((a, b) => a.duracion - b.duracion)
          duraciones[m] = lista.length ? lista[0].duracion : null
          // Del transporte caben varias combinaciones; de los demás, la mejor.
          mezcla.push(...lista.slice(0, m === 'transporte' ? 3 : 1))
        })
        mezcla.sort((a, b) => a.duracion - b.duracion)
        setTiempos(duraciones)
        setResultados(mezcla)
        if (mezcla.length) setSel(0)
        else setError(t('sala.nav.sinRutas', 'No hay rutas con esos modos por aquí. Prueba a combinar otros, cambiar la hora o acercar los puntos.'))
        return mezcla
      }
      const r = await planificar({ origen: o, destino: d, modos: ms, cuando, hora, locale })
      setResultados(r)
      if (r.length === 0) {
        setError(t('sala.nav.sinRutas', 'No hay rutas con esos modos por aquí. Prueba a combinar otros, cambiar la hora o acercar los puntos.'))
      } else {
        setSel(0)
        if (ms.length === 1) void compararModos(o, d, ms[0], Math.min(...r.map((x) => x.duracion)))
      }
      return r
    } catch {
      setError(t('sala.nav.errorRed', 'No se pudieron calcular las rutas. Revisa tu conexión e inténtalo de nuevo.'))
    } finally {
      setBuscando(false)
    }
  }

  /**
   * Lo que tarda cada modo, como en los mapas de siempre: solo cuando se buscó
   * con UN modo, porque es ahí donde la pregunta «¿y en coche?» tiene sentido.
   * El modo elegido sale de los resultados; los otros tres, de una petición por
   * modo que corre en segundo plano y no retrasa lo que ya está en pantalla.
   */
  const compararModos = async (o: PuntoNav, d: PuntoNav, elegido: ModoNav, duracion: number) => {
    const id = ++compara.current
    setTiempos({ [elegido]: duracion })
    setComparando(true)
    await Promise.all(
      MODOS_NAV.map((m) => m.id)
        // El transporte público se queda fuera a propósito: su cupo en HERE es
        // el más escaso, así que solo se calcula si tocas su chip.
        .filter((m) => m !== elegido && m !== 'transporte')
        .map(async (m) => {
          let mejor: number | null = null
          try {
            const r = await planificar({ origen: o, destino: d, modos: [m], cuando, hora, locale })
            if (r.length) mejor = Math.min(...r.map((x) => x.duracion))
          } catch {
            // Un modo sin respuesta se queda en «—»; los demás siguen.
          }
          if (id === compara.current) setTiempos((v) => ({ ...v, [m]: mejor }))
        }),
    )
    if (id === compara.current) setComparando(false)
  }

  /** Tiempo en transporte público, a petición: una sola consulta intermodal. */
  const tiempoTransporte = async (o: PuntoNav, d: PuntoNav) => {
    const id = compara.current
    setCargandoTransporte(true)
    let mejor: number | null = null
    try {
      const r = await planificar({ origen: o, destino: d, modos: ['transporte'], cuando, hora, locale })
      if (r.length) mejor = Math.min(...r.map((x) => x.duracion))
    } catch {
      // Sin respuesta se queda en «—», como cualquier otro modo.
    }
    if (id !== compara.current) return
    setTiempos((v) => ({ ...v, transporte: mejor }))
    setCargandoTransporte(false)
  }

  const recalcular = () => {
    if (!nav.posicion) return
    void buscar({ origen: { nombre: t('sala.nav.miUbicacion', 'Mi ubicación'), lat: nav.posicion.lat, lng: nav.posicion.lng } })
  }

  const guardar = async () => {
    if (!origen || !destino || !itSel) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.guardarTitulo', 'Guardar trayecto'),
      mensaje: t('sala.nav.guardarMensaje', 'Queda a mano sin conexión 30 días; después se recalcula al abrirlo.'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: `${origen.nombre} → ${destino.nombre}`,
    })
    if (!nombre) return
    await trayectosViajeRepo.add({ nombre, origen, destino, modos, itinerario: itSel, creadoEn: new Date().toISOString() })
    setGuardadoOk(true)
    setTimeout(() => setGuardadoOk(false), 2000)
  }

  /**
   * Ruta pedida desde el chat (vista Lugares): de donde estás al sitio que
   * escribiste, comparando todos los modos. Un lugar guardado con ese nombre
   * gana a la búsqueda en línea: es el que el usuario tiene en la cabeza.
   */
  const rutaDesdeChat = async (texto: string) => {
    nav.detener()
    setEligiendo(null)
    // El asistente cuenta en qué acabó: quien lo pidió por el chat mira ahí.
    const avisar = (frase: string) => useMascota.getState().decir(frase, { sistema: true })
    const desde = await miUbicacion('origen')
    if (!desde) {
      avisar(t('sala.nav.chatSinUbicacion', 'No pude leer tu ubicación; te lo cuento en Lugares.'))
      return
    }
    const guardado = misLugares.find((l) => l.nombre.localeCompare(texto, undefined, { sensitivity: 'base' }) === 0)
    const hallado = guardado ?? (await geocodificar(texto, idioma, desde).catch(() => []))[0]
    if (!hallado) {
      const aviso = t('sala.nav.sinLugar', 'No encontré «{q}». Prueba con el nombre completo o con la dirección.', { q: texto })
      setError(aviso)
      avisar(aviso)
      return
    }
    const hasta = { nombre: hallado.nombre, lat: hallado.lat, lng: hallado.lng }
    fijar('destino', hasta)
    const rutas = await buscar({ origen: desde, destino: hasta, optimo: true })
    const mejor = rutas?.[0]
    avisar(
      mejor
        ? t('sala.nav.chatListo', '{t} hasta {lugar}. Te dejo la ruta en el mapa.', {
            t: formatoDuracion(t, mejor.duracion),
            lugar: hasta.nombre,
          })
        : t('sala.nav.sinRutas', 'No hay rutas con esos modos por aquí. Prueba a combinar otros, cambiar la hora o acercar los puntos.'),
    )
  }

  // La petición llega por suscripción y no por dependencias: el ChatBox la deja
  // en el store en el mismo tick en que abre el menú, así que esta pestaña puede
  // estar montándose todavía (carga perezosa) y hay que mirar también al entrar.
  const atenderRuta = useRef(rutaDesdeChat)
  useEffect(() => {
    atenderRuta.current = rutaDesdeChat
  })
  useEffect(() => {
    const atender = (destino: string | null) => {
      if (!destino) return
      useOrdenRuta.getState().atendida()
      void atenderRuta.current(destino)
    }
    atender(useOrdenRuta.getState().destino)
    return useOrdenRuta.subscribe((s, prev) => {
      if (s.sello !== prev.sello) atender(s.destino)
    })
  }, [])

  const cargar = (tr: TrayectoViaje) => {
    nav.detener()
    const ms = tr.modos as ModoNav[]
    setOrigen(tr.origen)
    setDestino(tr.destino)
    setModos(ms)
    setError(null)
    setAbiertos(new Set())
    // El itinerario caducado ya no está: se pide de nuevo a HERE con horarios frescos.
    if (!tr.itinerario) {
      void buscar({ origen: tr.origen, destino: tr.destino, modos: ms })
      return
    }
    setResultados([tr.itinerario])
    setSel(0)
  }

  const borrar = async (tr: TrayectoViaje) => {
    if (tr.id == null) return
    const ok = await confirmar({
      titulo: t('sala.nav.borrarTitulo', '¿Borrar este trayecto?'),
      mensaje: tr.nombre,
      textoOk: t('sala.nav.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await trayectosViajeRepo.remove(tr.id)
  }

  const alternarAbierto = (clave: string) =>
    setAbiertos((s) => {
      const n = new Set(s)
      if (n.has(clave)) n.delete(clave)
      else n.add(clave)
      return n
    })

  const campoClase =
    'rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs outline-none focus:border-white/30'

  return (
    <div ref={caja} data-tut="sala.navegar" className="@container">
      {/* Dos columnas cuando el panel da de sí: los controles a la izquierda —con
          los resultados y los lugares guardados justo debajo— y el mapa a la
          derecha, del ancho que el usuario le deje con el tirador. `flow-root`
          para que el flotante cuente dentro del alto del bloque. */}
      <div className={dosColumnas ? 'flow-root' : 'flex flex-col gap-3'}>
        {/* El mapa va PRIMERO en el DOM aunque se vea entre el formulario y los
            resultados: en dos columnas flota al final de la línea, y un flotante
            solo aparta lo que viene detrás. En una sola columna `order` lo
            devuelve a su sitio de siempre. */}
        <div
          className={dosColumnas ? 'relative float-end ps-3 sticky top-0' : 'relative order-2'}
          style={dosColumnas ? { width: `${anchoMapa}%` } : undefined}
        >
          {/* Tirador: con el mapa al lado va de pie en el hueco entre las dos
              columnas; con el mapa debajo se tumba encima de él. */}
          {conClave && (
            <div
              role="separator"
              aria-orientation={dosColumnas ? 'vertical' : 'horizontal'}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                inicioTirador.current = e.clientY
                inicioAlto.current = e.currentTarget.parentElement?.clientHeight ?? 0
                setArrastrando(true)
              }}
              onPointerMove={moverTirador}
              onPointerUp={() => setArrastrando(false)}
              onPointerCancel={() => setArrastrando(false)}
              onDoubleClick={() => (dosColumnas ? setAnchoMapa(50) : setAltoMapa(null))}
              title={tituloTirador}
              aria-label={tituloTirador}
              className={
                dosColumnas
                  ? 'absolute start-0 top-1/2 z-10 flex h-24 w-3 -translate-y-1/2 cursor-col-resize touch-none select-none items-center justify-center'
                  : 'absolute inset-x-0 -top-3 z-10 mx-auto flex h-3 w-24 cursor-row-resize touch-none select-none items-center justify-center'
              }
            >
              <span
                className={`rounded-full transition ${dosColumnas ? 'h-full w-1' : 'h-1 w-full'} ${
                  arrastrando ? 'bg-accent' : 'bg-white/25 hover:bg-white/60'
                }`}
              />
            </div>
          )}

          {/* Sin clave las teselas responderían 401: el mapa espera a la configuración. */}
          {conClave && (
            <MapaCalles
              origen={origen}
              destino={destino}
              itinerario={itSel}
              posicion={nav.posicion}
              seguir={navegando}
              tramoActivo={navegando ? (nav.progreso?.tramo ?? null) : null}
              onTocar={eligiendo ? (p) => void tocarMapa(p) : undefined}
              eligiendo={!!eligiendo}
              onMover={(c) => {
                if (!navegando) setZona(c)
              }}
              // El alto a medida es cosa del mapa debajo; al lado manda el ancho.
              alto={dosColumnas ? null : altoMapa}
              lugares={pines}
              onLugar={(p) => {
                fijar(eligiendo === 'origen' ? 'origen' : 'destino', p)
                setEligiendo(null)
              }}
            />
          )}
        </div>

        <div
          className={dosColumnas ? 'mb-3 space-y-3' : 'order-1 space-y-3'}
          style={anchoControles}
        >
          {!conClave && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              {t('sala.nav.sinClave', 'Falta configurar el servicio de rutas (VITE_HERE_KEY). Mientras tanto, esta pestaña solo muestra los trayectos guardados.')}
            </p>
          )}

          {/* Formulario */}
          <div className="ui-panel-2 space-y-2.5 rounded-xl border border-white/10 p-3">
            <BuscadorLugar
              valor={origen}
              onElegir={(p) => fijar('origen', p)}
              placeholder={t('sala.nav.origenPh', 'Origen: dirección, lugar o parada')}
              cerca={cerca}
              lugares={lugares}
              icono="ubicacion"
              colorPunto="#22c55e"
              acciones={
                <>
                  <BotonCampo icono="miUbicacion" titulo={t('sala.nav.miUbicacion', 'Mi ubicación')} onClick={() => void miUbicacion('origen')} />
                  <BotonCampo
                    icono="mapa"
                    titulo={t('sala.nav.enMapa', 'Elegir en el mapa')}
                    activo={eligiendo === 'origen'}
                    onClick={() => setEligiendo((e) => (e === 'origen' ? null : 'origen'))}
                  />
                </>
              }
            />
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10" />
              <button
                type="button"
                onClick={invertir}
                title={t('sala.nav.invertir', 'Invertir origen y destino')}
                aria-label={t('sala.nav.invertir', 'Invertir origen y destino')}
                className="rounded-full border border-white/10 bg-black/25 p-1.5 text-white/60 hover:text-white"
              >
                <Icono nombre="invertir" />
              </button>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <BuscadorLugar
              valor={destino}
              onElegir={(p) => fijar('destino', p)}
              placeholder={t('sala.nav.destinoPh', 'Destino: dirección, lugar o parada')}
              cerca={cerca}
              lugares={lugares}
              icono="pin"
              colorPunto="#ef4444"
              acciones={
                <>
                  <BotonCampo icono="miUbicacion" titulo={t('sala.nav.miUbicacion', 'Mi ubicación')} onClick={() => void miUbicacion('destino')} />
                  <BotonCampo
                    icono="mapa"
                    titulo={t('sala.nav.enMapa', 'Elegir en el mapa')}
                    activo={eligiendo === 'destino'}
                    onClick={() => setEligiendo((e) => (e === 'destino' ? null : 'destino'))}
                  />
                </>
              }
            />
            {eligiendo && (
              <p className="text-[11px] text-amber-300/80">{t('sala.nav.tocaMapa', 'Toca el mapa para fijar el punto.')}</p>
            )}

            {/* Modos */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setOptimo(true)}
                aria-pressed={optimo}
                className={`rounded-2xl border px-3 py-1 text-xs font-semibold leading-tight transition ${
                  optimo ? 'border-accent ui-accent-bg' : 'border-white/10 bg-black/25 text-white/60 hover:bg-black/40'
                }`}
              >
                <span className="block">
                  <Icono nombre="estrella" /> {t('sala.nav.optimo', 'Óptimo')}
                </span>
              </button>
              {MODOS_NAV.map((m) => {
                const on = !optimo && modos.includes(m.id)
                const tiempo = tiempos[m.id]
                const esTransporte = m.id === 'transporte'
                const cargando = esTransporte ? cargandoTransporte : comparando && tiempo === undefined
                const porCalcular = esTransporte && tiempo === undefined && !cargando && Object.keys(tiempos).length > 0
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => alternarModo(m.id)}
                    aria-pressed={on}
                    title={porCalcular ? t('sala.nav.calcularTransporte', 'Tócalo para calcular cuánto tarda en transporte público') : undefined}
                    className={`rounded-2xl border px-3 py-1 text-xs font-semibold leading-tight transition ${
                      on ? 'border-accent ui-accent-bg' : 'border-white/10 bg-black/25 text-white/60 hover:bg-black/40'
                    }`}
                  >
                    <span className="block">
                      <Icono nombre={m.icono} /> {t(m.clave, m.es)}
                    </span>
                    {(tiempo !== undefined || cargando || porCalcular) && (
                      <span className={`block text-[10px] font-normal ${on ? 'opacity-80' : 'text-white/45'}`}>
                        {cargando ? '…' : tiempo == null ? (porCalcular ? '?' : '—') : formatoDuracion(t, tiempo)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-white/40">
              {t('sala.nav.modosAyuda', 'Combina modos: con transporte público, la bici o el auto sirven para llegar a la estación.')}
            </p>

            {/* Cuándo */}
            <div className="flex flex-wrap items-center gap-2">
              <select value={cuando} onChange={(e) => setCuando(e.target.value as Cuando)} className={campoClase}>
                <option value="ahora">{t('sala.nav.ahora', 'Salir ahora')}</option>
                <option value="salir">{t('sala.nav.salirA', 'Salir a las…')}</option>
                <option value="llegar">{t('sala.nav.llegarA', 'Llegar a las…')}</option>
              </select>
              {cuando !== 'ahora' && (
                <input type="datetime-local" value={hora} onChange={(e) => setHora(e.target.value)} className={campoClase} />
              )}
              <button
                type="button"
                onClick={() => void buscar()}
                disabled={!origen || !destino || buscando || !conClave}
                className="ui-accent-bg ml-auto rounded-xl px-4 py-2 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
              >
                <Icono nombre="navegar" /> {buscando ? t('sala.nav.buscando', 'Calculando rutas…') : t('sala.nav.buscar', 'Buscar cómo llegar')}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{error}</p>
          )}

          {/* Navegación viva */}
          {navegando && itSel && (
            <div className="ui-panel-legible sticky top-0 z-10 space-y-2 rounded-xl border border-accent/40 p-3 shadow-lg">
              {nav.estado === 'buscando' && (
                <p className="text-xs text-white/60">
                  <Icono nombre="miUbicacion" /> {t('sala.nav.esperandoGps', 'Buscando tu ubicación…')}
                </p>
              )}
              {nav.estado === 'denegado' && (
                <p className="text-xs text-amber-300">
                  {t('sala.nav.gpsDenegado', 'No se pudo leer tu ubicación: revisa el permiso del navegador o del sistema.')}
                </p>
              )}
              {nav.estado === 'error' && (
                <p className="text-xs text-amber-300">{t('sala.nav.sinGps', 'Tu dispositivo no comparte la ubicación ahora mismo.')}</p>
              )}
              {instruccion && (
                <div className="flex items-center gap-3">
                  <span className="text-accent text-3xl">
                    <Icono nombre={instruccion.icono} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold leading-snug">{instruccion.titulo}</p>
                    {instruccion.detalle && <p className="text-xs text-white/55">{instruccion.detalle}</p>}
                  </div>
                </div>
              )}
              {nav.progreso?.fueraDeRuta && !nav.progreso.llegaste && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-xs text-amber-200">
                  <span className="flex-1">{t('sala.nav.fueraRuta', 'Estás fuera de la ruta.')}</span>
                  <button
                    type="button"
                    onClick={recalcular}
                    className="rounded-md bg-amber-400/30 px-2 py-1 font-semibold hover:bg-amber-400/45"
                  >
                    {t('sala.nav.recalcular', 'Recalcular desde aquí')}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoz((v) => !v)}
                  aria-pressed={voz}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${voz ? 'border-accent text-accent' : 'border-white/10 text-white/60'}`}
                >
                  <Icono nombre={voz ? 'bocina' : 'silencio'} /> {t('sala.nav.voz', 'Voz')}
                </button>
                <button
                  type="button"
                  onClick={nav.detener}
                  className="texto-cta ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold hover:brightness-110"
                >
                  <Icono nombre="detener" /> {t('sala.nav.detener', 'Detener')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={dosColumnas ? 'space-y-3' : 'order-3 space-y-3'}
          style={anchoControles}
        >
          {/* Alternativas */}
          {resultados.length > 1 && (
            <div className="space-y-1.5">
              {resultados.map((it, i) => {
                const aPie = it.piernas.filter((p) => familiaModo(p.modo) === 'WALK').reduce((s, p) => s + (p.distancia ?? 0), 0)
                const directo = it.piernas.length === 1 && esCalle(it.piernas[0].modo)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSel(i)
                      nav.detener()
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      sel === i ? 'border-accent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold">{formatoDuracion(t, it.duracion)}</span>
                      <span className="text-xs text-white/50">
                        {formatoHora(it.salida, locale)} → {formatoHora(it.llegada, locale)}
                      </span>
                      <span className="ml-auto text-[11px] text-white/45">
                        {directo
                          ? t('sala.nav.directo', 'Directo')
                          : it.transbordos === 0
                            ? t('sala.nav.sinTransbordos', 'Sin transbordos')
                            : it.transbordos === 1
                              ? t('sala.nav.transbordo', '1 transbordo')
                              : t('sala.nav.transbordos', '{n} transbordos', { n: it.transbordos })}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CadenaModos it={it} t={t} />
                      {aPie > 0 && !directo && (
                        <span className="text-[11px] text-white/45">{t('sala.nav.aPie', '{d} a pie', { d: formatoDistancia(aPie, locale) })}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Detalle del itinerario elegido */}
          {itSel && origen && destino && (
            <div className="ui-panel-2 space-y-2.5 rounded-xl border border-white/10 p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-bold">{formatoDuracion(t, itSel.duracion)}</span>
                <span className="text-xs text-white/50">
                  {formatoHora(itSel.salida, locale)} → {formatoHora(itSel.llegada, locale)}
                </span>
                {/* En un trayecto directo la cadena solo repetiría la duración. */}
                {!(itSel.piernas.length === 1 && esCalle(itSel.piernas[0].modo)) && (
                  <span className="ml-auto">
                    <CadenaModos it={itSel} t={t} />
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {!navegando ? (
                  <button
                    type="button"
                    onClick={nav.iniciar}
                    className="ui-accent-bg flex-1 rounded-lg py-2 text-sm font-bold transition hover:brightness-110"
                  >
                    <Icono nombre="play" /> {t('sala.nav.navegar', 'Navegar')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nav.detener}
                    className="texto-cta flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold hover:brightness-110"
                  >
                    <Icono nombre="detener" /> {t('sala.nav.detener', 'Detener')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void guardar()}
                  className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-black/40"
                >
                  <Icono nombre={guardadoOk ? 'confirmar' : 'guardar'} /> {guardadoOk ? t('sala.nav.guardado', 'Guardado') : t('sala.nav.guardar', 'Guardar')}
                </button>
                <BotonCompartir titulo={t('sala.nav.compartirTitulo', 'Cómo llegar')} texto={textoTrayecto(t, origen, destino, itSel, locale)} />
              </div>

              <ol className="space-y-1.5">
                {itSel.piernas.map((p, i) => {
                  const color = colorDe(p)
                  const activo = navegando && nav.progreso?.tramo === i
                  const clavePasos = `p${i}`
                  const claveParadas = `s${i}`
                  return (
                    <li
                      key={i}
                      className={`rounded-lg border bg-black/20 p-2.5 ${activo ? 'border-accent' : 'border-white/10'}`}
                      style={{ borderLeft: `4px solid ${color}` }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-base" style={{ color }}>
                          <Icono nombre={ICONO_MODO[familiaModo(p.modo)]} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{resumenPierna(t, p, locale)}</p>
                          <p className="text-[11px] text-white/45">
                            {formatoHora(p.salida, locale)} → {formatoHora(p.llegada, locale)} · {formatoDuracion(t, p.duracion)}
                            {p.agencia ? ` · ${p.agencia}` : ''}
                          </p>
                        </div>
                      </div>
                      {p.pasos && p.pasos.length > 0 && (
                        <div className="mt-1.5">
                          <button type="button" onClick={() => alternarAbierto(clavePasos)} className="text-[11px] text-accent hover:underline">
                            {abiertos.has(clavePasos)
                              ? t('sala.nav.ocultarPasos', 'Ocultar indicaciones')
                              : t('sala.nav.verPasos', 'Ver indicaciones ({n})', { n: p.pasos.length })}
                          </button>
                          {abiertos.has(clavePasos) && (
                            <ol className="mt-1 space-y-1">
                              {p.pasos.map((paso, j) => (
                                <li
                                  key={j}
                                  className={`flex items-start gap-2 text-xs ${activo && nav.progreso?.paso === j ? 'text-accent font-semibold' : 'text-white/75'}`}
                                >
                                  <span className="mt-px shrink-0 text-white/50">
                                    <Icono nombre={iconoDireccion(paso)} />
                                  </span>
                                  <span className="min-w-0 flex-1">{paso.texto}</span>
                                  {paso.distancia > 0 && <span className="shrink-0 text-white/40">{formatoDistancia(paso.distancia, locale)}</span>}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                      {p.paradas && p.paradas.length > 0 && (
                        <div className="mt-1.5">
                          <button type="button" onClick={() => alternarAbierto(claveParadas)} className="text-[11px] text-accent hover:underline">
                            {abiertos.has(claveParadas)
                              ? t('sala.nav.ocultarParadas', 'Ocultar paradas')
                              : t('sala.nav.verParadas', 'Ver paradas ({n})', { n: p.paradas.length })}
                          </button>
                          {abiertos.has(claveParadas) && (
                            <ul className="mt-1 space-y-0.5 border-l-2 pl-2 text-xs text-white/70" style={{ borderColor: color }}>
                              {p.paradas.map((parada, j) => (
                                <li key={j}>{parada.nombre}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <LugaresNav
            candidato={destino ?? origen}
            onUsar={(cual, p) => {
              fijar(cual, p)
              setEligiendo(null)
            }}
          />

          {/* Guardados */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-white/50">
              <Icono nombre="guardar" /> {t('sala.nav.guardados', 'Trayectos guardados')}
            </h4>
            {guardados.length === 0 ? (
              <p className="text-xs text-white/40">
                {t('sala.nav.guardadosVacio', 'Guarda una ruta y quedará a mano sin conexión 30 días; después se recalcula al abrirla.')}
              </p>
            ) : (
              guardados.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => cargar(tr)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tr.nombre}</p>
                    <p className="truncate text-[11px] text-white/45">
                      {tr.itinerario && `${formatoDuracion(t, tr.itinerario.duracion)} · `}
                      {tr.origen.nombre} → {tr.destino.nombre}
                    </p>
                  </div>
                  {tr.itinerario ? (
                    <CadenaModos it={tr.itinerario} t={t} />
                  ) : (
                    <span className="shrink-0 text-[10px] text-white/35">
                      {t('sala.nav.caduco', 'Se recalcula al abrirlo')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void borrar(tr)
                    }}
                    aria-label={t('sala.nav.borrar', 'Borrar')}
                    className="px-1 text-white/40 hover:text-red-300"
                  >
                    <Icono nombre="cerrar" />
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="text-[10px] text-white/30">
            {t('sala.nav.fuentes', 'Rutas, horarios y mapa: HERE. Los horarios pueden variar; confírmalos con el operador.')}
          </p>
        </div>
      </div>
    </div>
  )
}
