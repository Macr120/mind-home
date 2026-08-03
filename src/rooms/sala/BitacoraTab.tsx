import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useRef, useState } from 'react'
import type { LugarViaje, RecuerdoViaje } from '../../core/data/db'
import { VACIO, bitacoraViajeRepo, portadasLugarRepo, portadasViajeRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useT } from '../../core/i18n/useT'
import { comprimirFoto, Foto } from './fotos'
import { HojaItinerario } from './HojaItinerario'

interface Props {
  lugares: LugarViaje[]
  /** Lugar preseleccionado (llegando desde el mapa). */
  lugarInicial: number | null
}

type Visor = { fotos: Blob[]; idx: number }

/** Formulario inline para añadir un recuerdo (foto + anécdota) a un lugar. */
function FormRecuerdo({ lugar, onListo }: { lugar: LugarViaje; onListo: () => void }) {
  const t = useT()
  const [fecha, setFecha] = useState(lugar.fechaVisita ?? fechaLocalISO())
  const [texto, setTexto] = useState('')
  const [fotos, setFotos] = useState<Blob[]>([])
  const inputFotos = useRef<HTMLInputElement>(null)

  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos?.length) return
    const nuevas = await Promise.all([...archivos].map(comprimirFoto))
    setFotos((prev) => [...prev, ...nuevas])
    if (inputFotos.current) inputFotos.current.value = ''
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim() && fotos.length === 0) return
    await bitacoraViajeRepo.add({
      lugarId: lugar.id!,
      fecha,
      texto: texto.trim(),
      fotos: fotos.length ? fotos : undefined,
      creadoEn: new Date().toISOString(),
    })
    onListo()
  }

  return (
    <form onSubmit={guardar} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-white/30"
      />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t('sala.bit.ph', '¿Qué pasó ahí? Tu anécdota…')}
        rows={3}
        autoFocus
        className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
      />
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
          className="rounded-lg border border-white/10 bg-black/25 px-4 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-black/40"
        >
          <Icono nombre="foto" /> {t('sala.bit.foto', 'Foto')}
        </button>
        <button
          type="submit"
          disabled={!texto.trim() && fotos.length === 0}
          className="flex-1 rounded-lg bg-teal-600 py-1.5 text-sm font-bold texto-cta transition hover:brightness-110 disabled:opacity-40"
        >
          {t('sala.bit.guardar', 'Guardar recuerdo')}
        </button>
      </div>
    </form>
  )
}

/** Tarjeta tipo álbum: foto de portada (o fondo con emoji) + título sobre degradado. */
function TarjetaAlbum({
  portada,
  emoji,
  titulo,
  subtitulo,
  chip,
  onClick,
  onPortada,
  tituloPortada,
  tut,
}: {
  portada: Blob | null
  emoji: string
  titulo: string
  subtitulo: string
  chip?: string
  onClick: () => void
  /** Si se define, muestra un botoncito 🖼️ para subir la portada sin abrir la carpeta. */
  onPortada?: () => void
  tituloPortada?: string
  /** Ancla para los tutoriales guiados. */
  tut?: string
}) {
  return (
    <div
      onClick={onClick}
      data-tut={tut}
      className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left transition hover:border-white/25"
    >
      {portada ? (
        <Foto
          blob={portada}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-500/15 via-transparent to-violet-500/15 text-4xl transition group-hover:scale-110">
          <Icono emoji={emoji} />
        </div>
      )}
      {chip && (
        <span className="ui-noche absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">
          <Icono nombre="foto" /> {chip}
        </span>
      )}
      {onPortada && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPortada()
          }}
          title={tituloPortada}
          className="ui-noche absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur transition hover:bg-black/85"
        >
          <Icono nombre="imagen" />
        </button>
      )}
      <div className="ui-noche absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
        <p className="truncate text-sm font-bold text-white">{titulo}</p>
        <p className="truncate text-[10px] text-white/60">{subtitulo}</p>
      </div>
    </div>
  )
}

