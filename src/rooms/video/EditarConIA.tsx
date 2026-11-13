import { useEffect, useRef, useState } from 'react'
import { MOODS_LISTA } from '../../core/audio/temas'
import { mensajeErrorIA } from '../../core/cuenta/api'
import { costoOp, hayCreditos, opImagen } from '../../core/cuenta/costos'
import { mediosVideoRepo } from '../../core/data/repository'
import { generarImagen } from '../../core/imagenIA'
import { useAjustes } from '../../core/state/ajustesStore'
import type { ClipVideo, FiltroEscena, MedioVideo, MovimientoClip } from '../../core/data/db'
import { useT, type TFunc } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { analizarLinea, creditosEscucha, type AnalisisLinea, type FaseAnalisis } from './analisis'
import { COLOR } from './constantes'
import { conPaquete, creditosPaquete } from './paqueteVideo'
import {
  aplicarPlan,
  clipApoyo,
  dichoEntre,
  ESTILOS_EDICION,
  planearEdicion,
  type EstiloEdicion,
  type OpcionesEdicion,
  type PlanEdicion,
  type ResultadoEdicion,
} from './iaEdicion'
import { nombreTransicion } from './RejillaTransiciones'
import { PedirCambios } from './CambiosPorChat'
import { borrarEstilo, esElEstilo, estilosDeFabrica, estilosPropios, guardarEstilo, type EstiloGuardado } from './estilosEdicion'
import { musicaDeFondo } from './musicaFondo'
import { recortarAAspecto } from './Secciones'
import { reencuadrarClips } from './reencuadre'
import { sonidoFabrica } from './sonidos'
import { clipsDe, type ProyectoAbierto } from './modelo'

type Interruptor = Exclude<keyof OpcionesEdicion, 'instrucciones' | 'estilo'>

const INTERRUPTORES: { id: Interruptor; clave: string; es: string }[] = [
  { id: 'subtitulos', clave: 'video.editarIA.op.subtitulos', es: 'Subtítulos' },
  { id: 'silencios', clave: 'video.editarIA.op.silencios', es: 'Quitar silencios' },
  { id: 'titulos', clave: 'video.editarIA.op.titulos', es: 'Títulos' },
  { id: 'efectos', clave: 'video.editarIA.op.efectos', es: 'Efectos y transiciones' },
  { id: 'filtros', clave: 'video.editarIA.op.filtros', es: 'Filtros de color' },
  { id: 'sonidos', clave: 'video.editarIA.op.sonidos', es: 'Efectos de sonido' },
  { id: 'musica', clave: 'video.editarIA.op.musica', es: 'Música de fondo' },
  { id: 'limpiarVoz', clave: 'video.editarIA.op.limpiarVoz', es: 'Limpiar la voz' },
  { id: 'apoyos', clave: 'video.editarIA.op.apoyos', es: 'Imágenes de apoyo' },
]

const NOMBRE_ESTILO: Record<EstiloEdicion, [string, string]> = {
  dinamico: ['video.editarIA.estilo.dinamico', 'Dinámico'],
  elegante: ['video.editarIA.estilo.elegante', 'Elegante'],
  divertido: ['video.editarIA.estilo.divertido', 'Divertido'],
  profesional: ['video.editarIA.estilo.profesional', 'Profesional'],
  cine: ['video.editarIA.estilo.cine', 'Cinematográfico'],
}

/** Texto del progreso del análisis (compartido con el clipeado). */
export function textoProgreso(t: TFunc, fase: FaseAnalisis, hecho: number, total: number): string {
  if (fase === 'audio') return t('video.editarIA.escuchando', 'Escuchando el audio… {n}/{total}', { n: hecho, total })
  if (fase === 'video') return t('video.editarIA.mirando', 'Mirando el video… {n}/{total}', { n: hecho, total })
  return t('video.editarIA.pensando', 'La IA está decidiendo…')
}

