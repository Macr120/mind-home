import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ObjetoCuarto } from '../../data/db'
import type { Pieza3D } from '../../chat/mascotas'
import { iaActiva, generarModelo3D, type EstiloModelo3D } from '../../chat/ia'
import { iaHabilitada } from '../../edicion'
import { Creditos } from '../Creditos'
import { OP_OBJETO_3D } from '../../cuenta/catalogoNucleo'
import { useCuartos } from '../../state/cuartosStore'
import { useDiseño, MAPA_ROOM, esObjetoLibreria } from '../../state/disenoStore'
import { pedirDestinoObjeto } from '../../state/destinoObjetoStore'
import { useEditorUi } from '../../state/editorUiStore'
import { getTema } from '../../house/temas'
import { MiniaturaModelo } from '../../house/Miniatura'
import { RECURSOS } from '../../house/recursos'
import { CATALOGO, TIPO_PIEZAS, TIPO_GLB, piezasDesdeObjeto, grupoAccionDe } from '../../house/catalogo'
import {
  TIPO_CUADRO_FOTO, TIPO_ESPEJO, TIPO_FUENTE, TIPO_ESTANQUE, TIPO_CASCADA,
  TIPO_RESBALADILLA, TIPO_PASAMANOS, TIPO_CARRUSEL, TIPO_COLUMPIO,
  TIPO_ESPECTACULAR, TIPO_LETRERO_VEGAS, TIPO_LETRERO_NEON,
  esTipoEspecial, esAnuncio, comprimirFoto, grupoFx,
} from '../../house/especiales'
import { esVehiculo } from '../../house/vehiculos'
import type { GrupoAccion } from '../../state/accionCuartoStore'
import { ColorPicker } from '../comun/ColorPicker'
import { PropiedadGrupo } from './PropiedadGrupo'
import { PreviewObjeto3D } from './PreviewObjeto3D'
import { EditorPiezas, plantillaObjetoPiezas } from '../comun/EditorPiezas'
import { EditorAnimacion } from './EditorAnimacion'
import { SliderProp } from '../comun/SliderProp'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import type { NombreIcono } from '../iconos/catalogo'

const ESCALA_MIN = 0.3
const ESCALA_MAX = 3
const ESCALA_DEFAULT = 1

/** Intensidad de efectos (agua/luz/velocidad del juego) de los objetos especiales. */
const FX_MIN = 0.2
const FX_MAX = 2
const FX_DEFAULT = 1

const nombreRecurso = (id: number) =>
  RECURSOS.find((r) => r.id === id)?.nombre ?? `Recurso ${id}`

/** Nombre legible de un objeto colocado. */
function nombreObjeto(o: ObjetoCuarto): string {
  if (o.nombre) return o.nombre
  if (o.tipo === TIPO_PIEZAS) return 'Objeto de piezas'
  if (o.tipo === TIPO_GLB) return 'Modelo subido'
  if (o.tipo === TIPO_CUADRO_FOTO) return 'Cuadro con foto'
  if (o.tipo === TIPO_ESPEJO) return 'Espejo'
  if (o.tipo === TIPO_FUENTE) return 'Fuente clásica'
  if (o.tipo === TIPO_ESTANQUE) return 'Estanque con chorro'
  if (o.tipo === TIPO_CASCADA) return 'Cascada de pared'
  if (o.tipo === TIPO_RESBALADILLA) return 'Resbaladilla'
  if (o.tipo === TIPO_PASAMANOS) return 'Pasamanos'
  if (o.tipo === TIPO_CARRUSEL) return 'Carrusel'
  if (o.tipo === TIPO_COLUMPIO) return 'Columpio'
  if (o.tipo === TIPO_ESPECTACULAR) return 'Espectacular de carretera'
  if (o.tipo === TIPO_LETRERO_VEGAS) return 'Letrero Las Vegas'
  if (o.tipo === TIPO_LETRERO_NEON) return 'Letrero de neón'
  if (o.tipo.startsWith('recurso:')) {
    return nombreRecurso(Number(o.tipo.slice('recurso:'.length)))
  }
  return CATALOGO.find((i) => i.id === o.tipo)?.nombre ?? 'Objeto'
}

