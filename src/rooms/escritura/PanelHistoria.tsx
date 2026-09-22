import { useState, type ReactNode } from 'react'
import type { Documento, Historia, RelacionLibro } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { VistaBlob } from '../_shared/ImagenIA'
import { DiagramaRelaciones } from './DiagramaRelaciones'
import { crearFicha, notaDeRelacion, CARPETAS, type CarpetaHistoria } from './fichas'
import { colorDeCarpeta, colorDeFicha, esTipoRef, type TipoRef } from './menciones'
import { FichaCompacta, PaletaColor } from './Referencias'
import { textoPlano } from './sanitizarHtml'

/**
 * Una hoja en la lista; las fichas de referencia llevan su miniatura o su punto
 * de color y, con el ojo, se despliegan en pequeño aquí mismo (leer y editar
 * sin salir de la hoja abierta).
 */
function FilaDoc({
  d,
  activa,
  historia,
  sangrada,
  onIr,
  expandida,
  onExpandir,
}: {
  d: Documento
  activa: boolean
  historia?: Historia
  sangrada?: boolean
  onIr: (id: number) => void
  /** La ficha en pequeño está desplegada bajo la fila. */
  expandida?: boolean
  /** Solo fichas de referencia que no están abiertas en la hoja. */
  onExpandir?: () => void
}) {
  const t = useT()
  const tipo = esTipoRef(d.seccion) ? d.seccion : null
  const color = tipo ? colorDeFicha(d, tipo, historia) : undefined
  return (
    <li className={sangrada ? 'ms-4' : ''}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => d.id != null && onIr(d.id)}
          title={d.descripcion}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition hover:bg-white/10 ${
            activa ? 'bg-white/10 font-semibold text-white' : 'text-white/65'
          }`}
        >
          {color &&
            (d.imagen ? (
              <VistaBlob blob={d.imagen} className="h-4 w-4 shrink-0 rounded" />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            ))}
          <span className="min-w-0 flex-1 truncate">{d.titulo}</span>
          {/* Hoja compartida por enlace: se edita entre varios (ver core/espacios) */}
          {d.espacioId && (
            <span className="shrink-0 text-white/40" title={t('esp.doc.compartido', 'Compartido')}>
              <Icono nombre="companeros" />
            </span>
          )}
        </button>
        {onExpandir && (
          <button
            type="button"
            onClick={onExpandir}
            aria-expanded={!!expandida}
            aria-label={
              expandida ? t('escritura.ref.ocultarFicha', 'Ocultar la ficha') : t('escritura.ref.verFicha', 'Ver la ficha aquí')
            }
            title={
              expandida ? t('escritura.ref.ocultarFicha', 'Ocultar la ficha') : t('escritura.ref.verFicha', 'Ver la ficha aquí')
            }
            className="shrink-0 rounded-lg px-1 py-1 text-white/35 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre={expandida ? 'ocultar' : 'ver'} />
          </button>
        )}
      </div>
      {expandida && tipo && (
        <FichaCompacta doc={d} tipo={tipo} historia={historia} onGrande={() => d.id != null && onIr(d.id)} />
      )}
    </li>
  )
}

/** Cabecera plegable de una carpeta (chevron + icono + conteo) y lo que cuelga de ella. */
function Plegable({
  abierta,
  onAlternar,
  icono,
  titulo,
  conteo,
  activa,
  extra,
  bajoCabecera,
  children,
}: {
  abierta: boolean
  onAlternar: () => void
  icono?: NombreIcono
  titulo: string
  conteo?: number
  /** La carpeta está abierta en grande en la hoja (se resalta como una fila activa). */
  activa?: boolean
  /** Control a la derecha de la cabecera (el punto de color de la carpeta). */
  extra?: ReactNode
  /** Fila bajo la cabecera, visible aunque esté plegada (la paleta). */
  bajoCabecera?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide transition hover:bg-white/10 ${
            activa ? 'bg-white/10 text-white' : 'text-white/45'
          }`}
        >
          <span className="text-white/35">
            <Icono nombre={abierta ? 'desplegado' : 'plegado'} />
          </span>
          {icono && <Icono nombre={icono} />}
          <span className="min-w-0 flex-1 truncate">{titulo}</span>
          {conteo != null && conteo > 0 && <span className="text-[10px] text-white/35">{conteo}</span>}
        </button>
        {extra}
      </div>
      {bajoCabecera}
      {abierta && <div className="ms-3 space-y-0.5">{children}</div>}
    </div>
  )
}