/** Submenú 4 · Bitácora: álbumes por país → tarjetas de lugares → recuerdos. */
export function BitacoraTab({ lugares, lugarInicial }: Props) {
  const t = useT()
  const entradas = bitacoraViajeRepo.useAll() ?? VACIO
  const portadas = portadasViajeRepo.useAll() ?? VACIO
  const portadaPais = useMemo(
    () => new Map(portadas.map((p) => [p.pais, p])),
    [portadas],
  )
  const portadasLug = portadasLugarRepo.useAll() ?? VACIO
  const portadaLugar = useMemo(
    () => new Map(portadasLug.map((p) => [p.lugarId, p])),
    [portadasLug],
  )

  const visitados = useMemo(
    () =>
      lugares
        .filter((l) => l.visitado === 1)
        .sort((a, b) => (b.fechaVisita ?? '').localeCompare(a.fechaVisita ?? '')),
    [lugares],
  )
  const porLugar = useMemo(() => {
    const mapa = new Map<number, RecuerdoViaje[]>()
    for (const e of entradas) {
      mapa.set(e.lugarId, [...(mapa.get(e.lugarId) ?? []), e])
    }
    return mapa
  }, [entradas])

  /** Carpetas: un álbum por país, ordenadas por visita más reciente. */
  const paises = useMemo(() => {
    const mapa = new Map<string, LugarViaje[]>()
    for (const l of visitados) {
      mapa.set(l.pais, [...(mapa.get(l.pais) ?? []), l])
    }
    return [...mapa.entries()]
  }, [visitados])

  const [paisSel, setPaisSel] = useState<string | null>(null)
  const [lugarSel, setLugarSel] = useState<number | null>(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [verPlan, setVerPlan] = useState(false)
  const [visor, setVisor] = useState<Visor | null>(null)
  const inputPortada = useRef<HTMLInputElement>(null)
  /** Álbum al que se le va a subir portada (país o lugar). */
  const [portadaTarget, setPortadaTarget] = useState<
    { tipo: 'pais'; pais: string } | { tipo: 'lugar'; id: number } | null
  >(null)

  const pedirPortada = (target: { tipo: 'pais'; pais: string } | { tipo: 'lugar'; id: number }) => {
    setPortadaTarget(target)
    inputPortada.current?.click()
  }

  /** Sube (o reemplaza) la foto de portada del álbum apuntado (país o lugar). */
  const cambiarPortada = async (archivos: FileList | null) => {
    if (!archivos?.length || !portadaTarget) return
    const foto = await comprimirFoto(archivos[0])
    if (portadaTarget.tipo === 'pais') {
      const existente = portadaPais.get(portadaTarget.pais)
      if (existente?.id) await portadasViajeRepo.update(existente.id, { foto })
      else await portadasViajeRepo.add({ pais: portadaTarget.pais, foto })
    } else {
      const existente = portadaLugar.get(portadaTarget.id)
      if (existente?.id) await portadasLugarRepo.update(existente.id, { foto })
      else await portadasLugarRepo.add({ lugarId: portadaTarget.id, foto })
    }
    setPortadaTarget(null)
    if (inputPortada.current) inputPortada.current.value = ''
  }

  // Llegada desde el mapa: abre el álbum del país y el lugar con el form listo
  // (ajuste en render; si el lugar aún no carga, se reintenta al llegar `lugares`).
  const [procesado, setProcesado] = useState<number | null>(null)
  if (lugarInicial && procesado !== lugarInicial) {
    const l = lugares.find((x) => x.id === lugarInicial)
    if (l) {
      setProcesado(lugarInicial)
      setPaisSel(l.pais)
      setLugarSel(lugarInicial)
      setFormAbierto(true)
    }
  }

  const fotosDe = (ls: LugarViaje[]) => {
    let n = 0
    for (const l of ls) for (const r of porLugar.get(l.id!) ?? []) n += r.fotos?.length ?? 0
    return n
  }
  const portadaDe = (ls: LugarViaje[]): Blob | null => {
    for (const l of ls) {
      for (const r of porLugar.get(l.id!) ?? []) {
        if (r.fotos?.length) return r.fotos[0]
      }
    }
    return null
  }

  const lugaresTxt = (n: number) =>
    n === 1
      ? t('sala.bit.unLugar', '1 lugar')
      : t('sala.bit.nLugares', '{n} lugares').replace('{n}', String(n))
  const recuerdosTxt = (n: number) =>
    n === 1
      ? t('sala.bit.unRecuerdo', '1 recuerdo')
      : t('sala.bit.nRecuerdos', '{n} recuerdos').replace('{n}', String(n))

  const lugar = lugarSel ? visitados.find((l) => l.id === lugarSel) : null

  // ── Nivel 3: recuerdos de un lugar ────────────────────────────────────────
  if (lugar) {
    const recuerdos = porLugar.get(lugar.id!) ?? []
    return (
      <div data-tut="sala.bitacora.recuerdos" className="space-y-3">
        <header className="flex items-center gap-2">
          <button
            onClick={() => {
              setLugarSel(null)
              setFormAbierto(false)
              setVerPlan(false)
            }}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/15"
          >
            ‹ {lugar.pais}
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold"><Icono nombre="ubicacion" /> {lugar.nombre}</h3>
            <p className="truncate text-[11px] text-white/45">
              {[lugar.ciudad, lugar.estado].filter(Boolean).join(', ')}
              {lugar.fechaVisita
                ? ` · ${t('sala.bit.visitadoEl', 'visitado el {f}').replace('{f}', lugar.fechaVisita)}`
                : ''}
            </p>
          </div>
          <button
            onClick={() => setVerPlan((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              verPlan ? 'bg-teal-600 texto-cta' : 'bg-white/5 hover:bg-white/15'
            }`}
          >
            <Icono nombre="lista" /> {t('sala.bit.itinerario', 'Itinerario')}
          </button>
          {!formAbierto && (
            <button
              onClick={() => setFormAbierto(true)}
              className="rounded-lg bg-teal-600/80 px-2.5 py-1.5 text-xs font-semibold texto-cta hover:brightness-110"
            >
              <Icono nombre="agregar" /> {t('sala.bit.recuerdo', 'Recuerdo')}
            </button>
          )}
        </header>

        {verPlan && <HojaItinerario lugar={lugar} />}

        {formAbierto && <FormRecuerdo lugar={lugar} onListo={() => setFormAbierto(false)} />}

        {recuerdos.length === 0 && !formAbierto && (
          <p className="py-6 text-center text-sm text-white/40">
            {t('sala.bit.sinRecuerdos', 'Sin recuerdos todavía: guarda una foto y tu anécdota.')}
          </p>
        )}

        {recuerdos.map((e) => (
          <div key={e.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {e.fotos && e.fotos.length > 0 && (
              <Foto
                blob={e.fotos[0]}
                className="h-44 w-full cursor-zoom-in object-cover transition hover:opacity-90"
                onClick={() => setVisor({ fotos: e.fotos!, idx: 0 })}
              />
            )}
            <div className="p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40">{e.fecha}</span>
                <button
                  onClick={() => e.id && void bitacoraViajeRepo.remove(e.id)}
                  className="ml-auto text-white/30 hover:text-white/70"
                >
                  ✕
                </button>
              </div>
              {e.texto && <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{e.texto}</p>}
              {e.fotos && e.fotos.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {e.fotos.slice(1).map((f, i) => (
                    <Foto
                      key={i}
                      blob={f}
                      className="h-16 w-full cursor-zoom-in rounded-lg object-cover transition hover:opacity-80"
                      onClick={() => setVisor({ fotos: e.fotos!, idx: i + 1 })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {visor && <VisorFotos visor={visor} setVisor={setVisor} />}
      </div>
    )
  }

  // ── Nivel 2: lugares (tarjetas) de un país ────────────────────────────────
  if (paisSel) {
    const delPais = visitados.filter((l) => l.pais === paisSel)
    return (
      <div className="space-y-3">
        <header className="flex items-center gap-2">
          <button
            onClick={() => setPaisSel(null)}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/15"
          >
            ‹ {t('sala.bit.albumes', 'Álbumes')}
          </button>
          <h3 className="min-w-0 flex-1 truncate font-bold"><Icono nombre="carpeta" /> {paisSel}</h3>
          <span className="text-[11px] text-white/40">{lugaresTxt(delPais.length)}</span>
          <button
            onClick={() => pedirPortada({ tipo: 'pais', pais: paisSel })}
            title={t('sala.bit.portadaPaisTip', 'Elegir foto de portada de esta carpeta')}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/15"
          >
            <Icono nombre="imagen" /> {t('sala.bit.portada', 'Portada')}
          </button>
          <input
            ref={inputPortada}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void cambiarPortada(e.target.files)}
          />
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {delPais.map((l) => {
            const recuerdos = porLugar.get(l.id!) ?? []
            const nFotos = fotosDe([l])
            return (
              <TarjetaAlbum
                key={l.id}
                tut={`sala.bitacora.lugar.${l.id}`}
                portada={portadaLugar.get(l.id!)?.foto ?? portadaDe([l])}
                emoji="📍"
                titulo={l.nombre}
                subtitulo={l.fechaVisita ?? recuerdosTxt(recuerdos.length)}
                chip={nFotos > 0 ? String(nFotos) : undefined}
                onClick={() => setLugarSel(l.id!)}
                onPortada={() => pedirPortada({ tipo: 'lugar', id: l.id! })}
                tituloPortada={t('sala.bit.portadaLugarTip', 'Elegir foto de portada de este lugar')}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // ── Nivel 1: carpetas por país ────────────────────────────────────────────
  return (
    <div data-tut="sala.bitacora" className="space-y-3">
      {visitados.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">
          {t('sala.bit.sinVisitados', 'La bitácora se escribe con lugares visitados. Pon un pin en el mapa o marca con ✓ tu itinerario.')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {paises.map(([pais, ls]) => {
            const nFotos = fotosDe(ls)
            return (
              <TarjetaAlbum
                key={pais}
                tut={`sala.bitacora.album.${pais}`}
                portada={portadaPais.get(pais)?.foto ?? portadaDe(ls)}
                emoji="🌍"
                titulo={pais}
                subtitulo={lugaresTxt(ls.length)}
                chip={nFotos > 0 ? String(nFotos) : undefined}
                onClick={() => setPaisSel(pais)}
                onPortada={() => pedirPortada({ tipo: 'pais', pais })}
                tituloPortada={t('sala.bit.portadaPaisTip', 'Elegir foto de portada de esta carpeta')}
              />
            )
          })}
        </div>
      )}
      <input
        ref={inputPortada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void cambiarPortada(e.target.files)}
      />
    </div>
  )
}

/** Visor de fotos a pantalla completa. */
function VisorFotos({ visor, setVisor }: { visor: Visor; setVisor: (v: Visor | null) => void }) {
  return (
    <div
      className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
      onClick={() => setVisor(null)}
    >
      <Foto blob={visor.fotos[visor.idx]} className="max-h-full max-w-full rounded-xl object-contain" />
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
  )
}
