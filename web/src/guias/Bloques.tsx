import { useEffect, useState } from 'react'
import type { T, Visual } from './datos'

interface Foto { archivo: string; autor: string; fuente: string }
/** `credito` sustituye al «autor · Pexels» del pie (Wikimedia lleva licencia; vacío = sin pie). */
interface LaminaMedio extends Foto { tipo: 'foto' | 'video'; credito?: string }
const MEDIOS = import.meta.glob<{ fotos: Record<string, Foto>; laminas?: Record<string, LaminaMedio> }>('../../../marketing/guias/*/medios.json', { eager: true, import: 'default' })

/**
 * Los bloques visuales que acompañan cada línea del guion. Cada uno es
 * contenido de la página (se lee sin audio) y, mientras su línea suena,
 * se resalta (`activo`).
 */
export function Bloque({ v, tema, t }: { v: Visual; tema: string; t: T }) {
  const k = (s: string) => t(`${tema}.${s}`)
  switch (v.tipo) {
    case 'dato':
      return (
        <div className="g-dato">
          <strong>{v.cifra}</strong>
          <span>{k(`dato.${v.clave}`)}</span>
        </div>
      )
    case 'lista':
      return (
        <ul className="g-lista">
          {v.claves!.map((c) => {
            const det = t(`${tema}.lista.${c}Det`)
            return (
              <li key={c}>
                <b>{k(`lista.${c}`)}</b>
                {det !== `${tema}.lista.${c}Det` && <span>{det}</span>}
              </li>
            )
          })}
        </ul>
      )
    case 'pasos':
      return (
        <ol className="g-pasos">
          {v.claves!.map((c, i) => (
            <li key={c}>
              <i>{i + 1}</i>
              <div>
                <b>{k(`pasos.${c}`)}</b>
                <span>{k(`pasos.${c}Det`)}</span>
              </div>
            </li>
          ))}
        </ol>
      )
    case 'grafica':
      return <Grafica id={v.grafica!} k={k} />
    case 'foto': {
      const f = MEDIOS[`../../../marketing/guias/${tema}/medios.json`]?.fotos[v.foto!]
      if (!f) return null
      return (
        <figure className="g-foto">
          <img src={`/guias/${tema}/${f.archivo}`} alt="" loading="lazy" />
          <figcaption>
            <a href={f.fuente} rel="noopener" target="_blank">
              {f.autor} · Pexels
            </a>
          </figcaption>
        </figure>
      )
    }
    case 'cita':
      return (
        <blockquote className="g-cita">
          <p>«{k('cita.texto')}»</p>
          <cite>{k('cita.autor')}</cite>
        </blockquote>
      )
    case 'aviso':
      return null // el aviso médico va fijo al pie de la parte
    default:
      return null
  }
}

