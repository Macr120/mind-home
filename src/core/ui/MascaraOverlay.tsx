import { useMemo } from 'react'
import { MascaraApp, type TextosMascara } from '../../../marketing/mascara/src/MascaraApp'
import { hayBackend } from '../cuenta/supabase'
import { useT } from '../i18n/useT'
import { useMascaraUi } from '../state/mascaraUiStore'
import { crearSenalMascara } from './mascaraSenal'

/**
 * Máscara AR dentro de la app: envuelve la MascaraApp de marketing/mascara
 * (mismo código que el build standalone del puerto 5175). Se monta lazy desde
 * App.tsx: el segundo <Canvas> y MediaPipe no tocan el arranque. OJO: aquí no
 * se importa su estilos.css (sus reglas globales de html/body pisarían la app).
 *
 * Los textos se traducen AQUÍ y viajan como prop: el standalone se queda con
 * los suyos en español y las claves `t()` viven en `src/`, donde las ve el
 * verificador de i18n. Expresiones y peinados reutilizan las claves del editor
 * de personajes.
 */
/** URL que codifica el QR del emisor: al abrirla, la app conecta como controlador. */
function urlRemota(codigo: string): string {
  const base = (import.meta.env.VITE_URL_APP as string | undefined) ?? window.location.origin
  return `${base}/?mascara=${codigo}`
}

export default function MascaraOverlay() {
  const cerrar = useMascaraUi((s) => s.cerrar)
  const codigoRemoto = useMascaraUi((s) => s.codigoRemoto)
  const t = useT()
  const textos = useMemo<Partial<TextosMascara>>(
    () => ({
      salir: t('mascara.salir', 'Salir'),
      ocultar: t('mascara.ocultar', 'Ocultar'),
      mostrar: t('mascara.mostrar', 'Mostrar interfaz'),
      menos: t('mascara.menos', 'Menos'),
      ajustes: t('mascara.ajustes', 'Ajustes'),
      mascara: t('mascara.modelo', 'Máscara'),
      // La cabeza Base y los cuerpos prediseñados ya tienen nombre en el editor de personajes.
      mascaraNombre: (id, nombre) =>
        id === 'base' ? t('editor.pers.modeloBase', 'Humano') : t(`editor.pers.cuerpo.${id}`, nombre),
      cara: t('mascara.cara', 'Cara'),
      caraFija: t('mascara.cara.fija', 'Fija'),
      caraImita: t('mascara.cara.imita', 'Imita'),
      caraViva: t('mascara.cara.viva', 'Viva'),
      camara: t('mascara.camara', 'Cámara'),
      frontal: t('mascara.camara.frontal', 'Frontal'),
      trasera: t('mascara.camara.trasera', 'Trasera'),
      linterna: t('mascara.linterna', 'Linterna'),
      lenteAuto: (camara) => t('mascara.lenteAuto', 'Lente automático ({camara})', { camara }),
      camaraN: (n) => t('mascara.camaraN', 'Cámara {n}', { n }),
      zoom: t('mascara.zoom', 'Zoom'),
      encuadre: t('mascara.encuadre', 'Encuadre'),
      vertical: t('mascara.encuadre.vertical', 'Vertical'),
      amplio: t('mascara.encuadre.amplio', 'Amplio (bandas)'),
      piel: t('mascara.piel', 'Piel'),
      pelo: t('mascara.pelo', 'Pelo'),
      tamano: t('mascara.tamano', 'Tamaño'),
      altura: t('mascara.altura', 'Altura'),
      profundidad: t('mascara.profundidad', 'Profundidad'),
      grabar: t('mascara.grabar', 'Grabar'),
      detener: t('mascara.detener', 'Detener grabación'),
      errorModelo: t('mascara.estado.errorModelo', 'Error al cargar MediaPipe'),
      sinCamara: t('mascara.estado.sinCamara', 'Sin cámara'),
      cargando: t('mascara.estado.cargando', 'Cargando modelo…'),
      caraDetectada: t('mascara.estado.cara', 'Cara detectada'),
      buscandoCara: t('mascara.estado.buscando', 'Buscando cara…'),
      errorCamara: (detalle) =>
        t('mascara.errorCamara', 'Cámara no disponible ({detalle}). En iPhone abre la URL del túnel HTTPS.', { detalle }),
      errorGrabar: (detalle) => t('mascara.errorGrabar', 'No se pudo grabar: {detalle}', { detalle }),
      expresion: (id, nombre) => t(`editor.pers.expresion.${id}`, nombre),
      peinado: (id, nombre) => t(`editor.pers.peinado.${id}`, nombre),
      remoto: t('mascara.remoto', 'Remoto'),
      remotoPermitir: t('mascara.remoto.permitir', 'Permitir control'),
      remotoConectar: t('mascara.remoto.conectar', 'Conectar'),
      remotoCodigo: t('mascara.remoto.codigo', 'Código'),
      remotoEsperando: t('mascara.remoto.esperando', 'Esperando al otro teléfono…'),
      remotoConectando: t('mascara.remoto.conectando', 'Conectando…'),
      remotoConectado: t('mascara.remoto.conectado', 'Conectado'),
      remotoCortado: t('mascara.remoto.cortado', 'Conexión cortada'),
      remotoCortar: t('mascara.remoto.cortar', 'Cortar'),
      remotoReintentar: t('mascara.remoto.reintentar', 'Reintentar'),
      remotoAyuda: t('mascara.remoto.ayuda', 'Abre la Máscara AR en el otro teléfono y escribe este código en su sección Remoto.'),
      remotoQr: t('mascara.remoto.qr', 'O escanea el código QR con la cámara del otro teléfono.'),
      remotoVideo: t('mascara.remoto.video', 'Esperando el video…'),
      remotoError: (detalle) => t('mascara.remoto.error', 'No se pudo conectar: {detalle}', { detalle }),
    }),
    [t],
  )
  return (
    // `ui-noche`: el panel de la máscara flota sobre la cámara y está pensado en
    // oscuro, así que conserva la tinta blanca aunque la app esté en modo claro.
    <div className="ui-noche fixed inset-0 z-[60] bg-[#0f1115]">
      <MascaraApp
        onSalir={cerrar}
        textos={textos}
        crearSenal={hayBackend() ? crearSenalMascara : undefined}
        urlRemota={urlRemota}
        codigoInicial={codigoRemoto ?? undefined}
      />
    </div>
  )
}
