import { useRef, useState } from 'react'
import type { Hobby, ProyectoHobby, SesionHobby } from '../../core/data/db'
import { proyectosHobbyRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { comprimirFoto, Foto } from '../_shared/fotos'
import { fmtMin, hoyISO, rgba } from './stats'

/**
 * Un proyecto por dentro: su descripción, sus fotos de avance y su propio
 * cronograma de metas (las mismas del calendario, acotadas a `proyecto:<id>`).
 */
export function DetalleProyecto({
  hobby,
  proyecto,
  sesiones,
  onVolver,
}: {
  hobby: Hobby
  proyecto: ProyectoHobby
  sesiones: SesionHobby[]
  onVolver: () => void
}) {
  const t = useT()
  const [renombrando, setRenombrando] = useState(false)
  const [nombreTmp, setNombreTmp] = useState(proyecto.nombre)
  const [nota, setNota] = useState(proyecto.nota ?? '')
  const [visor, setVisor] = useState<number | null>(null)
  const inputFotos = useRef<HTMLInputElement>(null)

  const imagenes = proyecto.imagenes ?? []
  const suyas = sesiones.filter((s) => s.proyectoId === proyecto.id)
  const min = suyas.reduce((acc, s) => acc + s.minutos, 0)

  const guardarNombre = () => {
    const n = nombreTmp.trim()
    if (n) void proyectosHobbyRepo.update(proyecto.id!, { nombre: n })
    setRenombrando(false)
  }

  const alternar = () =>
    proyectosHobbyRepo.update(
      proyecto.id!,
      proyecto.estado === 'en-curso'
        ? { estado: 'terminado', terminadoEn: hoyISO() }
        : { estado: 'en-curso', terminadoEn: undefined },
    )

  const agregarFotos = async (files: FileList | null) => {
    if (!files?.length) return
    const nuevas = await Promise.all([...files].map(comprimirFoto))
    await proyectosHobbyRepo.update(proyecto.id!, { imagenes: [...imagenes, ...nuevas] })
    if (inputFotos.current) inputFotos.current.value = ''
  }

  const quitarFoto = (i: number) =>
    proyectosHobbyRepo.update(proyecto.id!, { imagenes: imagenes.filter((_, j) => j !== i) })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg px-2 py-1 text-lg hover:bg-white/10"
          title={t('hobbies.proy.volver', 'Volver al hobby')}
        >
          ‹
        </button>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
          style={{ background: rgba(hobby.color, 0.2) }}
        >
          <Icono nombre={proyecto.estado === 'terminado' ? 'hecho' : 'herramienta'} />
        </span>
        {renombrando ? (
          <input
            autoFocus
            value={nombreTmp}
            onChange={(e) => setNombreTmp(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardarNombre()
              else if (e.key === 'Escape') setRenombrando(false)
            }}
            maxLength={60}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-lg font-bold outline-none focus:border-white/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNombreTmp(proyecto.nombre)
              setRenombrando(true)
            }}
            title={t('hobbies.proy.renombrar', 'Renombrar el proyecto')}
            className="min-w-0 flex-1 truncate text-left text-lg font-bold hover:opacity-80"
          >
            {proyecto.nombre}
          </button>
        )}
        <button
          type="button"
          onClick={alternar}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          {proyecto.estado === 'en-curso'
            ? t('hobbies.proy.terminar', 'Terminar')
            : t('hobbies.proy.reabrir', 'Reabrir')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <p className="text-sm font-bold">{suyas.length}</p>
          <p className="text-[9px] text-white/40">{t('hobbies.proy.sesiones', 'Sesiones')}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <p className="text-sm font-bold">{fmtMin(min)}</p>
          <p className="text-[9px] text-white/40">{t('hobbies.stat.total', 'Total')}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <p className="text-sm font-bold">{imagenes.length}</p>
          <p className="text-[9px] text-white/40">{t('hobbies.proy.fotos', 'Fotos')}</p>
        </div>
      </div>

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => void proyectosHobbyRepo.update(proyecto.id!, { nota: nota.trim() || undefined })}
        placeholder={t('hobbies.proy.notaPh', '¿De qué va este proyecto? Materiales, ideas, referencias...')}
        rows={3}
        className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
      />

      <div data-tut="hobbies.proyecto.fotos" className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">
            <Icono nombre="foto" /> {t('hobbies.proy.avance', 'Avance en fotos')}
          </p>
          <button
            type="button"
            onClick={() => inputFotos.current?.click()}
            className="rounded-lg bg-white/10 px-3 py-1 text-[11px] font-semibold hover:bg-white/15"
          >
            {t('hobbies.proy.subir', '+ Subir imagen')}
          </button>
        </div>
        <input
          ref={inputFotos}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void agregarFotos(e.target.files)}
        />
        {imagenes.length === 0 ? (
          <p className="py-2 text-center text-xs text-white/35">
            {t('hobbies.proy.sinFotos', 'Sin fotos todavía. Sube una para ver cómo avanza.')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {imagenes.map((img, i) => (
              <div key={i} className="relative">
                <Foto
                  blob={img}
                  className="h-24 w-full cursor-zoom-in rounded-lg object-cover transition hover:opacity-80"
                  onClick={() => setVisor(i)}
                />
                <button
                  type="button"
                  onClick={() => void quitarFoto(i)}
                  title={t('hobbies.proy.borrarFoto', 'Borrar imagen')}
                  className="ui-noche absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[10px] text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Las metas del proyecto: mismas funciones que el cronograma del calendario
          (sub-metas, fechas, pasos, plan con IA), acotadas a este proyecto. */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex h-96 flex-col">
          <CronogramaApp plantillaId="hobbies" ambitoId={`proyecto:${proyecto.id}`} />
        </div>
      </div>

      {visor != null && imagenes[visor] && (
        <div
          className="ui-noche fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          onClick={() => setVisor(null)}
        >
          <Foto blob={imagenes[visor]} className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            type="button"
            onClick={() => setVisor(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
          {imagenes.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setVisor((v) => ((v ?? 0) - 1 + imagenes.length) % imagenes.length)
                }}
                className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white/80 hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setVisor((v) => ((v ?? 0) + 1) % imagenes.length)
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
