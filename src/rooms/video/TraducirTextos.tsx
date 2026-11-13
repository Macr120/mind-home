import { useEffect, useRef, useState } from 'react'
import { mensajeErrorIA } from '../../core/cuenta/api'
import { costoOp, hayCreditos } from '../../core/cuenta/costos'
import type { ClipVideo, MedioVideo } from '../../core/data/db'
import { IDIOMAS } from '../../core/i18n/idiomas'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Creditos } from '../../core/ui/Creditos'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Campo, INPUT, Modal, Spinner } from '../_shared/ui'
import { COLOR } from './constantes'
import { Pildora } from './EditarConIA'
import type { ProyectoAbierto } from './modelo'
import { conVozIA, creditosTextos, cuentaPorGrupo, GRUPOS_TEXTOS, piezasDe, traducirTextosProyecto, type GrupoTextos } from './traduccionTextos'

const NOMBRE_GRUPO: Record<GrupoTextos, [string, string]> = {
  titulos: ['video.traducirTextos.titulos', 'Títulos y rótulos'],
  narraciones: ['video.traducirTextos.narraciones', 'Narraciones'],
  avatares: ['video.traducirTextos.avatares', 'Avatares'],
}

/**
 * «Traducir textos»: lo escrito del proyecto (títulos, guiones de narración y
 * líneas de avatares) a otro idioma, sin tocar el audio del video. 1 crédito
 * por cada 20 textos; rehacer las voces IA, 3 por línea. Se puede deshacer.
 */
