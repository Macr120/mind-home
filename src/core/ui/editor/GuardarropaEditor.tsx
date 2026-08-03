import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useDiseño } from '../../state/disenoStore'
import { useEditorUi } from '../../state/editorUiStore'
import { prendasCustomRepo } from '../../data/repository'
import { iaActiva, generarModelo3D } from '../../chat/ia'
import { iaHabilitada } from '../../edicion'
import { Creditos } from '../Creditos'
import { OP_ROPA_3D } from '../../cuenta/catalogoNucleo'
import { ModeloPiezas, PiezasSeleccionContext } from '../../house/modeloPersonalizado'
import { EditorPiezas } from './EditorPiezas'
import type { Pieza3D } from '../../chat/mascotas'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

const inputCls =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85 placeholder:text-white/25 focus:outline-none'

/** Prenda de arranque para el constructor manual: un chaleco sobre el torso. */
const PLANTILLA_PRENDA = (): Pieza3D[] => [
  { tipo: 'caja', pos: [0, 0.92, 0], tam: [0.66, 0.66, 0.36], color: '#7c3aed' },
  { tipo: 'caja', pos: [0, 1.26, 0], tam: [0.68, 0.12, 0.38], color: '#5b21b6' },
]

const GHOST = '#8a93a3'

/** Cuerpo base semitransparente como referencia al construir/editar una prenda. */
function CuerpoFantasma() {
  const cubos: [number, number, number, number, number, number][] = [
    [-0.14, 0.3, 0, 0.24, 0.6, 0.26],
    [0.14, 0.3, 0, 0.24, 0.6, 0.26],
    [0, 0.92, 0, 0.6, 0.62, 0.3],
    [-0.42, 0.92, 0, 0.2, 0.6, 0.26],
    [0.42, 0.92, 0, 0.2, 0.6, 0.26],
    [0, 1.5, 0, 0.44, 0.44, 0.44],
  ]
  return (
    <group>
      {cubos.map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={GHOST} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Preview de la prenda sobre el cuerpo fantasma; las piezas se tocan para elegirlas. */
function PreviewPrendaCustom({ piezas }: { piezas: Pieza3D[] }) {
  const piezaSel = useEditorUi((s) => s.piezaSel)
  const setPiezaSel = useEditorUi((s) => s.setPiezaSel)
  const sel = piezas.length ? { sel: Math.min(piezaSel, piezas.length - 1), onSel: setPiezaSel } : null
  return (
    <div className="h-48 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [2.2, 1.9, 4.1], fov: 32, near: 0.1, far: 100 }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.35} />
        <CuerpoFantasma />
        <PiezasSeleccionContext.Provider value={sel}>
          <ModeloPiezas piezas={piezas} />
        </PiezasSeleccionContext.Provider>
        <OrbitControls enablePan={false} enableDamping target={[0, 0.9, 0]} minDistance={1.6} maxDistance={8} />
      </Canvas>
    </div>
  )
}

interface Editando {
  id?: number
  nombre: string
  piezas: Pieza3D[]
}

/**
 * Guardarropa a medida del personaje principal: crea prendas por IA o a mano
 * (constructor por piezas con preview), guárdalas y póntelas/quítatelas. Lo
 * puesto vive en el avatar; el guardarropa es una tabla local.
 */
export function GuardarropaEditor() {
  const t = useT()
  const guardadas = prendasCustomRepo.useAll()
  const ropaCustom = useDiseño((s) => s.avatar.ropaCustom)
  const poner = useDiseño((s) => s.ponerAvatarPrendaCustom)
  const quitar = useDiseño((s) => s.quitarAvatarPrendaCustom)

  const [editando, setEditando] = useState<Editando | null>(null)
  const [desc, setDesc] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estaPuesta = (id?: number) => id != null && (ropaCustom ?? []).some((g) => g.refId === id)

  const parsePiezas = (raw: string): Pieza3D[] => {
    try {
      return JSON.parse(raw) as Pieza3D[]
    } catch {
      return []
    }
  }

  const generarIA = async () => {
    if (!desc.trim() || generando) return
    setGenerando(true)
    setError(null)
    try {
      const piezas = await generarModelo3D(desc.trim(), 'ropa')
      const nombre = desc.trim()
      const id = await prendasCustomRepo.add({ nombre, piezas: JSON.stringify(piezas), creadoEn: Date.now() })
      await poner(id, piezas, nombre) // se pone al crearla
      setDesc('')
    } catch (err) {
      console.warn('[MPH] No se pudo crear la prenda con IA:', err)
      setError(t('editor.pers.ropaCustomError', 'No pude crear la prenda. Revisa el modelo de IA e inténtalo de nuevo.'))
    } finally {
      setGenerando(false)
    }
  }

  const guardarEditando = async () => {
    if (!editando) return
    const nombre = editando.nombre.trim() || t('editor.pers.ropaCustomSinNombre', 'Prenda')
    const piezasJson = JSON.stringify(editando.piezas)
    let id = editando.id
    if (id != null) {
      await prendasCustomRepo.update(id, { nombre, piezas: piezasJson })
      if (estaPuesta(id)) await poner(id, editando.piezas, nombre) // refresca lo puesto
    } else {
      id = await prendasCustomRepo.add({ nombre, piezas: piezasJson, creadoEn: Date.now() })
      await poner(id, editando.piezas, nombre) // se pone al crearla
    }
    setEditando(null)
  }

  const eliminar = async (id: number) => {
    if (estaPuesta(id)) await quitar(id)
    await prendasCustomRepo.remove(id)
  }

  // ── Constructor / editor de una prenda ──
  if (editando) {
    return (
      <div className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-2">
        <input
          value={editando.nombre}
          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
          placeholder={t('editor.pers.ropaCustomNombre', 'Nombre de la prenda')}
          autoComplete="off"
          className={`${inputCls} w-full`}
        />
        <PreviewPrendaCustom piezas={editando.piezas} />
        <EditorPiezas
          piezas={editando.piezas}
          onChange={(piezas) => setEditando({ ...editando, piezas })}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setEditando(null)}
            className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10"
          >
            {t('editor.pers.cancelar', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={guardarEditando}
            className="flex-1 rounded-md border border-accent/40 bg-accent/20 px-2 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/30"
          >
            {t('editor.pers.guardar', 'Guardar')}
          </button>
        </div>
      </div>
    )
  }

  // ── Lista + acciones ──
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {t('editor.pers.guardarropa', 'Guardarropa a medida')}
      </p>

      {/* Crear por IA */}
      {iaHabilitada() && (
        <div className="flex gap-1.5">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generarIA()}
            placeholder={
              iaActiva()
                ? t('editor.pers.ropaCustomPh', 'Descríbela: "chaleco de plumas dorado"')
                : t('editor.pers.ropaCustomSinIa', 'Crear ropa con IA requiere elegir modelo en la barra')
            }
            disabled={!iaActiva() || generando}
            className={`${inputCls} min-w-0 flex-1 disabled:opacity-40`}
          />
          <button
            type="button"
            onClick={generarIA}
            disabled={!iaActiva() || generando || !desc.trim()}
            className="rounded-md border border-accent/30 bg-accent/10 px-2.5 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-30"
            title={t('editor.pers.ropaCustomGenerar', 'Crear la prenda con IA')}
          >
            {generando ? <span className="animate-pulse">…</span> : <Icono nombre="brillo" />}
          </button>
          <Creditos op={OP_ROPA_3D} />
        </div>
      )}
      {error && <p className="px-1 text-[10px] text-red-400/80">{error}</p>}

      {/* Construir a mano */}
      <button
        type="button"
        onClick={() => setEditando({ nombre: '', piezas: PLANTILLA_PRENDA() })}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/15"
      >
        <Icono nombre="muro" /> {t('editor.pers.ropaCustomManual', 'Construir a mano')}
      </button>

      {/* Prendas guardadas */}
      {(guardadas ?? []).length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] leading-snug text-white/40">
          {t('editor.pers.ropaCustomVacio', 'Aún no tienes prendas a medida. Crea una con IA o constrúyela a mano.')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {(guardadas ?? []).map((p) => {
            const puesta = estaPuesta(p.id)
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                  puesta ? 'border-accent/30 bg-accent/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    puesta ? void quitar(p.id!) : void poner(p.id!, parsePiezas(p.piezas), p.nombre)
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-base leading-none">
                    <Icono emoji="🧵" />
                  </span>
                  <span className={`truncate text-xs font-semibold ${puesta ? 'text-white/90' : 'text-white/55'}`}>
                    {p.nombre}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditando({ id: p.id, nombre: p.nombre, piezas: parsePiezas(p.piezas) })}
                  title={t('editor.pers.editar', 'Editar')}
                  className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-white/15"
                >
                  <Icono nombre="editar" />
                </button>
                <button
                  type="button"
                  onClick={() => void eliminar(p.id!)}
                  title={t('editor.pers.borrar', 'Eliminar')}
                  className="grid h-6 w-6 place-items-center rounded-md bg-white/5 text-xs text-white/50 transition hover:bg-red-500/25"
                >
                  <Icono nombre="basura" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    puesta ? void quitar(p.id!) : void poner(p.id!, parsePiezas(p.piezas), p.nombre)
                  }
                  className={`grid h-6 w-6 place-items-center rounded-md text-xs transition ${
                    puesta ? 'bg-accent/30 text-accent' : 'bg-white/5 text-white/40 hover:bg-white/15'
                  }`}
                  title={puesta ? t('editor.pers.quitarPrenda', 'Quitar') : t('editor.pers.ponerPrenda', 'Poner')}
                >
                  {puesta ? '✓' : '+'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
