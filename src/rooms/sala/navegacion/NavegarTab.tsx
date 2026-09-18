import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ItinerarioNav, LugarViaje, PiernaNav, PuntoNav, TrayectoViaje } from '../../../core/data/db'
import { VACIO, trayectosViajeRepo } from '../../../core/data/repository'
import { localeActual, useT, type TFunc } from '../../../core/i18n/useT'
import { useAjustes } from '../../../core/state/ajustesStore'
import { confirmar, pedirTexto } from '../../../core/state/confirmarStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { BotonCompartir } from '../BotonCompartir'
import { BuscadorLugar } from './BuscadorLugar'
import { claveConfigurada } from './config'
import { formatoDistancia, formatoDuracion, formatoHora, resumenPierna } from './formato'
import { obtenerPosicion } from './geo'
import { nombreDeCoords, planificar } from './here'
import MapaCalles from './MapaCalles'
import { COLOR_MODO, ICONO_MODO, MODOS_NAV, esCalle, familiaModo, iconoDireccion, type ModoNav } from './modos'
import { textoTrayecto } from './textoTrayecto'
import { useNavegacionViva, type Progreso } from './useNavegacionViva'

interface Props {
  lugares: LugarViaje[]
}

type Cuando = 'ahora' | 'salir' | 'llegar'

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
  const [modos, setModos] = useState<ModoNav[]>(['caminar', 'transporte'])
  const [cuando, setCuando] = useState<Cuando>('ahora')
  const [hora, setHora] = useState(horaInicial)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ItinerarioNav[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [eligiendo, setEligiendo] = useState<'origen' | 'destino' | null>(null)
  const [voz, setVoz] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const ultimaVoz = useRef('')

  const itSel = sel != null ? (resultados[sel] ?? null) : null
  const nav = useNavegacionViva(itSel)
  const navegando = nav.estado !== 'apagado'
  const cerca = nav.posicion ?? origen ?? destino ?? null
  const conClave = claveConfigurada()

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

  const limpiarResultados = () => {
    setResultados([])
    setSel(null)
    setError(null)
    setAbiertos(new Set())
    nav.detener()
  }

  const fijar = (cual: 'origen' | 'destino', p: PuntoNav | null) => {
    ;(cual === 'origen' ? setOrigen : setDestino)(p)
    limpiarResultados()
  }

  const miUbicacion = async (cual: 'origen' | 'destino') => {
    setError(null)
    try {
      const pos = await obtenerPosicion()
      fijar(cual, { nombre: t('sala.nav.miUbicacion', 'Mi ubicación'), lat: pos.lat, lng: pos.lng })
    } catch (e) {
      setError(
        (e as { code?: number }).code === 1
          ? t('sala.nav.gpsDenegado', 'No se pudo leer tu ubicación: revisa el permiso del navegador o del sistema.')
          : t('sala.nav.sinGps', 'Tu dispositivo no comparte la ubicación ahora mismo.'),
      )
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

  const alternarModo = (m: ModoNav) =>
    setModos((ms) => (ms.includes(m) ? (ms.length > 1 ? ms.filter((x) => x !== m) : ms) : [...ms, m]))

  const buscar = async (desde?: PuntoNav) => {
    const o = desde ?? origen
    if (!o || !destino || buscando) return
    if (desde) setOrigen(desde)
    setBuscando(true)
    limpiarResultados()
    try {
      const r = await planificar({ origen: o, destino, modos, cuando, hora, locale })
      setResultados(r)
      if (r.length === 0) {
        setError(t('sala.nav.sinRutas', 'No hay rutas con esos modos por aquí. Prueba a combinar otros, cambiar la hora o acercar los puntos.'))
      } else {
        setSel(0)
      }
    } catch {
      setError(t('sala.nav.errorRed', 'No se pudieron calcular las rutas. Revisa tu conexión e inténtalo de nuevo.'))
    } finally {
      setBuscando(false)
    }
  }

  const recalcular = () => {
    if (!nav.posicion) return
    void buscar({ nombre: t('sala.nav.miUbicacion', 'Mi ubicación'), lat: nav.posicion.lat, lng: nav.posicion.lng })
  }

  const guardar = async () => {
    if (!origen || !destino || !itSel) return
    const nombre = await pedirTexto({
      titulo: t('sala.nav.guardarTitulo', 'Guardar trayecto'),
      mensaje: t('sala.nav.guardarMensaje', 'Quedará a mano aunque no tengas conexión.'),
      textoOk: t('sala.nav.guardar', 'Guardar'),
      valor: `${origen.nombre} → ${destino.nombre}`,
    })
    if (!nombre) return
    await trayectosViajeRepo.add({ nombre, origen, destino, modos, itinerario: itSel, creadoEn: new Date().toISOString() })
    setGuardadoOk(true)
    setTimeout(() => setGuardadoOk(false), 2000)
  }

  const cargar = (tr: TrayectoViaje) => {
    nav.detener()
    setOrigen(tr.origen)
    setDestino(tr.destino)
    setModos(tr.modos as ModoNav[])
    setResultados([tr.itinerario])
    setSel(0)
    setError(null)
    setAbiertos(new Set())
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
    <div data-tut="sala.navegar" className="space-y-3">
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
          {MODOS_NAV.map((m) => {
            const on = modos.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => alternarModo(m.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on ? 'border-accent ui-accent-bg' : 'border-white/10 bg-black/25 text-white/60 hover:bg-black/40'
                }`}
              >
                <Icono nombre={m.icono} /> {t(m.clave, m.es)}
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
        </div>

        <button
          type="button"
          onClick={() => void buscar()}
          disabled={!origen || !destino || buscando || !conClave}
          className="ui-accent-bg w-full rounded-xl py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
        >
          <Icono nombre="navegar" /> {buscando ? t('sala.nav.buscando', 'Calculando rutas…') : t('sala.nav.buscar', 'Buscar cómo llegar')}
        </button>
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
      />
      )}

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

      {/* Guardados */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-white/50">
          <Icono nombre="guardar" /> {t('sala.nav.guardados', 'Trayectos guardados')}
        </h4>
        {guardados.length === 0 ? (
          <p className="text-xs text-white/40">
            {t('sala.nav.guardadosVacio', 'Guarda una ruta y quedará a mano aunque no tengas conexión.')}
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
                  {formatoDuracion(t, tr.itinerario.duracion)} · {tr.origen.nombre} → {tr.destino.nombre}
                </p>
              </div>
              <CadenaModos it={tr.itinerario} t={t} />
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
  )
}