function Grafica({ id, k }: { id: string; k: (s: string) => string }) {
  if (id === 'supercompensacion') {
    return (
      <figure className="g-grafica">
        <svg viewBox="0 0 400 180" role="img" aria-label={k('grafica.supercompensacion')}>
          <line x1="20" y1="100" x2="390" y2="100" className="g-eje" strokeDasharray="4 5" />
          <text x="24" y="92" className="g-rotulo">{k('grafica.base')}</text>
          <path d="M20 100 H90 C120 100 125 150 160 152 C200 154 215 100 245 72 C270 50 300 60 330 70 H390" className="g-curva" />
          <rect x="90" y="30" width="44" height="140" rx="6" className="g-franja" />
          <text x="112" y="24" textAnchor="middle" className="g-rotulo">{k('grafica.estimulo')}</text>
          <text x="160" y="172" textAnchor="middle" className="g-rotulo">{k('grafica.fatiga')}</text>
          <text x="214" y="128" textAnchor="middle" className="g-rotulo">{k('grafica.recupera')}</text>
          <text x="300" y="44" textAnchor="middle" className="g-rotulo g-fuerte">{k('grafica.mejora')}</text>
        </svg>
        <figcaption>{k('grafica.supercompensacion')}</figcaption>
      </figure>
    )
  }
  if (id === 'historia') {
    const hitos = ['776', '1811', '1953', '1968', '2020']
    return (
      <figure className="g-grafica">
        <ol className="g-historia">
          {hitos.map((h) => (
            <li key={h}>
              <b>{h === '776' ? k('grafica.a776') : h}</b>
              <span>{k(`grafica.h${h}`)}</span>
            </li>
          ))}
        </ol>
        <figcaption>{k('grafica.historia')}</figcaption>
      </figure>
    )
  }
  if (id === 'zonas') {
    const seg = [
      { c: 'z2', p: 80, r: k('grafica.suave') },
      { c: 'z3', p: 5, r: k('grafica.intermedio') },
      { c: 'z5', p: 15, r: k('grafica.intenso') },
    ]
    return (
      <figure className="g-grafica">
        <div className="g-barra-apilada">
          {seg.map((s) => (
            <span key={s.c} className={`g-${s.c}`} style={{ flexGrow: s.p }} />
          ))}
        </div>
        <ul className="g-leyenda">
          {seg.map((s) => (
            <li key={s.c}>
              <i className={`g-${s.c}`} />
              {s.r} <b>≈{s.p} %</b>
            </li>
          ))}
        </ul>
        <figcaption>{k('grafica.zonas')}</figcaption>
      </figure>
    )
  }
  // Bloque de cuatro semanas: tres de carga creciente y una de descarga.
  const vol = [62, 72, 82, 50]
  return (
    <figure className="g-grafica">
      <svg viewBox="0 0 400 170" role="img" aria-label={k('grafica.bloques')}>
        {vol.map((v, i) => (
          <g key={i}>
            <rect x={40 + i * 90} y={140 - v * 1.4} width="60" height={v * 1.4} rx="8" className={i === 3 ? 'g-barra-descarga' : 'g-barra'} />
            <text x={70 + i * 90} y="160" textAnchor="middle" className="g-rotulo">
              {i === 3 ? k('grafica.descarga') : `${k('grafica.semana')} ${i + 1}`}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>{k('grafica.bloques')} · {k('grafica.volumen')}</figcaption>
    </figure>
  )
}

/**
 * Grabación: la imagen o el clip (Pexels, Wikimedia o la propia app) que ilustra la línea, en la esquina
 * de arriba a la derecha mientras Pep@ está en su círculo de abajo. Sin `id`
 * se desvanece con la última que mostró.
 */
export function Lamina({ id, tema, idioma }: { id?: string; tema: string; idioma: string }) {
  const laminas = MEDIOS[`../../../marketing/guias/${tema}/medios.json`]?.laminas
  const [ultima, setUltima] = useState(id)
  if (id && id !== ultima) setUltima(id)
  // Todas a la caché desde el principio: que ninguna entre en negro a media toma.
  useEffect(() => {
    for (const l of Object.values(laminas ?? {})) void fetch(`/guias/${tema}/${l.archivo.replace('{idioma}', idioma)}`).catch(() => {})
  }, [laminas, tema, idioma])
  const l = ultima ? laminas?.[ultima] : undefined
  if (!l) return null
  // `{idioma}`: las que cambian por idioma (la app grabada en el idioma de la guía).
  const src = `/guias/${tema}/${l.archivo.replace('{idioma}', idioma)}`
  return (
    <figure className={`g-lamina${id ? ' visible' : ''}`} aria-hidden="true">
      <div key={ultima} className="g-lamina-medio">
        {l.tipo === 'video' ? <video src={src} autoPlay muted loop playsInline /> : <img src={src} alt="" />}
      </div>
      {l.credito !== '' && <figcaption>{l.credito ?? `${l.autor} · Pexels`}</figcaption>}
    </figure>
  )
}
