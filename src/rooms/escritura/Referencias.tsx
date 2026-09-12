import { useEffect, useRef, useState } from 'react'
import type { Documento, Historia } from '../../core/data/db'
import { documentosRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { ImagenIA, VistaBlob } from '../_shared/ImagenIA'
import { BotonSecundario, Campo, INPUT } from '../_shared/ui'
import { PALETA_TEXTO } from './constantes'
import { colorDeCarpeta, IMAGEN_FICHA, promptImagenFicha, type FichaRef, type TipoRef } from './menciones'
import { contarPalabras, sanitizarHtml } from './sanitizarHtml'

const ICONO_TIPO: Record<TipoRef, NombreIcono> = { personaje: 'persona', lugar: 'ubicacion', acto: 'mascara' }

const CLAVE_TIPO: Record<TipoRef, [string, string]> = {
  personaje: ['escritura.ref.tipo.personaje', 'Personaje'],
  lugar: ['escritura.ref.tipo.lugar', 'Lugar'],
  acto: ['escritura.ref.tipo.acto', 'Acto'],
}

/**
 * Fila de puntos de color para las menciones. Con `heredado` (el color de la
 * carpeta) el primer punto es «usar el de la carpeta» y `valor` vacío lo elige.
 */
export function PaletaColor({
  valor,
  heredado,
  etiqueta,
  onElegir,
}: {
  valor?: string
  heredado?: string
  etiqueta: string
  onElegir: (color: string | undefined) => void
}) {
  const t = useT()
  const punto = (c: string, activo: boolean, titulo: string, onClick: () => void) => (
    <button
      key={c}
      type="button"
      aria-label={titulo}
      title={titulo}
      aria-pressed={activo}
      onClick={onClick}
      className={`h-4 w-4 rounded-full border border-white/20 transition hover:scale-125 ${activo ? 'scale-125 ring-2 ring-white' : ''}`}
      style={{ background: c }}
    />
  )
  return (
    <span className="flex flex-wrap items-center gap-1" aria-label={etiqueta}>
      {heredado &&
        punto(heredado, !valor, t('escritura.ref.heredar', 'El color de la carpeta'), () => onElegir(undefined))}
      {heredado && <span className="mx-0.5 h-3 w-px bg-white/15" />}
      {PALETA_TEXTO.map((c) => punto(c, valor === c, etiqueta, () => onElegir(c)))}
    </span>
  )
}

/**
 * La cabecera de una ficha (personaje, lugar o acto): su imagen (subida o
 * generada con IA), la descripción breve, los otros nombres y el color de sus
 * menciones. En grande vive sobre el texto de la hoja; `compacta` es la misma
 * ficha apilada dentro de la barra. Descripción y alias se guardan con debounce.
 */
export function CabeceraFicha({
  doc,
  tipo,
  historia,
  compacta,
  onPequeno,
}: {
  doc: Documento
  tipo: TipoRef
  historia?: Historia
  /** Apilada y sin ayudas: la versión de la barra. */
  compacta?: boolean
  /** «Ver en pequeño en la barra»: solo en grande. */
  onPequeno?: () => void
}) {
  const t = useT()
  const [descripcion, setDescripcion] = useState(doc.descripcion ?? '')
  const [alias, setAlias] = useState(doc.alias ?? '')
  const sucioRef = useRef(false)
  const timerRef = useRef(0)
  const guardarRef = useRef(() => {})

  const guardar = () => {
    if (!sucioRef.current || doc.id == null) return
    sucioRef.current = false
    void documentosRepo.update(doc.id, {
      descripcion: descripcion.trim() || undefined,
      alias: alias.trim() || undefined,
      actualizadoEn: new Date().toISOString(),
    })
  }
  useEffect(() => {
    guardarRef.current = guardar
  })
  // Flush al desmontar (cambiar de hoja o cerrar): que no se pierda la última frase.
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      guardarRef.current()
    },
    [],
  )

  const alEscribir = (poner: (v: string) => void, v: string) => {
    poner(v)
    sucioRef.current = true
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => guardarRef.current(), 700)
  }

  const img = IMAGEN_FICHA[tipo]
  const titulo = doc.titulo.trim()
  const prompt = titulo ? promptImagenFicha(tipo, titulo, descripcion, historia?.titulo) : undefined

  return (
    <div
      className={
        compacta
          ? 'flex flex-col gap-2'
          : 'mx-5 mt-4 flex shrink-0 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row'
      }
    >
      <div className={`w-full shrink-0 ${compacta ? '' : tipo === 'personaje' ? 'sm:w-40' : 'sm:w-56'}`}>
        <ImagenIA
          imagen={doc.imagen}
          prompt={prompt}
          aspecto={img.aspecto}
          max={img.max}
          claseMarco={compacta && tipo === 'personaje' ? 'aspect-square w-24' : img.marco}
          onCambiar={async (imagen) => {
            if (doc.id != null) await documentosRepo.update(doc.id, { imagen })
          }}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Campo etiqueta={t('escritura.ref.descripcion', 'Descripción breve')}>
          <textarea
            value={descripcion}
            onChange={(e) => alEscribir(setDescripcion, e.target.value)}
            rows={compacta ? 2 : 3}
            placeholder={t('escritura.ref.descripcionPh', 'Lo esencial, en una o dos líneas.')}
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta={t('escritura.ref.alias', 'Otros nombres')}>
          <input
            value={alias}
            onChange={(e) => alEscribir(setAlias, e.target.value)}
            placeholder={t('escritura.ref.aliasPh', 'Apodos o formas cortas, separados por comas')}
            className={INPUT}
          />
        </Campo>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span>{t('escritura.ref.color', 'Color de sus menciones')}</span>
          <PaletaColor
            valor={doc.color}
            heredado={colorDeCarpeta(tipo, historia)}
            etiqueta={t('escritura.ref.color', 'Color de sus menciones')}
            onElegir={(color) => doc.id != null && void documentosRepo.update(doc.id, { color })}
          />
        </div>
        {!compacta && (
          <p className="text-[11px] text-white/40">
            {t('escritura.ref.ayudaMenciones', 'Su nombre se marca en el texto de las demás hojas: toca una mención para ver esta ficha.')}
          </p>
        )}
        {onPequeno && (
          <BotonSecundario pequeno onClick={onPequeno}>
            <Icono nombre="carpeta" /> {t('escritura.ref.enBarra', 'Ver en pequeño en la barra')}
          </BotonSecundario>
        )}
      </div>
    </div>
  )
}

