import { useMemo, useState } from 'react'
import type { MaterialTaller } from '../../data/db'
import {
  guardarAjustesCotizacion,
  materialesTallerRepo,
  useAjustesCotizacion,
} from '../../data/repository'
import type { PlanCorte } from '../../muebles/corte'
import { cotizar, type RenglonPresupuesto } from '../../muebles/costos'
import { reponerCatalogo } from '../../muebles/catalogoSiembra'
import type { Despiece } from '../../muebles/tipos'
import { dinero } from '../../moneda'
import { confirmar } from '../../state/confirmarStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import {
  BotonPrimario,
  BotonSecundario,
  INPUT,
  Modal,
} from '../../../rooms/_shared/ui'
import { Chips, Interruptor } from './CampoMm'
import { AvisosMueble } from './PanelDespiece'
import { descargarPresupuestoXlsx, imprimirPresupuesto, sePuedeImprimir } from './exportarTaller'

/**
 * Presupuesto del mueble y catálogo de precios. Los precios son del usuario: el
 * catálogo de fábrica solo evita empezar con una tabla vacía, y cada renglón se
 * edita o se borra.
 */

const TIPOS: { id: MaterialTaller['tipo']; clave: string; nombreEs: string }[] = [
  { id: 'tablero', clave: 'muebles.mat.tipo.tablero', nombreEs: 'Tableros' },
  { id: 'canto', clave: 'muebles.mat.tipo.canto', nombreEs: 'Cantos' },
  { id: 'tubo', clave: 'muebles.mat.tipo.tubo', nombreEs: 'Tubos' },
  { id: 'herraje', clave: 'muebles.mat.tipo.herraje', nombreEs: 'Herrajes' },
  { id: 'servicio', clave: 'muebles.mat.tipo.servicio', nombreEs: 'Servicios' },
]

