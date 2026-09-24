import { useEffect, useMemo, useState } from 'react'
import { planificarCorte } from '../../muebles/corte'
import { despiezar, firmaDespiece } from '../../muebles/despiece'
import { sembrarCatalogoTaller } from '../../muebles/catalogoSiembra'
import { armarMueble } from '../../muebles/modulos'
import { piezas3DDeCuerpo } from '../../muebles/piezas3d'
import { publicarMueble } from '../../muebles/publicar'
import { confirmar } from '../../state/confirmarStore'
import { useTallerMuebles, type TallerTab } from '../../state/tallerMueblesStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { PestanasCarpeta, type ItemPestana } from '../../../rooms/_shared/PestanasCarpeta'
import { BotonPrimario } from '../../../rooms/_shared/ui'
import { PanelDespiece } from './PanelDespiece'
import { PanelEstilo, PanelMedidas, PanelModulos } from './PanelesMueble'
import { PanelPrecios } from './PanelPrecios'
import { VisorMueble3D } from './VisorMueble3D'

/**
 * Taller de muebles: el editor de objetos a pantalla completa.
 *
 * Se monta en la raíz de `App` (y no dentro del panel del editor) por lo mismo
 * que `PlantillaPreviaOverlay`: ahí dentro su `fixed` quedaría encajonado por el
 * stacking context del panel derecho. Va ANTES del bloque de diálogos, para que
 * el de destino del objeto —mismo z— se pinte encima cuando pregunte dónde va.
 *
 * El mueble se arma UNA vez por cambio de receta y de ahí salen las tres vistas
 * (3D, despiece y precios): son proyecciones del mismo `Cuerpo`, no cálculos
 * paralelos.
 */