export function TraducirTextos({
  proyecto,
  medios,
  onAplicar,
  onRehacerVoces,
  onCerrar,
}: {
  proyecto: ProyectoAbierto
  medios: MedioVideo[]
  onAplicar: (clips: ClipVideo[]) => void
  /** Rehace la voz IA de estos clips con su texto nuevo (cobra la tarifa de la voz IA). */
  onRehacerVoces: (ids: string[]) => Promise<void>
  onCerrar: () => void
}) {
  const t = useT()
  const cuenta = cuentaPorGrupo(proyecto.clips)
  const [grupos, setGrupos] = useState<Set<GrupoTextos>>(() => new Set(GRUPOS_TEXTOS.filter((g) => cuenta[g] > 0)))
  const [idiomaId, setIdiomaId] = useState<string>(() => (IDIOMAS.find((i) => i.id === 'en') ?? IDIOMAS[0]).id)
  const idioma = IDIOMAS.find((i) => i.id === idiomaId) ?? IDIOMAS[0]
  const [rehacerVoz, setRehacerVoz] = useState(true)
  const [progreso, setProgreso] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState<{ traducidos: number; voces: number; previos: ClipVideo[] } | null>(null)
  const vivo = useRef(true)
  useEffect(
    () => () => {
      vivo.current = false
    },
    [],
  )

  const piezas = piezasDe(proyecto.clips, grupos)
  const voces = conVozIA(proyecto.clips, piezas, medios)
  const creditosTexto = creditosTextos(piezas) * costoOp('texto')
  const creditosVoz = rehacerVoz ? voces.length * costoOp('tts') : 0
  const total = creditosTexto + creditosVoz
  const nombreIdioma = t(idioma.clave, idioma.label)

  const alternar = (g: GrupoTextos) =>
    setGrupos((prev) => {
      const s = new Set(prev)
      if (s.has(g)) s.delete(g)
      else s.add(g)
      return s
    })

  const correr = async () => {
    if (
      hayCreditos() &&
      !(await confirmar({
        titulo: t('video.editarIA.costoTitulo', 'Usar {n} créditos', { n: total }),
        mensaje: [
          t('video.traducirTextos.costoMsg', 'Traducir {n} textos: {c} créditos (1 por cada 20 textos).', { n: piezas.length, c: creditosTexto }),
          creditosVoz > 0 ? t('video.traducirTextos.costoVoz', 'Rehacer {n} voces IA: {c} créditos (3 por voz).', { n: voces.length, c: creditosVoz }) : '',
        ]
          .filter(Boolean)
          .join(' '),
        textoOk: t('video.editarIA.costoOk', 'Continuar'),
      }))
    )
      return
    setError('')
    try {
      const r = await traducirTextosProyecto(proyecto.clips, piezas, medios, idioma, (n, tot) =>
        vivo.current && setProgreso(t('video.traducirVideo.traduciendo', 'Traduciendo… {n}/{total}', { n, total: tot })),
      )
      const previos = proyecto.clips
      onAplicar(r.clips)
      if (rehacerVoz && r.sinVoz.length) {
        if (vivo.current) setProgreso(t('video.traducirTextos.voces', 'Rehaciendo las voces…'))
        await onRehacerVoces(r.sinVoz)
      }
      if (vivo.current) setHecho({ traducidos: r.traducidos, voces: rehacerVoz ? r.sinVoz.length : 0, previos })
    } catch (e) {
      if (vivo.current) setError(mensajeErrorIA(e, t, t('video.traducirTextos.error', 'No se pudieron traducir los textos')))
    } finally {
      if (vivo.current) setProgreso(null)
    }
  }

  if (hecho) {
    return (
      <Modal titulo={t('video.traducirTextos.listo', 'Textos traducidos al {idioma}', { idioma: nombreIdioma })} onCerrar={onCerrar}>
        <ul className="space-y-1 text-xs text-white/60">
          <li className="flex items-center gap-1.5">
            <Icono nombre="hecho" /> {t('video.traducirTextos.res', '{n} textos traducidos', { n: hecho.traducidos })}
          </li>
          {hecho.voces > 0 && (
            <li className="flex items-center gap-1.5">
              <Icono nombre="hecho" /> {t('video.traducirTextos.resVoces', '{n} voces rehechas', { n: hecho.voces })}
            </li>
          )}
        </ul>
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
    <Modal titulo={t('video.traducirTextos.titulo', 'Traducir textos')} onCerrar={onCerrar}>
      <p className="text-xs text-white/55">
        {t('video.traducirTextos.intro', 'Los títulos, guiones de narración y líneas de los avatares pasan a otro idioma. El audio del video no se toca: para eso está «Traducir video».')}
      </p>
      <Campo etiqueta={t('video.traducirVideo.idioma', 'Idioma')}>
        <select value={idiomaId} onChange={(e) => setIdiomaId(e.target.value)} className={INPUT}>
          {IDIOMAS.map((i) => (
            <option key={i.id} value={i.id}>
              {t(i.clave, i.label)} · {i.endonimo}
            </option>
          ))}
        </select>
      </Campo>
      <div className="flex flex-wrap gap-1.5">
        {GRUPOS_TEXTOS.filter((g) => cuenta[g] > 0).map((g) => (
          <Pildora key={g} activo={grupos.has(g)} onClick={() => alternar(g)}>
            {t(NOMBRE_GRUPO[g][0], NOMBRE_GRUPO[g][1])} · {cuenta[g]}
          </Pildora>
        ))}
        {voces.length > 0 && (
          <Pildora activo={rehacerVoz} onClick={() => setRehacerVoz((x) => !x)}>
            {t('video.traducirTextos.rehacerVoz', 'Rehacer las voces IA ({n})', { n: voces.length })}
          </Pildora>
        )}
      </div>
      {piezas.length === 0 && <p className="text-xs text-amber-300">{t('video.traducirTextos.vacio', 'No hay textos que traducir.')}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <BotonPrimario type="button" app={COLOR} disabled={ocupado || piezas.length === 0} onClick={() => void correr()}>
        {ocupado ? <Spinner pequeno /> : <Icono nombre="idiomas" />} {ocupado ? progreso : t('video.traducirVideo.boton', 'Traducir al {idioma}', { idioma: nombreIdioma })}{' '}
        {!ocupado && <Creditos n={total} />}
      </BotonPrimario>
      {hayCreditos() && (
        <p className="text-[11px] text-white/45">
          {t('video.traducirTextos.tarifa', 'Tarifa: 1 crédito por cada 20 textos; rehacer una voz IA, 3.')}
        </p>
      )}
    </Modal>
  )
}