export function PanelPrecios({
  despiece,
  plan,
  nombre,
}: {
  despiece: Despiece
  plan: PlanCorte
  nombre: string
}) {
  const t = useT()
  const aj = useAjustesCotizacion()
  const catalogo = materialesTallerRepo.useAll()
  const [verCatalogo, setVerCatalogo] = useState(false)
  const [verAjustes, setVerAjustes] = useState(false)

  const presupuesto = useMemo(
    () => cotizar(despiece, plan, catalogo ?? [], aj),
    [despiece, plan, catalogo, aj],
  )
  const fmt = (n: number) => dinero(n, { moneda: aj.moneda, decimales: aj.decimales })

  const porGrupo = useMemo(() => {
    const mapa = new Map<RenglonPresupuesto['grupo'], RenglonPresupuesto[]>()
    for (const r of presupuesto.renglones) {
      const lista = mapa.get(r.grupo)
      if (lista) lista.push(r)
      else mapa.set(r.grupo, [r])
    }
    return [...mapa]
  }, [presupuesto.renglones])

  const nombreGrupo: Record<string, string> = {
    tablero: t('muebles.cot.gTablero', 'Tableros'),
    canto: t('muebles.cot.gCanto', 'Cantos'),
    tubo: t('muebles.cot.gTubo', 'Metal'),
    herraje: t('muebles.cot.gHerraje', 'Herrajes'),
    servicio: t('muebles.cot.gServicio', 'Servicios'),
    manoObra: t('muebles.cot.manoObra', 'Mano de obra'),
    extra: t('muebles.cot.gExtra', 'Extras'),
    descuento: t('muebles.cot.descuento', 'Descuento'),
  }

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border p-3 ${
          presupuesto.conErrores
            ? 'border-red-400/30 bg-red-400/5'
            : 'border-accent/30 bg-accent/10'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {t('muebles.cot.total', 'Total')}
        </p>
        <p
          className={`text-2xl font-bold tabular-nums ${presupuesto.conErrores ? 'opacity-50' : ''}`}
        >
          {fmt(presupuesto.total)}
        </p>
        <p className="mt-0.5 text-[10px] text-white/45">
          {t('muebles.cot.materiales', 'Materiales')} {fmt(presupuesto.subtotalMateriales)}
          {presupuesto.subtotalManoObra > 0 &&
            ` · ${t('muebles.cot.manoObra', 'Mano de obra')} ${fmt(presupuesto.subtotalManoObra)}`}
          {presupuesto.impuesto > 0 &&
            ` · ${aj.impuestoNombre} ${fmt(presupuesto.impuesto)}${
              aj.impuestoIncluido ? ` (${t('muebles.cot.incluido', 'incluido')})` : ''
            }`}
        </p>
      </div>

      <AvisosMueble avisos={presupuesto.avisos} />

      <div className="flex flex-wrap gap-1.5">
        <BotonSecundario pequeno onClick={() => setVerCatalogo(true)}>
          <Icono nombre="etiqueta" /> {t('muebles.cot.catalogo', 'Precios')}
        </BotonSecundario>
        <BotonSecundario pequeno onClick={() => setVerAjustes(true)}>
          <Icono nombre="ajustes" /> {t('muebles.cot.ajustes', 'Ajustes')}
        </BotonSecundario>
        {sePuedeImprimir() && (
          <BotonSecundario
            pequeno
            onClick={() =>
              void imprimirPresupuesto(presupuesto, nombre, fmt, {
                concepto: t('muebles.cot.concepto', 'Concepto'),
                cant: t('muebles.cot.cant', 'Cantidad'),
                unitario: t('muebles.cot.unitario', 'Unitario'),
                importe: t('muebles.cot.importe', 'Importe'),
                total: t('muebles.cot.total', 'Total'),
                impuesto: aj.impuestoNombre,
              })
            }
          >
            <Icono nombre="imprimir" /> {t('muebles.cot.imprimir', 'Imprimir')}
          </BotonSecundario>
        )}
        <BotonSecundario
          pequeno
          onClick={() =>
            void descargarPresupuestoXlsx(presupuesto, despiece, plan, nombre, {
              presupuesto: t('muebles.cot.hojaPresupuesto', 'Presupuesto'),
              despiece: t('muebles.cot.hojaDespiece', 'Despiece'),
              acomodo: t('muebles.cot.hojaAcomodo', 'Cortes'),
              concepto: t('muebles.cot.concepto', 'Concepto'),
              detalle: t('muebles.cot.detalle', 'Detalle'),
              cant: t('muebles.cot.cant', 'Cantidad'),
              unidad: t('muebles.cot.unidad', 'Unidad'),
              unitario: t('muebles.cot.unitario', 'Unitario'),
              importe: t('muebles.cot.importe', 'Importe'),
              total: t('muebles.cot.total', 'Total'),
              pieza: t('muebles.desp.pieza', 'Pieza'),
              ancho: t('muebles.medidas.ancho', 'Ancho'),
              alto: t('muebles.medidas.alto', 'Alto'),
              grosor: t('muebles.estilo.grosor', 'Grosor'),
              material: t('muebles.estilo.material', 'Material'),
              veta: t('muebles.desp.veta', 'Veta'),
              hoja: t('muebles.corte.hoja', 'Hoja'),
              girada: t('muebles.corte.girada', 'Girada'),
            })
          }
        >
          <Icono nombre="descargar" /> Excel
        </BotonSecundario>
      </div>

      {porGrupo.map(([grupo, renglones]) => (
        <div key={grupo} className="overflow-hidden rounded-xl border border-white/10">
          <p className="bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {nombreGrupo[grupo] ?? grupo}
          </p>
          {renglones.map((r) => (
            <div key={r.id} className="border-t border-white/5 px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[12px]">{r.concepto}</span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums">{fmt(r.subtotal)}</span>
              </div>
              <p className="text-[10px] tabular-nums text-white/35">
                {r.cantidad} {t(`muebles.unidad.${r.unidad}`, r.unidad)} × {fmt(r.unitario)}
                {r.detalle ? ` · ${r.detalle}` : ''}
              </p>
            </div>
          ))}
        </div>
      ))}

      {verCatalogo && <CatalogoMateriales catalogo={catalogo ?? []} onCerrar={() => setVerCatalogo(false)} />}
      {verAjustes && <AjustesPanel onCerrar={() => setVerAjustes(false)} />}
    </div>
  )
}

