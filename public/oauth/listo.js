/*
 * Puente del login social del ESCRITORIO. Supabase vuelve aquí (una página
 * normal, que termina de cargar) en vez de ir directo al esquema propio: así la
 * pestaña del navegador ya no se queda «cargando» para siempre. Esta página
 * pasa el `code` a la app por el enlace profundo, intenta cerrarse y, si el
 * navegador no lo deja (solo cierra pestañas abiertas por script), lo dice.
 * Es un archivo aparte porque la CSP de la app prohíbe el JS en línea.
 */
;(function () {
  var TEXTOS = {
    es: ['Listo, ya entraste', 'Vuelve a MindHaOS. Ya puedes cerrar esta pestaña.', 'Abrir MindHaOS'],
    en: ["You're signed in", 'Go back to MindHaOS. You can close this tab now.', 'Open MindHaOS'],
    pt: ['Pronto, você entrou', 'Volte ao MindHaOS. Já pode fechar esta aba.', 'Abrir o MindHaOS'],
    fr: ['C’est fait, vous êtes connecté', 'Revenez sur MindHaOS. Vous pouvez fermer cet onglet.', 'Ouvrir MindHaOS'],
    de: ['Fertig, du bist angemeldet', 'Kehre zu MindHaOS zurück. Du kannst diesen Tab jetzt schließen.', 'MindHaOS öffnen'],
    it: ['Fatto, hai effettuato l’accesso', 'Torna su MindHaOS. Puoi chiudere questa scheda.', 'Apri MindHaOS'],
    nl: ['Klaar, je bent ingelogd', 'Ga terug naar MindHaOS. Je kunt dit tabblad nu sluiten.', 'MindHaOS openen'],
    pl: ['Gotowe, jesteś zalogowany', 'Wróć do MindHaOS. Możesz już zamknąć tę kartę.', 'Otwórz MindHaOS'],
    tr: ['Tamam, giriş yaptın', 'MindHaOS’a geri dön. Bu sekmeyi artık kapatabilirsin.', 'MindHaOS’u aç'],
    ru: ['Готово, вы вошли', 'Вернитесь в MindHaOS. Эту вкладку можно закрыть.', 'Открыть MindHaOS'],
    ar: ['تم تسجيل الدخول', 'عد إلى MindHaOS. يمكنك إغلاق علامة التبويب هذه الآن.', 'افتح MindHaOS'],
    hi: ['हो गया, आप साइन इन हैं', 'MindHaOS पर लौटें। अब आप यह टैब बंद कर सकते हैं।', 'MindHaOS खोलें'],
    id: ['Beres, kamu sudah masuk', 'Kembali ke MindHaOS. Tab ini sudah boleh ditutup.', 'Buka MindHaOS'],
    ja: ['ログインしました', 'MindHaOSに戻ってください。このタブは閉じてかまいません。', 'MindHaOSを開く'],
    ko: ['로그인되었습니다', 'MindHaOS로 돌아가세요. 이제 이 탭을 닫아도 됩니다.', 'MindHaOS 열기'],
    zh: ['已登录', '请回到 MindHaOS。现在可以关闭此标签页了。', '打开 MindHaOS'],
  }
  var idioma = (navigator.language || 'es').slice(0, 2).toLowerCase()
  var t = TEXTOS[idioma] || TEXTOS.en
  document.documentElement.lang = TEXTOS[idioma] ? idioma : 'en'
  if (idioma === 'ar') document.documentElement.dir = 'rtl'
  document.getElementById('titulo').textContent = t[0]
  document.getElementById('texto').textContent = t[1]

  // = REDIRECT_NATIVO de sesionStore.ts: el código (o el error) viaja tal cual.
  var destino = 'com.macr120.mindhome://oauth' + location.search + location.hash
  var abrir = document.getElementById('abrir')
  abrir.textContent = t[2]
  abrir.href = destino
  // Sin `code` la página la abrió alguien a mano: no hay nada que entregar.
  if (!/[?&#](code|error)=/.test(location.search + location.hash)) return
  location.href = destino
  setTimeout(function () {
    window.close()
  }, 1500)
})()