const fmtDuracion = (seg: number) => {
  const s = Math.round(seg)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Antes de cobrar, dice cuánto: la tarifa del paquete (1 crédito por cada 25 s,
 * todo incluido). Con claves propias no hay créditos que avisar.
 */
export async function avisarCreditos(t: TFunc, segundos: number, creditos: number): Promise<boolean> {
  if (!hayCreditos()) return true
  return confirmar({
    titulo: t('video.editarIA.costoTitulo', 'Usar {n} créditos', { n: creditos }),
    mensaje: t(
      'video.editarIA.costoMsg',
      'El video dura {dur}: son {n} créditos (1 por cada 25 s, todo incluido). Lo que no se use, como los tramos sin voz, se devuelve al terminar.',
      { dur: fmtDuracion(segundos), n: creditos },
    ),
    textoOk: t('video.editarIA.costoOk', 'Continuar'),
  })
}

/** La tarifa, bajo el botón (solo con créditos). */
export function NotaTarifa() {
  const t = useT()
  if (!hayCreditos()) return null
  return <p className="text-[11px] text-white/45">{t('video.editarIA.tarifa', 'Tarifa: 1 crédito por cada 25 s de video, todo incluido.')}</p>
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

interface ItemPlan {
  clave: string
  icono: NombreIcono
  texto: string
  detalle?: string
}

/** Las cosas del plan, una por casilla (la clave dice qué parte del plan es). */
function itemsDelPlan(t: TFunc, plan: PlanEdicion, a: AnalisisLinea, hayMusica: boolean, nombreFoto: (id: number) => string | undefined = () => undefined): ItemPlan[] {
  const items: ItemPlan[] = []
  const nombreFiltro: Record<FiltroEscena, string> = {
    ninguno: t('video.filtro.ninguno', 'Sin filtro'),
    bn: t('video.filtro.bn', 'B/N'),
    sepia: t('video.filtro.sepia', 'Sepia'),
    calido: t('video.filtro.calido', 'Cálido'),
    frio: t('video.filtro.frio', 'Frío'),
    oscuro: t('video.filtro.oscuro', 'Oscuro'),
  }
  if (plan.silencios.length) {
    const seg = plan.silencios.reduce((s, [x, y]) => s + y - x, 0)
    items.push({ clave: 'silencios', icono: 'tijeras', texto: t('video.editarIA.plan.silencios', 'Quitar {n} silencios ({s} s)', { n: plan.silencios.length, s: seg.toFixed(1) }) })
  }
  plan.cortes.forEach((c, i) => {
    const dicho = dichoEntre(a, c.desde, c.hasta)
    items.push({
      clave: `corte-${i}`,
      icono: 'tijeras',
      texto: t('video.editarIA.plan.corte', 'Quitar {desde}–{hasta}', { desde: mmss(c.desde), hasta: mmss(c.hasta) }) + (dicho ? `: «${dicho.slice(0, 80)}»` : ''),
      detalle: c.motivo || undefined,
    })
  })
  if (plan.subtitulos) {
    items.push({
      clave: 'subtitulos',
      icono: 'letra',
      texto: plan.subtitulos.karaoke
        ? t('video.editarIA.plan.karaoke', 'Subtítulos karaoke: la palabra que suena se ilumina')
        : t('video.editarIA.op.subtitulos', 'Subtítulos'),
    })
  }
  if (plan.destacados.length) {
    items.push({
      clave: 'destacados',
      icono: 'estrella',
      texto: t('video.editarIA.plan.destacados', 'Palabras clave en color'),
      detalle: plan.destacados.map((d) => `${d.palabra}${d.emoji}`).join(' · '),
    })
  }
  plan.titulos.forEach((x, i) =>
    items.push({ clave: `titulo-${i}`, icono: 'letra', texto: `${t('video.editarIA.plan.titulo1', 'Título en {t}', { t: mmss(x.inicio) })}: «${x.texto.contenido}»` }),
  )
  plan.efectos.forEach((e, i) =>
    items.push({ clave: `efecto-${i}`, icono: 'brillo', texto: t('video.editarIA.plan.efecto', '{efecto} en {t}', { efecto: nombreTransicion(t, e.tipo), t: mmss(e.en) }) }),
  )
  plan.filtros.forEach((f, i) =>
    items.push({
      clave: `filtro-${i}`,
      icono: 'paleta',
      texto: t('video.editarIA.plan.filtro', 'Filtro {filtro} de {desde} a {hasta}', { filtro: nombreFiltro[f.filtro], desde: mmss(f.desde), hasta: mmss(f.hasta) }),
    }),
  )
  plan.sonidos.forEach((x, i) => {
    const son = sonidoFabrica(x.clave)
    items.push({
      clave: `sonido-${i}`,
      icono: 'musica',
      texto: t('video.editarIA.plan.sonido', 'Sonido «{nombre}» en {t}', { nombre: son ? t(son.claveNombre, son.es) : x.clave, t: mmss(x.en) }),
    })
  })
  const nombreMov: Record<MovimientoClip, string> = {
    zoomIn: t('video.movimiento.zoomIn', 'Acercar lento'),
    zoomOut: t('video.movimiento.zoomOut', 'Alejar lento'),
    punch: t('video.movimiento.punch', 'Golpe de zoom'),
    panIzq: t('video.movimiento.panIzq', 'Paneo a la izquierda'),
    panDer: t('video.movimiento.panDer', 'Paneo a la derecha'),
  }
  plan.movimientos.forEach((m, i) =>
    items.push({
      clave: `movimiento-${i}`,
      icono: 'foto',
      texto: t('video.editarIA.plan.movimiento', '{mov} de {desde} a {hasta}', { mov: nombreMov[m.tipo], desde: mmss(m.desde), hasta: mmss(m.hasta) }),
    }),
  )
  plan.velocidades.forEach((v, i) =>
    items.push({
      clave: `velocidad-${i}`,
      icono: 'cronometro',
      texto: t('video.editarIA.plan.velocidad', 'Velocidad {v}× de {desde} a {hasta}', { v: v.velocidad, desde: mmss(v.desde), hasta: mmss(v.hasta) }),
    }),
  )
  if (plan.color) items.push({ clave: 'color', icono: 'paleta', texto: t('video.editarIA.plan.color', 'Corrección de color de todo el video') })
  if (plan.musica) {
    items.push({
      clave: 'musica',
      icono: 'musica',
      texto: t('video.editarIA.plan.musica', 'Música de fondo «{vibe}» que baja sola cuando alguien habla', {
        vibe: t(`ajustes.musica.mood.${plan.musica.vibe}`, MOODS_LISTA.find((m) => m.id === plan.musica?.vibe)?.defecto ?? plan.musica.vibe),
      }),
      detalle: hayMusica ? t('video.editarIA.plan.musicaReemplaza', 'Reemplaza la música que ya tiene el proyecto') : undefined,
    })
  }
  plan.apoyos.forEach((x, i) => {
    const foto = x.fotoId != null ? nombreFoto(x.fotoId) : undefined
    items.push({
      clave: `apoyo-${i}`,
      icono: 'imagen',
      texto: t('video.editarIA.plan.apoyo', 'Imagen de apoyo de {desde} a {hasta}', { desde: mmss(x.desde), hasta: mmss(x.hasta) }),
      detalle: foto
        ? t('video.editarIA.plan.apoyoFoto', 'Tu foto «{nombre}»', { nombre: foto })
        : t('video.editarIA.plan.apoyoIA', 'Se genera con IA: {idea}', { idea: x.idea.slice(0, 120) }),
    })
  })
  if (plan.limpiarVoz) {
    items.push({
      clave: 'limpiarVoz',
      icono: 'microfono',
      texto: t('video.editarIA.plan.limpiarVoz', 'Limpiar la voz: menos retumbe y siseo, volumen más parejo'),
    })
  }
  return items
}

/** Botón-píldora con estado (opciones de la IA). */
export function Pildora({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        activo ? 'border-white/60 bg-white/20 text-white' : 'border-white/15 text-white/55 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * «Editar video con IA»: la IA escucha y mira la pista principal y la edita
 * (subtítulos, cortes, títulos, efectos, filtros y sonidos). Se aplica de una
 * vez y se puede deshacer desde el resumen.
 */
export function EditarConIA({
  proyecto,
  medios,
  onAplicar,
  onCerrar,
}: {
  proyecto: ProyectoAbierto
  medios: MedioVideo[]
  /** Reemplaza los clips del proyecto (también para deshacer). */
  onAplicar: (clips: ClipVideo[]) => void
  onCerrar: () => void
}) {
  const t = useT()
  const hayMusica = proyecto.clips.some((c) => c.pista === 'musica')
  const [opciones, setOpciones] = useState<OpcionesEdicion>({
    instrucciones: '',
    estilo: proyecto.aspecto === '9:16' ? 'dinamico' : 'profesional',
    subtitulos: true,
    silencios: true,
    titulos: true,
    efectos: true,
    filtros: false,
    sonidos: false,
    // Si ya hay música, no se toca salvo que se pida.
    musica: !hayMusica,
    limpiarVoz: true,
    apoyos: false,
  })
  const calidad = useAjustes((s) => s.calidadImagen)
  const [propios, setPropios] = useState<EstiloGuardado[]>(estilosPropios)
  const [nombreNuevo, setNombreNuevo] = useState<string | null>(null)
  const fabrica = estilosDeFabrica(t)
  const fotos = medios.filter((m) => m.tipo === 'imagen' && m.id != null).map((m) => ({ id: m.id!, nombre: m.nombre }))
  const nombreFoto = (id: number) => fotos.find((f) => f.id === id)?.nombre
  const [progreso, setProgreso] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState<{ resultado: ResultadoEdicion; previos: ClipVideo[] } | null>(null)
  /** Lo que propuso la IA, a la espera de que se marque qué aplicar (ya está pagado). */
  const [propuesta, setPropuesta] = useState<{ plan: PlanEdicion; analisis: AnalisisLinea } | null>(null)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  // Formato del proyecto ≠ formato del video (vertical con un video horizontal, o al revés): reencuadrar ayuda.
  const desajuste = clipsDe(proyecto.clips, 'video').some((c) => {
    if (c.fuente.tipo !== 'video' || (c.ajuste ?? 'cubrir') !== 'cubrir') return false
    const fuente = c.fuente
    const m = medios.find((x) => x.id === fuente.medioId)
    if (!m?.ancho || !m.alto) return false
    const horizontalMedio = m.ancho > m.alto * 1.1
    return proyecto.aspecto === '16:9' ? m.alto > m.ancho * 1.1 : horizontalMedio
  })
  const [reencuadrar, setReencuadrar] = useState(desajuste)
  const vivo = useRef(true)
  useEffect(
    () => () => {
      vivo.current = false
    },
    [],
  )

  const principal = clipsDe(proyecto.clips, 'video')
  const segVideo = principal.filter((c) => c.fuente.tipo === 'video').reduce((s, c) => s + c.duracion, 0)
  const hayVideo = segVideo > 0
  // Lo ya escuchado en la sesión no se vuelve a pagar; la decisión, como mínimo 1 tramo.
  const tramos = Math.max(1, creditosEscucha(principal, medios))
  const creditos = creditosPaquete('video.editar', tramos)

  const correr = async () => {
    if (!(await avisarCreditos(t, segVideo, creditos))) return
    setError('')
    setProgreso(t('video.editarIA.preparando', 'Preparando…'))
    try {
      const r = await conPaquete(
        'video.editar',
        tramos,
        async () => {
          const analisis = await analizarLinea(principal, medios, {
            vertical: proyecto.aspecto === '9:16',
            alProgreso: (fase, n, total) => vivo.current && setProgreso(textoProgreso(t, fase, n, total)),
          })
          if (vivo.current) setProgreso(textoProgreso(t, 'ia', 0, 0))
          return { analisis, plan: await planearEdicion(proyecto, analisis, opciones, fotos) }
        },
        (x) => Math.max(1, x.analisis.escuchados),
      )
      if (!vivo.current) return
      // Todo marcado de entrada: se desmarca lo que no convenza.
      setMarcados(new Set(itemsDelPlan(t, r.plan, r.analisis, hayMusica, nombreFoto).map((i) => i.clave)))
      setPropuesta(r)
    } catch (e) {
      if (vivo.current) setError(mensajeErrorIA(e, t, t('video.editarIA.error', 'No se pudo editar el video')))
    } finally {
      if (vivo.current) setProgreso(null)
    }
  }

  const aplicar = async () => {
    if (!propuesta) return
    const { plan, analisis } = propuesta
    const si = (clave: string) => marcados.has(clave)
    const elegido: PlanEdicion = {
      ...plan,
      silencios: si('silencios') ? plan.silencios : [],
      cortes: plan.cortes.filter((_, i) => si(`corte-${i}`)),
      subtitulos: si('subtitulos') ? plan.subtitulos : null,
      destacados: si('destacados') ? plan.destacados : [],
      titulos: plan.titulos.filter((_, i) => si(`titulo-${i}`)),
      efectos: plan.efectos.filter((_, i) => si(`efecto-${i}`)),
      filtros: plan.filtros.filter((_, i) => si(`filtro-${i}`)),
      sonidos: plan.sonidos.filter((_, i) => si(`sonido-${i}`)),
      movimientos: plan.movimientos.filter((_, i) => si(`movimiento-${i}`)),
      velocidades: plan.velocidades.filter((_, i) => si(`velocidad-${i}`)),
      color: si('color') ? plan.color : null,
      musica: si('musica') ? plan.musica : null,
      limpiarVoz: si('limpiarVoz') && plan.limpiarVoz,
      apoyos: plan.apoyos.filter((_, i) => si(`apoyo-${i}`)),
    }
    try {
      const resultado = aplicarPlan(proyecto, analisis, elegido)
      const previos = proyecto.clips
      // Música de fondo: el vibe se renderiza en el Studio de audio y entra como medio propio.
      if (elegido.musica) {
        setProgreso(t('video.editarIA.musicaPreparando', 'Preparando la música…'))
        const musica = await musicaDeFondo(elegido.musica.vibe, elegido.musica.volumen, resultado.clips)
        if (musica) {
          resultado.clips = [...resultado.clips.filter((c) => c.pista !== 'musica'), musica.clip]
          resultado.musica = musica.nombre
        }
      }
      // Imágenes de apoyo: la foto elegida o una generada con IA (tarifa de imagen). Si una falla
      // (sin créditos, contenido…), las que faltan se saltan y se avisa; lo demás se aplica igual.
      const generar = resultado.apoyos.filter((x) => x.fotoId == null).length
      let hechas = 0
      let fallo = ''
      const nuevos: ClipVideo[] = []
      for (const x of resultado.apoyos) {
        if (x.fotoId != null) {
          nuevos.push(clipApoyo(x, x.fotoId))
          continue
        }
        if (fallo) continue
        setProgreso(t('video.editarIA.apoyoGenerando', 'Generando imagen {n}/{total}…', { n: hechas + 1, total: generar }))
        try {
          const { blob, ancho, alto } = await recortarAAspecto(await generarImagen(x.idea, 1280, undefined, proyecto.aspecto, calidad), proyecto.aspecto)
          const medioId = await mediosVideoRepo.add({ tipo: 'imagen', nombre: x.idea.slice(0, 40), blob, ancho, alto, miniatura: blob, origen: 'ia', creadoEn: new Date().toISOString() })
          nuevos.push(clipApoyo(x, medioId))
          hechas++
        } catch (e) {
          fallo = mensajeErrorIA(e, t, t('video.editarIA.apoyoError', 'No se pudo generar una imagen de apoyo'))
        }
      }
      resultado.clips = [...resultado.clips, ...nuevos]
      resultado.apoyosPuestos = nuevos.length
      if (fallo) setError(fallo)
      // Reencuadre (local y gratis): el encuadre sigue la cara en cada clip de video.
      if (reencuadrar) {
        setProgreso(t('video.reencuadre.buscando', 'Buscando la cara…'))
        const r = await reencuadrarClips(resultado.clips, (n, tot) =>
          vivo.current && setProgreso(t('video.reencuadre.progreso', 'Buscando la cara… {n}/{total} s', { n, total: tot })),
        )
        resultado.clips = r.clips
        resultado.reencuadrados = r.reencuadrados
      }
      if (!vivo.current) return
      onAplicar(resultado.clips)
      setHecho({ resultado, previos })
    } catch (e) {
      setError(mensajeErrorIA(e, t, t('video.editarIA.error', 'No se pudo editar el video')))
    } finally {
      if (vivo.current) setProgreso(null)
    }
  }

  if (propuesta && !hecho) {
    const items = itemsDelPlan(t, propuesta.plan, propuesta.analisis, hayMusica, nombreFoto)
    // Lo único que aún cuesta: las imágenes de apoyo que se generan con IA.
    const costoImagenes = costoOp(opImagen(calidad), propuesta.plan.apoyos.filter((x, i) => x.fotoId == null && marcados.has(`apoyo-${i}`)).length)
    const alternar = (clave: string) =>
      setMarcados((prev) => {
        const nuevo = new Set(prev)
        if (nuevo.has(clave)) nuevo.delete(clave)
        else nuevo.add(clave)
        return nuevo
      })
    return (
      <Modal titulo={t('video.editarIA.plan.titulo', 'Lo que propone la IA')} onCerrar={onCerrar} ancho="max-w-lg">
        {propuesta.plan.resumen && <p className="text-sm text-white/80">{propuesta.plan.resumen}</p>}
        {items.length === 0 ? (
          <p className="text-xs text-white/50">{t('video.editarIA.sinCambios', 'La IA no encontró nada que cambiar.')}</p>
        ) : (
          <>
            <p className="text-xs text-white/50">{t('video.editarIA.plan.intro', 'Desmarca lo que no quieras y aplica el resto.')}</p>
            <ul className="max-h-[45vh] space-y-1 overflow-y-auto">
              {items.map((i) => (
                <li key={i.clave}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                    <input type="checkbox" className="mt-1" checked={marcados.has(i.clave)} onChange={() => alternar(i.clave)} />
                    <span className="shrink-0 text-white/60">
                      <Icono nombre={i.icono} />
                    </span>
                    <span className="min-w-0">
                      <span className="block">{i.texto}</span>
                      {i.detalle && <span className="block text-[11px] text-white/45">{i.detalle}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <BotonSecundario onClick={() => setPropuesta(null)}>
            <Icono nombre="volver" /> {t('video.editarIA.plan.volver', 'Volver')}
          </BotonSecundario>
          <BotonPrimario type="button" app={COLOR} disabled={(marcados.size === 0 && !reencuadrar) || progreso != null} onClick={() => void aplicar()}>
            {progreso != null ? <Spinner pequeno /> : <Icono nombre="hecho" />}{' '}
            {progreso ?? t('video.editarIA.plan.aplicar', 'Aplicar {n}', { n: marcados.size })}
            {progreso == null && <Creditos n={costoImagenes} />}
          </BotonPrimario>
        </div>
      </Modal>
    )
  }

  if (hecho) {
    const r = hecho.resultado
    const lineas = [
      r.cortes > 0 && t('video.editarIA.res.cortes', 'Se quitaron {n} tramos ({s} s)', { n: r.cortes, s: r.segundosQuitados.toFixed(1) }),
      r.subtitulos > 0 && t('video.editarIA.res.subtitulos', '{n} subtítulos', { n: r.subtitulos }),
      r.titulos > 0 && t('video.editarIA.res.titulos', '{n} títulos', { n: r.titulos }),
      r.efectos > 0 && t('video.editarIA.res.efectos', '{n} efectos', { n: r.efectos }),
      r.sonidos > 0 && t('video.editarIA.res.sonidos', '{n} efectos de sonido', { n: r.sonidos }),
      (r.apoyosPuestos ?? 0) > 0 && t('video.editarIA.res.apoyos', '{n} imágenes de apoyo', { n: r.apoyosPuestos ?? 0 }),
      r.musica && t('video.editarIA.res.musica', 'Música de fondo: {nombre}', { nombre: r.musica }),
      (r.reencuadrados ?? 0) > 0 && t('video.editarIA.res.reencuadre', '{n} clips siguen la cara', { n: r.reencuadrados ?? 0 }),
    ].filter(Boolean) as string[]
    return (
      <Modal titulo={t('video.editarIA.listo', 'Video editado')} onCerrar={onCerrar}>
        {r.resumen && <p className="text-sm text-white/80">{r.resumen}</p>}
        {lineas.length > 0 ? (
          <ul className="space-y-1 text-xs text-white/60">
            {lineas.map((l) => (
              <li key={l} className="flex items-center gap-1.5">
                <Icono nombre="hecho" /> {l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-white/50">{t('video.editarIA.sinCambios', 'La IA no encontró nada que cambiar.')}</p>
        )}
        {error && <p className="text-xs text-amber-300">{error}</p>}
        <p className="text-xs text-white/40">{t('video.editarIA.retocar', 'Todo quedó en la línea de tiempo: retócalo clip por clip como cualquier otro.')}</p>
        <div className="rounded-xl border border-white/10 p-2">
          <p className="mb-1.5 text-xs font-semibold text-white/70">{t('video.chat.retocar', '¿Algo que cambiar? Pídelo:')}</p>
          <PedirCambios clips={proyecto.clips} onAplicar={onAplicar} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <BotonSecundario
            onClick={() => {
              onAplicar(hecho.previos)
              onCerrar()
            }}
          >
            <Icono nombre="deshacer" /> {t('video.editarIA.deshacer', 'Deshacer')}
          </BotonSecundario>
          <BotonPrimario type="button" app={COLOR} onClick={onCerrar}>
            {t('video.editarIA.aceptar', 'Listo')}
          </BotonPrimario>
        </div>
      </Modal>
    )
  }

  const ocupado = progreso != null
  return (
    <Modal titulo={t('video.editarIA.titulo', 'Editar video con IA')} onCerrar={onCerrar}>
      <p className="text-xs text-white/55">
        {t('video.editarIA.intro', 'La IA escucha y mira tu video, y lo edita: subtítulos, cortes, títulos, efectos especiales y más.')}
      </p>
      {!hayVideo && <p className="text-xs text-amber-300">{t('video.editarIA.sinVideo', 'Añade primero un video a la pista principal.')}</p>}
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.estilos.titulo', 'Estilos guardados')}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {[...fabrica, ...propios].map((e) => (
            <span key={e.id} className="inline-flex items-center">
              <Pildora activo={esElEstilo(e, opciones)} onClick={() => setOpciones(e.opciones)}>
                {e.nombre}
              </Pildora>
              {!e.id.startsWith('fab-') && (
                <button
                  type="button"
                  aria-label={t('video.estilos.borrar', 'Borrar el estilo')}
                  title={t('video.estilos.borrar', 'Borrar el estilo')}
                  onClick={() => setPropios(borrarEstilo(e.id))}
                  className="ms-0.5 rounded-full p-0.5 text-white/40 hover:text-white"
                >
                  <Icono nombre="cerrar" />
                </button>
              )}
            </span>
          ))}
          {nombreNuevo == null ? (
            <button
              type="button"
              onClick={() => setNombreNuevo('')}
              className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-white/55 hover:bg-white/10"
            >
              <Icono nombre="guardar" /> {t('video.estilos.guardar', 'Guardar como estilo')}
            </button>
          ) : (
            <form
              className="flex items-center gap-1"
              onSubmit={(ev) => {
                ev.preventDefault()
                if (!nombreNuevo.trim()) return
                setPropios(guardarEstilo(nombreNuevo, opciones))
                setNombreNuevo(null)
              }}
            >
              <input
                autoFocus
                value={nombreNuevo}
                maxLength={30}
                onChange={(ev) => setNombreNuevo(ev.target.value)}
                placeholder={t('video.estilos.nombrePh', 'Nombre del estilo')}
                className={`${INPUT} !w-36 !py-1 text-xs`}
              />
              <BotonSecundario pequeno type="submit" disabled={!nombreNuevo.trim()}>
                {t('video.estilos.ok', 'Guardar')}
              </BotonSecundario>
            </form>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.editarIA.estilo', 'Estilo')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ESTILOS_EDICION.map((e) => (
            <Pildora key={e} activo={opciones.estilo === e} onClick={() => setOpciones((o) => ({ ...o, estilo: e }))}>
              {t(NOMBRE_ESTILO[e][0], NOMBRE_ESTILO[e][1])}
            </Pildora>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-white/50">{t('video.editarIA.que', 'Qué hacer')}</p>
        <div className="flex flex-wrap gap-1.5">
          {INTERRUPTORES.map((x) => (
            <Pildora key={x.id} activo={opciones[x.id]} onClick={() => setOpciones((o) => ({ ...o, [x.id]: !o[x.id] }))}>
              {t(x.clave, x.es)}
            </Pildora>
          ))}
          {desajuste && (
            <Pildora activo={reencuadrar} onClick={() => setReencuadrar((x) => !x)}>
              {t('video.editarIA.op.reencuadre', 'Reencuadrar siguiendo la cara')}
            </Pildora>
          )}
        </div>
      </div>
      <Campo etiqueta={t('video.editarIA.indicaciones', 'Indicaciones (opcional)')}>
        <textarea
          value={opciones.instrucciones}
          onChange={(e) => setOpciones((o) => ({ ...o, instrucciones: e.target.value }))}
          rows={2}
          placeholder={t('video.editarIA.indicacionesPh', 'Quita las muletillas, títulos en amarillo, zoom en los chistes…')}
          className={INPUT}
        />
      </Campo>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario type="button" app={COLOR} disabled={ocupado || !hayVideo} onClick={() => void correr()}>
        {ocupado ? <Spinner pequeno /> : <Icono nombre="brillo" />} {ocupado ? progreso : t('video.editarIA.boton', 'Editar con IA')}{' '}
        {!ocupado && <Creditos n={creditos} />}
      </BotonPrimario>
      <NotaTarifa />
      <p className="text-xs text-white/40">{t('video.editarIA.nota', 'Puedes deshacerlo al terminar. Los subtítulos salen de lo que se dice en el video.')}</p>
    </Modal>
  )
}
