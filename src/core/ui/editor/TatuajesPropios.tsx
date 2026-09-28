import { useEffect, useRef, useState } from 'react'
import { useDiseño } from '../../state/disenoStore'
import { useEditorUi, PREFIJO_PROPIO } from '../../state/editorUiStore'
import { confirmar } from '../../state/confirmarStore'
import { prendasCustomRepo } from '../../data/repository'
import { TATUAJE_ESCALA_MIN, TATUAJE_ESCALA_MAX, type AjustePrenda } from '../../house/apariencia'
import { ColorPicker } from '../comun/ColorPicker'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

const inputCls =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'
const botonCls =
  'flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/65 transition hover:bg-white/10'

/** Lado del lienzo de dibujo (px) y de la imagen guardada (se reduce al guardar). */
const LADO_LIENZO = 512
const LADO_GUARDADO = 256
/** Color del papel del lienzo y de las miniaturas (lo transparente del dibujo). */
const PAPEL = '#f4f1ec'
/** Cuántos pasos guarda «Deshacer». */
const MAX_DESHACER = 20

/**
 * Panel del tatuaje que se está colocando: la posición se elige tocando o
 * arrastrando sobre el personaje del visor 3D; aquí quedan el tamaño y volver
 * a su lugar de fábrica.
 */
export function MoverTatuaje({
  ajuste,
  onAjuste,
}: {
  ajuste?: AjustePrenda
  onAjuste: (aj: AjustePrenda) => void
}) {
  const t = useT()
  return (
    <div className="mt-1.5 space-y-1.5 border-t border-white/10 pt-1.5">
      <p className="text-[11px] leading-snug text-accent/90">
        {t('editor.tatuaje.colocar', 'Toca o arrastra sobre el personaje para colocarlo donde quieras.')}
      </p>
      <label className="flex items-center gap-2 text-[11px] text-white/55">
        <span className="w-16 shrink-0">{t('editor.tatuaje.tamano', 'Tamaño')}</span>
        <input
          type="range"
          min={TATUAJE_ESCALA_MIN}
          max={TATUAJE_ESCALA_MAX}
          step={0.05}
          value={ajuste?.escala ?? 1}
          onChange={(e) => onAjuste({ escala: Number(e.target.value) })}
          className="min-w-0 flex-1 accent-[var(--color-accent)]"
        />
      </label>
      <button
        type="button"
        onClick={() => onAjuste({ punto: undefined, escala: undefined })}
        className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/55 transition hover:bg-white/15"
      >
        <Icono nombre="restaurar" /> {t('editor.tatuaje.restablecer', 'Volver a su lugar')}
      </button>
    </div>
  )
}

/** Lo que se está dibujando: un tatuaje nuevo o uno guardado (con su imagen de partida). */
interface Dibujando {
  id?: number
  nombre: string
  imagen?: string
}

/**
 * Tatuajes propios de una carpeta de Tatuajes: dibujados a mano en un lienzo
 * 2D o subidos como imagen. Se guardan como filas de `prendasCustom` con
 * `imagen` (sin piezas) y, puestos, viajan en `avatar.tatuajesCustom` y se
 * pegan como estampa igual que los de fábrica.
 */
