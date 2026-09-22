import { useRef, useState } from 'react'
import { dibujosRepo, VACIO } from '../../core/data/repository'
import { localeActual, useT } from '../../core/i18n/useT'
import { pedirTexto } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { Foto, comprimirFoto, miniaturaFoto } from '../_shared/fotos'
import { BotonEnviarAContacto } from '../_shared/BotonEnviarAContacto'
import { empaquetarDibujo } from './compartible'
import { BotonBorrar, BotonPrimario, BotonSecundario, Campo, INPUT, Modal, TARJETA, Vacio } from '../_shared/ui'
import { COLOR, PRESETS_LIENZO } from './constantes'

/** PNG blanco del tamaño pedido: el punto de partida de todo dibujo. */
function lienzoBlanco(ancho: number, alto: number): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png'))
}

/** La galería de dibujos: rejilla de miniaturas, crear (en blanco o desde foto), renombrar y borrar. */
export function GaleriaDibujos({ onAbrir }: { onAbrir: (id: number) => void }) {
  const t = useT()
  const dibujos = dibujosRepo.useAll() ?? VACIO
  const [borrando, setBorrando] = useState<number | null>(null)
  const [alta, setAlta] = useState(false)
  const [nombre, setNombre] = useState('')
  const [preset, setPreset] = useState(0)
  const archivoRef = useRef<HTMLInputElement>(null)

  const crear = async () => {
    const p = PRESETS_LIENZO[preset]
    const imagen = await lienzoBlanco(p.ancho, p.alto)
    const ahora = new Date().toISOString()
    const id = await dibujosRepo.add({
      nombre: nombre.trim() || t('arte.lista.sinNombre', 'Dibujo'),
      imagen,
      miniatura: await miniaturaFoto(imagen),
      ancho: p.ancho,
      alto: p.alto,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    setAlta(false)
    setNombre('')
    onAbrir(id)
  }

  const crearDesdeFoto = async (archivo: File) => {
    const imagen = await comprimirFoto(archivo)
    const bmp = await createImageBitmap(imagen)
    const ancho = bmp.width
    const alto = bmp.height
    bmp.close()
    const ahora = new Date().toISOString()
    const id = await dibujosRepo.add({
      nombre: archivo.name.replace(/\.[a-z0-9]+$/i, '') || t('arte.lista.sinNombre', 'Dibujo'),
      imagen,
      miniatura: await miniaturaFoto(imagen),
      ancho,
      alto,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
    setAlta(false)
    onAbrir(id)
  }

  const renombrar = async (id: number, actual: string) => {
    const nuevo = await pedirTexto({ titulo: t('arte.lista.renombrar', 'Renombrar dibujo'), valor: actual })
    if (nuevo && nuevo !== actual) {
      await dibujosRepo.update(id, { nombre: nuevo, actualizadoEn: new Date().toISOString() })
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {dibujos.length === 0 ? (
        <Vacio
          icono="pincel"
          titulo={t('arte.lista.vacio', 'Aún no hay dibujos')}
          sub={t('arte.lista.vacioSub', 'Pinta desde cero, edita una foto o deja que la IA imagine contigo.')}
          cta={{ texto: t('arte.lista.nuevo', 'Nuevo dibujo'), onClick: () => setAlta(true) }}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <BotonPrimario type="button" pequeno app={COLOR} onClick={() => setAlta(true)}>
              <Icono nombre="agregar" /> {t('arte.lista.nuevo', 'Nuevo dibujo')}
            </BotonPrimario>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dibujos.map((d) => (
              <li key={d.id} className={`${TARJETA} space-y-2 p-2`}>
                <button
                  type="button"
                  onClick={() => d.id != null && onAbrir(d.id)}
                  className="relative block w-full overflow-hidden rounded-lg transition hover:brightness-110"
                >
                  <Foto blob={d.miniatura ?? d.imagen} className="aspect-square w-full object-cover" />
                  {d.espacioId && (
                    <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur">
                      <Icono nombre="companeros" /> {t('esp.arte.compartido', 'Compartido')}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => d.id != null && onAbrir(d.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-xs font-semibold">{d.nombre}</p>
                    <p className="text-[10px] text-white/40">
                      {new Date(d.actualizadoEn).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}
                    </p>
                  </button>
                  <BotonEnviarAContacto pequeno empaquetar={() => empaquetarDibujo(d)} className="!bg-transparent px-1.5 py-1 text-white/40 hover:!bg-white/10" />
                  <button
                    type="button"
                    onClick={() => d.id != null && void renombrar(d.id, d.nombre)}
                    aria-label={t('arte.lista.renombrar', 'Renombrar dibujo')}
                    title={t('arte.lista.renombrar', 'Renombrar dibujo')}
                    className="rounded-lg px-1.5 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
                  >
                    <Icono nombre="editar" />
                  </button>
                  <BotonBorrar
                    confirmando={borrando === d.id}
                    onPedir={() => setBorrando(d.id ?? null)}
                    onConfirmar={() => {
                      if (d.id != null) void dibujosRepo.remove(d.id)
                      setBorrando(null)
                    }}
                    onCancelar={() => setBorrando(null)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <input
        ref={archivoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void crearDesdeFoto(archivo)
          e.target.value = ''
        }}
      />

      {alta && (
        <Modal titulo={t('arte.lista.nuevo', 'Nuevo dibujo')} onCerrar={() => setAlta(false)}>
          <Campo etiqueta={t('arte.lista.nombre', 'Nombre')}>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} />
          </Campo>
          <Campo etiqueta={t('arte.lista.tamano', 'Tamaño del lienzo')}>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS_LIENZO.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(i)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    preset === i ? 'border-white/60 bg-white/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {p.id}
                  <span className="block text-[10px] font-normal text-white/40">
                    {p.ancho}×{p.alto}
                  </span>
                </button>
              ))}
            </div>
          </Campo>
          <div className="flex items-center justify-between gap-2 pt-1">
            <BotonSecundario pequeno onClick={() => archivoRef.current?.click()}>
              <Icono nombre="foto" /> {t('arte.lista.desdeFoto', 'Desde una foto')}
            </BotonSecundario>
            <BotonPrimario type="button" app={COLOR} onClick={() => void crear()}>
              {t('arte.lista.crear', 'Crear')}
            </BotonPrimario>
          </div>
        </Modal>
      )}
    </div>
  )
}