/** Una ubicación con objetos (un cuarto o el mapa) y sus objetos colocados. */
interface Ubicacion {
  id: string
  icon: string
  nombre: string
  objetos: ObjetoCuarto[]
}

/** Submenú activo de la pestaña Objetos: crear, ubicar en el mapa o editar. */
type ObjTab = 'crear' | 'mapa' | 'editar'

/**
 * Editor de objetos (pestaña Objetos), en 3 submenús: Crear (con IA/manual/.glb),
 * Mapa (elegir uno entre los ya colocados, por cuarto o sueltos) y Editar (preview
 * 3D + propiedades del seleccionado). Crear o tocar una miniatura en Mapa saltan
 * directo a Editar.
 */
export function EditorObjetosSection() {
  const t = useT()
  const cuartos = useCuartos((s) => s.cuartos)
  const objetos = useDiseño((s) => s.objetos)
  const temaId = useDiseño((s) => s.temaGlobal)
  const setObjetoColor = useDiseño((s) => s.setObjetoColor)
  const setObjetoEscala = useDiseño((s) => s.setObjetoEscala)
  const setObjetoFx = useDiseño((s) => s.setObjetoFx)
  const setObjetoRotEje = useDiseño((s) => s.setObjetoRotEje)
  const setObjetoAltura = useDiseño((s) => s.setObjetoAltura)
  const addObjetoPiezas = useDiseño((s) => s.addObjetoPiezas)
  const addObjetoGlb = useDiseño((s) => s.addObjetoGlb)
  const setObjetoModeloGlb = useDiseño((s) => s.setObjetoModeloGlb)
  const setObjetoFoto = useDiseño((s) => s.setObjetoFoto)
  const setObjetoTexto = useDiseño((s) => s.setObjetoTexto)
  const setObjetoPiezas = useDiseño((s) => s.setObjetoPiezas)
  const convertirObjetoAPiezas = useDiseño((s) => s.convertirObjetoAPiezas)
  const restaurarObjetoPredeterminado = useDiseño((s) => s.restaurarObjetoPredeterminado)
  const setObjetoNombre = useDiseño((s) => s.setObjetoNombre)
  const setObjetoGrupoAccion = useDiseño((s) => s.setObjetoGrupoAccion)
  const setObjetoAnimacion = useDiseño((s) => s.setObjetoAnimacion)
  const removeObjeto = useDiseño((s) => s.removeObjeto)
  const objetoSel = useEditorUi((s) => s.objetoSel)
  const setObjetoSel = useEditorUi((s) => s.setObjetoSel)
  // Engrane ⚙️ del preview: con piezas y abierto se edita la Forma; cerrado (o sin
  // piezas) se editan las propiedades del objeto completo (Tamaño/Posición/Rotación).
  const piezasControles = useEditorUi((s) => s.piezasControles)
  const tema = getTema(temaId)

  const seleccionado = objetos.find((o) => o.id === objetoSel) ?? null
  // Editando un objeto de la biblioteca (desde el inventario): se muestra solo su editor, sin la lista.
  const editandoBiblioteca = !!seleccionado && esObjetoLibreria(seleccionado)

  // Ubicaciones con objetos: cada cuarto que tenga objetos + el mapa.
  const ubicaciones = useMemo<Ubicacion[]>(() => {
    const arr: Ubicacion[] = []
    for (const c of cuartos) {
      const objs = objetos.filter((o) => o.roomId === c.id)
      if (objs.length) arr.push({ id: c.id, icon: c.icon, nombre: c.nombre.split(' · ')[0], objetos: objs })
    }
    // El mapa (los objetos de la biblioteca NO se listan aquí; se editan de a uno desde el inventario).
    const mapa = objetos.filter((o) => o.roomId === MAPA_ROOM)
    if (mapa.length) arr.push({ id: MAPA_ROOM, icon: '🗺️', nombre: t('editor.obj.mapa', 'Mapa'), objetos: mapa })
    return arr
  }, [cuartos, objetos, t])

  // Submenú activo: Crear, Mapa (ubicación) o Editar (propiedades del seleccionado).
  const [tab, setTab] = useState<ObjTab>(() => (ubicaciones.length === 0 ? 'crear' : 'editar'))

  // Crea un objeto de geometría básica en el destino elegido y lo abre para editar.
  const crearObjetoPiezas = async () => {
    const destino = await pedirDestinoObjeto()
    if (!destino) return
    const id = await addObjetoPiezas(plantillaObjetoPiezas(), '#f59e0b', destino)
    setObjetoSel(id)
    setTab('editar')
  }

  // Selecciona el primer objeto al entrar (o si el seleccionado dejó de existir).
  useEffect(() => {
    if (seleccionado || ubicaciones.length === 0) return
    const primero = ubicaciones[0].objetos[0]
    if (primero?.id != null) setObjetoSel(primero.id)
  }, [seleccionado, ubicaciones, setObjetoSel])

  const botonCrear = (
    <button
      type="button"
      onClick={crearObjetoPiezas}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
    >
      <Icono nombre="muro" /> {t('editor.obj.crearPiezas', 'Crear objeto con piezas 3D')}
    </button>
  )

  // Generar un objeto o pieza arquitectónica con IA (o subir un .glb) y abrirlo para
  // editar, en el destino que elija el usuario (mapa o cuarto).
  const generadorIA = (
    <GenerarObjetoIA
      onCrear={async (piezas, grupo) => {
        const destino = await pedirDestinoObjeto()
        if (!destino) return
        const id = await addObjetoPiezas(
          piezas,
          piezas[0]?.color ?? '#f59e0b',
          destino,
          grupo && grupo !== 'ninguno' ? grupo : undefined,
        )
        setObjetoSel(id)
        setTab('editar')
      }}
      onCrearGlb={async (glb) => {
        const destino = await pedirDestinoObjeto()
        if (!destino) return
        const id = await addObjetoGlb(glb, '#f59e0b', destino)
        setObjetoSel(id)
        setTab('editar')
      }}
    />
  )

  const ubicActiva = seleccionado
    ? ubicaciones.find((u) => u.id === seleccionado.roomId) ?? ubicaciones[0]
    : ubicaciones[0]
  const escala = seleccionado?.escala ?? ESCALA_DEFAULT
  // Efecto ajustable del especial seleccionado (agua/luz/juego); null = sin slider.
  const fxGrupo = seleccionado ? grupoFx(seleccionado.tipo) : null

  const tabs: { id: ObjTab; label: string; icono: NombreIcono }[] = [
    { id: 'crear', label: t('editor.obj.tabCrear', 'Crear'), icono: 'agregar' },
    { id: 'mapa', label: t('editor.obj.mapa', 'Mapa'), icono: 'mapa' },
    { id: 'editar', label: t('editor.obj.tabEditar', 'Editar'), icono: 'editar' },
  ]

  return (
    <div className="space-y-3">
      {!editandoBiblioteca && (
      <>
      {/* Submenús: crear objetos, verlos por ubicación en el mapa, editar el seleccionado */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-[11px] font-semibold transition ${
              tab === tb.id
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            <Icono nombre={tb.icono} />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'crear' && (
        <div className="space-y-2">
          {botonCrear}
          {generadorIA}
        </div>
      )}

      {tab === 'mapa' && (
        ubicaciones.length === 0 ? (
          <p className="text-xs text-white/40">
            {t('editor.obj.sinObjetos', 'Aún no hay objetos. Créalos en la pestaña Crear.')}
          </p>
        ) : (
        <>
        {/* Ubicación: cuartos con objetos + el mapa */}
        <div className="flex flex-wrap gap-1.5">
          {ubicaciones.map((u) => {
            const activa = ubicActiva.id === u.id
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  const p = u.objetos[0]
                  if (p?.id != null) setObjetoSel(p.id)
                }}
                title={u.nombre}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  activa
                    ? 'border-accent/50 bg-accent text-accent-ink'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-base leading-none"><Icono emoji={u.icon} /></span>
                <span className="max-w-[7rem] truncate">{u.nombre}</span>
              </button>
            )
          })}
        </div>

        {/* Objetos de la ubicación activa: tocar uno lo selecciona y abre Editar */}
        <div className="grid grid-cols-4 gap-2">
          {ubicActiva.objetos.map((o) => {
            const sel = o.id === objetoSel
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  if (o.id != null) setObjetoSel(o.id)
                  setTab('editar')
                }}
                title={nombreObjeto(o)}
                className={`flex items-center justify-center rounded-lg border p-1.5 transition ${
                  sel
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <MiniaturaModelo
                  tipo={o.tipo}
                  color={o.color}
                  tema={tema}
                  piezas={o.piezas}
                  modeloGlb={o.modeloGlb}
                  foto={o.foto}
                  texto={o.texto}
                  idObjeto={o.id}
                  className="h-12 w-full object-contain"
                />
              </button>
            )
          })}
        </div>
        </>
        )
      )}

      {tab === 'editar' && !seleccionado && (
        <p className="text-xs text-white/40">
          {t('editor.obj.editarVacio', 'Elige un objeto en la pestaña Mapa, o crea uno nuevo.')}
        </p>
      )}
      </>
      )}

      {/* Vista previa 3D + propiedades del objeto seleccionado */}
      {seleccionado && (editandoBiblioteca || tab === 'editar') && (
        <>
          <PreviewObjeto3D
            key={seleccionado.id}
            tipo={seleccionado.tipo}
            color={seleccionado.color}
            escala={escala}
            rotY={seleccionado.rotY ?? 0}
            rotX={seleccionado.rotX ?? 0}
            rotZ={seleccionado.rotZ ?? 0}
            alturaY={seleccionado.y ?? 0}
            temaId={temaId}
            piezas={seleccionado.piezas}
            modeloGlb={seleccionado.modeloGlb}
            foto={seleccionado.foto}
            texto={seleccionado.texto}
            anim={seleccionado.animacion}
            fx={seleccionado.fx}
            onPiezasChange={
              seleccionado.tipo === TIPO_PIEZAS && seleccionado.id != null
                ? (p) => setObjetoPiezas(seleccionado.id!, p)
                : undefined
            }
            onActivarPiezas={
              // Un .glb es UN objeto entero: no se descompone en piezas (evita el cubo).
              // Los especiales tampoco: perderían la foto/el reflejo.
              seleccionado.tipo !== TIPO_PIEZAS && seleccionado.tipo !== TIPO_GLB &&
              !esTipoEspecial(seleccionado.tipo) && seleccionado.id != null
                ? () =>
                    convertirObjetoAPiezas(
                      seleccionado.id!,
                      // Réplica fiel de la forma real (objetos del catálogo/recursos).
                      piezasDesdeObjeto(seleccionado.tipo, seleccionado.color, temaId) ??
                        plantillaObjetoPiezas(seleccionado.color),
                    )
                : undefined
            }
          />
          {seleccionado.tipo === TIPO_PIEZAS || seleccionado.tipo === TIPO_GLB ? (
            /* Objetos de piezas o con modelo .glb: nombre editable + eliminar. */
            <div className="flex items-stretch gap-1.5">
              <input
                value={seleccionado.nombre ?? ''}
                onChange={(e) =>
                  seleccionado.id != null && setObjetoNombre(seleccionado.id, e.target.value)
                }
                placeholder={t('editor.obj.nombrePh', 'Nombre del objeto')}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-semibold text-white/85 placeholder:font-normal placeholder:text-white/25 focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  if (seleccionado.id == null) return
                  await removeObjeto(seleccionado.id)
                  setObjetoSel(null)
                }}
                title={t('editor.obj.eliminar', 'Eliminar objeto')}
                className="grid w-9 place-items-center rounded-md border border-white/10 bg-white/5 text-sm transition hover:bg-red-500/25"
              >
                <Icono nombre="basura" />
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-white/85">{nombreObjeto(seleccionado)}</p>
          )}

          {/* Biblioteca: generar con IA o subir un .glb para ESTE objeto (queda en su carpeta). */}
          {editandoBiblioteca && (seleccionado.tipo === TIPO_PIEZAS || seleccionado.tipo === TIPO_GLB) && (
            <GenerarObjetoIA
              onCrear={(piezas, grupo) =>
                seleccionado.id != null && setObjetoPiezas(seleccionado.id, piezas, grupo)
              }
              onCrearGlb={(glb) =>
                seleccionado.id != null && setObjetoModeloGlb(seleccionado.id, glb)
              }
            />
          )}

          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-3">
            {/* Anuncios: el texto que muestra el letrero (nombre de la casa, frase…). */}
            {esAnuncio(seleccionado.tipo) && (
              <PropiedadGrupo titulo={<><Icono nombre="editar" /> {t('editor.obj.texto', 'Texto')}</>}>
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={seleccionado.texto ?? ''}
                    onChange={(e) =>
                      seleccionado.id != null && setObjetoTexto(seleccionado.id, e.target.value)
                    }
                    placeholder={t('editor.obj.textoPh', 'El nombre de tu casa o una frase…')}
                    className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white/85 placeholder:text-white/25 focus:outline-none"
                  />
                  <p className="text-[10px] leading-snug text-white/35">
                    {t('editor.obj.textoAyuda', 'Enter agrega otra línea. Vacío = texto de muestra.')}
                  </p>
                </div>
              </PropiedadGrupo>
            )}

            {/* Cuadro especial y espectacular: la foto que se muestra dentro. */}
            {(seleccionado.tipo === TIPO_CUADRO_FOTO || seleccionado.tipo === TIPO_ESPECTACULAR) && (
              <PropiedadGrupo titulo={<><Icono nombre="foto" /> {t('editor.obj.foto', 'Foto')}</>}>
                <div className="space-y-1.5">
                  <label className="block cursor-pointer rounded-md border border-accent/30 bg-accent/10 px-2 py-1.5 text-center text-[11px] font-semibold text-accent transition hover:bg-accent/20">
                    <Icono nombre="foto" />{' '}
                    {seleccionado.foto
                      ? t('editor.obj.cambiarFoto', 'Cambiar la foto')
                      : t('editor.obj.subirFoto', 'Subir una foto')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f || seleccionado.id == null) return
                        await setObjetoFoto(seleccionado.id, await comprimirFoto(f))
                      }}
                    />
                  </label>
                  {seleccionado.foto && (
                    <button
                      type="button"
                      onClick={() => seleccionado.id != null && setObjetoFoto(seleccionado.id, undefined)}
                      className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center text-[11px] text-white/60 transition hover:bg-red-500/25"
                    >
                      <Icono nombre="basura" /> {t('editor.obj.quitarFoto', 'Quitar la foto')}
                    </button>
                  )}
                  <p className="text-[10px] leading-snug text-white/35">
                    {seleccionado.tipo === TIPO_ESPECTACULAR
                      ? t('editor.obj.fotoAyudaPanel', 'La foto llena el panel; el texto queda en una banda encima.')
                      : t('editor.obj.fotoAyuda', 'El marco adopta la proporción de tu foto.')}
                  </p>
                </div>
              </PropiedadGrupo>
            )}

            {/* Objetos de piezas con el engrane ⚙️ abierto: editor de piezas (forma). */}
            {seleccionado.tipo === TIPO_PIEZAS && piezasControles && (
              <PropiedadGrupo titulo={<><Icono nombre="muro" /> {t('editor.obj.forma', 'Forma')}</>}>
                <EditorPiezas
                  piezas={seleccionado.piezas ?? []}
                  onChange={(p) => seleccionado.id != null && setObjetoPiezas(seleccionado.id, p)}
                  onRestaurar={() => {
                    if (seleccionado.id == null) return
                    // Convertido: vuelve a su modelo original; creado de piezas: a la caja inicial.
                    if (seleccionado.tipoOriginal) restaurarObjetoPredeterminado(seleccionado.id)
                    else setObjetoPiezas(seleccionado.id, plantillaObjetoPiezas(seleccionado.color))
                  }}
                />
              </PropiedadGrupo>
            )}

            {/* El color no aplica a piezas (cada una tiene el suyo) ni a un .glb (trae su propio material). */}
            {seleccionado.tipo !== TIPO_PIEZAS && seleccionado.tipo !== TIPO_GLB && (
              <PropiedadGrupo titulo={t('editor.obj.color', 'Color')}>
                <ColorPicker
                  value={seleccionado.color}
                  onChange={(c) => seleccionado.id != null && setObjetoColor(seleccionado.id, c)}
                />
              </PropiedadGrupo>
            )}


            {/* Tamaño/posición/rotación del objeto completo: siempre en objetos con forma
                fija (glb, catálogo, recursos); en piezas, solo con el engrane ⚙️ cerrado
                (abierto se edita cada pieza por separado, arriba). */}
            {(seleccionado.tipo !== TIPO_PIEZAS || !piezasControles) && (
              <div className="space-y-1.5">
                {/* Intensidad del efecto del especial: agua, luz o velocidad del juego. */}
                {fxGrupo && (
                  <SliderProp
                    label={
                      fxGrupo === 'agua'
                        ? t('editor.obj.fxAgua', 'Intensidad del agua')
                        : fxGrupo === 'luz'
                          ? t('editor.obj.fxLuz', 'Intensidad de la luz')
                          : t('editor.obj.fxJuego', 'Velocidad del juego')
                    }
                    value={seleccionado.fx ?? FX_DEFAULT}
                    min={FX_MIN}
                    max={FX_MAX}
                    step={0.05}
                    fmt={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => seleccionado.id != null && setObjetoFx(seleccionado.id, v)}
                    onReset={() => seleccionado.id != null && setObjetoFx(seleccionado.id, FX_DEFAULT)}
                  />
                )}
                <SliderProp
                  label={t('editor.obj.tamano', 'Tamaño')}
                  value={escala}
                  min={ESCALA_MIN}
                  max={ESCALA_MAX}
                  step={0.05}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => seleccionado.id != null && setObjetoEscala(seleccionado.id, v)}
                  onReset={() => seleccionado.id != null && setObjetoEscala(seleccionado.id, ESCALA_DEFAULT)}
                />
                <SliderProp
                  label={t('editor.obj.altura', 'Altura')}
                  value={seleccionado.y ?? 0}
                  min={0}
                  max={4}
                  step={0.1}
                  fmt={(v) => v.toFixed(1)}
                  onChange={(v) => seleccionado.id != null && setObjetoAltura(seleccionado.id, v)}
                  onReset={() => seleccionado.id != null && setObjetoAltura(seleccionado.id, 0)}
                />
                <SliderProp
                  label={t('editor.obj.girar', 'Girar (Y)')}
                  value={seleccionado.rotY ?? 0}
                  min={0}
                  max={359}
                  step={1}
                  fmt={(v) => `${Math.round(v)}°`}
                  onChange={(v) => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'y', v)}
                  onReset={() => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'y', 0)}
                  extra={
                    <>
                      <BotonGiro90
                        title={t('editor.obj.girIzq', 'Girar 90° a la izquierda')}
                        onClick={() =>
                          seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'y', (seleccionado.rotY ?? 0) - 90)
                        }
                      >
                        ⟲
                      </BotonGiro90>
                      <BotonGiro90
                        title={t('editor.obj.girDer', 'Girar 90° a la derecha')}
                        onClick={() =>
                          seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'y', (seleccionado.rotY ?? 0) + 90)
                        }
                      >
                        ⟳
                      </BotonGiro90>
                    </>
                  }
                />
                <SliderProp
                  label={t('editor.obj.inclinarX', 'Inclinar (X)')}
                  value={seleccionado.rotX ?? 0}
                  min={0}
                  max={359}
                  step={1}
                  fmt={(v) => `${Math.round(v)}°`}
                  onChange={(v) => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'x', v)}
                  onReset={() => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'x', 0)}
                />
                <SliderProp
                  label={t('editor.obj.inclinarZ', 'Inclinar (Z)')}
                  value={seleccionado.rotZ ?? 0}
                  min={0}
                  max={359}
                  step={1}
                  fmt={(v) => `${Math.round(v)}°`}
                  onChange={(v) => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'z', v)}
                  onReset={() => seleccionado.id != null && setObjetoRotEje(seleccionado.id, 'z', 0)}
                />
              </div>
            )}

            {/* Animación: aplica a cualquier tipo de objeto (el preset mueve el conjunto). */}
            <PropiedadGrupo titulo={<><Icono nombre="brillo" /> {t('editor.anim.titulo', 'Animación')}</>}>
              <EditorAnimacion
                anim={seleccionado.animacion}
                onChange={(a) => seleccionado.id != null && setObjetoAnimacion(seleccionado.id, a)}
                piezas={seleccionado.tipo === TIPO_PIEZAS ? seleccionado.piezas : undefined}
                onAplicarPose={
                  seleccionado.tipo === TIPO_PIEZAS && seleccionado.id != null
                    ? (p) => setObjetoPiezas(seleccionado.id!, p)
                    : undefined
                }
                conVida
              />
              {/* Función especial (sentarse/acostarse/conducir): la IA lo clasifica al crear
                  el objeto, aquí se corrige a mano. Oculto en tipos con mecanismo propio
                  (especiales de plantilla y los 4 vehículos) y en .glb (sin bounding box fiable). */}
              {seleccionado.tipo !== TIPO_GLB &&
                !esTipoEspecial(seleccionado.tipo) &&
                !esVehiculo(seleccionado.tipo) &&
                seleccionado.id != null && (
                  <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {t('editor.obj.grupoAccion', 'Función especial')}
                    </p>
                    <select
                      value={grupoAccionDe(seleccionado.tipo, seleccionado.grupoAccion) ?? ''}
                      onChange={(e) =>
                        seleccionado.id != null &&
                        setObjetoGrupoAccion(
                          seleccionado.id,
                          e.target.value ? (e.target.value as GrupoAccion) : null,
                        )
                      }
                      className="w-full cursor-pointer rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-white/85 focus:outline-none [&>option]:bg-[var(--ui-panel)]"
                    >
                      <option value="">{t('editor.obj.grupoNinguno', '— (ninguno)')}</option>
                      <option value="asiento">{t('editor.obj.grupoAsiento', 'Sentarse')}</option>
                      <option value="acostarse">{t('editor.obj.grupoAcostarse', 'Acostarse')}</option>
                      <option value="vehiculo">{t('editor.obj.grupoVehiculo', 'Conducir')}</option>
                    </select>
                  </div>
                )}
            </PropiedadGrupo>
          </div>
        </>
      )}
    </div>
  )
}

/** Botón diminuto de giro rápido 90° (integrado en la fila de rotación). */
function BotonGiro90({
  children,
  title,
  onClick,
}: {
  children: ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-5 w-5 place-items-center rounded text-sm text-white/50 transition hover:bg-white/10 hover:text-white/85"
    >
      {children}
    </button>
  )
}

/**
 * Bloque: generar con IA un objeto o una pieza arquitectónica a partir de una
 * descripción en texto (cada categoría usa un prompt especializado en
 * `generarModelo3D`) o subir un modelo `.glb` propio (se optimiza/decima al vuelo,
 * ver `optimizarGlb`). El resultado son piezas o un modelo, editables como
 * cualquier objeto.
 */
function GenerarObjetoIA({
  onCrear,
  onCrearGlb,
}: {
  onCrear: (piezas: Pieza3D[], grupo: GrupoAccion | 'ninguno' | null) => void
  onCrearGlb?: (glb: Blob) => void
}) {
  const t = useT()
  const [desc, setDesc] = useState('')
  const [tipo, setTipo] = useState<'objeto' | 'arquitectura'>('objeto')
  const [estilo, setEstilo] = useState<EstiloModelo3D>('normal')
  const [generando, setGenerando] = useState(false)
  const [optimizando, setOptimizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generar = async () => {
    if (!desc.trim() || generando) return
    setGenerando(true)
    setError(null)
    try {
      const { piezas, grupo } = await generarModelo3D(desc.trim(), tipo, estilo)
      onCrear(piezas, grupo)
      setDesc('')
    } catch (err) {
      console.warn('[MPH] No se pudo generar el objeto 3D:', err)
      setError(t('editor.obj.formaError', 'No pude crear la forma. Revisa el modelo de IA e inténtalo de nuevo.'))
    } finally {
      setGenerando(false)
    }
  }

  const categorias: { id: 'objeto' | 'arquitectura'; emoji: string; label: string }[] = [
    { id: 'objeto', emoji: '📦', label: t('editor.obj.tipoObjeto', 'Objeto') },
    { id: 'arquitectura', emoji: '🏛️', label: t('editor.obj.tipoArq', 'Arquitectura') },
  ]

  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
      {/* Generar con IA (categoría, estilo, descripción): cuesta créditos. La
          subida manual de .glb de abajo es gratis. */}
      {iaHabilitada() && (
      <>
      {/* Categoría: afina el prompt (proporciones de mueble vs. escala arquitectónica). */}
      <div className="flex overflow-hidden rounded-md border border-white/10">
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTipo(c.id)}
            className={`flex-1 px-2 py-1 text-[11px] font-semibold transition ${
              tipo === c.id ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/55 hover:bg-white/10'
            }`}
          >
            <Icono emoji={c.emoji} /> {c.label}
          </button>
        ))}
      </div>

      {/* Estilo: modula el prompt (nivel de detalle, formas, colores). */}
      <label className="flex items-center gap-1.5 text-[11px] text-white/45">
        {t('editor.obj.estilo', 'Estilo')}
        <select
          value={estilo}
          onChange={(e) => setEstilo(e.target.value as EstiloModelo3D)}
          className="min-w-0 flex-1 cursor-pointer rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-white/85 focus:outline-none [&>option]:bg-[var(--ui-panel)]"
        >
          <option value="normal">{t('editor.obj.estiloNormal', 'Normal')}</option>
          <option value="detallado">{t('editor.obj.estiloDetallado', 'Detallado')}</option>
          <option value="minimalista">{t('editor.obj.estiloMinimalista', 'Minimalista')}</option>
          <option value="redondeado">{t('editor.obj.estiloRedondeado', 'Redondeado')}</option>
          <option value="bloques">{t('editor.obj.estiloBloques', 'Bloques (voxel)')}</option>
        </select>
      </label>

      <div className="flex gap-1.5">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generar()}
          placeholder={
            !iaActiva()
              ? t('editor.obj.formaSinIa', 'Describir la forma requiere IA (elige modelo en la barra)')
              : tipo === 'objeto'
                ? t('editor.obj.formaPhObj', 'Descríbelo: "silla de madera con cojín rojo"')
                : t('editor.obj.formaPhArq', 'Descríbelo: "columna griega con base"')
          }
          disabled={!iaActiva() || generando}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white/85 placeholder:text-white/25 focus:outline-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={generar}
          disabled={!iaActiva() || generando || !desc.trim()}
          className="rounded-md border border-accent/30 bg-accent/10 px-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-30"
          title={t('editor.obj.formaGenerar', 'Crear con IA')}
        >
          {generando ? <span className="animate-pulse">…</span> : <Icono nombre="brillo" />}
        </button>
        <Creditos op={OP_OBJETO_3D} />
      </div>
      </>
      )}
      {error && <p className="px-1 text-[10px] text-red-400/80">{error}</p>}

      {onCrearGlb && (
        <label
          className={`block rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center text-[11px] text-white/60 transition ${
            optimizando ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-white/15'
          }`}
        >
          {optimizando ? (
            <span className="animate-pulse">{t('editor.obj.optimizando', 'Optimizando modelo…')}</span>
          ) : (
            <>
              <Icono nombre="cuarto-bodega" /> {t('editor.obj.subirGlb', 'Subir modelo .glb')}
            </>
          )}
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            className="hidden"
            disabled={optimizando}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setOptimizando(true)
              setError(null)
              try {
                const { optimizarGlb } = await import('../../house/optimizarGlb')
                onCrearGlb(await optimizarGlb(f))
              } catch (err) {
                console.warn('[MPH] No se pudo optimizar el .glb:', err)
                setError(t('editor.obj.glbError', 'No pude procesar ese modelo .glb. ¿Es un archivo válido?'))
              } finally {
                setOptimizando(false)
              }
            }}
          />
        </label>
      )}
    </div>
  )
}
