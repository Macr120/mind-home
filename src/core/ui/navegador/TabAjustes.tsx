import { useMemo, useState } from 'react'
import { useCategoriasWeb } from '../../data/repository'
import { useT } from '../../i18n/useT'
import { BUSCADORES, useAjustesNav, type BuscadorId } from '../../navegador/ajustes'
import { categoriasVisibles } from '../../navegador/categoriasWeb'
import { borrarCategoria, crearCategoria, fijarLimiteCategoria, renombrarCategoria } from '../../navegador/sitios'
import { activarSyncHistorial, desactivarSyncHistorial, syncHistorialActivo } from '../../navegador/syncHistorial'
import { hayNavegadorEscritorio } from '../../plataforma'
import { confirmar, pedirTexto } from '../../state/confirmarStore'
import { useFoco } from '../../state/focoStore'
import { Icono } from '../iconos/Icono'

const INACTIVO_OPCIONES = [60, 120, 300, 600]
const FOCO_OPCIONES = [15, 25, 45, 60, 90]

/** Ajustes del navegador: buscador, pausa por inactividad, modo foco, categorías y límites, privacidad y sync. */
export function TabAjustes() {
  const t = useT()
  const buscador = useAjustesNav((s) => s.buscador)
  const inactivoSeg = useAjustesNav((s) => s.inactivoSeg)
  const sinRegistro = useAjustesNav((s) => s.sinRegistro)
  const borrarAlCerrar = useAjustesNav((s) => s.borrarAlCerrar)
  const propias = useCategoriasWeb()
  const categorias = useMemo(() => categoriasVisibles(propias ?? [], t), [propias, t])
  const [sync, setSync] = useState(syncHistorialActivo)
  const escritorio = hayNavegadorEscritorio()

  const renombrar = async (clave: string, actual: string) => {
    const nombre = await pedirTexto({
      titulo: t('nav.cat.renombrar', 'Renombrar categoría'),
      valor: actual,
      textoOk: t('ui.guardar', 'Guardar'),
    })
    if (nombre != null && nombre.trim() && nombre.trim() !== actual) await renombrarCategoria(clave, nombre)
  }

  const borrar = async (clave: string, nombre: string) => {
    const ok = await confirmar({
      titulo: t('nav.cat.borrar', 'Borrar categoría'),
      mensaje: t('nav.cat.borrarExplica', '«{n}» desaparece y sus sitios vuelven a la categoría automática.', { n: nombre }),
      textoOk: t('nav.hist.borrar', 'Borrar'),
      peligro: true,
    })
    if (ok) await borrarCategoria(clave)
  }

  const nueva = async () => {
    const nombre = await pedirTexto({
      titulo: t('nav.cat.nueva', 'Nueva categoría'),
      mensaje: t('nav.cat.nuevaExplica', 'Un nombre corto, como «Salud» o «Bancos».'),
      textoOk: t('nav.cat.crear', 'Crear'),
    })
    if (nombre) await crearCategoria(nombre)
  }

  const cambiarSync = async (v: boolean) => {
    if (v) {
      const ok = await confirmar({
        titulo: t('nav.ajustes.sync', 'Sincronizar el historial'),
        mensaje: t(
          'nav.ajustes.syncPregunta',
          'Las páginas que visites se guardarán también en la nube de tu cuenta y se verán en tus otros dispositivos. Lo de antes de hoy en otros dispositivos no se trae.',
        ),
        textoOk: t('nav.ajustes.syncOk', 'Sincronizar'),
      })
      if (!ok) return
      setSync(true)
      await activarSyncHistorial()
    } else {
      desactivarSyncHistorial()
      setSync(false)
    }
  }

  const cerrarSesiones = async () => {
    const ok = await confirmar({
      titulo: t('nav.ajustes.cerrarSesiones', 'Cerrar sesiones de los sitios'),
      mensaje: t('nav.ajustes.cerrarSesionesPregunta', 'Se borran las cookies, el almacenamiento y la caché del navegador de la app: tendrás que volver a entrar en tus sitios.'),
      textoOk: t('nav.ajustes.cerrarSesionesOk', 'Cerrar sesiones'),
      peligro: true,
    })
    if (ok) await window.mph?.navegador?.limpiarSesion?.()
  }

  const selectClase = 'mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/85 outline-none'

  return (
    <div className="space-y-4">
      <label className="block text-xs text-white/50">
        {t('nav.ajustes.buscador', 'Buscador para «busca en internet…» y el modo web')}
        <select value={buscador} onChange={(e) => useAjustesNav.getState().setBuscador(e.target.value as BuscadorId)} className={selectClase}>
          {BUSCADORES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-white/50">
        {t('nav.ajustes.inactivo', 'Dejar de contar el tiempo tras estar sin tocar nada')}
        <select
          value={INACTIVO_OPCIONES.includes(inactivoSeg) ? inactivoSeg : 120}
          onChange={(e) => useAjustesNav.getState().setInactivoSeg(Number(e.target.value))}
          className={selectClase}
        >
          {INACTIVO_OPCIONES.map((s) => (
            <option key={s} value={s}>
              {t('nav.ajustes.minutos', '{n} min', { n: s / 60 })}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[10px] text-white/35">
          {t('nav.ajustes.inactivoExplica', 'Un video sonando sigue contando aunque no toques nada. Solo en el escritorio.')}
        </span>
      </label>

      <SeccionFoco categorias={categorias} />

      <section>
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.ajustes.categoriasLimites', 'Categorías y límites')}</p>
          <button type="button" onClick={() => void nueva()} className="rounded-lg px-2 py-0.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white/90">
            {t('nav.cat.nuevaOpcion', '+ Nueva categoría…')}
          </button>
        </div>
        <p className="mb-1 px-1 text-[10px] text-white/35">
          {t('nav.limite.categoriasExplica', 'Minutos al día por categoría: al pasarlos el asistente avisa (no bloquea). Vacío = sin límite.')}
        </p>
        <div className="space-y-0.5">
          {categorias.map((c) => (
            <div key={c.clave} className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
              <span className="w-5 shrink-0 text-center text-sm" style={{ color: c.color }}>
                {c.emoji ? <Icono emoji={c.emoji} /> : <Icono nombre={c.icono ?? 'etiqueta'} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-white/85">{c.nombre}</span>
              <input
                type="number"
                min={0}
                step={5}
                inputMode="numeric"
                defaultValue={c.limiteMin ?? ''}
                key={`${c.clave}-${c.limiteMin ?? ''}`}
                placeholder={t('nav.limite.min', 'min')}
                aria-label={t('nav.limite.titulo', 'Límite diario en minutos')}
                onBlur={(e) => {
                  const n = Math.round(Number(e.target.value))
                  const nuevo = Number.isFinite(n) && n > 0 ? n : undefined
                  if (nuevo !== c.limiteMin) void fijarLimiteCategoria(c.clave, nuevo)
                }}
                className="w-16 shrink-0 rounded-lg border border-white/10 bg-black/30 px-1.5 py-0.5 text-end text-[11px] text-white/85 outline-none"
              />
              {c.clave !== 'otros' && (
                <button
                  type="button"
                  onClick={() => void renombrar(c.clave, c.nombre)}
                  className="shrink-0 rounded px-1 text-xs text-white/30 transition hover:bg-white/10 hover:text-white/80"
                  title={t('nav.cat.renombrar', 'Renombrar categoría')}
                  aria-label={t('nav.cat.renombrar', 'Renombrar categoría')}
                >
                  <Icono nombre="editar" />
                </button>
              )}
              {c.propia && (
                <button
                  type="button"
                  onClick={() => void borrar(c.clave, c.nombre)}
                  className="shrink-0 rounded px-1 text-xs text-white/30 transition hover:bg-white/10 hover:text-red-300"
                  title={t('nav.cat.borrar', 'Borrar categoría')}
                  aria-label={t('nav.cat.borrar', 'Borrar categoría')}
                >
                  <Icono nombre="basura" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.ajustes.privacidad', 'Privacidad')}</p>
        <Interruptor
          activo={sinRegistro}
          onCambio={(v) => useAjustesNav.getState().setSinRegistro(v)}
          texto={t('nav.ajustes.sinRegistro', 'Sin registro')}
          explica={t('nav.ajustes.sinRegistroExplica', 'Mientras esté activo no se apuntan páginas ni visitas. Se apaga solo al cerrar la app.')}
        />
        <Interruptor
          activo={borrarAlCerrar}
          onCambio={(v) => useAjustesNav.getState().setBorrarAlCerrar(v)}
          texto={t('nav.ajustes.borrarAlCerrar', 'Borrar el historial al cerrar el navegador')}
          explica={t('nav.ajustes.borrarAlCerrarExplica', 'Las visitas y el tiempo por sitio se conservan.')}
        />
        {escritorio && (
          <button
            type="button"
            onClick={() => void cerrarSesiones()}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
          >
            {t('nav.ajustes.cerrarSesiones', 'Cerrar sesiones de los sitios')}
          </button>
        )}
      </section>

      <section className="space-y-2">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.ajustes.nube', 'Nube')}</p>
        <Interruptor
          activo={sync}
          onCambio={(v) => void cambiarSync(v)}
          texto={t('nav.ajustes.sync', 'Sincronizar el historial')}
          explica={t(
            'nav.ajustes.syncExplica',
            'Apagado, el historial de páginas se queda en este dispositivo. Los sitios, categorías y el tiempo por sitio sincronizan siempre. Al apagarlo, lo ya subido se queda en la nube: bórralo antes con «Borrar historial» si no lo quieres allí.',
          )}
        />
      </section>
    </div>
  )
}

function Interruptor({ activo, onCambio, texto, explica }: { activo: boolean; onCambio: (v: boolean) => void; texto: string; explica?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
      <input type="checkbox" checked={activo} onChange={(e) => onCambio(e.target.checked)} className="mt-0.5 accent-current" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-white/85">{texto}</span>
        {explica && <span className="block text-[10px] leading-snug text-white/35">{explica}</span>}
      </span>
    </label>
  )
}

/** Modo foco: duración, categorías y sitios bloqueados, y el botón para empezar o terminar. */
function SeccionFoco({ categorias }: { categorias: { clave: string; nombre: string; color: string }[] }) {
  const t = useT()
  const hasta = useFoco((s) => s.hasta)
  const duracionMin = useFoco((s) => s.duracionMin)
  const bloqueadas = useFoco((s) => s.categorias)
  const sitios = useFoco((s) => s.sitios)
  const [sitiosTexto, setSitiosTexto] = useState(sitios.join(', '))
  const alternar = (clave: string) =>
    useFoco.getState().setCategorias(bloqueadas.includes(clave) ? bloqueadas.filter((c) => c !== clave) : [...bloqueadas, clave])
  const guardarSitios = () =>
    useFoco.getState().setSitios(
      sitiosTexto
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes('.')),
    )
  return (
    <section className="space-y-2">
      <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{t('nav.foco.titulo', 'Modo foco')}</p>
      <p className="px-1 text-[10px] text-white/35">
        {t('nav.foco.explica', 'Durante un rato, los sitios de estas categorías (y los que escribas) no se abren. Desde el chat: «modo foco 25 min» o «fin del foco».')}
      </p>
      <label className="block px-1 text-xs text-white/50">
        {t('nav.foco.duracion', 'Duración por defecto')}
        <select
          value={FOCO_OPCIONES.includes(duracionMin) ? duracionMin : 25}
          onChange={(e) => useFoco.getState().setDuracionMin(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/85 outline-none"
        >
          {FOCO_OPCIONES.map((m) => (
            <option key={m} value={m}>
              {t('nav.ajustes.minutos', '{n} min', { n: m })}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-1 px-1">
        {categorias
          .filter((c) => c.clave !== 'otros')
          .map((c) => {
            const on = bloqueadas.includes(c.clave)
            return (
              <button
                key={c.clave}
                type="button"
                onClick={() => alternar(c.clave)}
                aria-pressed={on}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition ${on ? 'text-white/95' : 'border-white/10 text-white/50 hover:bg-white/10'}`}
                style={on ? { borderColor: c.color, backgroundColor: c.color + '33' } : undefined}
              >
                {c.nombre}
              </button>
            )
          })}
      </div>
      <label className="block px-1 text-xs text-white/50">
        {t('nav.foco.sitios', 'Sitios concretos (separados por comas)')}
        <input
          value={sitiosTexto}
          onChange={(e) => setSitiosTexto(e.target.value)}
          onBlur={guardarSitios}
          placeholder="ejemplo.com, otro.com"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/85 outline-none focus:border-white/30"
        />
      </label>
      <button
        type="button"
        onClick={() => (hasta ? useFoco.getState().terminar('manual') : void useFoco.getState().activar())}
        className={`w-full rounded-xl border py-1.5 text-xs font-semibold transition ${
          hasta ? 'border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
        }`}
      >
        {hasta ? t('nav.foco.terminar', 'Terminar el modo foco') : t('nav.foco.empezar', 'Empezar el modo foco ahora')}
      </button>
    </section>
  )
}
