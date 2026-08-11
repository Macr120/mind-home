import { useRef, useState } from 'react'
import type { Anecdota } from '../../core/data/db'
import { anecdotasRepo } from '../../core/data/repository'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { fechaLocalISO } from '../../core/fechaLocal'
import { Archivador } from '../_shared/Archivador'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { comprimirFoto, miniaturaFoto, Foto } from '../_shared/fotos'
import { CalendarioAnimo } from './CalendarioAnimo'
import { ANIMOS } from './animos'
import { ejemploAnecdotario } from './ejemplos'

const hoy = () => fechaLocalISO()

/** «lunes, 3 de agosto» — el encabezado del día abierto bajo el calendario. */
const nombreDia = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(localeActual(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

/** Tamaño de página del historial: ~2 meses de entradas diarias por tanda. */
const PAGINA = 60

export function AnecdotarioApp() {
  // Ventana acotada: la tabla crece años y trae BLOBS embebidos — materializarla
  // entera en cada escritura era el mayor consumo de RAM de la app. «Cargar
  // más» sube el límite. El calendario de ánimo colorea lo que cae en la
  // ventana (60 entradas cubren de sobra el mes que enseña).
  const [limite, setLimite] = useState(PAGINA)
  const entradas = anecdotasRepo.useAll({ limit: limite })
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [animo, setAnimo] = useState('🙂')
  const [fotos, setFotos] = useState<Blob[]>([])
  const inputFotos = useRef<HTMLInputElement>(null)
  /** Visor a pantalla completa: fotos de una anécdota + índice actual. */
  const [visor, setVisor] = useState<{ fotos: Blob[]; idx: number } | null>(null)
  /** Día abierto bajo el calendario; null = ninguno. */
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const lista = entradas ?? []
  // Descendente por id: la primera tarjeta es la misma cuyo ánimo colorea la
  // celda del calendario (que también toma la más reciente del día).
  const delDia = diaSel
    ? lista.filter((a) => a.fecha === diaSel).sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    : []

  const t = useT()

  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos?.length) return
    const nuevas = await Promise.all([...archivos].map(comprimirFoto))
    setFotos((prev) => [...prev, ...nuevas])
    if (inputFotos.current) inputFotos.current.value = ''
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contenido.trim() && fotos.length === 0) return
    // Miniaturas paralelas a las fotos: la rejilla pinta ~200px, no 1280px.
    const miniaturas = fotos.length ? await Promise.all(fotos.map(miniaturaFoto)) : undefined
    await anecdotasRepo.add({
      fecha: hoy(),
      titulo: titulo.trim() || t('anec.sinTitulo', 'Sin título'),
      contenido: contenido.trim(),
      animo,
      fotos: fotos.length ? fotos : undefined,
      miniaturas,
    })
    setTitulo('')
    setContenido('')
    setFotos([])
  }

  return (
    <div data-tut="anecdotario.app" className="mx-auto max-w-2xl space-y-5">
      <form
        data-tut="anecdotario.form"
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <div className="flex gap-2">
          {ANIMOS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAnimo(a)}
              className={`text-2xl transition ${
                animo === a ? 'scale-125' : 'opacity-50 hover:opacity-100'
              }`}
            >
              <Icono emoji={a} />
            </button>
          ))}
        </div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={t('anec.titulo', 'Título del día')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
        />
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder={t('anec.ph', '¿Qué pasó hoy? ¿Qué aprendiste?')}
          rows={4}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30 resize-none"
        />

        {/* fotos por subir */}
        {fotos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                <Foto blob={f} className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  className="ui-noche absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[10px] text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputFotos}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void agregarFotos(e.target.files)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputFotos.current?.click()}
            className="rounded-lg border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-black/40"
          >
            <Icono nombre="foto" /> {t('anec.fotos', 'Fotos')}
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-violet-600 py-2 font-bold texto-cta hover:brightness-110 transition"
          >
            {t('anec.guardar', 'Guardar anécdota')}
          </button>
        </div>
      </form>

      {/* calendario de ánimo (heatmap de emociones) */}
      <div data-tut="anecdotario.calendario">
        <CalendarioAnimo anecdotas={lista} seleccionado={diaSel} onSeleccionar={setDiaSel} />
      </div>


      {/* El día que se toca en el calendario se abre aquí mismo, entero. Sin
          `useEffect`: al borrar su última entrada el panel se va solo y la
          celda vuelve a estar deshabilitada. */}
      {diaSel && delDia.length > 0 && (
        <div data-tut="anecdotario.dia" className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold capitalize">
              {t('anec.dia.titulo', `Recuerdos del ${nombreDia(diaSel)}`, { fecha: nombreDia(diaSel) })}
            </p>
            <button
              onClick={() => setDiaSel(null)}
              aria-label={t('anec.dia.cerrar', 'Cerrar el día')}
              className="ml-auto text-white/30 hover:text-white/70"
            >
              ✕
            </button>
          </div>
          {delDia.map((a) => (
            <TarjetaAnecdota key={a.id ?? a.fecha} a={a} onVerFoto={(fotos, idx) => setVisor({ fotos, idx })} />
          ))}
        </div>
      )}

      <div className="space-y-3" data-tut="anecdotario.lista">
        <Archivador
          items={lista}
          fecha={(a) => a.fecha}
          clave={(a) => a.id ?? a.fecha}
          vacio={t('anec.vacio', 'Tu anecdotario está vacío. Escribe tu primer recuerdo.')}
        >
          {(a) => <TarjetaAnecdota a={a} onVerFoto={(fotos, idx) => setVisor({ fotos, idx })} />}
        </Archivador>
        {lista.length >= limite && (
          <button
            onClick={() => setLimite((n) => n + PAGINA)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('anec.cargarMas', 'Cargar más recuerdos')}
          </button>
        )}
      </div>

      <BarraEjemplo paquete={ejemploAnecdotario} />

      {/* visor de fotos */}
      {visor && (
        <div
          className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          onClick={() => setVisor(null)}
        >
          <Foto
            blob={visor.fotos[visor.idx]}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <button
            onClick={() => setVisor(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
          {visor.fotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setVisor({ ...visor, idx: (visor.idx - 1 + visor.fotos.length) % visor.fotos.length })
                }}
                className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 hover:bg-white/20"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setVisor({ ...visor, idx: (visor.idx + 1) % visor.fotos.length })
                }}
                className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Un recuerdo. Lo pintan igual el día abierto bajo el calendario y el archivador. */
function TarjetaAnecdota({
  a,
  onVerFoto,
}: {
  a: Anecdota
  onVerFoto: (fotos: Blob[], idx: number) => void
}) {
  return (
    <article className="rounded-xl bg-white/5 p-4 border border-white/10">
      <header className="flex items-center gap-2">
        <span className="text-xl"><Icono emoji={a.animo} /></span>
        <h3 className="font-bold">{a.titulo}</h3>
        <span className="ml-auto text-xs text-white/40">{a.fecha}</span>
        <button
          onClick={() => a.id && anecdotasRepo.remove(a.id)}
          className="text-white/30 hover:text-white/70"
        >
          ✕
        </button>
      </header>
      {a.contenido && <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{a.contenido}</p>}
      {a.fotos && a.fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {a.fotos.map((f, i) => (
            <Foto
              key={i}
              // Entradas viejas no tienen miniatura: caen a la foto completa.
              blob={a.miniaturas?.[i] ?? f}
              className="h-24 w-full cursor-zoom-in rounded-lg object-cover transition hover:opacity-80"
              onClick={() => onVerFoto(a.fotos!, i)}
            />
          ))}
        </div>
      )}
    </article>
  )
}
