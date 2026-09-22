import { useState } from 'react'
import type { Documento, Historia, TipoLibro } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo, VACIO } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { confirmar, pedirTexto } from '../../core/state/confirmarStore'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { Icono } from '../../core/ui/iconos/Icono'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { BotonBorrar, BotonPrimario, Modal, TARJETA, FILA_INTERACTIVA, Vacio } from '../_shared/ui'
import { COLOR } from './constantes'
import { ejemploEscritura } from './ejemplos'

/** La plantilla solo decide el icono de la portada. */
const ICONO_TIPO: Record<TipoLibro, NombreIcono> = {
  blanco: 'tab-diario',
  cuento: 'libro',
  guion: 'pelicula',
  teatro: 'mascara',
}

const PLANTILLAS: { tipo: TipoLibro; clave: string; labelEs: string }[] = [
  { tipo: 'blanco', clave: 'escritura.plantilla.blanco', labelEs: 'En blanco' },
  { tipo: 'cuento', clave: 'escritura.plantilla.cuento', labelEs: 'Cuento' },
  { tipo: 'guion', clave: 'escritura.plantilla.guionNombre', labelEs: 'Guion' },
  { tipo: 'teatro', clave: 'escritura.plantilla.teatroNombre', labelEs: 'Obra de teatro' },
]

/**
 * La estantería: todos los libros con su portada e icono de plantilla. Los
 * documentos sueltos de antes también salen como libros; al abrirlos se
 * envuelven en uno (su texto se vuelve el primer capítulo).
 */