export default function TallerMueblesOverlay() {
  const t = useT()
  const m = useTallerMuebles((s) => s.mueble)
  const pestana = useTallerMuebles((s) => s.pestana)
  const setPestana = useTallerMuebles((s) => s.setPestana)
  const setNombre = useTallerMuebles((s) => s.setNombre)
  const objetoId = useTallerMuebles((s) => s.objetoId)
  const disenoId = useTallerMuebles((s) => s.disenoId)
  const sucio = useTallerMuebles((s) => s.sucio)
  const marcarGuardado = useTallerMuebles((s) => s.marcarGuardado)
  const cerrar = useTallerMuebles((s) => s.cerrar)
  const [publicando, setPublicando] = useState(false)
  const [cotas, setCotas] = useState(false)

  // El catálogo de precios se siembra al abrir (idempotente: no resucita lo que
  // el usuario borró).
  useEffect(() => {
    void sembrarCatalogoTaller()
  }, [])

  const cuerpo = useMemo(() => (m ? armarMueble(m) : null), [m])
  const piezas = useMemo(() => (cuerpo ? piezas3DDeCuerpo(cuerpo) : []), [cuerpo])
  const despiece = useMemo(() => (cuerpo && m ? despiezar(cuerpo, m) : null), [cuerpo, m])
  // La firma evita re-optimizar el corte cuando cambia algo que no altera las
  // piezas (el nombre del mueble, por ejemplo).
  const firma = despiece ? firmaDespiece(despiece) : ''
  const plan = useMemo(
    () => (despiece ? planificarCorte(despiece) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firma],
  )

  if (!m || !cuerpo || !despiece || !plan) return null

  const publicar = async () => {
    if (publicando) return
    setPublicando(true)
    try {
      const r = await publicarMueble(m, { objetoId, disenoId })
      marcarGuardado(r.objetoId ?? undefined, r.disenoId ?? undefined)
      if (!r.soloGuardado) cerrar()
    } finally {
      setPublicando(false)
    }
  }

  const intentarCerrar = async () => {
    if (!sucio) {
      cerrar()
      return
    }
    const ok = await confirmar({
      titulo: t('muebles.cerrar.titulo', 'Salir sin enviar el mueble'),
      mensaje: t('muebles.cerrar.msg', 'Los cambios que no enviaste a la MindHaOS se pierden.'),
      peligro: true,
    })
    if (ok) cerrar()
  }

  const tabs: ItemPestana<TallerTab>[] = [
    { id: 'modulo', icono: 'rejilla', labelEs: 'Módulo' },
    { id: 'medidas', icono: 'regla', labelEs: 'Medidas' },
    { id: 'estilo', icono: 'paleta', labelEs: 'Estilo' },
    { id: 'despiece', icono: 'cortar', labelEs: 'Cortes' },
    { id: 'precios', icono: 'moneda', labelEs: 'Precio' },
  ]

  return (
    <div className="ui-app fixed inset-0 z-50 flex flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 md:px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/20 text-base">
          <Icono nombre="taller" />
        </span>
        <span className="min-w-0 flex-1">
          <input
            value={m.nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-label={t('muebles.nombre', 'Nombre del mueble')}
            className="w-full truncate bg-transparent text-base font-bold outline-none"
          />
          <span className="block text-[10px] tabular-nums text-white/40">
            {m.medidas.ancho} × {m.medidas.alto} × {m.medidas.fondo} mm
          </span>
        </span>
        <button
          type="button"
          onClick={() => setCotas(!cotas)}
          title={t('muebles.cotas', 'Ver medidas')}
          className={`ui-boton hidden h-9 w-9 place-items-center rounded-lg transition md:grid ${
            cotas ? 'bg-accent text-accent-ink' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <Icono nombre="regla" />
        </button>
        <span className="hidden md:block">
          <BotonPrimario pequeno onClick={() => void publicar()} disabled={publicando}>
            <Icono nombre="casa" />{' '}
            {objetoId != null
              ? t('muebles.guardarCambios', 'Guardar cambios')
              : t('muebles.enviarCasa', 'Enviar a la MindHaOS')}
          </BotonPrimario>
        </span>
        <button
          type="button"
          onClick={() => void intentarCerrar()}
          className="ui-boton shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
        >
          {t('plantillas.cerrarPrevia', '‹ Cerrar')}
        </button>
      </header>

      <div className="px-3 pt-2 md:px-4">
        <PestanasCarpeta
          items={tabs}
          activo={pestana}
          onCambio={setPestana}
          prefijoClave="muebles.tab"
          variante="raiz"
          flecha={false}
        />
      </div>

      {/* Móvil: el visor arriba y los controles debajo (flex-col-reverse sobre
          un solo árbol). Escritorio: visor a la izquierda, panel a la derecha. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <div className="min-h-0 w-full overflow-y-auto p-3 pb-24 md:w-[23rem] md:shrink-0 md:pb-4">
          {pestana === 'modulo' && <PanelModulos m={m} />}
          {pestana === 'medidas' && <PanelMedidas m={m} />}
          {pestana === 'estilo' && <PanelEstilo m={m} cuerpo={cuerpo} />}
          {pestana === 'despiece' && (
            <PanelDespiece despiece={despiece} plan={plan} nombre={m.nombre} />
          )}
          {pestana === 'precios' && (
            <PanelPrecios despiece={despiece} plan={plan} nombre={m.nombre} />
          )}
        </div>
        <div className="h-[36vh] min-h-[180px] shrink-0 md:h-auto md:min-h-0 md:flex-1">
          <VisorMueble3D piezas={piezas} cuerpo={cuerpo} cotas={cotas} />
        </div>
      </div>

      {/* En móvil la acción principal no puede quedar perdida en el scroll. */}
      <div className="pointer-events-none fixed bottom-0 start-0 end-0 p-3 pb-[max(0.75rem,var(--safe-bottom))] md:hidden">
        <span className="pointer-events-auto block">
          <BotonPrimario
            className="w-full"
            onClick={() => void publicar()}
            disabled={publicando}
          >
            <Icono nombre="casa" />{' '}
            {objetoId != null
              ? t('muebles.guardarCambios', 'Guardar cambios')
              : t('muebles.enviarCasa', 'Enviar a la MindHaOS')}
          </BotonPrimario>
        </span>
      </div>
    </div>
  )
}
