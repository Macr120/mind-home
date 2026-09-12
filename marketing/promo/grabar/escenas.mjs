/**
 * Las tomas del anuncio, una por clip. Cada una es JavaScript que corre en la
 * página con las ayudas de `sesion.mjs` (`sleep`, `prep`, `modulo`, `moverCam`,
 * `cortarCam`, `camJugador`, `CASA`, `abrirApp`, `limpiarTodo`, `desplazar`…)
 * y los stores globales de DEV (`useHouse`, `useCam`, `useCiclo`, `useDiseño`,
 * `useLayout`, `useMascota`, `useHerramienta`).
 *
 * - `preparar`: arma la escena ANTES de grabar (no se ve).
 * - `animar`: corre mientras se graba; tiene `SEG` (segundos de la toma) y `t0`.
 * - `limpiar`: deja la casa como estaba para la siguiente toma.
 *
 * `seg` es lo que se graba: un poco más de lo que el montaje usa (`src/escenas.ts`),
 * para que una voz larga tenga clip de sobra.
 */
export const ESCENAS = [
  {
    nombre: '01-avatar',
    seg: 5,
    preparar: `
      await limpiarTodo()
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
      await cortarCam(await camJugador(80))
      await sleep(900)
      return 'ok'
    `,
    animar: `
      // Un saludo del personaje y, de golpe, la casa entera.
      await sleep(250)
      useHerramienta.getState().setEmote('dab')
      await sleep(1250)
      useHerramienta.getState().setEmote(null)
      await moverCam(camAhora(), CASA, 1100, easeIn)
    `,
  },
  {
    nombre: '02-casa-gira',
    seg: 6,
    preparar: `
      await limpiarTodo()
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
      await cortarCam(CASA)
      await sleep(900)
      return useCam.getState().zoom
    `,
    animar: `
      const a = camAhora()
      await moverCam(a, { ...a, az: a.az + Math.PI / 2, zoom: a.zoom * 1.3 }, SEG * 1000, (q) => q)
    `,
  },
  {
    nombre: '03-app-cocina',
    seg: 3,
    preparar: `await limpiarTodo(); await abrirApp('cocina'); await sleep(1400); return 'ok'`,
    animar: `await sleep(400); await desplazar(260, 2200)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    nombre: '03-app-ejercicio',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      const de = await modulo('/src/core/state/demoEjercicioStore.ts')
      de.useDemoEjercicio.getState().abrir('Sentadilla', undefined, 'overlay')
      await sleep(1800)
      return 'ok'
    `,
    limpiar: `(await modulo('/src/core/state/demoEjercicioStore.ts')).useDemoEjercicio.getState().cerrar()`,
  },
  {
    nombre: '03-app-finanzas',
    seg: 3,
    preparar: `await limpiarTodo(); await abrirApp('despacho'); await sleep(1400); return 'ok'`,
    animar: `await sleep(400); await desplazar(260, 2200)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    nombre: '03-app-metas',
    seg: 3,
    preparar: `await limpiarTodo(); await abrirApp('metas'); await sleep(1400); return 'ok'`,
    animar: `await sleep(400); await desplazar(220, 2200)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    nombre: '03-app-studio',
    seg: 4,
    preparar: `
      await limpiarTodo()
      // Las previas de Arte y Video salen vacías en el demo; la del estudio musical trae canciones de fábrica.
      ;(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().abrir('audio')
      await sleep(2200)
      return 'ok'
    `,
    animar: `await sleep(500); await desplazar(200, 2500)`,
    limpiar: `(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().cerrar()`,
  },
  {
    nombre: '04-mosaico',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      ;(await modulo('/src/core/state/hudStore.ts')).useHud.getState().desplegarTodo()
      await sleep(600)
      const b = document.querySelector('[data-tut="menu.rapido"]')
      if (!b) return 'SIN BOTON menu.rapido'
      b.click()
      await sleep(1500)
      return 'ok'
    `,
    animar: `await sleep(600); await desplazar(240, 2400)`,
    limpiar: `escape()`,
  },
  {
    nombre: '04-editor',
    seg: 4.5,
    preparar: `
      await limpiarTodo()
      await cortarCam(CASA)
      const eu = await modulo('/src/core/state/editorUiStore.ts')
      eu.useEditorUi.getState().setEditor3d(false)
      eu.useEditorUi.getState().setTab('mapa')
      useLayout.getState().setEditMode(true)
      await sleep(1500)
      return 'editMode=' + useLayout.getState().editMode
    `,
    animar: `
      const a = camAhora()
      await moverCam(a, { ...a, az: a.az - Math.PI / 3, zoom: a.zoom * 1.15 }, SEG * 1000, (q) => q)
    `,
    limpiar: `useLayout.getState().setEditMode(false)`,
  },
  {
    nombre: '04-temas',
    seg: 6,
    preparar: `
      await limpiarTodo()
      await cortarCam(CASA)
      await sleep(600)
      return 'ok'
    `,
    animar: `
      const a = camAhora()
      const giro = moverCam(a, { ...a, az: a.az + Math.PI / 4 }, SEG * 1000, (q) => q)
      await sleep(700)
      // Temas de día (nada de noche neón): el usuario quiere luz en toda la grabación.
      await useDiseño.getState().setTemaGlobal('barbie')
      await sleep(1500)
      await useDiseño.getState().setTemaGlobal('vaquero')
      await sleep(1500)
      await useDiseño.getState().setTemaGlobal('medieval')
      await giro
    `,
    limpiar: `await useDiseño.getState().setTemaGlobal(null); await sleep(800)`,
  },
  {
    nombre: '05-calendario',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      ;(await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI.getState().abrirCalendario('semana')
      await sleep(1800)
      return 'ok'
    `,
    animar: `await sleep(500); await desplazar(300, 2600)`,
    limpiar: `(await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI.getState().cerrarCalendario()`,
  },
  {
    nombre: '05-misiones',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      ;(await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI.getState().abrirCalendario('objetivos')
      await sleep(1800)
      return 'ok'
    `,
    animar: `await sleep(500); await desplazar(280, 2600)`,
    limpiar: `(await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI.getState().cerrarCalendario()`,
  },
  {
    nombre: '05-cronograma',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      await abrirApp('metas')
      await sleep(1400)
      const b = document.querySelector('[data-tut="cal.cron.modo.cronograma"]')
      if (b) b.click()
      await sleep(1400)
      return b ? 'ok' : 'SIN pestaña cronograma'
    `,
    animar: `await sleep(500); await desplazar(240, 2600)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    nombre: '06-avatar-asistente',
    seg: 4,
    preparar: `
      await limpiarTodo()
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      const hs = await modulo('/src/core/state/houseStore.ts')
      const p = hs.playerPos
      useMascota.getState().irA(p.x + 1.4, p.z + 0.9)
      await cortarCam(await camJugador(38))
      await sleep(1200)
      return 'ok'
    `,
    animar: `
      const a = camAhora()
      await moverCam(a, { ...a, az: a.az + 0.35, zoom: a.zoom * 1.12 }, SEG * 1000, (q) => q)
    `,
  },
  {
    nombre: '06-chat',
    seg: 4.5,
    preparar: `
      await limpiarTodo()
      const rep = await modulo('/src/core/data/repository.ts')
      const asis = useMascota.getState().mascota
      await rep.limpiarConversacion(asis)
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'usuario', texto: CHAT_Q, creado: new Date(Date.now() - 60000).toISOString() })
      await rep.mensajesChatRepo.add({ asistenteId: asis, rol: 'asistente', texto: CHAT_A, creado: new Date(Date.now() - 30000).toISOString() })
      useMascota.getState().abrirConversacion(asis)
      useMascota.getState().setHiloOculto(false)
      await cortarCam(await camJugador(60))
      await sleep(1500)
      return 'ok'
    `,
    animar: `
      const a = camAhora()
      await moverCam(a, { ...a, zoom: a.zoom * 1.1 }, SEG * 1000, (q) => q)
    `,
    limpiar: `useMascota.getState().cerrarConversacion()`,
  },
  {
    // «Crean imágenes…»: el anecdotario del demo está lleno de fotos y recuerdos.
    nombre: '06-fotos',
    seg: 3.5,
    preparar: `await limpiarTodo(); await abrirApp('anecdotario'); await sleep(1800); return 'ok'`,
    animar: `await sleep(500); await desplazar(260, 2500)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    nombre: '06-ideas',
    seg: 3.5,
    preparar: `await limpiarTodo(); await abrirApp('ideas'); await sleep(1600); return 'ok'`,
    animar: `await sleep(500); await desplazar(240, 2600)`,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    // «…recursos…»: un diagrama de decisión del año de Pep@ (FODA, Eisenhower…) en Ideas.
    nombre: '06-diagrama',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      const rep = await modulo('/src/core/data/repository.ts')
      const { defTipo } = await modulo('/src/rooms/ideas/tiposMapa.ts')
      const mapas = (await rep.mapasIdeasRepo.list()).filter((m) => defTipo(m.tipo).familia === 'diagramas')
      const mapa = ['foda', 'eisenhower', 'matriz', 'proscontras'].map((t) => mapas.find((m) => m.tipo === t)).find(Boolean) ?? mapas[0]
      if (!mapa) throw new Error('el demo no tiene diagramas')
      ;(await modulo('/src/core/abrirApp.ts')).abrirApp('ideas', 'diagramas', String(mapa.id))
      await sleep(2000)
      // La paleta flotante de «añadir elemento» tapa los nodos de abajo: fuera durante la toma.
      const paleta = document.querySelector('[data-tut="ideas.mapa.hijo"]')?.parentElement
      if (paleta) paleta.style.display = 'none'
      return 'ok'
    `,
    animar: `
      // Dos pasos de acercamiento con la rueda sobre el lienzo (su manejador hace el zoom).
      const el = document.querySelector('.cursor-grab')
      if (!el) return
      const r = el.getBoundingClientRect()
      for (let i = 0; i < 2; i++) {
        await sleep(i === 0 ? 900 : 700)
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.4, bubbles: true, cancelable: true }))
      }
    `,
    limpiar: `useHouse.getState().closeRoom()`,
  },
  {
    // La sala de cómputo no está en la casa demo: se abre en la previa con su año construido.
    nombre: '06-formulas',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      await (await modulo('/src/demo/construir.ts')).construirAppDemo('computo')
      ;(await modulo('/src/core/state/intencionApp.ts')).lanzarIntencionApp({ appId: 'computo', seccion: 'formulario' })
      ;(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().abrir('computo')
      await sleep(2600)
      return 'ok'
    `,
    animar: `await sleep(400); await desplazar(260, 2800)`,
    limpiar: `(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().cerrar()`,
  },
  {
    // La misma sala en modo gráfica: la superficie 3D de fábrica girando.
    nombre: '06-grafica',
    seg: 3.5,
    preparar: `
      await limpiarTodo()
      await (await modulo('/src/demo/construir.ts')).construirAppDemo('computo')
      ;(await modulo('/src/core/state/intencionApp.ts')).lanzarIntencionApp({ appId: 'computo', seccion: 'grafica' })
      ;(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().abrir('computo')
      await sleep(1600)
      document.querySelector('[data-tut="computo.graf.tipo.3d"]')?.click()
      await sleep(2000)
      return 'ok'
    `,
    animar: `
      // Arrastre sintético sobre el lienzo: OrbitControls captura el puntero y con
      // un puntero inventado setPointerCapture lanza NotFoundError, así que se anula.
      const c = document.querySelector('[data-tut="computo.calc.grafica"] canvas')
      if (!c) return
      c.setPointerCapture = () => {}
      c.releasePointerCapture = () => {}
      const r = c.getBoundingClientRect()
      const x0 = r.left + r.width / 2
      const y0 = r.top + r.height / 2
      const ev = (tipo, x, y) =>
        c.dispatchEvent(new PointerEvent(tipo, { clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', button: 0, buttons: tipo === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
      await sleep(300)
      ev('pointerdown', x0, y0)
      const t0 = performance.now()
      await new Promise((res) => {
        const paso = () => {
          const q = Math.min(1, (performance.now() - t0) / (SEG * 1000 - 700))
          ev('pointermove', x0 + 220 * ease(q), y0 - 30 * Math.sin(q * Math.PI))
          if (q < 1) requestAnimationFrame(paso); else res()
        }
        paso()
      })
      ev('pointerup', x0 + 220, y0)
    `,
    limpiar: `(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().cerrar()`,
  },
  {
    nombre: '07-sisifo',
    seg: 4.5,
    preparar: `
      await limpiarTodo()
      ;(await modulo('/src/core/state/sisifoUiStore.ts')).useSisifoUi.getState().abrir()
      await sleep(1800)
      return 'ok'
    `,
    animar: `await sleep(600); await desplazar(320, 3200)`,
    limpiar: `(await modulo('/src/core/state/sisifoUiStore.ts')).useSisifoUi.getState().cerrar()`,
  },
  {
    nombre: '07-wrapped',
    seg: 4,
    preparar: `
      await limpiarTodo()
      ;(await modulo('/src/core/state/wrappedUiStore.ts')).useWrappedUi.getState().abrir('semana')
      await sleep(1200)
      return 'ok'
    `,
    limpiar: `(await modulo('/src/core/state/wrappedUiStore.ts')).useWrappedUi.getState().cerrar()`,
  },
  {
    nombre: '07-baile',
    seg: 5.5,
    preparar: `
      await limpiarTodo()
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      await cortarCam(await camJugador(40))
      const act = await modulo('/src/core/state/actuacionStore.ts')
      act.useActuacion.getState().actuar(useMascota.getState().mascota, { tipo: 'emote', emote: 'floss' })
      await sleep(700)
      return 'ok'
    `,
    animar: `
      useHerramienta.getState().setEmote('griddy')
      const a = camAhora()
      await moverCam(a, { ...a, az: a.az + 0.6, zoom: a.zoom * 1.1 }, SEG * 1000, (q) => q)
    `,
    limpiar: `
      useHerramienta.getState().setEmote(null)
      ;(await modulo('/src/core/state/actuacionStore.ts')).useActuacion.getState().parar(useMascota.getState().mascota)
    `,
  },
  {
    nombre: '07-panel-ia',
    seg: 4,
    preparar: `
      await limpiarTodo()
      const eu = await modulo('/src/core/state/editorUiStore.ts')
      eu.useEditorUi.getState().setEditor3d(false)
      eu.useEditorUi.getState().setTab('config')
      useLayout.getState().setEditMode(true)
      await sleep(1500)
      // El grupo «IA: activar y precios» va plegado: se despliega y se lleva arriba.
      const btn = document.querySelector('[data-tut="editor.config.ia.abrir"]')
      if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click()
      await sleep(700)
      const sec = document.querySelector('[data-grupo="ia"]')
      if (sec) sec.scrollIntoView({ block: 'start' })
      await sleep(400)
      return btn ? 'ok' : 'SIN grupo ia'
    `,
    animar: `await sleep(600); await desplazar(200, 2800)`,
    limpiar: `useLayout.getState().setEditMode(false)`,
  },
  {
    // Cierre con luz de media tarde (cálida pero clara): el usuario pidió grabar
    // con el paso del tiempo apagado y con luz, nada de noche.
    nombre: '09-atardecer',
    seg: 5,
    preparar: `
      await limpiarTodo()
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      useCiclo.setState({ minutos: 15 * 60, modo: 'manual' })
      await cortarCam(CASA)
      await sleep(900)
      return 'ok'
    `,
    animar: `
      const a = camAhora()
      const dolly = moverCam(a, { ...a, az: a.az - Math.PI / 5, zoom: a.zoom * 1.35 }, SEG * 1000, (q) => q)
      const t = performance.now()
      while (performance.now() - t < SEG * 1000 - 300) {
        const q = Math.min(1, (performance.now() - t) / (SEG * 1000 - 800))
        useCiclo.setState({ minutos: Math.round(15 * 60 + q * 80), modo: 'manual' })
        await sleep(100)
      }
      await dolly
    `,
    limpiar: `useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })`,
  },
]