function CatalogoMateriales({
  catalogo,
  onCerrar,
}: {
  catalogo: MaterialTaller[]
  onCerrar: () => void
}) {
  const t = useT()
  const [tipo, setTipo] = useState<MaterialTaller['tipo']>('tablero')
  const [editando, setEditando] = useState<MaterialTaller | 'nuevo' | null>(null)
  const filas = catalogo.filter((m) => m.tipo === tipo).sort((a, b) => a.orden - b.orden)

  const borrar = async (m: MaterialTaller) => {
    const ok = await confirmar({
      titulo: t('muebles.mat.borrar', 'Borrar «{nombre}»', { nombre: m.nombre }),
      mensaje: t('muebles.mat.borrarMsg', 'Deja de usarse en los presupuestos.'),
      peligro: true,
    })
    if (ok && m.id != null) await materialesTallerRepo.remove(m.id)
  }

  const restaurar = async () => {
    const ok = await confirmar({
      titulo: t('muebles.mat.restaurar', 'Restaurar precios de fábrica'),
      mensaje: t(
        'muebles.mat.restaurarMsg',
        'Vuelve a añadir los materiales de fábrica que hayas borrado. Los que editaste se quedan como están.',
      ),
    })
    if (ok) await reponerCatalogo()
  }

  return (
    <Modal titulo={t('muebles.mat.titulo', 'Precios de materiales')} onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-3">
        <Chips
          label={t('muebles.mat.familia', 'Familia')}
          valor={tipo}
          opciones={TIPOS.map((x) => ({ valor: x.id, texto: t(x.clave, x.nombreEs) }))}
          onChange={(v) => setTipo(v)}
        />
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {filas.map((m) => (
            <div
              key={m.clave}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2"
            >
              <button
                type="button"
                onClick={() => setEditando(m)}
                className="min-w-0 flex-1 text-start"
              >
                <p className="truncate text-[12px] font-semibold">{m.nombre}</p>
                <p className="text-[10px] tabular-nums text-white/40">
                  {dinero(m.precio)} / {t(`muebles.unidad.${m.unidad}`, m.unidad)}
                  {m.grosor ? ` · ${m.grosor} mm` : ''}
                  {m.cintaMm ? ` · ${m.cintaMm} mm` : ''}
                </p>
              </button>
              <button
                type="button"
                onClick={() => void borrar(m)}
                title={t('ui.borrar', 'Borrar')}
                className="ui-boton grid h-8 w-8 place-items-center rounded-lg text-white/30 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <Icono nombre="basura" />
              </button>
            </div>
          ))}
          {filas.length === 0 && (
            <p className="py-6 text-center text-[12px] text-white/35">
              {t('muebles.mat.vacio', 'Nada en esta familia todavía.')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <BotonPrimario pequeno onClick={() => setEditando('nuevo')}>
            <Icono nombre="agregar" /> {t('muebles.mat.nuevo', 'Añadir material')}
          </BotonPrimario>
          <BotonSecundario pequeno onClick={() => void restaurar()}>
            <Icono nombre="restaurar" /> {t('muebles.mat.restaurar', 'Restaurar precios de fábrica')}
          </BotonSecundario>
        </div>
      </div>
      {editando && (
        <EditorMaterial
          material={editando === 'nuevo' ? null : editando}
          tipo={tipo}
          onCerrar={() => setEditando(null)}
        />
      )}
    </Modal>
  )
}

function EditorMaterial({
  material,
  tipo,
  onCerrar,
}: {
  material: MaterialTaller | null
  tipo: MaterialTaller['tipo']
  onCerrar: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(material?.nombre ?? '')
  const [precio, setPrecio] = useState(String(material?.precio ?? 0))
  const [unidad, setUnidad] = useState<MaterialTaller['unidad']>(
    material?.unidad ?? (tipo === 'tablero' ? 'hoja' : tipo === 'herraje' ? 'pz' : 'ml'),
  )

  const guardar = async () => {
    const n = nombre.trim()
    const p = parseFloat(precio)
    if (!n || !Number.isFinite(p)) return
    if (material?.id != null) {
      await materialesTallerRepo.update(material.id, { nombre: n, precio: p, unidad })
    } else {
      await materialesTallerRepo.add({
        clave: `user-${tipo}-${Date.now().toString(36)}`,
        tipo,
        nombre: n,
        orden: 900,
        activo: true,
        precio: p,
        unidad,
        creadoEn: new Date().toISOString(),
      })
    }
    onCerrar()
  }

  const unidades: MaterialTaller['unidad'][] =
    tipo === 'tablero'
      ? ['hoja', 'm2']
      : tipo === 'servicio'
        ? ['ml', 'hora', 'pz']
        : tipo === 'herraje'
          ? ['pz', 'par', 'juego']
          : ['ml']

  return (
    <Modal
      titulo={material ? t('muebles.mat.editar', 'Editar material') : t('muebles.mat.nuevo', 'Añadir material')}
      onCerrar={onCerrar}
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('muebles.mat.nombre', 'Nombre')}
          </p>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('muebles.mat.nombrePh', 'Melamina blanca 18 mm')}
            className={INPUT}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('muebles.mat.precio', 'Precio')}
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className={`${INPUT} tabular-nums`}
          />
        </div>
        <Chips
          label={t('muebles.mat.unidad', 'Se vende por')}
          valor={unidad}
          opciones={unidades.map((u) => ({ valor: u, texto: t(`muebles.unidad.${u}`, u) }))}
          onChange={(v) => setUnidad(v)}
        />
        <div className="flex justify-end gap-1.5">
          <BotonSecundario pequeno onClick={onCerrar}>
            {t('ui.cancelar', 'Cancelar')}
          </BotonSecundario>
          <BotonPrimario pequeno onClick={() => void guardar()}>
            {t('ui.guardar', 'Guardar')}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  )
}

function AjustesPanel({ onCerrar }: { onCerrar: () => void }) {
  const t = useT()
  const aj = useAjustesCotizacion()
  const set = (p: Parameters<typeof guardarAjustesCotizacion>[0]) => void guardarAjustesCotizacion(p)

  return (
    <Modal titulo={t('muebles.cot.ajustes', 'Ajustes del presupuesto')} onCerrar={onCerrar}>
      <div className="space-y-3">
        <Chips
          label={t('muebles.cot.modoTablero', 'Cobrar el tablero')}
          valor={aj.modoTablero}
          opciones={[
            { valor: 'hoja' as const, texto: t('muebles.cot.modoHoja', 'Hojas completas') },
            { valor: 'm2-con-merma' as const, texto: t('muebles.cot.modoMerma', 'm² + merma') },
            { valor: 'm2' as const, texto: t('muebles.cot.modoM2', 'Solo m² usados') },
          ]}
          onChange={(v) => set({ modoTablero: v })}
        />
        <p className="text-[10px] leading-snug text-white/40">
          {t(
            'muebles.cot.modoAyuda',
            'Las hojas se compran enteras: el desperdicio ya lo pagaste. Cobrar solo los metros usados deja ese costo de tu lado.',
          )}
        </p>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t('muebles.cot.moneda', 'Moneda')}
          </p>
          <input
            value={aj.moneda}
            onChange={(e) => set({ moneda: e.target.value.toUpperCase().slice(0, 3) })}
            className={`${INPUT} uppercase`}
          />
          <p className="mt-1 text-[10px] text-white/35">
            {t(
              'muebles.cot.avisoMoneda',
              'Cambiar la moneda no convierte los precios: revísalos en el catálogo.',
            )}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {aj.impuestoNombre} (%)
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={aj.impuestoPct}
            onChange={(e) => set({ impuestoPct: parseFloat(e.target.value) || 0 })}
            className={`${INPUT} tabular-nums`}
          />
        </div>
        <Interruptor
          label={t('muebles.cot.impIncluido', 'El impuesto ya va incluido')}
          valor={aj.impuestoIncluido}
          onChange={(v) => set({ impuestoIncluido: v })}
        />
        <Interruptor
          label={t('muebles.cot.cobrarMano', 'Cobrar mano de obra')}
          valor={aj.manoObraActiva}
          onChange={(v) => set({ manoObraActiva: v })}
        />
        {aj.manoObraActiva && (
          <>
            <Chips
              label={t('muebles.cot.manoModo', 'Cómo se cobra')}
              valor={aj.manoObraModo}
              opciones={[
                { valor: 'hora' as const, texto: t('muebles.cot.porHora', 'Por hora') },
                { valor: 'pct' as const, texto: t('muebles.cot.porPct', '% de materiales') },
                { valor: 'pieza' as const, texto: t('muebles.cot.porPieza', 'Por pieza') },
              ]}
              onChange={(v) => set({ manoObraModo: v })}
            />
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t('muebles.cot.manoValor', 'Valor')}
              </p>
              <input
                type="number"
                inputMode="decimal"
                value={aj.manoObraValor}
                onChange={(e) => set({ manoObraValor: parseFloat(e.target.value) || 0 })}
                className={`${INPUT} tabular-nums`}
              />
            </div>
          </>
        )}
        <Interruptor
          label={t('muebles.cot.cobrarCorte', 'Cobrar el corte y el canteado')}
          valor={aj.cobrarCorte}
          onChange={(v) => set({ cobrarCorte: v })}
        />
      </div>
    </Modal>
  )
}
