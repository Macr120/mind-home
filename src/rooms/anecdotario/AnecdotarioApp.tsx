import { useRef, useState } from 'react'
import { anecdotasRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { fechaLocalISO } from '../../core/fechaLocal'
import { comprimirFoto, Foto } from '../_shared/fotos'
import { CalendarioAnimo } from './CalendarioAnimo'
import { ANIMOS } from './animos'

const hoy = () => fechaLocalISO()

export function AnecdotarioApp() {
  const entradas = anecdotasRepo.useAll()
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [animo, setAnimo] = useState('🙂')
  const [fotos, setFotos] = useState<Blob[]>([])
  const inputFotos = useRef<HTMLInputElement>(null)
  /** Visor a pantalla completa: fotos de una anécdota + índice actual. */
  const [visor, setVisor] = useState<{ fotos: Blob[]; idx: number } | null>(null)
  /** Día elegido en el calendario (filtra la lista); null = todas. */
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const lista = entradas ?? []
  const listaVisible = diaSel ? lista.filter((a) => a.fecha === diaSel) : lista

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
    await anecdotasRepo.add({
      fecha: hoy(),
      titulo: titulo.trim() || t('anec.sinTitulo', 'Sin título'),
      contenido: contenido.trim(),
      animo,
      fotos: fotos.length ? fotos : undefined,
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
      <CalendarioAnimo anecdotas={lista} seleccionado={diaSel} onSeleccionar={setDiaSel} />

      {diaSel && (
        <button
          onClick={() => setDiaSel(null)}
          className="flex items-center gap-2 rounded-full bg-violet-400/15 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-400/25"
        >
          {t('anec.cal.filtro', 'Mostrando {fecha}', { fecha: diaSel })} ✕
        </button>
      )}

      <div className="space-y-3" data-tut="anecdotario.lista">
        {lista.length === 0 && (
          <p className="text-center text-white/40 text-sm py-8">
            {t('anec.vacio', 'Tu anecdotario está vacío. Escribe tu primer recuerdo.')}
          </p>
        )}
        {listaVisible.map((a) => (
          <article
            key={a.id}
            className="rounded-xl bg-white/5 p-4 border border-white/10"
          >
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
            {a.contenido && (
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">
                {a.contenido}
              </p>
            )}
            {a.fotos && a.fotos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {a.fotos.map((f, i) => (
                  <Foto
                    key={i}
                    blob={f}
                    className="h-24 w-full cursor-zoom-in rounded-lg object-cover transition hover:opacity-80"
                    onClick={() => setVisor({ fotos: a.fotos!, idx: i })}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

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
