import { useRef, useState } from 'react'
import type { PerfilIdioma } from '../../core/data/db'
import { VACIO, materialesIdiomaRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Foto, comprimirFoto } from '../_shared/fotos'
import { COLOR } from './constantes'
import { hablar, hayTTS } from './tts'

/**
 * Material propio de un tema del temario: apuntes de texto e imágenes que sube
 * el usuario (fotos de la pizarra, tablas de conjugación, capturas…). Las
 * notas se pueden escuchar con la voz del idioma.
 */
export function MaterialPanel({ perfil, tema, onCerrar }: {
  perfil: PerfilIdioma
  tema: { id: string; titulo: string }
  onCerrar: () => void
}) {
  const t = useT()
  const inputImagenes = useRef<HTMLInputElement>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [borrandoId, setBorrandoId] = useState<number | null>(null)

  const conTTS = hayTTS()
  const material = (materialesIdiomaRepo.useAll() ?? VACIO).filter(
    (m) => m.idiomaId === perfil.id && m.temaId === tema.id,
  )

  const agregarImagenes = async (archivos: FileList | null) => {
    const idiomaId = perfil.id
    if (!archivos?.length || idiomaId == null) return
    setSubiendo(true)
    for (const archivo of Array.from(archivos)) {
      const blob = await comprimirFoto(archivo)
      await materialesIdiomaRepo.add({
        idiomaId,
        temaId: tema.id,
        tipo: 'imagen',
        titulo: archivo.name.replace(/\.[^.]+$/, '').slice(0, 60),
        blob,
        creadoEn: new Date().toISOString(),
      })
    }
    setSubiendo(false)
    if (inputImagenes.current) inputImagenes.current.value = ''
  }

  const guardarNota = async () => {
    const idiomaId = perfil.id
    if (!texto.trim() || idiomaId == null) return
    await materialesIdiomaRepo.add({
      idiomaId,
      temaId: tema.id,
      tipo: 'texto',
      titulo: titulo.trim().slice(0, 60),
      texto: texto.trim(),
      creadoEn: new Date().toISOString(),
    })
    setTitulo('')
    setTexto('')
  }

  const inputBase =
    'w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-white/30'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        className="ui-panel max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-white/10 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            <Icono nombre="carpeta" /> {t('idiomas.mat.titulo', 'Mi material')}
            <span className="text-white/40"> · {tema.titulo}</span>
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded px-2 py-1 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        <p className="text-xs leading-relaxed text-white/45">
          {t('idiomas.mat.desc', 'Guarda aquí tus apuntes y fotos de este tema: la pizarra de la clase, una tabla de conjugación, una captura o tus propias notas.')}
        </p>

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t('idiomas.mat.tituloPh', 'Título de la nota (opcional)')}
            className={inputBase}
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder={t('idiomas.mat.textoPh', 'Pega o escribe tus apuntes…')}
            className={`${inputBase} resize-none`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void guardarNota()}
              disabled={!texto.trim()}
              className="flex-1 rounded-lg py-2 text-sm font-semibold text-black transition disabled:opacity-40"
              style={{ background: COLOR }}
            >
              <Icono nombre="nota" /> {t('idiomas.mat.guardarNota', 'Guardar nota')}
            </button>
            <button
              type="button"
              onClick={() => inputImagenes.current?.click()}
              disabled={subiendo}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              <Icono nombre="imagen" />{' '}
              {subiendo ? t('idiomas.mat.subiendo', 'Subiendo…') : t('idiomas.mat.subirImagen', 'Subir imagen')}
            </button>
          </div>
          <input
            ref={inputImagenes}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void agregarImagenes(e.target.files)}
          />
        </div>

        {material.length === 0 ? (
          <p className="rounded-xl bg-black/20 px-3 py-4 text-center text-xs text-white/40">
            {t('idiomas.mat.vacio', 'Todavía no subes nada a este tema.')}
          </p>
        ) : (
          material.map((m) => (
            <div key={m.id} className="space-y-2 rounded-xl bg-black/20 p-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                  <Icono nombre={m.tipo === 'imagen' ? 'imagen' : 'nota'} />{' '}
                  {m.titulo || t('idiomas.mat.sinTitulo', 'Nota')}
                </span>
                {m.tipo === 'texto' && conTTS && (
                  <button
                    type="button"
                    onClick={() => hablar(m.texto ?? '', perfil.codigo)}
                    className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                    title={t('idiomas.voc.escuchar', 'Escuchar')}
                  >
                    <Icono nombre="bocina" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBorrandoId(m.id ?? null)}
                  className="shrink-0 rounded-lg bg-white/5 px-2 py-1.5 text-xs transition hover:bg-white/10"
                  title={t('idiomas.mat.borrar', 'Borrar material')}
                >
                  <Icono nombre="basura" />
                </button>
              </div>

              {m.tipo === 'imagen' && m.blob && (
                <Foto blob={m.blob} className="w-full rounded-lg" />
              )}
              {m.tipo === 'texto' && (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/60">{m.texto}</p>
              )}

              {borrandoId === m.id && (
                <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-2">
                  <span className="min-w-0 flex-1 text-[11px] text-red-200/90">
                    {t('idiomas.mat.confirmarBorrar', '¿Borrar este material?')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBorrandoId(null)}
                    className="rounded-lg bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
                  >
                    {t('idiomas.form.cancelar', 'Cancelar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (m.id != null) void materialesIdiomaRepo.remove(m.id)
                      setBorrandoId(null)
                    }}
                    className="rounded-lg bg-red-500/80 px-2.5 py-1 text-xs font-semibold"
                  >
                    {t('idiomas.voc.siBorrar', 'Borrar')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