/**
 * El texto de una ficha en pequeño: contentEditable con el HTML saneado, sin
 * barra de formato, que se guarda solo (mismo saneado y debounce que la hoja).
 * Solo se usa con fichas que NO están abiertas en la hoja: dos editores del
 * mismo documento se pisarían.
 */
function TextoFicha({ doc }: { doc: Documento }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const docRef = useRef(doc)
  const sucioRef = useRef(false)
  const timerRef = useRef(0)
  const guardarRef = useRef(() => {})

  const guardar = () => {
    const el = ref.current
    if (!sucioRef.current || !el || doc.id == null) return
    sucioRef.current = false
    void documentosRepo.update(doc.id, {
      contenido: sanitizarHtml(el.innerHTML),
      palabras: contarPalabras(el.innerText),
      actualizadoEn: new Date().toISOString(),
    })
  }
  useEffect(() => {
    docRef.current = doc
    guardarRef.current = guardar
  })
  // El HTML se monta una vez por ficha y vive en el DOM (como en la hoja); al
  // cerrar la tarjeta se guarda lo pendiente.
  useEffect(() => {
    const el = ref.current
    if (el) el.innerHTML = sanitizarHtml(docRef.current.contenido)
    return () => {
      window.clearTimeout(timerRef.current)
      guardarRef.current()
    }
  }, [doc.id])

  const alInput = () => {
    sucioRef.current = true
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => guardarRef.current(), 1500)
  }

  return (
    <div
      ref={ref}
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label={t('escritura.ref.texto', 'Texto de la ficha')}
      onInput={alInput}
      className="mph-doc mph-doc-mini max-h-64 overflow-y-auto rounded-lg bg-black/20 px-2.5 py-2 text-xs outline-none"
    />
  )
}

/** La ficha entera en pequeño, dentro de la barra: cabecera + texto + «Ver en grande». */
export function FichaCompacta({
  doc,
  tipo,
  historia,
  onGrande,
}: {
  doc: Documento
  tipo: TipoRef
  historia?: Historia
  onGrande: () => void
}) {
  const t = useT()
  return (
    <div className="mb-1 mt-0.5 space-y-2 rounded-lg border border-white/10 bg-black/15 p-2">
      <CabeceraFicha key={doc.id} doc={doc} tipo={tipo} historia={historia} compacta />
      <TextoFicha key={doc.id} doc={doc} />
      <BotonSecundario pequeno onClick={onGrande} className="w-full">
        <Icono nombre="expandir" /> {t('escritura.ref.enGrande', 'Ver en grande')}
      </BotonSecundario>
    </div>
  )
}

/**
 * Globo que aparece bajo una mención cuando el caret entra en ella: la ficha en
 * pequeño y el botón para abrirla. `preventDefault` en pointerdown o el clic
 * mueve el caret, la selección cambia y el globo se cierra antes del click.
 */
export function GloboReferencia({
  ficha,
  top,
  left,
  onAbrir,
}: {
  ficha: FichaRef
  top: number
  left: number
  onAbrir: () => void
}) {
  const t = useT()
  const [clave, es] = CLAVE_TIPO[ficha.tipo]
  return (
    <div
      role="dialog"
      aria-label={ficha.titulo}
      onPointerDown={(e) => e.preventDefault()}
      className="ui-panel ui-pop absolute z-20 w-64 space-y-2 rounded-xl border border-white/10 p-2.5 shadow-xl"
      style={{ top, left }}
    >
      <div className="flex items-start gap-2">
        {ficha.imagen ? (
          <VistaBlob blob={ficha.imagen} className="h-12 w-12 shrink-0 rounded-lg" />
        ) : (
          <span
            className="texto-vivo grid h-12 w-12 shrink-0 place-items-center rounded-lg text-lg"
            style={{ ...vivo(ficha.color), background: `color-mix(in srgb, ${ficha.color} 25%, transparent)` }}
          >
            <Icono nombre={ICONO_TIPO[ficha.tipo]} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {/* `texto-vivo`: el color de la ficha tal cual en oscuro y entintado en claro */}
          <p className="texto-vivo truncate text-sm font-semibold" style={vivo(ficha.color)}>
            {ficha.titulo}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-white/40">{t(clave, es)}</p>
          {ficha.descripcion && <p className="mt-1 line-clamp-3 text-xs text-white/65">{ficha.descripcion}</p>}
        </div>
      </div>
      <BotonSecundario pequeno onClick={onAbrir} className="w-full">
        <Icono nombre="expandir" /> {t('escritura.ref.abrir', 'Abrir la ficha')}
      </BotonSecundario>
    </div>
  )
}