export function ListaLibros({ onAbrir }: { onAbrir: (id: number) => void }) {
  const t = useT()
  const libros = historiasRepo.useAll() ?? VACIO
  const documentos = documentosRepo.useAll() ?? VACIO
  const sueltos = documentos.filter((d) => d.historiaId == null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [eligiendo, setEligiendo] = useState(false)

  const crear = async (tipo: TipoLibro) => {
    setEligiendo(false)
    const titulo = await pedirTexto({
      titulo: t('escritura.libros.nuevo', 'Nuevo libro'),
      mensaje: t('escritura.libros.nuevoMsg', 'Título del libro'),
    })
    if (!titulo) return
    const ahora = new Date().toISOString()
    const id = await historiasRepo.add({ titulo, tipo, creadoEn: ahora, actualizadoEn: ahora })
    onAbrir(id)
  }

  /** El documento suelto de antes se vuelve libro: su texto es el primer capítulo. */
  const envolver = async (d: Documento) => {
    if (d.id == null) return
    const ahora = new Date().toISOString()
    const id = await historiasRepo.add({ titulo: d.titulo, tipo: 'blanco', creadoEn: d.creadoEn, actualizadoEn: ahora })
    await documentosRepo.update(d.id, { historiaId: id, seccion: 'capitulo' })
    onAbrir(id)
  }

  const renombrar = async (actual: string, alGuardar: (titulo: string) => Promise<void>) => {
    const titulo = await pedirTexto({ titulo: t('escritura.libros.renombrar', 'Renombrar libro'), valor: actual })
    if (titulo && titulo !== actual) await alGuardar(titulo)
  }

  const borrarLibro = async (h: Historia) => {
    if (h.id == null) return
    const docs = documentos.filter((d) => d.historiaId === h.id)
    if (docs.length > 0) {
      const ok = await confirmar({
        titulo: t('escritura.libros.borrar', 'Borrar libro'),
        mensaje: t('escritura.libros.borrarMsg', 'También se borrarán sus {n} textos (capítulos, personajes, actos…).', {
          n: docs.length,
        }),
        peligro: true,
      })
      if (!ok) return
      for (const d of docs) if (d.id != null) await documentosRepo.remove(d.id)
    }
    const relaciones = (await relacionesLibroRepo.list()).filter((r) => r.historiaId === h.id)
    for (const r of relaciones) if (r.id != null) await relacionesLibroRepo.remove(r.id)
    await historiasRepo.remove(h.id)
  }

  const modalPlantillas = eligiendo && (
    <Modal titulo={t('escritura.plantilla.titulo', '¿Qué vas a escribir?')} onCerrar={() => setEligiendo(false)}>
      <div className="grid grid-cols-2 gap-2">
        {PLANTILLAS.map((p) => (
          <button
            key={p.tipo}
            type="button"
            onClick={() => void crear(p.tipo)}
            className={`${TARJETA} ${FILA_INTERACTIVA} flex flex-col items-center gap-1 p-4 text-sm`}
          >
            <span className="text-xl">
              <Icono nombre={ICONO_TIPO[p.tipo]} />
            </span>
            {t(p.clave, p.labelEs)}
          </button>
        ))}
      </div>
    </Modal>
  )

  if (libros.length === 0 && sueltos.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Vacio
          icono="libro"
          titulo={t('escritura.libros.vacio', 'Aún no hay libros')}
          sub={t(
            'escritura.libros.vacioSub',
            'Cada libro trae sus carpetas de capítulos, personajes, lugares y actos con sus tramas.',
          )}
          cta={{ texto: t('escritura.libros.nuevo', 'Nuevo libro'), onClick: () => setEligiendo(true) }}
        />
        <BarraEjemplo paquete={ejemploEscritura} />
        {modalPlantillas}
      </div>
    )
  }

  const Portada = ({
    icono,
    titulo,
    onAbrirLibro,
  }: {
    icono: NombreIcono
    titulo: string
    onAbrirLibro: () => void
  }) => (
    <button
      type="button"
      onClick={onAbrirLibro}
      className="relative flex aspect-[3/4] w-full flex-col items-center rounded-e-xl rounded-s-sm border border-white/15 bg-gradient-to-br from-white/15 via-white/[0.08] to-white/5 p-2 text-center shadow-lg transition hover:-translate-y-0.5 hover:from-white/20"
    >
      {/* El lomo */}
      <span aria-hidden className="absolute inset-y-1 start-1.5 w-px bg-white/25" />
      <span className="mt-5 text-3xl text-white/85">
        <Icono nombre={icono} />
      </span>
      <span className="mt-auto mb-4 line-clamp-3 w-full px-1.5 text-sm font-semibold leading-tight">{titulo}</span>
    </button>
  )

  /** El libro «Compartidos conmigo» no se renombra ni se borra: lo gestiona el sync. */
  const Pie = ({
    sub,
    onRenombrar,
    claveBorrar,
    onBorrar,
  }: {
    sub: string
    onRenombrar?: () => void
    claveBorrar?: string
    onBorrar?: () => void
  }) => (
    <div className="flex items-center justify-between gap-1 px-0.5">
      <span className="min-w-0 truncate text-[10px] text-white/40">{sub}</span>
      {onRenombrar && onBorrar && claveBorrar && (
        <span className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onRenombrar}
            aria-label={t('escritura.libros.renombrar', 'Renombrar libro')}
            title={t('escritura.libros.renombrar', 'Renombrar libro')}
            className="rounded-lg px-1.5 py-0.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            <Icono nombre="editar" />
          </button>
          <BotonBorrar
            confirmando={borrando === claveBorrar}
            onPedir={() => setBorrando(claveBorrar)}
            onConfirmar={() => {
              onBorrar()
              setBorrando(null)
            }}
            onCancelar={() => setBorrando(null)}
          />
        </span>
      )}
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="flex justify-end">
        <BotonPrimario type="button" pequeno app={COLOR} onClick={() => setEligiendo(true)}>
          <Icono nombre="agregar" /> {t('escritura.libros.nuevo', 'Nuevo libro')}
        </BotonPrimario>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {libros.map((h) => (
          <li key={`h${h.id}`} className="flex flex-col gap-1">
            <Portada
              icono={h.compartidos ? 'companeros' : ICONO_TIPO[h.tipo ?? 'blanco']}
              titulo={h.titulo}
              onAbrirLibro={() => h.id != null && onAbrir(h.id)}
            />
            <Pie
              sub={t('escritura.historias.textos', '{n} textos', {
                n: documentos.filter((d) => d.historiaId === h.id).length,
              })}
              onRenombrar={
                h.compartidos
                  ? undefined
                  : () =>
                      void renombrar(h.titulo, async (titulo) => {
                        if (h.id != null)
                          await historiasRepo.update(h.id, { titulo, actualizadoEn: new Date().toISOString() })
                      })
              }
              claveBorrar={h.compartidos ? undefined : `h${h.id}`}
              onBorrar={h.compartidos ? undefined : () => void borrarLibro(h)}
            />
          </li>
        ))}
        {sueltos.map((d) => (
          <li key={`d${d.id}`} className="flex flex-col gap-1">
            <Portada icono={d.espacioId ? 'companeros' : 'tab-diario'} titulo={d.titulo} onAbrirLibro={() => void envolver(d)} />
            <Pie
              sub={
                d.espacioId
                  ? `${t('esp.doc.compartido', 'Compartido')} · ${t('escritura.lista.palabras', '{n} palabras', { n: d.palabras })}`
                  : t('escritura.lista.palabras', '{n} palabras', { n: d.palabras })
              }
              onRenombrar={() =>
                void renombrar(d.titulo, async (titulo) => {
                  if (d.id != null) await documentosRepo.update(d.id, { titulo, actualizadoEn: new Date().toISOString() })
                })
              }
              claveBorrar={`d${d.id}`}
              onBorrar={() => {
                if (d.id != null) void documentosRepo.remove(d.id)
              }}
            />
          </li>
        ))}
      </ul>
      <BarraEjemplo paquete={ejemploEscritura} />
      {modalPlantillas}
    </div>
  )
}
