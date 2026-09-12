/**
 * El grabador que corre DENTRO de la página: captura la pestaña con
 * `getDisplayMedia` (la misma vía que «Grabar dentro de la app» en el shell de
 * escritorio), graba N segundos con MediaRecorder mientras la escena se anima y
 * descarga el archivo (Chrome lo deja en la carpeta fijada por CDP).
 *
 * Detalles que cuestan una sesión si no se saben:
 * - `getDisplayMedia` exige un gesto de usuario: la evaluación va con
 *   `userGesture: true` y la llamada es lo PRIMERO del cuerpo, antes de
 *   cualquier `await` (la activación transitoria se agota enseguida).
 * - Se espera 1,5 s tras conceder la captura: la infobar de «compartiendo
 *   pestaña» encoge el área de contenido y el compositor cambia de tamaño.
 * - Códec: H.264 por hardware si Chrome lo ofrece (VP9 por software tira
 *   frames a 2 MP); lo que salga se pasa a H.264 CFR con ffmpeg después.
 */
export function codigoGrabar({ nombre, seg, preparar = '', animar = '', limpiar = '' }, ayudas) {
  return `(async () => {
  const __streamP = navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    systemAudio: 'exclude',
  })
  ${ayudas}
  const __stream = await __streamP
  const __track = __stream.getVideoTracks()[0]
  await sleep(1500)
  const __ajustes = __track.getSettings()
  prep()
  const __extra = await (async () => { ${preparar} })()
  await sleep(250)
  prep()
  // H.264 High de nivel 5.1 primero: el área capturada (ventana entera a 3×, ~3 MP)
  // se pasa del tope de 2,1 MP del nivel 4.0, y con ese perfil el codificador por
  // hardware devolvía un archivo VACÍO sin quejarse.
  const __mimes = ['video/mp4;codecs=avc1.640033', 'video/mp4;codecs=avc1.640032', 'video/mp4;codecs=avc1.64002A', 'video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9']
  const __mime = __mimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm'
  const __trozos = []
  const __rec = new MediaRecorder(__stream, { mimeType: __mime, videoBitsPerSecond: 14000000 })
  let __errorRec = null
  __rec.ondataavailable = (e) => { if (e.data.size) __trozos.push(e.data) }
  __rec.onerror = (e) => { __errorRec = 'MediaRecorder: ' + ((e.error && (e.error.message || e.error.name)) || 'error') }
  const __fin = new Promise((r) => { __rec.onstop = r })
  await silenciarAvisos()
  __rec.start(1000)
  const t0 = performance.now()
  const SEG = ${seg}
  let __error = null
  try {
    await (async () => { ${animar} })()
  } catch (e) {
    __error = String(e && e.message ? e.message : e)
  }
  const __resta = SEG * 1000 - (performance.now() - t0)
  if (__resta > 0) await sleep(__resta)
  __rec.stop()
  await __fin
  const __seg = (performance.now() - t0) / 1000
  __track.stop()
  const __blob = new Blob(__trozos, { type: __mime })
  const __a = document.createElement('a')
  __a.href = URL.createObjectURL(__blob)
  __a.download = ${JSON.stringify(nombre)} + (__mime.includes('mp4') ? '.mp4' : '.webm')
  document.body.appendChild(__a)
  __a.click()
  __a.remove()
  try {
    await (async () => { ${limpiar} })()
  } catch (e) {
    __error = (__error ? __error + ' | ' : '') + 'limpiar: ' + String(e && e.message ? e.message : e)
  }
  if (__errorRec) __error = (__error ? __error + ' | ' : '') + __errorRec
  return { mime: __mime, ajustes: __ajustes, dpr: window.devicePixelRatio, bytes: __blob.size, seg: __seg, extra: __extra, error: __error }
})()`
}
