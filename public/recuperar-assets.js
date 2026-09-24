/*
 * Recuperación de chunks envenenados (web; inerte en Capacitor y Electron).
 *
 * Justo después de un deploy, Cloudflare Pages puede responder a un chunk que
 * aún no se propagó con el fallback SPA (index.html, 200, text/html). Como
 * `/assets/*` lleva `Cache-Control: immutable` de un año (ver `_headers`), el
 * NAVEGADOR guarda ese HTML bajo la URL del chunk y desde entonces la app
 * arranca en negro sin ningún error visible: el módulo de entrada no carga.
 *
 * Si el módulo de entrada falla, se revisan los scripts y modulepreload del
 * documento, se vuelve a pedir con `cache: 'reload'` el que no llegue como
 * JavaScript (eso reemplaza la entrada de la caché HTTP) y se recarga. Como
 * mucho dos veces por pestaña, para no entrar en bucle si el fallo es otro.
 *
 * Script clásico y ES5 a propósito: tiene que correr aunque el grafo de
 * módulos entero haya fallado, y la CSP no admite scripts en línea.
 */
;(function () {
  var CLAVE = 'mh.recuperarAssets'

  function intentos() {
    try {
      return Number(sessionStorage.getItem(CLAVE) || 0)
    } catch (e) {
      return 99
    }
  }

  function recuperar() {
    var n = intentos()
    if (n >= 2) return
    try {
      sessionStorage.setItem(CLAVE, String(n + 1))
    } catch (e) {
      return
    }
    var nodos = document.querySelectorAll('script[type="module"][src], link[rel="modulepreload"][href]')
    var urls = []
    for (var i = 0; i < nodos.length; i++) urls.push(nodos[i].src || nodos[i].href)
    Promise.all(
      urls.map(function (u) {
        return fetch(u)
          .then(function (r) {
            if (/javascript/.test(r.headers.get('content-type') || '')) return null
            return fetch(u, { cache: 'reload' })
          })
          .catch(function () {
            return null
          })
      }),
    ).then(function () {
      location.reload()
    })
  }

  window.addEventListener(
    'error',
    function (e) {
      var el = e.target
      if (el && el.tagName === 'SCRIPT' && el.type === 'module') recuperar()
    },
    true,
  )

  // Arrancó bien: el contador se limpia para el próximo deploy.
  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        sessionStorage.removeItem(CLAVE)
      } catch (e) {
        // Sin almacenamiento no hay contador que limpiar.
      }
    }, 30000)
  })
})()