/**
 * Las carpetas del libro DENTRO del editor: un árbol plegable por sección, con
 * cada personaje como subcarpeta que guarda sus conexiones. La nota de una
 * conexión se lee en pequeño aquí mismo o en grande abriéndola en la hoja.
 * En pantallas chicas flota como overlay sobre el papel; en md+ es una columna.
 */
export function PanelHistoria({
  historiaId,
  docId,
  onIr,
  onCerrar,
  relacionesEnPanel,
  relacionesEnHoja,
  onAlternarRelaciones,
  onRelacionesGrande,
  abiertas,
  onAlternarFicha,
}: {
  historiaId: number
  /** El documento abierto en el editor (se resalta en la lista). */
  docId: number
  onIr: (id: number) => void
  onCerrar: () => void
  /** La carpeta «Relaciones»: desplegada en pequeño aquí, o abierta en grande en la hoja. */
  relacionesEnPanel: boolean
  relacionesEnHoja: boolean
  onAlternarRelaciones: () => void
  onRelacionesGrande: () => void
  /** Fichas desplegadas en pequeño dentro de la barra (viven en el editor: sobreviven al cambio de hoja). */
  abiertas: Set<number>
  onAlternarFicha: (id: number) => void
}) {
  const t = useT()
  const historia = (historiasRepo.useAll() ?? VACIO).find((h) => h.id === historiaId)
  const documentos = (documentosRepo.useAll() ?? VACIO).filter((d) => d.historiaId === historiaId)
  const relaciones = (relacionesLibroRepo.useAll() ?? VACIO).filter((r) => r.historiaId === historiaId)

  // Plegado con el patrón del Archivador: `tocadas` INVIERTE el estado por
  // defecto (la carpeta que lleva a la ficha abierta), así los datos tardíos de
  // Dexie no dejan todo cerrado al montar.
  const [tocadas, setTocadas] = useState<Set<string>>(new Set())
  const [notaAbierta, setNotaAbierta] = useState<number | null>(null)
  /** La carpeta cuya paleta de color está desplegada. */
  const [paleta, setPaleta] = useState<TipoRef | null>(null)

  const docActual = documentos.find((d) => d.id === docId)
  const porDefecto = new Set<string>()
  if (docActual?.seccion === 'trama') {
    porDefecto.add('acto')
    if (docActual.actoId != null) porDefecto.add(`a${docActual.actoId}`)
  } else if (docActual?.seccion === 'relacion') {
    porDefecto.add('personaje')
  } else if (docActual?.seccion) {
    porDefecto.add(docActual.seccion)
    if (docActual.seccion === 'personaje') porDefecto.add(`p${docActual.id}`)
  }
  const abierta = (k: string) => porDefecto.has(k) !== tocadas.has(k)
  const alternar = (k: string) =>
    setTocadas((prev) => {
      const sig = new Set(prev)
      if (sig.has(k)) sig.delete(k)
      else sig.add(k)
      return sig
    })

  const nombreDe = (id?: number) => documentos.find((d) => d.id === id)?.titulo ?? ''

  const crear = async (c: CarpetaHistoria, actoId?: number) => {
    const id =
      actoId != null
        ? await crearFicha(t, historiaId, 'trama', 'escritura.historias.nuevaTrama', 'Nueva trama', actoId)
        : await crearFicha(t, historiaId, c.seccion, c.claveNuevo, c.nuevoEs)
    if (id != null) onIr(id)
  }

  /** La nota de una conexión, en grande: se abre (o estrena) en la hoja. */
  const abrirNota = async (r: RelacionLibro) => {
    onIr(await notaDeRelacion(r, `${nombreDe(r.aId)} ↔ ${nombreDe(r.bId)}`))
  }

  /** El color de las menciones de toda una carpeta (sin tocar `actualizadoEn`: no reordena la estantería). */
  const cambiarColorCarpeta = (tipo: TipoRef, color: string | undefined) => {
    if (historia?.id == null) return
    void historiasRepo.update(historia.id, { coloresRef: { ...historia.coloresRef, [tipo]: color } })
  }

  // La ficha abierta en la hoja no se despliega en pequeño: ya está en grande
  // (y dos editores del mismo documento se pisarían).
  const fila = (d: Documento, sangrada?: boolean) => (
    <FilaDoc
      key={d.id}
      d={d}
      activa={d.id === docId}
      historia={historia}
      sangrada={sangrada}
      onIr={onIr}
      expandida={d.id != null && d.id !== docId && abiertas.has(d.id)}
      onExpandir={esTipoRef(d.seccion) && d.id != null && d.id !== docId ? () => onAlternarFicha(d.id!) : undefined}
    />
  )

  return (
    <div className="ui-panel absolute inset-y-0 left-0 z-10 flex w-64 flex-col rounded-xl border border-white/10 md:static md:w-56 md:shrink-0">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-white/60">
          {historia?.titulo ?? t('escritura.historias.boton', 'Carpetas de la historia')}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t('escritura.historias.cerrarPanel', 'Cerrar las carpetas')}
          title={t('escritura.historias.cerrarPanel', 'Cerrar las carpetas')}
          className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {CARPETAS.map((c) => {
          const propios = documentos.filter((d) => d.seccion === c.seccion)
          // Las carpetas de fichas llevan el punto de color de sus menciones en el texto.
          const tipo = esTipoRef(c.seccion) ? c.seccion : null
          return (
            <Plegable
              key={c.seccion}
              abierta={abierta(c.seccion)}
              onAlternar={() => alternar(c.seccion)}
              icono={c.icono}
              titulo={t(c.clave, c.labelEs)}
              conteo={propios.length}
              extra={
                tipo && (
                  <button
                    type="button"
                    onClick={() => setPaleta((p) => (p === tipo ? null : tipo))}
                    aria-expanded={paleta === tipo}
                    aria-label={t('escritura.ref.colorCarpeta', 'Color de las menciones de esta carpeta')}
                    title={t('escritura.ref.colorCarpeta', 'Color de las menciones de esta carpeta')}
                    className="me-1 h-3 w-3 shrink-0 rounded-full border border-white/30 transition hover:scale-125"
                    style={{ background: colorDeCarpeta(tipo, historia) }}
                  />
                )
              }
              bajoCabecera={
                tipo &&
                paleta === tipo && (
                  <div className="my-1 ms-6">
                    <PaletaColor
                      valor={colorDeCarpeta(tipo, historia)}
                      etiqueta={t('escritura.ref.colorCarpeta', 'Color de las menciones de esta carpeta')}
                      onElegir={(color) => cambiarColorCarpeta(tipo, color)}
                    />
                  </div>
                )
              }
            >
              {c.seccion === 'personaje' ? (
                // Cada personaje es una subcarpeta con sus conexiones dentro.
                propios.map((p) => {
                  const suyas = relaciones.filter((r) => r.aId === p.id || r.bId === p.id)
                  return (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => alternar(`p${p.id}`)}
                          aria-expanded={abierta(`p${p.id}`)}
                          aria-label={t('escritura.relaciones.titulo', 'Relaciones')}
                          className="rounded-lg px-1 py-1 text-white/35 transition hover:bg-white/10"
                        >
                          <Icono nombre={abierta(`p${p.id}`) ? 'desplegado' : 'plegado'} />
                        </button>
                        <ul className="min-w-0 flex-1">{fila(p)}</ul>
                      </div>
                      {abierta(`p${p.id}`) && (
                        <ul className="ms-5 space-y-0.5">
                          {suyas.map((r) => {
                            const notaDoc = documentos.find((d) => d.id === r.docId)
                            const desplegada = notaAbierta === r.id
                            return (
                              <li key={r.id}>
                                <button
                                  type="button"
                                  onClick={() => r.id != null && setNotaAbierta(desplegada ? null : r.id)}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left text-[11px] text-white/55 transition hover:bg-white/10 hover:text-white/80"
                                >
                                  <Icono nombre="vinculo" />
                                  <span className="min-w-0 flex-1 truncate">
                                    {r.texto} · {nombreDe(r.aId === p.id ? r.bId : r.aId)}
                                  </span>
                                </button>
                                {desplegada && (
                                  <div className="ms-4 mt-0.5 space-y-1 rounded-lg bg-black/20 p-2">
                                    <p className="line-clamp-4 whitespace-pre-wrap text-[11px] text-white/60">
                                      {textoPlano(notaDoc?.contenido ?? '') ||
                                        t('escritura.relaciones.sinNota', 'Sin nota aún: ábrela en la hoja y escríbela.')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void abrirNota(r)}
                                      className="flex items-center gap-1 text-[11px] text-white/45 transition hover:text-white"
                                    >
                                      <Icono nombre="expandir" /> {t('escritura.relaciones.abrirHoja', 'Abrir en la hoja')}
                                    </button>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })
              ) : c.seccion === 'acto' ? (
                // Cada acto es una subcarpeta con sus tramas dentro.
                propios.map((acto) => (
                  <div key={acto.id} className="flex flex-col">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => alternar(`a${acto.id}`)}
                        aria-expanded={abierta(`a${acto.id}`)}
                        aria-label={t('escritura.historias.tramas', 'Tramas')}
                        className="rounded-lg px-1 py-1 text-white/35 transition hover:bg-white/10"
                      >
                        <Icono nombre={abierta(`a${acto.id}`) ? 'desplegado' : 'plegado'} />
                      </button>
                      <ul className="min-w-0 flex-1">{fila(acto)}</ul>
                    </div>
                    {abierta(`a${acto.id}`) && (
                      <ul className="ms-5 space-y-0.5">
                        {documentos.filter((d) => d.actoId === acto.id).map((tr) => fila(tr))}
                        <li>
                          <BotonNuevo
                            onClick={() => void crear(c, acto.id)}
                            texto={t('escritura.historias.nuevaTrama', 'Nueva trama')}
                          />
                        </li>
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <ul className="space-y-0.5">{propios.map((d) => fila(d))}</ul>
              )}
              <BotonNuevo onClick={() => void crear(c)} texto={t(c.claveNuevo, c.nuevoEs)} />
            </Plegable>
          )
        })}

        {/* Las relaciones entre personajes son otra carpeta: el diagrama en pequeño aquí, o en grande en la hoja */}
        <Plegable
          abierta={relacionesEnPanel}
          onAlternar={onAlternarRelaciones}
          icono="vinculo"
          titulo={t('escritura.relaciones.titulo', 'Relaciones')}
          conteo={relaciones.length}
          activa={relacionesEnHoja}
        >
          {relacionesEnHoja ? (
            <p className="px-2 py-1 text-[11px] text-white/40">
              {t('escritura.relaciones.enHoja', 'Abiertas en grande en la hoja.')}
            </p>
          ) : (
            <DiagramaRelaciones historiaId={historiaId} compacto onAbrirDoc={onIr} onGrande={onRelacionesGrande} />
          )}
        </Plegable>
      </div>
    </div>
  )
}

function BotonNuevo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white/75"
    >
      <Icono nombre="agregar" /> {texto}
    </button>
  )
}
