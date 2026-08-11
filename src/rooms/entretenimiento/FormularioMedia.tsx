import { useEffect, useState } from 'react'
import type { MediaArchivo, ResumenMedia, TipoMedia } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { COLOR, ESTADOS_MEDIA, TIPOS_MEDIA, getTipoMedia } from './constantes'
import { Estrellas } from './Estrellas'
import { hoyISO } from './fecha'
import { buscarPortada, imagenArticulo } from './portadaMedia'
import { Foto } from '../_shared/fotos'
import { completarMediaIA } from './resumenIA'
import { buscarSugerencias, type SugerenciaMedia } from './sugerenciasMedia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Creditos } from '../../core/ui/Creditos'
import { OP_FICHA } from './costosIA'

export function FormularioMedia({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: MediaArchivo
  onGuardado?: () => void
  onCancelar?: () => void
}) {
  const t = useT()
  const [tipo, setTipo] = useState<TipoMedia>(inicial?.tipo ?? 'pelicula')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [genero, setGenero] = useState(inicial?.genero ?? '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [estado, setEstado] = useState<MediaArchivo['estado']>(
    inicial?.estado ?? 'completado',
  )
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0)
  const [resena, setResena] = useState(inicial?.resena ?? '')
  const [autor, setAutor] = useState(inicial?.autor ?? '')
  const [resumen, setResumen] = useState<ResumenMedia | undefined>(inicial?.resumen)
  const [portada, setPortada] = useState(inicial?.portada)
  const [consultando, setConsultando] = useState(false)
  const [errorIA, setErrorIA] = useState('')
  const [wiki, setWiki] = useState(inicial?.resumen?.wiki)
  const [sugerencias, setSugerencias] = useState<SugerenciaMedia[]>([])
  // Al editar una entrada ya guardada el título es el bueno: no se sugiere nada
  // hasta que el usuario lo toque.
  const [buscarTitulo, setBuscarTitulo] = useState(!inicial)

  // Sugerencias mientras se escribe, con pausa para no disparar una petición
  // por tecla; el AbortController descarta las respuestas que llegan tarde.
  useEffect(() => {
    const texto = titulo.trim()
    const ctrl = new AbortController()
    const espera = setTimeout(() => {
      if (!buscarTitulo || texto.length < 3) {
        setSugerencias([])
        return
      }
      void buscarSugerencias(tipo, texto, ctrl.signal).then((res) => {
        if (!ctrl.signal.aborted) setSugerencias(res)
      })
    }, 400)
    return () => {
      clearTimeout(espera)
      ctrl.abort()
    }
  }, [titulo, tipo, buscarTitulo])

  /** Al elegir una sugerencia se fija la obra: título, autor y portada. */
  const elegir = async (s: SugerenciaMedia) => {
    setTitulo(s.titulo)
    setBuscarTitulo(false)
    setSugerencias([])
    setWiki(s.wiki)
    if (!autor.trim() && s.autor) setAutor(s.autor)
    if (s.portada) setPortada(s.portada)
    else if (s.wiki) setPortada(await imagenArticulo(s.wiki).catch(() => undefined))
  }

  /** La IA rellena los campos vacíos y trae sinopsis y portada. */
  const consultarIA = async () => {
    if (consultando || !titulo.trim()) return
    setErrorIA('')
    setConsultando(true)
    try {
      const datos = await completarMediaIA({
        tipo,
        titulo: titulo.trim(),
        autor: autor.trim() || undefined,
        genero: genero.trim() || undefined,
        estado,
        wiki,
      })
      // Si veníamos de una sugerencia, ese artículo manda sobre el que adivine la IA.
      const resumenIA = { ...datos.resumen, wiki: wiki ?? datos.resumen.wiki }
      setResumen(resumenIA)
      // Solo se rellena lo que esté vacío: lo que ya escribiste manda.
      if (!autor.trim() && datos.autor) setAutor(datos.autor)
      if (!genero.trim() && datos.genero) setGenero(datos.genero)
      // Con la obra pendiente la fecha solo puede ser la del estreno; si ya la
      // viste o leíste, la fecha es tuya y no se toca.
      if (estado === 'pendiente' && datos.estreno) setFecha(datos.estreno)
      if (!portada) {
        const url = await buscarPortada({ tipo, titulo: titulo.trim(), autor, resumen: resumenIA })
        if (url) setPortada(url)
      }
    } catch (e) {
      console.warn('[MPH] No se pudo consultar la obra:', e)
      setErrorIA(e instanceof Error ? e.message : t('entre.res.error', 'No se pudo generar el resumen.'))
    } finally {
      setConsultando(false)
    }
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !genero.trim()) return

    const datos = {
      tipo,
      titulo: titulo.trim(),
      genero: genero.trim(),
      fecha,
      estado,
      calificacion,
      resena: resena.trim(),
      autor: autor.trim() || undefined,
      resumen,
      portada,
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }

    if (inicial?.id) await mediaArchivoRepo.update(inicial.id, datos)
    else await mediaArchivoRepo.add(datos)

    onGuardado?.()
  }

  const input =
    'w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-emerald-400/50'

  // La clave vive en el chat: se relee en cada render por si se configuró mientras tanto.
  const conIA = iaActiva() && titulo.trim().length > 2

  return (
    <form
      onSubmit={guardar}
      className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
    >
      <p className="text-sm font-semibold">
        <Icono nombre={inicial ? 'editar' : 'agregar'} />{' '}
        {inicial ? t('entre.form.editarTitulo', 'Editar entrada') : t('entre.form.añadirTitulo', 'Añadir al archivo')}
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {TIPOS_MEDIA.map((tipoItem) => (
          <button
            key={tipoItem.id}
            type="button"
            onClick={() => setTipo(tipoItem.id)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              tipo === tipoItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tipo === tipoItem.id ? { background: COLOR } : undefined}
          >
            <Icono emoji={tipoItem.icon} /> {tipoItem.label}
          </button>
        ))}
      </div>

      <input
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value)
          setBuscarTitulo(true)
        }}
        placeholder={t('entre.form.titulo', 'Título')}
        required
        className={input}
      />

      {/* Coincidencias mientras escribes: al elegir una, se fija la obra. */}
      {sugerencias.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <p className="px-2.5 pt-2 text-[10px] font-bold uppercase tracking-wide text-white/35">
            {t('entre.form.sugerencias', '¿Cuál es?')}
          </p>
          <ul className="divide-y divide-white/5">
            {sugerencias.map((s) => (
              <li key={`${s.wiki ?? s.titulo}-${s.detalle}`}>
                <button
                  type="button"
                  onClick={() => void elegir(s)}
                  className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-white/10"
                >
                  {s.miniatura ? (
                    <img
                      src={s.miniatura}
                      alt=""
                      className="h-10 w-7 shrink-0 rounded border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="w-7 shrink-0 text-center text-lg">
                      <Icono emoji={getTipoMedia(tipo).icon} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{s.titulo}</span>
                    {s.detalle && <span className="block truncate text-[11px] text-white/40">{s.detalle}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* La carátula se ve aunque no haya IA: la traen ya las sugerencias.
          La subida a mano manda sobre la remota (ver MiniPortada). */}
      {(portada || inicial?.portadaFoto) && (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
          {inicial?.portadaFoto ? (
            <Foto
              blob={inicial.portadaFoto}
              className="h-24 w-16 shrink-0 rounded-md border border-white/10 object-cover"
            />
          ) : (
            <img
              src={portada}
              alt={titulo}
              className="h-24 w-16 shrink-0 rounded-md border border-white/10 object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => {
              setPortada(undefined)
              if (inicial?.id) void mediaArchivoRepo.update(inicial.id, { portadaFoto: undefined })
            }}
            className="text-xs text-white/35 hover:text-red-400"
          >
            {t('entre.port.quitar', 'Quitar portada')}
          </button>
        </div>
      )}

      {/* En cuanto hay título, la IA puede rellenar la ficha entera. */}
      {conIA && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          {consultando ? (
            <p className="flex items-center gap-2 text-xs text-white/50">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
              {t('entre.form.consultando', 'Buscando la obra…')}
            </p>
          ) : !resumen ? (
            <>
              <button
                type="button"
                onClick={consultarIA}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-black hover:opacity-90"
                style={{ background: COLOR }}
              >
                <Icono nombre="brillo" /> {t('entre.form.completarIA', 'Completar con IA')}
                <Creditos op={OP_FICHA} />
              </button>
              <p className="text-[11px] text-white/40">
                {t('entre.form.completarAyuda', 'Rellena autor y género, y trae sinopsis y portada.')}
              </p>
            </>
          ) : (
            <>
              {resumen.ficha && <p className="text-[11px] text-white/45">{resumen.ficha}</p>}
              <p className="text-xs text-white/70 leading-relaxed">{resumen.sinopsis}</p>
              {resumen.claves.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resumen.claves.map((clave) => (
                    <span key={clave} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
                      {clave}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={consultarIA} className="text-xs text-white/35 hover:text-white/70">
                  {t('entre.res.rehacer', 'Rehacer')}
                </button>
                <button
                  type="button"
                  onClick={() => setResumen(undefined)}
                  className="text-xs text-white/35 hover:text-red-400"
                >
                  {t('entre.res.quitar', 'Quitar')}
                </button>
              </div>
            </>
          )}
          {errorIA && <p className="text-[10px] text-red-300">{errorIA}</p>}
        </div>
      )}

      <input
        value={autor}
        onChange={(e) => setAutor(e.target.value)}
        placeholder={t('entre.form.autor', 'Autor / director / desarrollador (opcional)')}
        className={input}
      />

      <input
        value={genero}
        onChange={(e) => setGenero(e.target.value)}
        placeholder={t('entre.form.genero', 'Género')}
        required
        className={input}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">
          {t('entre.form.fecha', 'Fecha (consumo o estreno)')}
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
        <label className="text-xs text-white/50">
          {t('entre.form.estado', 'Estado')}
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as MediaArchivo['estado'])}
            className={`mt-0.5 ${input}`}
          >
            {ESTADOS_MEDIA.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs text-white/50 mb-1">{t('entre.form.calificacion', 'Tu calificación')}</p>
        <Estrellas valor={calificacion} onChange={setCalificacion} />
      </div>

      <textarea
        value={resena}
        onChange={(e) => setResena(e.target.value)}
        placeholder={t('entre.form.ph.resena', 'Tu reseña…')}
        rows={4}
        className={`${input} resize-none`}
      />

      <div className="flex gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="flex-1 rounded-xl py-2.5 font-semibold bg-white/5 hover:bg-white/10">
            {t('entre.form.cancelar', 'Cancelar')}
          </button>
        )}
        <button type="submit" className="flex-1 rounded-xl py-2.5 font-bold text-black hover:opacity-90" style={{ background: COLOR }}>
          {inicial ? t('entre.form.guardar', 'Guardar cambios') : t('entre.form.guardarNuevo', 'Añadir al archivo')}
        </button>
      </div>
    </form>
  )
}
