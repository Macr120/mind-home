import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LugarViaje, PuntoNav } from '../../../core/data/db'
import { VACIO, lugaresNavRepo } from '../../../core/data/repository'
import { useT } from '../../../core/i18n/useT'
import { useAjustes } from '../../../core/state/ajustesStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../../core/ui/iconos/catalogo'
import { etiquetaLugar } from '../datos'
import { geocodificar, type ResultadoGeo } from './here'
import { ICONOS_LUGAR } from './LugaresNav'

interface Props {
  valor: PuntoNav | null
  onElegir: (p: PuntoNav | null) => void
  placeholder: string
  /** Sesgo de las sugerencias (posición o el otro extremo del trayecto). */
  cerca: { lat: number; lng: number } | null
  /** Lugares de la sala con coordenadas: salen primero al escribir. */
  lugares: LugarViaje[]
  /** Botones a la derecha del campo (mi ubicación, elegir en el mapa). */
  acciones?: ReactNode
  icono: NombreIcono
  colorPunto: string
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Campo de origen/destino con sugerencias: lugares propios + geocodificador en línea. */
export function BuscadorLugar({ valor, onElegir, placeholder, cerca, lugares, acciones, icono, colorPunto }: Props) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const [texto, setTexto] = useState(valor?.nombre ?? '')
  const [valorVisto, setValorVisto] = useState(valor)
  const [abierto, setAbierto] = useState(false)
  const [sugerencias, setSugerencias] = useState<ResultadoGeo[]>([])
  const [buscando, setBuscando] = useState(false)
  const peticion = useRef(0)
  // Los lugares guardados («casa», «trabajo») van antes que nada al escribir.
  const guardados = lugaresNavRepo.useAll() ?? VACIO

  // El valor cambió desde fuera (mi ubicación, invertir, tocar el mapa): reflejarlo en el campo.
  if (valor !== valorVisto) {
    setValorVisto(valor)
    setTexto(valor?.nombre ?? '')
    setAbierto(false)
  }

  const consulta = abierto && texto.trim().length >= 3 && texto !== valor?.nombre ? texto.trim() : ''
  // Clave redondeada: la posición GPS cambia a cada segundo y no debe relanzar la búsqueda.
  const cercaClave = cerca ? `${cerca.lat.toFixed(3)},${cerca.lng.toFixed(3)}` : ''

  useEffect(() => {
    if (!consulta) return
    const id = ++peticion.current
    const timer = setTimeout(async () => {
      setBuscando(true)
      const [lat, lng] = cercaClave.split(',').map(Number)
      try {
        const r = await geocodificar(consulta, idioma, cercaClave ? { lat, lng } : null)
        if (id === peticion.current) setSugerencias(r)
      } catch {
        if (id === peticion.current) setSugerencias([])
      } finally {
        if (id === peticion.current) setBuscando(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [consulta, idioma, cercaClave])

  const q = normalizar(texto.trim())
  const favoritos = q.length >= 2 ? guardados.filter((l) => normalizar(l.nombre).includes(q)).slice(0, 4) : []
  const propios =
    q.length >= 2
      ? lugares.filter((l) => l.lat != null && l.lng != null && normalizar(etiquetaLugar(l)).includes(q)).slice(0, 4)
      : []
  const mostrar =
    abierto &&
    q.length >= 2 &&
    texto !== valor?.nombre &&
    (favoritos.length > 0 || propios.length > 0 || sugerencias.length > 0 || buscando)

  const elegir = (p: PuntoNav) => {
    onElegir(p)
    setTexto(p.nombre)
    setAbierto(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 focus-within:border-white/30">
        <span style={{ color: colorPunto }}>
          <Icono nombre={icono} />
        </span>
        <input
          value={texto}
          onChange={(e) => {
            const v = e.target.value
            setTexto(v)
            setAbierto(true)
            if (v.trim().length < 3) setSugerencias([])
            if (v === '' && valor) onElegir(null)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAbierto(false)
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
        />
        {texto && (
          <button
            type="button"
            onClick={() => {
              setTexto('')
              setSugerencias([])
              onElegir(null)
            }}
            aria-label={t('sala.nav.limpiar', 'Limpiar')}
            className="rounded-md p-1 text-white/40 hover:text-white"
          >
            <Icono nombre="cerrar" />
          </button>
        )}
        {acciones}
      </div>

      {mostrar && (
        <ul
          className="ui-panel-legible absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-white/10 py-1 shadow-xl"
          // Sin esto el input pierde el foco antes de que llegue el click.
          onMouseDown={(e) => e.preventDefault()}
        >
          {favoritos.map((l) => (
            <li key={`fav-${l.id}`}>
              <button
                type="button"
                onClick={() => elegir({ nombre: l.nombre, lat: l.lat, lng: l.lng })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
              >
                <span className="text-teal-300">
                  <Icono nombre={ICONOS_LUGAR.includes(l.icono as NombreIcono) ? (l.icono as NombreIcono) : 'pin'} />
                </span>
                <span className="min-w-0 flex-1 truncate">{l.nombre}</span>
                <span className="text-[10px] text-white/40">{t('sala.nav.guardado', 'Guardado')}</span>
              </button>
            </li>
          ))}
          {propios.map((l) => (
            <li key={`propio-${l.id}`}>
              <button
                type="button"
                onClick={() => elegir({ nombre: l.nombre, lat: l.lat as number, lng: l.lng as number })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
              >
                <span className="text-teal-400">
                  <Icono nombre={l.visitado ? 'ubicacion' : 'brujula'} />
                </span>
                <span className="min-w-0 flex-1 truncate">{etiquetaLugar(l)}</span>
                <span className="text-[10px] text-white/40">{t('sala.nav.tuLugar', 'Tu lugar')}</span>
              </button>
            </li>
          ))}
          {sugerencias.map((s, i) => (
            <li key={`geo-${i}`}>
              <button
                type="button"
                onClick={() => elegir({ nombre: s.nombre, lat: s.lat, lng: s.lng })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
              >
                <span className="text-white/50">
                  <Icono nombre={s.tipo === 'parada' ? 'bus' : s.tipo === 'direccion' ? 'casa' : 'pin'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{s.nombre}</span>
                  {s.detalle && <span className="block truncate text-[11px] text-white/45">{s.detalle}</span>}
                </span>
              </button>
            </li>
          ))}
          {buscando && sugerencias.length === 0 && propios.length === 0 && (
            <li className="px-3 py-1.5 text-xs text-white/40">{t('sala.nav.buscandoLugares', 'Buscando…')}</li>
          )}
        </ul>
      )}
    </div>
  )
}