export function TatuajesPropios({ carpetaId }: { carpetaId: number }) {
  const t = useT()
  const todas = prendasCustomRepo.useAll()
  const propios = todas
    ?.filter((p) => p.carpetaId === carpetaId && p.imagen)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const puestos = useDiseño((s) => s.avatar.tatuajesCustom)
  const poner = useDiseño((s) => s.ponerAvatarTatuaje)
  const quitar = useDiseño((s) => s.quitarAvatarTatuaje)
  const ajustar = useDiseño((s) => s.ajustarAvatarTatuaje)
  const tatuajeSel = useEditorUi((s) => s.tatuajeSel)
  const setTatuajeSel = useEditorUi((s) => s.setTatuajeSel)
  const [dibujando, setDibujando] = useState<Dibujando | null>(null)
  const subir = useRef<HTMLInputElement>(null)

  const puesto = (id?: number) => (puestos ?? []).find((x) => x.refId === id)

  const guardar = async (imagen: string, nombre: string) => {
    if (!dibujando) return
    const n = nombre.trim() || t('editor.tatuaje.sinNombre', 'Tatuaje')
    let id = dibujando.id
    if (id != null) {
      await prendasCustomRepo.update(id, { nombre: n, imagen })
      if (puesto(id)) await poner(id, imagen, n) // refresca el que lleva puesto
    } else {
      id = await crearTatuaje(n, imagen, carpetaId, (propios ?? []).length)
      await poner(id, imagen, n) // se pone al crearlo
    }
    setDibujando(null)
  }

  const eliminar = async (id: number, nombre: string) => {
    const ok = await confirmar({
      titulo: t('editor.tatuaje.borrar', 'Borrar «{nombre}»', { nombre }),
      mensaje: t('editor.tatuaje.borrarMsg', 'Se borra el dibujo y se le quita al personaje si lo lleva puesto.'),
      textoOk: t('editor.ropa.borrarOk', 'Borrar'),
    })
    if (!ok) return
    if (puesto(id)) await quitar(id)
    if (tatuajeSel === PREFIJO_PROPIO + id) setTatuajeSel(null)
    await prendasCustomRepo.remove(id)
  }

  const alSubir = async (archivo: File | undefined) => {
    if (!archivo) return
    // La imagen subida se abre en el lienzo para retocarla (borrar el fondo, añadir trazos).
    const url = await imagenDeArchivo(archivo)
    setDibujando({ nombre: archivo.name.replace(/\.[^.]+$/, ''), imagen: url })
  }

  if (dibujando) {
    return (
      <LienzoTatuaje
        inicial={dibujando}
        onCancelar={() => setDibujando(null)}
        onGuardar={(imagen, nombre) => void guardar(imagen, nombre)}
      />
    )
  }

  return (
    <div className="space-y-1.5">
      {propios?.map((p) => {
        const actual = puesto(p.id)
        const clave = PREFIJO_PROPIO + p.id
        const moviendo = tatuajeSel === clave
        return (
          <div
            key={p.id}
            className={`rounded-lg border px-2 py-1.5 transition ${
              actual ? 'border-accent/30 bg-accent/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void (actual ? quitar(p.id!) : poner(p.id!, p.imagen!, p.nombre))}
                className="flex min-w-0 flex-1 items-center gap-2 text-start"
              >
                <img
                  src={p.imagen}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded border border-white/10 object-contain"
                  style={{ backgroundColor: PAPEL }}
                />
                <span className={`truncate text-xs font-semibold ${actual ? 'text-white/90' : 'text-white/55'}`}>
                  {p.nombre}
                </span>
              </button>
              {actual && (
                <button
                  type="button"
                  onClick={() => setTatuajeSel(moviendo ? null : clave)}
                  title={t('editor.tatuaje.mover', 'Mover el tatuaje')}
                  aria-expanded={moviendo}
                  className={`grid h-6 w-6 place-items-center rounded-md text-xs transition ${
                    moviendo ? 'bg-accent/30 text-accent' : 'bg-white/5 text-white/50 hover:bg-white/15'
                  }`}
                >
                  <Icono nombre="mover" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setDibujando({ id: p.id, nombre: p.nombre, imagen: p.imagen })}
                title={t('editor.tatuaje.editar', 'Editar el dibujo')}
                className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-white/15"
              >
                <Icono nombre="pincel" />
              </button>
              <button
                type="button"
                onClick={() => void eliminar(p.id!, p.nombre)}
                title={t('editor.tatuaje.borrarTip', 'Borrar el tatuaje')}
                className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-red-500/25"
              >
                <Icono nombre="basura" />
              </button>
            </div>
            {actual && moviendo && <MoverTatuaje ajuste={actual} onAjuste={(aj) => void ajustar(p.id!, aj)} />}
          </div>
        )
      })}

      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => setDibujando({ nombre: '' })} className={botonCls}>
          <Icono nombre="pincel" /> {t('editor.tatuaje.dibujar', 'Dibujar a mano')}
        </button>
        <button type="button" onClick={() => subir.current?.click()} className={botonCls}>
          <Icono nombre="imagen" /> {t('editor.tatuaje.subir', 'Subir imagen')}
        </button>
      </div>
      <input
        ref={subir}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          void alSubir(f)
        }}
      />
    </div>
  )
}

/** Guarda un tatuaje propio nuevo al final de su carpeta (sin piezas: es un dibujo 2D). */
function crearTatuaje(nombre: string, imagen: string, carpetaId: number, orden: number) {
  return prendasCustomRepo.add({ nombre, piezas: '[]', imagen, carpetaId, orden, creadoEn: Date.now() })
}

/** Lee un archivo de imagen como data URL. */
function imagenDeArchivo(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result))
    lector.onerror = () => reject(lector.error)
    lector.readAsDataURL(archivo)
  })
}

/**
 * Lienzo 2D para dibujar un tatuaje: pincel y borrador con grosor y color,
 * deshacer y limpiar. Lo transparente se queda como piel (o ropa) al pegarlo.
 * Si trae `imagen` (una subida o un tatuaje guardado), empieza con ella encima,
 * ajustada al cuadro.
 */
function LienzoTatuaje({
  inicial,
  onCancelar,
  onGuardar,
}: {
  inicial: Dibujando
  onCancelar: () => void
  onGuardar: (imagen: string, nombre: string) => void
}) {
  const t = useT()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazando = useRef<{ x: number; y: number } | null>(null)
  const historial = useRef<ImageData[]>([])
  const [nombre, setNombre] = useState(inicial.nombre)
  const [herramienta, setHerramienta] = useState<'pincel' | 'borrador'>('pincel')
  const [grosor, setGrosor] = useState(14)
  const [color, setColor] = useState('#1e293b')
  const [vacio, setVacio] = useState(!inicial.imagen)
  const [puedeDeshacer, setPuedeDeshacer] = useState(false)

  // La imagen de partida se dibuja una vez, centrada y sin deformar.
  useEffect(() => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx || !inicial.imagen) return
    const img = new Image()
    img.onload = () => {
      const k = Math.min(LADO_LIENZO / img.width, LADO_LIENZO / img.height)
      const w = img.width * k
      const h = img.height * k
      ctx.drawImage(img, (LADO_LIENZO - w) / 2, (LADO_LIENZO - h) / 2, w, h)
    }
    img.src = inicial.imagen
  }, [inicial.imagen])

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * LADO_LIENZO, y: ((e.clientY - r.top) / r.height) * LADO_LIENZO }
  }

  const trazo = (ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }) => {
    ctx.globalCompositeOperation = herramienta === 'borrador' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = grosor
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    historial.current = [...historial.current.slice(-(MAX_DESHACER - 1)), ctx.getImageData(0, 0, LADO_LIENZO, LADO_LIENZO)]
    setPuedeDeshacer(true)
    const p = punto(e)
    trazando.current = p
    trazo(ctx, p, p) // un toque deja un punto
    if (herramienta === 'pincel') setVacio(false)
  }

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx || !trazando.current) return
    const p = punto(e)
    trazo(ctx, trazando.current, p)
    trazando.current = p
  }

  const deshacer = () => {
    const ctx = lienzo.current?.getContext('2d')
    const previo = historial.current.pop()
    if (ctx && previo) ctx.putImageData(previo, 0, 0)
    setPuedeDeshacer(historial.current.length > 0)
  }

  const limpiar = () => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    historial.current = [...historial.current.slice(-(MAX_DESHACER - 1)), ctx.getImageData(0, 0, LADO_LIENZO, LADO_LIENZO)]
    setPuedeDeshacer(true)
    ctx.clearRect(0, 0, LADO_LIENZO, LADO_LIENZO)
    setVacio(true)
  }

  const guardar = () => {
    const origen = lienzo.current
    if (!origen) return
    // Se guarda reducido (viaja dentro del avatar al sincronizar).
    const salida = document.createElement('canvas')
    salida.width = salida.height = LADO_GUARDADO
    salida.getContext('2d')!.drawImage(origen, 0, 0, LADO_GUARDADO, LADO_GUARDADO)
    onGuardar(salida.toDataURL('image/png'), nombre)
  }

  const herramientaBtn = (id: 'pincel' | 'borrador', etiqueta: string) => (
    <button
      type="button"
      onClick={() => setHerramienta(id)}
      aria-pressed={herramienta === id}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
        herramienta === id ? 'bg-accent/25 text-accent' : 'bg-white/5 text-white/55 hover:bg-white/10'
      }`}
    >
      <Icono nombre={id} /> {etiqueta}
    </button>
  )

  return (
    <div className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('editor.tatuaje.nombre', 'Nombre del tatuaje')}
        autoComplete="off"
        className={`${inputCls} w-full`}
      />
      {/* Cuadrícula de fondo = transparente: lo que no se pinte deja ver la piel. */}
      <canvas
        ref={lienzo}
        width={LADO_LIENZO}
        height={LADO_LIENZO}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={() => (trazando.current = null)}
        onPointerCancel={() => (trazando.current = null)}
        className="aspect-square w-full cursor-crosshair touch-none rounded-lg border border-white/15"
        style={{
          backgroundColor: PAPEL,
          backgroundImage:
            'linear-gradient(45deg, #e2ddd5 25%, transparent 25%, transparent 75%, #e2ddd5 75%), linear-gradient(45deg, #e2ddd5 25%, transparent 25%, transparent 75%, #e2ddd5 75%)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />
      <div className="flex gap-1.5">
        {herramientaBtn('pincel', t('editor.tatuaje.pincel', 'Pincel'))}
        {herramientaBtn('borrador', t('editor.tatuaje.borrador', 'Borrador'))}
        <button
          type="button"
          onClick={deshacer}
          disabled={!puedeDeshacer}
          title={t('editor.tatuaje.deshacer', 'Deshacer')}
          className="grid w-9 place-items-center rounded-md bg-white/5 text-xs text-white/55 transition hover:bg-white/10 disabled:opacity-35"
        >
          <Icono nombre="deshacer" />
        </button>
        <button
          type="button"
          onClick={limpiar}
          title={t('editor.tatuaje.limpiar', 'Limpiar el lienzo')}
          className="grid w-9 place-items-center rounded-md bg-white/5 text-xs text-white/55 transition hover:bg-red-500/25"
        >
          <Icono nombre="basura" />
        </button>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-white/55">
        <span className="w-16 shrink-0">{t('editor.tatuaje.grosor', 'Grosor')}</span>
        <input
          type="range"
          min={2}
          max={48}
          value={grosor}
          onChange={(e) => setGrosor(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--color-accent)]"
        />
      </label>
      {herramienta === 'pincel' && <ColorPicker value={color} onChange={setColor} fila />}
      <div className="flex gap-1.5">
        <button type="button" onClick={onCancelar} className={`${botonCls} flex-1`}>
          {t('editor.pers.cancelar', 'Cancelar')}
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={vacio}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-40"
        >
          <Icono nombre="guardar" /> {t('editor.pers.guardar', 'Guardar')}
        </button>
      </div>
    </div>
  )
}
