import {
  CINTAS_CANTO,
  GROSORES_FONDO,
  PAREDES_TUBO,
  PERFILES_TUBO,
  SECCIONES_TUBO,
  TABLEROS,
  TUBOS,
  getTablero,
} from '../../muebles/materiales'
import { MODULOS, admiteBase, admitePuertas, getModulo, type ParamModulo } from '../../muebles/modulos'
import type { Cuerpo, MaterialTableroId, ModuloId, Mueble } from '../../muebles/tipos'
import { useTallerMuebles } from '../../state/tallerMueblesStore'
import { ColorPicker } from '../comun/ColorPicker'
import { Icono } from '../iconos/Icono'
import { useT } from '../../i18n/useT'
import { CampoMm, Chips, Interruptor } from './CampoMm'

/**
 * Los tres paneles de edición del taller: qué módulo es, cuánto mide y de qué
 * está hecho. Todos escriben por el store, que normaliza — ningún panel puede
 * dejar la receta en un estado imposible.
 */

/** Título de bloque dentro de un panel. */
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 border-t border-white/10 pt-3 first:border-0 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{titulo}</p>
      {children}
    </div>
  )
}

export function PanelModulos({ m }: { m: Mueble }) {
  const t = useT()
  const setModulo = useTallerMuebles((s) => s.setModulo)
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-white/45">
        {t(
          'muebles.modulos.ayuda',
          'Elige el tipo de mueble. Después ajustas las medidas al milímetro y el material.',
        )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODULOS.map((def) => {
          const activo = def.id === m.moduloId
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setModulo(def.id)}
              className={`ui-boton flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition ${
                activo
                  ? 'border-accent/50 bg-accent/15'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">
                <Icono nombre={def.icono} />
              </span>
              <span className="text-[12px] font-semibold leading-tight">
                {t(def.clave, def.nombreEs)}
              </span>
              <span className="text-[10px] tabular-nums text-white/35">
                {def.medidas.ancho.def} × {def.medidas.alto.def} × {def.medidas.fondo.def} mm
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Un parámetro propio del módulo, con el control que le toca según su tipo. */
function ControlParam({ m, p }: { m: Mueble; p: ParamModulo }) {
  const t = useT()
  const setOpcion = useTallerMuebles((s) => s.setOpcion)
  if (p.visible && !p.visible(m)) return null
  const valor = m.opciones[p.id]
  const label = t(p.clave, p.nombreEs)

  if (p.tipo === 'bool') {
    return <Interruptor label={label} valor={valor === true} onChange={(v) => setOpcion(p.id, v)} />
  }
  if (p.tipo === 'opcion') {
    return (
      <Chips
        label={label}
        valor={String(valor)}
        opciones={(p.opciones ?? []).map((o) => ({ valor: o.valor, texto: t(o.clave, o.nombreEs) }))}
        onChange={(v) => setOpcion(p.id, v)}
      />
    )
  }
  const min = p.min ?? 0
  const max = p.max ?? 10
  // Los enteros pequeños (número de entrepaños, cajones…) se tocan mejor como
  // chips que con un deslizador; los grandes (altura del tubo) piden campo.
  if (max - min <= 8) {
    return (
      <Chips
        label={label}
        valor={Number(valor)}
        opciones={Array.from({ length: max - min + 1 }, (_, i) => ({
          valor: min + i,
          texto: String(min + i),
        }))}
        onChange={(v) => setOpcion(p.id, v)}
      />
    )
  }
  return (
    <CampoMm
      label={label}
      valor={Number(valor)}
      rango={{ min, max, def: Number(p.def), paso: 10 }}
      onChange={(v) => setOpcion(p.id, v)}
      sufijo={p.id === 'inclinacion' ? '°' : 'mm'}
    />
  )
}

export function PanelMedidas({ m }: { m: Mueble }) {
  const t = useT()
  const def = getModulo(m.moduloId)
  const setMedida = useTallerMuebles((s) => s.setMedida)
  return (
    <div className="space-y-3">
      <Bloque titulo={t('muebles.medidas.exteriores', 'Medidas exteriores')}>
        <CampoMm
          label={t('muebles.medidas.ancho', 'Ancho')}
          valor={m.medidas.ancho}
          rango={def.medidas.ancho}
          onChange={(v) => setMedida('ancho', v)}
        />
        <CampoMm
          label={t('muebles.medidas.alto', 'Alto')}
          valor={m.medidas.alto}
          rango={def.medidas.alto}
          onChange={(v) => setMedida('alto', v)}
        />
        <CampoMm
          label={t('muebles.medidas.fondo', 'Fondo')}
          valor={m.medidas.fondo}
          rango={def.medidas.fondo}
          onChange={(v) => setMedida('fondo', v)}
        />
      </Bloque>
      {def.params.length > 0 && (
        <Bloque titulo={t('muebles.medidas.deEsteMueble', 'De este mueble')}>
          {def.params.map((p) => (
            <ControlParam key={p.id} m={m} p={p} />
          ))}
        </Bloque>
      )}
    </div>
  )
}

/**
 * Estilo del mueble. Cada bloque se enseña solo si este módulo lo usa, y la
 * pregunta se le hace al `Cuerpo` YA ARMADO, no a la receta: así el panel dice
 * la verdad aunque lo que lleve metal o tablero dependa de un parámetro (una
 * silla de costados de tablero no tiene postes; un rack de rejilla no tiene
 * tablero que elegir). Lo que no se puede deducir del cuerpo —si el módulo
 * ADMITE puertas o trasera, que es justo lo que se activa desde aquí— lo dice
 * la definición del módulo.
 */
export function PanelEstilo({ m, cuerpo }: { m: Mueble; cuerpo: Cuerpo }) {
  const t = useT()
  const def = getModulo(m.moduloId)
  const setParcial = useTallerMuebles((s) => s.setParcial)
  const conTablero = cuerpo.partes.some((p) => p.hechoDe === 'tablero')
  const conMetal = cuerpo.partes.some((p) => p.hechoDe === 'tubo')
  // El grosor de la trasera lo comparten la trasera y los fondos de cajón.
  const conFondo = cuerpo.partes.some((p) => p.rol === 'fondo' || p.rol === 'fondo-cajon')
  const conFrentes = cuerpo.partes.some((p) => p.rol === 'puerta' || p.rol === 'frente-cajon')
  const conBase = admiteBase(m)
  const conPuertas = admitePuertas(m)
  const grosores = getTablero(m.tablero.materialId).grosores.filter((g) => g >= 15)

  return (
    <div className="space-y-3">
      {conTablero && (
        <Bloque titulo={t('muebles.estilo.tablero', 'Tablero')}>
          <Chips
            label={t('muebles.estilo.material', 'Material')}
            valor={m.tablero.materialId}
            opciones={TABLEROS.map((x) => ({ valor: x.id, texto: t(x.clave, x.nombreEs) }))}
            onChange={(v) =>
              setParcial({
                tablero: { ...m.tablero, materialId: v as MaterialTableroId, color: getTablero(v as MaterialTableroId).color },
              })
            }
          />
          <Chips
            label={t('muebles.estilo.grosor', 'Grosor')}
            valor={m.tablero.grosor}
            opciones={grosores.map((g) => ({ valor: g, texto: `${g} mm` }))}
            onChange={(v) => setParcial({ tablero: { ...m.tablero, grosor: v } })}
          />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t('muebles.estilo.color', 'Color')}
            </p>
            <ColorPicker
              value={m.tablero.color}
              onChange={(c) => setParcial({ tablero: { ...m.tablero, color: c } })}
              fila
            />
          </div>
        </Bloque>
      )}

      {conTablero && (
        <Bloque
          titulo={
            def.conTrasera
              ? t('muebles.estilo.traseraCantos', 'Trasera y cantos')
              : t('muebles.estilo.cantos', 'Cantos')
          }
        >
          {def.conTrasera && (
            <Chips
              label={t('muebles.estilo.trasera', 'Trasera')}
              valor={m.tablero.fondo}
              opciones={[
                { valor: 'ranura' as const, texto: t('muebles.estilo.ranura', 'En ranura') },
                { valor: 'sobrepuesto' as const, texto: t('muebles.estilo.sobrepuesta', 'Sobrepuesta') },
                { valor: 'ninguno' as const, texto: t('muebles.estilo.sinTrasera', 'Sin trasera') },
              ]}
              onChange={(v) => setParcial({ tablero: { ...m.tablero, fondo: v } })}
            />
          )}
          {def.conTrasera && conFondo && (
            <Chips
              label={t('muebles.estilo.grosorTrasera', 'Grosor de la trasera')}
              valor={m.tablero.grosorFondo}
              opciones={GROSORES_FONDO.map((g) => ({ valor: g, texto: `${g} mm` }))}
              onChange={(v) => setParcial({ tablero: { ...m.tablero, grosorFondo: v } })}
            />
          )}
          <Chips
            label={t('muebles.estilo.cantear', 'Cantear')}
            valor={m.tablero.cantear}
            opciones={[
              { valor: 'vistos' as const, texto: t('muebles.estilo.cantoVistos', 'Solo lo visto') },
              { valor: 'todos' as const, texto: t('muebles.estilo.cantoTodos', 'Todo') },
              { valor: 'ninguno' as const, texto: t('muebles.estilo.cantoNada', 'Nada') },
            ]}
            onChange={(v) => setParcial({ tablero: { ...m.tablero, cantear: v } })}
          />
          {m.tablero.cantear !== 'ninguno' && (
            <Chips
              label={t('muebles.estilo.cinta', 'Cinta de canto')}
              valor={m.tablero.cintaMm}
              opciones={CINTAS_CANTO.map((c) => ({ valor: c, texto: `${c} mm` }))}
              onChange={(v) => setParcial({ tablero: { ...m.tablero, cintaMm: v } })}
            />
          )}
        </Bloque>
      )}

      {conMetal && (
        <Bloque
          titulo={
            def.metalPropio
              ? t('muebles.estilo.metal', 'Postes metálicos')
              : t('muebles.estilo.metalAccesorios', 'Tubos metálicos')
          }
        >
          <Chips
            label={t('muebles.estilo.material', 'Material')}
            valor={m.metal.materialId}
            opciones={TUBOS.map((x) => ({ valor: x.id, texto: t(x.clave, x.nombreEs) }))}
            onChange={(v) => setParcial({ metal: { ...m.metal, materialId: v, color: TUBOS.find((x) => x.id === v)!.color } })}
          />
          {def.metalPropio && (
            <Chips
              label={t('muebles.estilo.perfil', 'Perfil')}
              valor={m.metal.perfil}
              opciones={PERFILES_TUBO.map((x) => ({ valor: x.id, texto: t(x.clave, x.nombreEs) }))}
              onChange={(v) => setParcial({ metal: { ...m.metal, perfil: v } })}
            />
          )}
          {def.metalPropio && (
            <Chips
              label={t('muebles.estilo.seccion', 'Sección')}
              valor={m.metal.seccion}
              opciones={SECCIONES_TUBO.map((x) => ({ valor: x, texto: `${x} mm` }))}
              onChange={(v) => setParcial({ metal: { ...m.metal, seccion: v } })}
            />
          )}
          <Chips
            label={t('muebles.estilo.pared', 'Pared')}
            valor={m.metal.pared}
            opciones={PAREDES_TUBO.map((x) => ({ valor: x, texto: `${x} mm` }))}
            onChange={(v) => setParcial({ metal: { ...m.metal, pared: v } })}
          />
        </Bloque>
      )}

      {conBase && (
        <Bloque titulo={t('muebles.estilo.base', 'Base')}>
          <Chips
            label={t('muebles.estilo.apoyo', 'Apoyo')}
            valor={m.base.tipo}
            opciones={[
              { valor: 'zoclo' as const, texto: t('muebles.estilo.zoclo', 'Zócalo') },
              { valor: 'patas' as const, texto: t('muebles.estilo.patas', 'Patas') },
              { valor: 'ninguna' as const, texto: t('muebles.estilo.sinBase', 'Al piso') },
            ]}
            onChange={(v) => setParcial({ base: { ...m.base, tipo: v } })}
          />
          {m.base.tipo !== 'ninguna' && (
            <CampoMm
              label={t('muebles.estilo.alturaBase', 'Altura de la base')}
              valor={m.base.altura}
              rango={{ min: 20, max: 300, def: 100, paso: 10 }}
              onChange={(v) => setParcial({ base: { ...m.base, altura: v } })}
            />
          )}
        </Bloque>
      )}

      {(conPuertas || conFrentes) && (
        <Bloque titulo={t('muebles.estilo.frentes', 'Frentes')}>
          {conPuertas && (
            <Chips
              label={t('muebles.estilo.puertas', 'Puertas')}
              valor={m.frentes.puertas}
              opciones={[
                { valor: 'ninguna' as const, texto: t('muebles.estilo.sinPuertas', 'Sin puertas') },
                { valor: 'batiente' as const, texto: t('muebles.estilo.batientes', 'Batientes') },
                { valor: 'corrediza' as const, texto: t('muebles.estilo.corredizas', 'Corredizas') },
              ]}
              onChange={(v) => setParcial({ frentes: { ...m.frentes, puertas: v } })}
            />
          )}
          {conPuertas && m.frentes.puertas !== 'ninguna' && (
            <Chips
              label={t('muebles.estilo.hojas', 'Hojas')}
              valor={m.frentes.hojas}
              opciones={[1, 2, 3, 4].map((n) => ({ valor: n, texto: String(n) }))}
              onChange={(v) => setParcial({ frentes: { ...m.frentes, hojas: v } })}
            />
          )}
          {/* El color y el tirador solo si hay un frente puesto: con el mueble
              abierto no habría a qué aplicarlos. */}
          {conFrentes && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t('muebles.estilo.colorFrente', 'Color del frente')}
              </p>
              <ColorPicker
                value={m.frentes.colorFrente}
                onChange={(c) => setParcial({ frentes: { ...m.frentes, colorFrente: c } })}
                fila
              />
            </div>
          )}
          {conFrentes && (
            <Chips
              label={t('muebles.estilo.tirador', 'Tirador')}
              valor={m.frentes.tirador}
              opciones={[
                { valor: 'barra' as const, texto: t('muebles.estilo.tiradorBarra', 'De barra') },
                { valor: 'perforado' as const, texto: t('muebles.estilo.tiradorPerforado', 'Perforado') },
                { valor: 'ninguno' as const, texto: t('muebles.estilo.sinTirador', 'Sin tirador') },
              ]}
              onChange={(v) => setParcial({ frentes: { ...m.frentes, tirador: v } })}
            />
          )}
        </Bloque>
      )}
    </div>
  )
}

/** Nombre traducido de un módulo, para el encabezado. */
export function nombreModulo(id: ModuloId, t: (k: string, d: string) => string): string {
  const def = getModulo(id)
  return t(def.clave, def.nombreEs)
}
