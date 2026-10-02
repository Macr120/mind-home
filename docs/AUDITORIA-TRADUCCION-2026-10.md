# Auditoría de traducción · MindHaOS en 16 idiomas (1 oct 2026)

**Pregunta:** ¿la app está traducida al 100 % en los 16 idiomas, salvo el nombre «MindHaOS»?

**Respuesta: no.** Los diccionarios sí están al 100 % de claves, pero hay texto que nunca pasa por
ellos y sale en español (a veces en inglés) en los 15 idiomas que no son español, además de
contenido de la demo y superficies nativas sin traducir. Nada de lo de abajo lo detecta
`npm run traducir:verificar`, que da **0 errores**.

Rutas relativas a la raíz del repo. «15 idiomas» = todos menos el español.

## Estado: prioridad ALTA arreglada (1 oct 2026)

Los 15 hallazgos ALTA se arreglaron el mismo día, sin commit. Las traducciones se hicieron en
la sesión (no con la API) y en los 15 idiomas a la vez.

| # | Arreglo |
|---|---|
| A1 | `sesionStore` devuelve códigos (`ErrorCuenta`) y cada pantalla los pinta con `mensajeCuenta(codigo, t)`. Las claves `cuenta.err.*` están en la app y en la web `/cuenta`. |
| A2 | `llamarFuncion` traduce el error del servidor por su código (`ia.err.<codigo>`); en español se queda el texto concreto del servidor. `mensajeErrorIA(e, t, fallo)` en 21 pantallas: fuera del español, los fallos internos se cambian por el aviso de la pantalla. El rechazo de un plan viaja como `ErrorIA('rechazo')`. |
| A3 | Las 46 claves `objetivos.sug.*`. |
| A4 | `diasSemana()` en los 4 selectores (la «X» solo en español; el resto con `Intl`), `textoRepeticion` con `rutinas.rep.txt.*` y las claves `rutinas.rep.unaVez/semanal/indefinido`. |
| A5 | `nombreCortoT` (los cuartos, con `nombreCuartoGlobal`) e `Intl.ListFormat`; la burbuja de foto usa `chat.fotoMensaje`. |
| A6 | Manual: las frases que faltaban, añadidas al final de cada `manual.<id>.ts` (sin regenerar), y `chat.manual.nota.computo/paintball`. Las 27 órdenes de Amigos NO se traducen: sus parsers solo entienden español e inglés, así que fuera del español se enseñan en inglés (`fraseDe`). |
| A7 | Temario: `idiomas.tema.*` e `idiomas.temaDesc.*` (84 temas) por `tituloNodo`, `descripcionNodo` y `tituloTema`. Nombres de idioma con `Intl.DisplayNames` (`nombreIdioma`). |
| A8 | `nombreCategoria` y `despacho.cat.*` (16); una categoría de fábrica elegida en otro idioma se guarda con su nombre español. |
| A9 | `cocina.momento.*` en el registro y en el nombre de la actividad. |
| A10 | `entre.estado.*` (3) y `entre.tipo.*` en el formulario. |
| A11 | `nombreApp` y `etiquetaSeccion` en `enlaceApp.ts` (nombre corto traducido). |
| A12 | `datosIdioma(idioma).nombreIA` en planes, evidencia del despertador, recetas y dietas. |
| A13 | `dilemas.i18n.ts` y 15 `dilemas.i18n.<id>.ts` por índice (son 32 dilemas, no 33). A Jev se le pregunta siempre el original. |
| A14 | El shell guarda sus textos en `TEXTOS` (español de fábrica) y la app le manda los de su idioma por `mph:idioma` (`core/i18n/textosEscritorio.ts`): menú, aviso de versión nueva y selector de programa. |
| A15 | `web/public/og.png` nuevo: icono actual, «MindHaOS» y mindhaos.com, sin texto que dependa del idioma. |

**Verificado:** `npx tsc -b`, `npm run build`, `npm run build:web` (96 páginas en 16 idiomas) y
`npm run traducir:verificar` (0 errores). En vivo, casa demo en japonés:
- Cocina: «朝食に追加».
- Finanzas: «食費 / 交通費».
- Entretenimiento: «見る・読む予定 / 進行中 / 完了».
- Idiomas: «英語 / スペイン語» y el temario entero.
- Misiones sugeridas, días «日 月 火…» y modos «1回だけ / 毎週 / 無期限».
- Chips «瞑想 · 庭を開く».
- Manual: las 40 carpetas; Amigos sale en inglés.
- Dilemas: los módulos cargan en orden. La partida no se abrió porque pide una decisión a Jev con IA.

Sin probar en vivo: el chat (con la IA activa, enviar gasta créditos) y el menú de Electron.

En el manual coreano se corrigió una frase vieja con el marcado roto (`[잤어요}`).

**Vistos de paso al verificar:** todos arreglados con la tanda MEDIA/BAJA (abajo), salvo los
géneros de la demo de Entretenimiento («Ciencia ficción», «Divulgación»), que son de la demo.

## Estado: prioridad MEDIA y BAJA (1 oct 2026)

Arreglado en código, sin commit. 277 claves nuevas traducidas en la sesión a los 15 idiomas: las
266 de la tanda, más las 10 descripciones del tiempo y el punto final de las ayudas del editor, que
salieron al verificar en vivo.

| # | Arreglo |
|---|---|
| M1 | Carpetas de fábrica del inventario por `nombreCategoria` (`inv.cat.*`; las renombradas se quedan tal cual). Selector «Agregar objeto» y conjunto de plantilla con `recurso.<id>`. Las 5 `recursoExtra.*` que faltaban. El nombre sembrado de un objeto se traduce también en su editor. |
| M2 | `useNombreCuarto` en los diálogos de destino, asignar y eliminar, en el constructor (el borrador del nombre parte del traducido y solo se guarda si cambia) y en los planos. Avisos del editor de planos con `planos.aviso.*`. |
| M3 | `garage.vehTipo.*`, `garage.mantTipo.*` y `garage.servicio.*`; el atajo guarda el título ya traducido. |
| M4 | Divisas con `Intl.DisplayNames` (`nombreDivisa`); «X de Y» con `despacho.meta.deObjetivo`. |
| M5 | Macros con `cocina.macros` y `cocina.macro.p/c/g` (en inglés «F»); placeholder de ingredientes. |
| M6 | El título y las actividades de cardio se guardan canónicos y se ven traducidos (`nombreEjercicio`); «Generando n/m» y «n fallaron». La clave `ejercicio.confirmarGenerarImagenes` tenía un `{proveedor}` viejo que salía literal: ahora `…C`. |
| M7 | `tituloSesion` en `jardin/pistas.ts` (el de la pantalla y el de la captura por chat). |
| M8 | `PILAR_GENERAL.titulo` traducido (`biblioteca.nodo.general`). |
| M9 | `unidadObjetivo` (`hoy.unidad.*`) en Misiones, «Añadir misión» y «Mientras dure». |
| M10 | `mesesCortos()` y `diasSemanaLunes()` en los 7 mapas de calor y calendarios. |
| M11 | Nombre de app traducido en Wrapped, Asistentes, notificación de objetivos y chat-editor; también en el grafo de memoria y en la vista por cuartos del editor. |
| M12 | `nombreAsistente` en carrera, canchas, paintball (también el nombre del bot en partida), selector y película; vehículos con `herr.veh.*`. |
| M13 | Clima: descripción por código (`descripcionClima`, las 10 `clima.<id>`), errores, «aprox.» y «Ciudad de México»; geocodificación en el idioma de la app. |
| M14 | Presupuesto del taller traducido (mano de obra, descuento, merma, «para N mm», «por tramo», IVA de fábrica); materiales por su clave real (`nombreTablero`), veta, unidades (`muebles.unidad.tramo`) y fechas en Excel e impresión. |
| M15 | Itinerario compartido con las cabeceras de la hoja; números con `localeActual()`; Nominatim en el idioma de la app. |
| M16 | ErrorBoundary; errores de redes por código (`mensajeErrorRedes`, en `redes/errores.ts` para no cargar `useT` en la web /cuenta); preguntas de Profundizar (`diario.prof.*`); las órdenes del Buzón se escriben en inglés fuera del español (el parser entiende es/en; «play cards» ahora también se entiende). |
| M17 | `rasgosPersona` (`entre.j.cien.ocup/ciudad/forma.*`); a Jev le siguen llegando en español. |
| M19 | Los 7 `$` sobrantes. El verificador ahora los marca como error y lee marcadores con «ñ». |
| M20 | Canal de notificaciones de Android con nombre traducido; permiso de micrófono de iOS al día en 14 idiomas; `NSAppleEventsUsageDescription` del Mac en los 16; `short_name` de la PWA = «MindHaOS». |
| M21 | Checkout web con `selectedLocale`; el registro guarda el idioma en `user_metadata` (para plantillas de correo por idioma). |
| M23 | Cómputo responde en el idioma de la app (la gráfica sugerida va en una etiqueta `#grafica:` que no se enseña); el tutor de Idiomas toma la lengua de la app como la del alumno. |
| BAJA | Fechas y números de 27 archivos con `localeActual()`; duraciones con `duracionMin`/`textoMin` (`ui.dur.*`) y abreviaturas (ppm, J1/J2, vueltas, S/R, ON/OFF, Cronograma); tooltips del HUD, mapa, techos, muros y puertas; letreros 3D de muestra; nombres por defecto (fondo, tema, carpeta, grupo, pista, charla, capturas, «HojaN»); placeholders; nombres de archivo; errores de pagos, sync y dictado; partícula coreana en widgets y web; widgets fr/ru, permisos iOS fr/ru/tr/id/zh/pt y textos de fr/ru/id/web con tuteo; «şifre» en la web turca; `cuenta.plan.local` ru; manual pt unificado en «você» y dos frases inglesas; fichas con mayúsculas por idioma y sin espacio tras la puntuación CJK; web con `hreflang`, `sitemap.xml` y `robots.txt`. |

**Verificado:** `npx tsc -b`, `npm run build`, `npm run build:web` (96 páginas, sitemap con 64 URLs;
`/cuenta` sigue sin `useT` ni diccionarios en su grafo estático) y `npm run traducir:verificar`
(0 errores). En vivo, casa demo en japonés con un Vite propio sin HMR, en las 22 apps:
- **Barrido de texto latino:** se pasó de 413 cadenas (el barrido del 1 oct, antes de los arreglos)
  a 157. Lo que queda es contenido de la demo, nombres propios y marcas (Nissan, Fitbod, criptos,
  obras y autores) y la sintaxis de Cómputo.
- **Garage:** «車 · Nissan Tsuru», los 12 tipos de mantenimiento y los 7 atajos de servicio.
- **Inventario:** 家具, 家電, 水回り, 照明, 植物…
- **Cocina:** «5分» y «P 14g · C 55g · F 8g».
- **Hobbies:** mapas de calor y calendario («10月 11月…», «月 火 水…») y «16時間46分».
- **Jardín:** «瞑想 · 森の音» y las duraciones «2分 5分…».
- **Clima:** «晴れ / 霧雨 / 雷雨». Se probó llamando a `descripcionClima`, porque el clima real está
  apagado en la demo.
- **Finanzas:** objetivos con «（42%）».

**Arreglado al verificar** (el análisis estático no lo veía):
- **Ejercicio:** las barras del resumen decían «0 / 180 min» (`unidad="min"` a mano), y lo mismo la
  barra de meta de las apps personalizadas. Ahora usan `ui.unidad.min`.
- **Biblioteca:** la lista de charlas pintaba «Ciencias naturales» si era lo primero que se abría,
  porque `campoDe` caía a `PILARES` sin traducir.
- **Clima:** faltaban las 10 descripciones `clima.<id>` en todos los idiomas. El verificador se
  conformó con las claves `clima.err.*` (punto ciego 2, abajo).
- **Editor:** el pie de ayuda terminaba en «。.» en ja/zh y «..» en ko, porque el punto iba fijo en
  el código y la traducción ya traía el suyo. Ahora es `editor.ayuda.punto`.

**Inofensivo:** el *Proxy* registra `.desayuno` (las pestañas de solo icono del registro de comida) y
`ejercicio.ej.` (ejercicios sin nombre). Las dos claves piden un texto vacío y no pintan nada.

**Sin probar en vivo:** el chat y los errores al publicar en redes, porque gastan IA o cuentas
reales, y lo nativo (canal de Android, permisos de iOS).

**Fuera de esta tanda (no se arreglan en código o piden decisión):**
- M18 Noticias: añadir medios de economía, tecnología, deportes y salud por idioma pide probar cada
  feed en vivo (CORS o rss2json).
- M20: compras dentro de la app solo en en-US (App Store Connect y Play) y el editor «Mind Planner
  Home» de Microsoft Store (Partner Center).
- M21: plantillas de correo de Auth por idioma (panel de Supabase; ya tienen `{{ .Data.idioma }}`),
  la página de error de `redes-oauth` (servidor, caso raro) y el botón de macOS: la última versión
  para Mac publicada es la 1.0.3, hace falta compilar una nueva en un Mac.
- M22: capturas de tienda (dependen del calendario de la demo) y fuentes de las fichas, que se
  editaron a mano: el generador ya está corregido, pero no se regeneraron.
- M23: moneda MXN fija en Finanzas y Garage.
- BAJA: `localeConfig` de Android 13 (la app elige su idioma dentro), instalador NSIS sin hi/id,
  `/mascara` (herramienta interna), correo de contacto `mindplannerhome@gmail.com` (falta uno de
  mindhaos.com), clips del video de fábrica y tono de los textos de marketing.
- La demo se arregló después, en su propia tanda (ver su sección, abajo).

## Cómo se hizo

1. `node scripts/verificar-i18n.mjs`: 10 253 claves de interfaz y 929 de tutorial en los 15
   diccionarios, 0 errores (1 229 avisos de longitud).
2. Análisis de los VALORES de los diccionarios: copias del inglés o del español, escritura
   nativa en ja/zh/ko/ru/hi/ar, marcadores con letras no ASCII y `$` sueltos.
3. Escáner AST (TypeScript) de los 1 652 archivos de `src/`: 25 077 literales fuera de
   `t()`, revisados por categoría.
4. Claves guardadas en DATOS (`clave:`, `labelKey:`) y las 269 plantillas de claves
   dinámicas (`t(\`prefijo.${id}\`)`), cruzadas contra los catálogos reales.
5. Capa de contenido (`PorIdioma`, `*.i18n.<id>.ts`, demo, manual, juegos): ramas y rutas
   por idioma.
6. Superficies fuera de `src/`: Android, iOS, Electron, PWA, Supabase, web y fichas de
   tienda.
7. **Barrido en vivo**:
   - Montaje: servidor propio sin HMR y casa demo en japonés y ruso.
   - Recorrido: las 22 apps con sus pestañas, menú lateral, editor (4 pestañas),
     calendario, chat, Configuraciones, bienvenida, Sísifo y progreso.
   - Detectores: un *Proxy* sobre `DICTS` registraba cada clave pedida que no existía,
     y un detector marcaba todo texto visible en alfabeto latino.

## Resumen

| Bloque | Estado |
|---|---|
| Diccionarios de interfaz y tutoriales (15 × 10 253 + 929) | ✅ 100 % de claves; 7 valores con `$` sobrante |
| Textos de interfaz fuera de `t()` | ❌ 15 hallazgos de prioridad ALTA, ~23 grupos MEDIA, ~30 BAJA |
| Contenido traducible (demo del año de Pep@, recetario, Sísifo, especies, diario cultural, preguntas, fórmulas, tutoriales, ejemplos de fábrica) | ✅ 16/16 |
| Contenido sin traducir | ❌ manual de comandos (50–65 %), temario de Idiomas, Dilemas, 100 personas, calendario de la demo |
| Web pública (`paginas` 16/16, `cuenta` 15/15), widgets Android 16/16, iOS (InfoPlist + widgets) 16/16, fichas App Store y MS Store 16/16 | ✅ |
| Escritorio (menú y diálogos), errores del servidor, compras in-app, `og.png` | ❌ |

Visto **limpio en vivo** (japonés): bienvenida (4 pasos), Configuraciones (7 secciones),
paneles del chat (Amigos, Asistentes, Lugares, Navegador), Sísifo, progreso, Escritura,
Archivo, Arte, Hobbies, Ideas, Jardín, Audio, Video, Cómputo y Diario.

---

## Prioridad ALTA (flujos comunes, 15 idiomas)

### A1. Login y cuenta: errores en español
- **Dónde se generan:** `src/core/cuenta/sesionStore.ts`
  - `:20-40` `mensajeAuth`: «Correo o contraseña incorrectos.», «Demasiados intentos…».
  - «Sin backend»: `:188 :210 :217 :244 :273 :284 :292 :302`.
  - «La contraseña necesita al menos 8 caracteres.»: `:190 :285`.
  - Borrar cuenta: `:294`. Cupones: `:307-311`. Mensaje de Apple sin traducir: `:231`.
- **Dónde se ven:** `EditorCuentaSection.tsx:100-118,232,411`, `PuertaUnlock.tsx:646-675` y la web
  `/cuenta` (`web/src/cuenta.tsx:112,180,183,201,287`).
- **Arreglo:** devolver códigos y traducir en la UI, como ya hacen `mensajeErrorBuzon` y `ErrorAlmacen`.

### A2. Errores de IA pintados en crudo (~30 pantallas)
- **Servidor:** `ia-chat`, `ia-imagen`, `ia-voz` e `ia-tts` devuelven `mensaje` en español; son 105
  textos distintos, por ejemplo `ia-chat/index.ts:791` «Vas muy rápido con la IA…».
- **Cliente:** `ErrorIA` los guarda tal cual (`src/core/cuenta/api.ts:204`). Además lanzan sus
  propios errores `core/chat/ia.ts`, `rooms/computo|ideas|video|audio/ia.ts`, `planIA.ts`,
  `imagenIA.ts` y `vozIA.ts`.
- **Dónde se ven** (con `e.message`):
  - ImagenIA, GenerarTexturaIA y EditorDibujo.
  - GeneradorPlan, MaterialEntrada, EditorFormula, ModoNormal, HojasTab, Rejilla, MapasTab y DiarioTab.
  - Editor de video (7 sitios), EditorProyecto de audio, EditorDocumento, EvidenciaAlarma,
    FormularioMedia, BloqueResumenIA, TabSitios.
  - `mensajeError3D` en el chat y en el editor.
- **Casos frecuentes:** sin créditos, límite de ritmo, sin sesión y proveedor caído. El chat sí
  traduce por código (`ChatBox.tsx:1000-1020`).
- **Arreglo:** `mensajeErrorIA(e, t)` por `codigo`, con un genérico traducido para lo demás.

### A3. Misiones sugeridas: 46 de 48 claves no existen
- **Dónde:** `src/core/objetivosSugeridos.ts:58-540`, campos `clave` + `etiquetaEs`. Solo existen las
  dos de escritura en los diccionarios.
- **Qué se ve:** «Beber agua», «Registrar lo que comí», «Meditar»… en Hoy › «Añadir misión»
  (`AnadirObjetivo.tsx:458`).
- **Además:** `nombreSugerencia()` (`:559`) guarda el nombre ya resuelto en la BD, así que la
  misión creada sigue en español en Hoy y en el calendario.
- **Claves que faltan** (prefijo `objetivos.sug.`):
  - cocina: comidas, agua, peso, menu, compra
  - ejercicio: fuerza, cardio, caminar, estirar
  - descanso: registrar, acostarme, pantallas
  - anecdotario: escribir, bueno, foto
  - despacho: gastos, presupuesto, ahorro
  - biblioteca: estudiar, apunte, preguntar
  - entretenimiento: archivar, mesa
  - sala: bitacora, porConocer
  - jardin: meditar, respirar, gratitud
  - garage: revisar, servicio
  - diario: titulares, efemerides
  - hobbies: practicar, proyecto
  - idiomas: repaso, charla, palabras
  - ideas: anotar, mapa
  - computo: resolver, hoja
  - agenda: pendientes, medicamentos, cumples
  - metas: revisar, planear
- **Origen:** se añadieron en `df60b28` y nunca entraron en `dict.en.ts`.

### A4. Calendario y rutinas
- **Letras de los días:** `src/core/rutinas.ts:9` `DIAS_SEMANA = ['D','L','M','X','J','V','S']` en los
  selectores de días (`RutinasPanel.tsx:315-335`, `HorarioActividad.tsx:244-261`,
  `AnadirObjetivo.tsx:187-200`, `MientrasDure.tsx:160-171`). La «X» de miércoles no se
  entiende fuera del español.
- **Texto de repetición:** `textoRepeticion` (`rutinas.ts:43-68`) arma en español «del … al …»,
  «cada mes (día n)», «cada año», «todos los días», «cada semana (…)», «hasta…» e
  «indefinidamente». Se ve en `Calendario.tsx:1609`, `DespliegueFila.tsx:104` y `RutinasPanel.tsx:308`.
- **Modos de repetición:** `MODOS_REPETICION` (`RutinasPanel.tsx:53-56`) usa claves que no existen
  (`rutinas.rep.unaVez`, `.semanal`, `.indefinido`). Sale «Solo una vez / Cada semana /
  Indefinidamente» en el editor de eventos y en el horario de todas las apps
  (`HorarioActividad.tsx:231`). Visto en vivo.

### A5. Confirmaciones del chat
- **Nombre de app en español:** `ChatBox.tsx:633` `nombreCorto` usa el nombre de la plantilla sin
  traducir en `:875,883,890,952,986,1048,1053`, y une con `.join(' y ')`. En inglés queda
  «…in Cocina y Ejercicio». Ya existe `nombreCortoT` (`:636`), pero no se usa.
- **Burbuja «📷 Foto»:** sale fija en `:704`.
- **Arreglo:** `nombreCortoT` + `Intl.ListFormat(localeActual(), { type: 'conjunction' })`.

### A6. Manual de comandos: entre el 50 y el 65 % sin traducir
- **Frases que faltan** (de 274; `ManualComandos.tsx` + `src/core/chat/manual.<id>.ts`):

  | pt | fr | de | it | ja | zh | ko | ru | hi | tr | id | pl | nl | ar |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | 143 | 137 | 177 | 144 | 156 | 155 | 157 | 157 | 156 | 152 | 143 | 152 | 161 | 157 |

- **Qué se ve:** salen en español y se mandan así al chat. Incluso las básicas: «[Comí] {pollo
  con arroz} en la {cena}», «[Abre] la {dieta}».
- **Notas:** faltan además `chat.manual.nota.computo` y `chat.manual.nota.paintball`.
- **Arreglo:** `npm run traducir:manual -- --todas` (usa la API) o a mano. **Nunca**
  `traducir:contenido --que=manual`, que regenera el archivo y pierde frases.

### A7. App Idiomas
- **Temario:** los 84 temas de fábrica, con título y descripción (168 textos), solo en español,
  incluso en inglés (`rooms/idiomas/temario.ts`). `tituloNodo()` (`temarioVivo.ts:260-266`)
  traduce el área y el nivel, pero no el tema.
  - Se ve en `TemarioTab.tsx:107,118`, `OpcionesTemas`, `CharlasTab`, `ProgresoTab` y `ChatTutor`, y
    viaja al chat.
- **Nombres de idioma:** los 16 de `CATALOGO_IDIOMAS` (`idiomas/constantes.ts:42-59`) están en español
  y se pintan en crudo (`SelectorIdiomas.tsx:93`).
  - Además se guardan en `perfil.nombre` (`:66`), así que todo el cuarto dice «Tutor de
    Inglés», «Repasar Inglés».
  - Arreglo: `Intl.DisplayNames(locale, { type: 'language' })`.

### A8. Finanzas: categorías
- **De fábrica:** las 16 categorías de `despacho/categorias.ts:16-39` se pintan en crudo
  (`MovimientosTab.tsx:128,271`, `BalanceTab.tsx:194`).
- **Las que escribe la app:** también en español: «Otros» (`MovimientosTab.tsx:64`), «Ahorro»,
  «Aportación a inversión» y «Pago de deuda» (`MetasTab.tsx:549`), y la captura por chat
  (`despacho/index.tsx:12-30`).

### A9. Cocina: momento de comida
- **Qué se ve:** `RegistroComida.tsx:148` pinta `momentoActual.label` («Desayuno»), y `:258` lo mete
  en «Añadir a {momento}». Visto en vivo: «Desayunoに追加».
- **Además:** se guarda como nombre de la actividad (`:154`, `cocina/index.tsx:422`).
- **Arreglo:** ya existe `cocina.momento.*`; basta usarla.

### A10. Entretenimiento: estado y tipo de obra
- **Estados:** `ESTADOS_MEDIA` (`entretenimiento/constantes.ts:22-26`: «Por ver/leer», «En curso»,
  «Completado») no tiene claves y sale en cada tarjeta del Archivo (`TarjetaMedia.tsx:137`) y en el
  formulario (`FormularioMedia.tsx:323`).
- **Tipos:** `TIPOS_MEDIA` llega ya resuelto a `FormularioMedia.tsx:155`, aunque existe `entre.tipo.*`.

### A11. Enlaces a apps (Metas, Planes y objetos enlazados)
- **Dónde:** `src/core/enlaceApp.ts:38-51` devuelve el nombre completo de la plantilla («Cómputo ·
  Calculadora y hojas») y la etiqueta de sección sin traducir.
- **Qué se ve:**
  - la burbuja «Abrir…» del objeto (`InteractOverlay.tsx:235→259`);
  - los chips y el selector «¿Dónde se registra este paso?» (`metas/ChipApp.tsx:53-204`);
  - `EnlaceObjetoDialog.tsx:209,211`, `EnlazarObjetoPanel.tsx:107→222` y `ControlHerramienta.tsx:1304`.
- **Arreglo:** las claves `room.<id>.nombre` (27/27) y `room.<id>.cmd.<seccion>` (76/76) ya existen.

### A12. La IA responde en el idioma equivocado
- **Planes y evidencia:** `src/core/planIA.ts:413` y `rooms/descanso/evidencia.ts:30` piden
  `'español'` o, si no, `'inglés'`. Los planes de metas y el veredicto de la alarma llegan en
  **inglés** en 14 idiomas.
- **Recetas y dietas:** `rooms/cocina/recetaIA.ts:61,112` pide siempre «Escribe en español».
- **Arreglo:** `datosIdioma(idioma).nombreIA`, como ya hace `rutinaIA.ts:132`.

### A13. Juego Dilemas: todo en español
- **Dónde:** `rooms/entretenimiento/juegos/dilemas.data.ts`: 33 dilemas × 4 campos = 132 textos, sin
  capa i18n. Se pinta en `Dilemas.tsx:233-285`. Afecta también al inglés.
- **Arreglo:** `dilemas.i18n.<id>.ts` por índice, como `preguntas.i18n`.

### A14. Escritorio (Electron)
- **Menú:** fijo en español, 28 rótulos (`electron/main.js:597-648`). En macOS se ve siempre.
- **Aviso de versión nueva:** `main.js:445-451` («Hay una versión nueva…», «Descargar / Ahora no»).
- **Selector de programa:** `main.js:720-725`.
- **Arreglo:** quitar `label` de los `role` (Electron los localiza) y mandar por IPC los textos
  propios en el idioma de la app.

### A15. Vista previa al compartir enlaces
- **Qué se ve:** `web/public/og.png` dice «Mind Planner Home», lleva un eslogan en español y el
  dominio viejo, en los 16 idiomas.

---

## Prioridad MEDIA

| # | Qué | Dónde |
|---|---|---|
| M1 | Editor › Objetos: 20 carpetas del inventario sin traducir (Mobiliario, Electrodomésticos, Plomería, Iluminación, Equipo cardio…, Vehículos, Alberca, Luces, Principales…) | `ObjetosCatalogo.tsx:431` (+ «Otros» `:170,188,347`); nombres de `core/house/recursos.ts` y `disenoStore.ts:2808-2936`. Visto en vivo |
| M1b | Selector «Agregar objeto» y conjunto de la plantilla, en crudo | `SelectorObjeto3D.tsx:10,92,100,110`, `PlantillasCatalogo.tsx:37,336` |
| M1c | Faltan 5 claves de objetos principales: `recursoExtra.diana-metas`, `.teclado-midi`, `.caballete-arte`, `.escritorio-escritura`, `.camara-video` | `especialesPlantillaMeta.ts:44-69` → `ObjetosCatalogo.tsx:113`, `EditorObjetosSection.tsx:83` |
| M2 | Nombres de cuarto sin `useNombreCuarto` («Cuarto 3», «Cocina · Nutrición») y avisos del editor de planos | `DestinoObjetoDialog.tsx:74,85`, `AsignarPlantillaDialog.tsx:58`, `EliminarCuartoDialog.tsx:39`, `ConstructorMapa.tsx:708`, `PlanoPanelProps.tsx:354,368,403`, `planoEditarForma.ts:70`, `planoPincelCuarto.ts:103`, `planoZonaDrag.ts:85`, `planoCuartoRegistroDrag.ts:52` |
| M3 | Garage: tipos de vehículo (6), de mantenimiento (12) y plantillas de servicio (7) sin claves; la plantilla guarda el título en español | `garage/constantes.ts` → `FormularioVehiculo.tsx:73`, `VehiculosTab.tsx:71`, `DetalleVehiculo.tsx:128,253`, `FormularioMantenimiento.tsx:42,93,116` |
| M4 | Finanzas › Mercados: 30 nombres de divisas; Metas «X de Y» | `mercados.ts:72-102` → `MercadosTab.tsx:360,372` (usar `Intl.DisplayNames`); `MetasTab.tsx:620` |
| M5 | Cocina: macros «P/C/G» fijas (en inglés la grasa es F) y placeholder de receta | `DiarioTab.tsx:104,141`, `DietasTab.tsx:338-340,558-570`, `RecetasTab.tsx:442,695,713-715`, `PlanSemanal.tsx:655`, `ProgresoTab.tsx:172`, `RegistroComida.tsx:230-233` (ya existen `cocina.dieta.gProt/gCarb/gGras`) |
| M6 | Ejercicio: título «Carrera» por defecto, guardado; el autocompletado deja el nombre canónico en español; «Generando n/m…» | `ResistenciaTab.tsx:58`, `AutocompleteEjercicio.tsx:61,89`, `GenerarImagenesBar.tsx:101,110` |
| M7 | Jardín: «Meditación libre / Meditación · …», guardados; captura por chat «Respiración» | `jardin/MeditacionTab.tsx:34,36`, `jardin/index.tsx:102` |
| M8 | Biblioteca: campo «General» sin clave `biblioteca.nodo.general` | `biblioteca/constantes.ts:13-18` → CharlasTab, ChatCharla, EnciclopediaTab, EstudioTab, HistorialSesiones, ResumenTab |
| M9 | Misiones: unidades «tarjetas» y «cálculos» («0 / 21 tarjetas») | `rooms/idiomas/index.tsx:187`, `rooms/computo/index.tsx:80` → `FilaHoy.tsx:170`. Visto en vivo |
| M10 | Meses «ene…dic» e iniciales de día en español en mapas de calor y calendarios de apps | `_shared/Heatmap.tsx:11,13`, `hobbies/HeatmapAnual.tsx:5`, `hobbies/HeatmapMes.tsx:6`, `hobbies/DetalleHobby.tsx:26`, `idiomas/HeatmapIdiomas.tsx:5`, `anecdotario/CalendarioAnimo.tsx:7`, `core/wrapped/HeatmapWrapped.tsx:13`. Visto en vivo |
| M11 | Nombre de app sin traducir: Wrapped, Asistentes, título de la notificación de objetivos, chat-editor («Abrí {app}») | `wrapped/slides.tsx:146,161`, `AsistentesConfig.tsx:27,99,291`, `core/avisos.ts:245`, `editorAcciones.ts:442` |
| M12 | Minijuegos: asistentes de fábrica (Mago, Gato…) y vehículos de carrera con nombre crudo | `CarreraOverlay.tsx:121,218,276`, `SelectorAsistente.tsx:36`, `MarcadorCancha.tsx:155`, `PaintballOverlay.tsx:251,279`, `video/Secciones.tsx:124` |
| M13 | Clima del reloj: 10 descripciones y errores en español, «aprox.», geocodificación en español y «Ciudad de México» por defecto | `core/clima.ts:41-60,74,175,181,200,253,267,291`, `cicloStore.ts:152,167`, `CicloPanel.tsx:267,288,291` |
| M14 | Taller de muebles | Ver detalle abajo |
| M15 | Sala: el itinerario que se comparte lleva cabeceras en español y «$» fijo | `sala/itinerarioTexto.ts:24,33` (geocoder `accept-language=es` en `geocoder.ts:48,58`, quizá a propósito) |
| M16 | Errores y textos sueltos | Ver detalle abajo |
| M17 | 100 personas: ocupación, ciudad y forma de ser en español (58 textos) | `juegos/cien.personas.ts` → `CienPersonas.tsx:247,249` |
| M18 | Noticias: fuera de es/en solo hay medios de «mundo» y «entretenimiento» | `rooms/diario/fuentes.ts` (cobertura, no traducción) |
| M19 | 7 valores de diccionario con `$` sobrante que se ve en pantalla | Ver detalle abajo |
| M20 | Nativo | Ver detalle abajo |
| M21 | Servidor y web | Ver detalle abajo |
| M22 | Tiendas | Ver detalle abajo |
| M23 | Decisiones de producto por confirmar | Ver detalle abajo |

**M14 · Taller de muebles**
- Presupuesto: «Mano de obra», «Descuento», «para N mm», «+N % de merma» e impuesto «IVA» por
  defecto (`core/muebles/costos.ts:151-387`, `repository.ts:1359` → `PanelPrecios.tsx:173,176`).
- Las exportaciones PDF y Excel usan `nombreEs`, `materialId` y `veta` en crudo
  (`exportarTaller.ts:83,91,222,230`).
- `DiagramaCortes.tsx:186` y `PanelDespiece.tsx:97` arman `muebles.mat.<id>`:
  - con «mdf-hidrofugo», cuya clave real es `mdfHidro`, sale el id crudo en los 16 idiomas;
  - en español todos los materiales salen como su id en minúsculas.

**M16 · Errores y textos sueltos**
- ErrorBoundary: «Algo falló al cargar», «Reintentar» y «Error en {app}»
  (`ErrorBoundary.tsx:41,49`, `RoomOverlay.tsx:223`, `PlantillaPreviaOverlay.tsx:51`,
  `PeliculaOverlay.tsx:16`).
- Errores de publicar en redes, crudos (`core/redes/api.ts`, `trabajos.ts:91`).
- Diario › Profundizar, la pregunta semilla (`ProfundizarModal.tsx:12-29`).
- Buzón: las acciones escriben órdenes en español como burbuja (`PanelAccionesHilo.tsx:101,132,206,220`).

**M19 · `$` sobrante en los diccionarios**
- pt: `creditos.n` («$120 créditos», que parece un precio), `ui.estrellas`, `descanso.nDe5`,
  `respaldo.aviso` y `garage.r.gasto`.
- de y it: `respaldo.aviso`.

**M20 · Nativo**
- Android: canal de notificaciones «Default» en inglés (`notificaciones.ts:185` no crea canal propio).
- iOS:
  - `NSMicrophoneUsageDescription` desfasado en 14 `InfoPlist.strings`: falta «grabar voz o
    instrumentos».
  - Compras in-app solo con localización en-US (`MPHProducts.storekit`, App Store Connect y Play).
- macOS: `NSAppleEventsUsageDescription` solo en inglés (`electron-builder.yml:128`).
- Windows Store: el editor se muestra como «Mind Planner Home» (`electron-builder.yml:65`).
- PWA: `short_name` «MPH» (`public/manifest.webmanifest:3`).

**M21 · Servidor y web**
- La página de error de `redes-oauth` solo existe en es/en y Supabase la sirve como texto
  (`:344-347`).
- Correos de Auth sin plantillas por idioma, y `signUp` no guarda el idioma.
- El botón de macOS de la web descarga la v1.0.3 con el nombre viejo (`web/index.html:319`).
- El pago web no pasa `selectedLocale` (`paywallWeb.ts:52`).

**M22 · Tiendas**
- Las capturas de 14 idiomas muestran eventos del calendario en inglés: «Go for a run», «Shift at…».
- Las fuentes de la ficha divergen: `msstore/textos` y `appstore/textos` ya no coinciden con sus
  generadores, y `ficha-appstore.mjs` lleva la línea de la EULA que no tiene `ficha-tienda.mjs`.

**M23 · Decisiones de producto por confirmar**
- Cómputo: la IA explica en español porque el mensaje lo arma la app (`computo/ia.ts:118,159,209`).
- Tutor de Idiomas: da por hecho un alumno hispanohablante (`idiomas/tutor.ts:27-28,72,100,181`).
- Moneda MXN fija en Finanzas y Garage.

## Prioridad BAJA

- **Unidades y abreviaturas**
  - «min», «h» y «s» fijas en unos 40 sitios: Ejercicio, Heatmap, Hobbies, Jardín, Cocina, Descanso
    («7 h 30 min»), CienPersonas y video. Ya existen claves como `nav.tiempo.min`.
  - Abreviaturas españolas: «aprox.», «v» (vueltas), «J1/J2», «ppm», «S/R».
  - «ON/OFF» fijo.
  - Cronograma: letras Su/Mo para cualquier idioma no español y «S{n}» (`metas/escala.ts:105-128`).
- **Fechas:** 42 fechas y horas usan el idioma del sistema y no el de la app
  (`toLocaleDateString(undefined…)`): ChatConversacion, Buzón, AvisosPlan, EditorCuentaSection,
  exportarTaller…
- **HUD y editor**
  - Tooltips: «Arrastra para {acción}» (`MoveControls.tsx:73`, en el HUD), «Expandir hacia N/O»
    (`GridResizer.tsx:79,88`), «Retraer techo del norte» (`TechoCeldaEditor.tsx:97,123`) y los
    tooltips de muros y puertas.
  - Editor de techo por celda: `EditorTechoCuartoSection.tsx:546-550`.
  - Letreros 3D por defecto: «TU ANUNCIO AQUÍ», «BIENVENIDOS», «MI CASA» (`especiales.tsx:997-999`).
- **Nombres por defecto que se guardan en español:** «Mi fondo», «Mi tema», «Nueva carpeta»,
  «Nuevo grupo», «Documento», «Pista 1», «Sesión de ejercicio», «Comida», «Anécdota»,
  «Sin título», «Charla», «Mis ahorros» (`db.ts:6226`), «Recurso N», «HojaN».
- **Placeholders, archivos y errores raros**
  - Placeholders: «ejemplo.com, otro.com», «MiPagina», «Náhuatl».
  - Nombres de archivo de descarga en español: mueble, corte, presupuesto, dibujo, documento…
  - Errores técnicos poco frecuentes: pagos, sync y dictado.
  - Grafo de memoria: nodos de app con nombre crudo.
- **Casos casi inalcanzables:** `room.<id>.sub` de 6 apps, el id «calendario» en la pantalla de la
  demo y `nombreCortoT` con ids de cuarto.
- **Superficies**
  - Coreano «MindHaOS을» → «를» en widgets Android/iOS.
  - Tratamiento vous/вы en los widgets fr/ru.
  - Rechazos de plugins nativos en español; el único visible es «Apple no devolvió el token».
  - Android 13 sin `localeConfig`.
  - Tratamiento mezclado en algunos `InfoPlist.strings` (fr, ru, tr, id, zh, pl, pt-PT).
  - Instalador NSIS sin hi/id.
  - `manifest` y `index.html` con un solo idioma.
  - `/mascara` siempre en español, con el título «Máscara MPH».
  - `cuenta.html` con título y meta en inglés.
  - Correo de contacto `mindplannerhome@gmail.com`.
  - Sin `hreflang` ni `sitemap`.
  - Mayúsculas turcas sin locale en las fichas.
  - Espacio tras la coma de ancho completo en las fichas ja/zh.
  - Clips del video de fábrica solo en español.
  - ru `cuenta.plan.local` = «Local».
  - Tratamiento usted/tú desigual en marketing ja/ko/hi/fr/ru.

## Demo (casa de Pep@: tutoriales «Ejemplos · demo» y capturas de tienda)

**Estado (1 oct 2026): arreglado, sin commit.** `DEMO_VERSION` sube a 41 para que las demos
guardadas se reconstruyan.
- **Rótulos de los builders:** el calendario (8 hábitos y la nota del turno), Agenda (cuidados,
  medicamentos, citas y próximos), Finanzas («Propinas»), Biblioteca, Sala y Descanso salen de
  `src/demo/textosDemo.ts`. Es un catálogo `PorIdioma` con 61 claves en los 16 idiomas, y el tipo
  exige todas. La rutina de sueño usa `descanso.rutina.nombre`, como la app.
- **Casa:** `localizarSnapshot()` traduce en memoria el `casa.json` antes de restaurarlo. Cambian
  las zonas, Laika, el coche, los letreros (en mayúsculas según el locale: «KIMS HAUS», «DENİZ’İN
  EVİ»), la alberca y el avatar, que ahora es el nombre local y no «Pep@». La carpeta vieja pasa a
  «Salud mental», como en la migración v140. El JSON sigue en español, y `descargarCasaJson` avisa
  si se exporta en otro idioma.
- **Datos iguales en es/en,** que el pipeline tomaba por estructura y nunca tradujo:
  - Relaciones de los contactos, géneros de Entretenimiento y apodos de los vehículos. Estaban en
    español también en la rama inglesa: se corrigió `demo.data.ts` a mano.
  - «Batch cooking», «Total ¥ / Total / Final» de Cómputo y, en ru/ja/zh/ko/hi/ar, los lugares
    romanizados del itinerario.
  - Todo se añadió a `traducciones/<cuarto>.<id>.json` y las ramas se regeneraron con
    `traducir-a-mano.mjs meter` (comprobado antes que regeneran idénticas). OJO: `meter cocina`
    sin `--recetas` NO es seguro, porque `traducciones/cocina.<id>.json` solo guarda las recetas.
- **Sala:** los países salen de `Intl.DisplayNames` por su ISO, y los pines usan el exónimo de cada
  idioma. Algunos idiomas cambiaron el viaje al traducir, y ahí los pines siguen al relato con su
  nombre, país y coordenadas (`ADAPTADOS`):
  - ja: el viaje grande es a México y los cortos, a Kagoshima y Nagano.
  - zh: los cortos son a Kagoshima y Nagano.
  - tr: los cortos son a Gaziantep y Ölüdeniz.
  - id: los cortos son a Yogyakarta y Dieng.
  - ko: Seúl pasa a ser Hanói.

  En los pines adaptados se quitan las fotos de la bitácora, porque son del lugar original. En
  japonés la bitácora queda sin fotos.
- **Fichas, pistas y detalles:**
  - Entretenimiento busca la carátula por el título español de la misma ficha: fuera de es/en pasa
    de ~20 a 31 fichas.
  - La Agenda lee «Laika» y la especialidad del título español, y la ficha de Laika toma la clínica
    de sus propias citas (antes eran dos clínicas distintas también en español).
  - Cocina reconoce la lista de ejemplo por su uid.
  - «M. & P. Hill».

**Verificado:** `tsc -b`, `npm run build` y el verificador. En vivo, en ja: la casa entera, Agenda,
Sala, Finanzas, Entretenimiento, Garage, Cocina, Cómputo, Biblioteca y Descanso. En de: la casa y
Sala. El barrido de texto latino en ja baja de 160 a 137. Lo que queda son nombres propios,
marcas, siglas (SF, IU, mg) y la sintaxis de Cómputo.

**Segunda pasada (1 oct 2026, sin commit, `DEMO_VERSION` 42).** Lo que el usuario vio sin traducir
y lo que quedaba:
- **El nombre de la protagonista salía «Pep@»:** la construcción grababa el avatar, los letreros y
  la historia de Laika con `tGlobal` antes de que bajara el chunk del idioma. `esperarIdioma()`
  (`core/i18n/dict.ts`) y `construir.ts` lo espera antes de la casa y de cada app perezosa.
- **«Lv» y «XP»:** `progreso.nv` por idioma y clave nueva `progreso.xp` («{n} XP») en las cinco
  barras que escribían «XP» a mano (panel de progreso, radar, menú rápido, celebración y Wrapped,
  este con `celebra.lista.xp`). Términos: de «Level · EP», it «Liv. · PE», pl «Poz. · PD», ja
  «レベル · 経験値», zh «等级 · 经验值», ko «레벨 · 경험치», ru «Ур. · опыта», hi «स्तर · अनुभव अंक»,
  ar «مستوى · نقطة خبرة»; «XP» se queda donde es lo habitual (es, en, pt, fr, nl, tr, id) y fr/nl/tr
  pasan a «Niv.», «Niv.» y «Sv.». Los tutoriales que decían «XP» se reescribieron en esos 9 idiomas.
- **Contenido** (14 agentes, uno por idioma, con `traducciones/` + `meter`; todas las ramas
  siguen saliendo idénticas de su JSON):
  - Contactos de la Agenda transliterados en ja/zh/ko/ru/hi/ar, con los `con` derivados del nombre
    (la app los enlaza por igualdad: 14 eventos enlazados en ja). Los amigos del Buzón toman su
    nombre de la Agenda (`amigosDemo.ts`) y el alias de nombre de pila parte también por «・»/«·».
  - Laika: `casa.laika.nombre` (mascota, asistente) y sus menciones en contenido y tutoriales.
  - Entretenimiento: título publicado en cada idioma y autores en su escritura (ja 「闇の左手」,
    「火星の人」, 大友克洋…); los que se publican en latino (AKIRA, PLUTO, Valve) se quedan.
  - Garage: talleres y direcciones en los 14 idiomas («Autowerkstatt Rivas», 「リバス整備工場」…).
  - «Clair de Lune» con su título local (「月の光」, 《月光》, «Лунный свет»…), también el proyecto
    de Hobbies; topónimos japoneses en árabe; «Café Mirasol» y «Hostal» donde sonaban a español.
  - Canchas: `canchas.nombre.*` en `nombreObjeto` (se guardan en español y se traducen al mostrar).
  - Animales: `nombresAnimales.ts` tiene lista por idioma, la usa la granja real al poner
    animales y la demo traduce los del snapshot por posición.
  - ru: «Наказакитё» → «Накадзакитё».

**Verificado:** `tsc -b`, `npm run build`, verificador sin errores. En vivo: en de, «Kim · Level 341»
y «2140 EP»; en ja, «ヒカル · レベル 341», «経験値 34040», contactos, amigos, Laika, animales, obras
(31 con carátula), canchas y proyectos, y el barrido de texto latino de las 22 apps solo encuentra
siglas, unidades, notación, marcas y títulos publicados en latino. En ar, avatar «نور», contactos,
amigos, talleres y obras.

**Moneda según el idioma (1 oct 2026, sin commit, `DEMO_VERSION` 43).** Ajuste «Moneda» en
Configuraciones (sección de idioma): `auto` = la de la región del dispositivo para el idioma de la app
(es-MX → MXN, es-ES → EUR, en-GB → GBP…) y, sin región, una por idioma (`MONEDA_DE_IDIOMA` en
`core/moneda.ts`). Las instalaciones que ya se usaban quedan en MXN (sus importes no se convierten);
las nuevas, en automática. Finanzas, Garage y Cocina formatean con `monedaActual()` y el locale del
idioma. La demo usa siempre la automática y convierte los importes del año (`montoDemo`, con las tasas
que ya usaban las traducciones: 45 000 MXN = ￥390 000); la meta de Japón lleva `{monto}`. El taller de
muebles conserva su moneda propia (su catálogo de precios está en pesos).

**Cierre (1 oct 2026, sin commit, `DEMO_VERSION` 44).**
- **Cifras del diario y de las gratitudes** (25 entradas y 2 gratitudes, en los 16 idiomas): llevan
  `{monto:N}`, con N en pesos, y `conMontos` (`core/moneda.ts`) las rellena en la moneda de la demo.
  Antes decían «euros» incluso en español. Comprobado en vivo:
  - es-MX: «$140 de propina», «$45,000».
  - ja: «￥1,210», «￥390,000», que cuadra con la meta.
  - de: «8 €», «2.600 €», idéntico al texto original.

  Los tutoriales de Finanzas y Garage ya no dicen «casi diez mil pesos».
- **Noticias (M18):** las 6 categorías tienen medios en los 14 idiomas, cada feed probado con CORS
  real.
  - Si el medio directo del día falla (caído o bloqueado en la región, como CNN árabe con 451 desde
    México), `cargarTitulares` prueba el siguiente de su categoría.
  - Fuera: NHK (congelado desde agosto), Corriere (2024), Mainichi, NTV y Milliyet (403 o vacíos).
    Tagesschau pasa a directo.
  - Solo con proxy (salen los días que les toca): ja economía y deportes; nl mundo, salud y
    entretenimiento.
- **Verificador (puntos ciegos 1, 2, 4 y 5):** `npm run traducir:auditar`
  (`scripts/auditar-i18n.mjs`).
  - Revisa: claves guardadas en datos, familias dinámicas contra su catálogo, `PorIdioma`
    incompletos y texto visible fuera de `t()`.
  - Resultado: 0 errores (503 claves, 200 familias). Probado rompiéndolo a propósito.
  - Las listas blancas están comentadas en el script.
- **Correos de Auth (M21):**
  - `supabase/templates/{confirmacion,recuperacion}.html`, más sus `.asunto.txt`, con una rama por
    idioma (`or .Data.idioma "es"`), enganchados en `config.toml`.
  - La app guarda el idioma en `user_metadata` también al iniciar sesión (`sesionStore`). Así le llega
    a las cuentas sociales y a las viejas.
  - **Falta pegarlos en el panel de Supabase.**
- **`redes-oauth`:** el aviso de enlace caducado sale en texto plano y en el idioma del navegador
  (16 idiomas). **Sin desplegar.**
- **Fichas (M22):** no había retoques a mano. Los textos son la salida de los generadores con la
  landing del 9 de septiembre.
  - Los generadores ahora ponen mayúsculas por idioma (turco «BİR») y una sola línea de la EULA.
  - `marketing/ficha/*.md` está regenerado.
  - `appstore/` y `msstore/` NO se regeneraron: traerían la copia nueva de la landing, y eso lo
    decide el producto.
- **Compras in-app (M20):** `docs/COMPRAS-IN-APP-IDIOMAS.md`, con nombre y descripción de los 6
  productos en 16 idiomas, dentro de los topes de Apple. Se pegan a mano en App Store Connect y Play.
- **Descartado a propósito:**
  - `localeConfig` de Android: la app elige su idioma dentro, así que sería un control muerto.
  - hi/id en NSIS: los textos son de electron-builder.
  - La hoja «Total en pesos» de Cómputo: es un ejercicio de conversión de yenes que cuadra por sí
    mismo.
  - El catálogo de ejercicios de fábrica guardado en español: se traduce al mostrarse con
    `descEjercicio`.
- **Barrido en vivo:**
  - BD demo en de: no queda más español que ese catálogo.
  - Noticias, con `cargarTitulares` real: ar, de, hi, ko, pt y tr con las 6 categorías.

**Descartado a propósito:** el portugués no tiene un problema propio de género (el contenido
español ya mezcla «preparado/preparada»), y los viajes cortos de zh a Japón están traducidos (es una
decisión de contenido).

- **Calendario:** `src/demo/anioCalendario.ts` tiene los 8 hábitos solo `{es, en}` y dos ternarios
  `idioma === 'es'`, así que se ven en **inglés** en 14 idiomas. Visto en vivo en ja y ru; sale
  también en las capturas de tienda.
- **Builders con ternario es/en**, que dejan el texto en español en 14 idiomas:
  - `agenda/demo.ts`: 21 textos (citas, medicamentos, Laika). Vistos en vivo: «Limpieza dental»,
    «Vitamina D», «Turno extra en la cafetería».
  - `sala/demo.ts`: países de los 12 pines, portadas y 2 rutas, con lugares solo en español.
    Visto: «Japón: de Tokio a Hiroshima», «Lo que sigue: Corea».
  - `descanso/demo.ts:92`: «Dormir».
  - `despacho/demo.ts`: «Propinas», unas 48 filas.
  - `biblioteca/demo.ts`: 10 descripciones.
- **Casa fija en español:**
  - Laika: historia, personalidad y saludo «Miau. ¿Ya saliste a correr hoy?» (`casaPep.ts:89-91`).
  - Las 6 zonas del croquis (`mapa/cuadrantes.ts`).
  - «Coche viejo», el rótulo 3D «CASA DE PEP@», el neón «FERIA», el cuarto «Alberca» y las canchas.
  - La instantánea `public/demo/casa.json` hace que el menú lateral diga «Pep@» y no el nombre
    local, y muestra la carpeta vieja «Memorias y salud mental», que `nombreCarpeta()` ya no reconoce.
- **Entretenimiento pierde fichas:** `entretenimiento/demo.ts:30` filtra por títulos es/en, así que
  quedan 19-20 de 34 fuera de es/en.
- **Menores**
  - Medios del video de fábrica con nombre en español.
  - `/laika/i` e `inferirEspecialidad` solo reconocen es/en.
  - `startsWith('Ejemplo:')`.
  - «M. y P. Hill».

## Puntos ciegos de `scripts/verificar-i18n.mjs`

Por eso daba 0 errores:

1. **No mira claves guardadas en datos** (`clave:`, `labelKey:`), y así pasaron A3 y A4. Habría que
   validar también esos literales con forma de clave.
2. **Familias dinámicas:** solo exige UNA clave por prefijo, y así pasaron M1c, M8 y el material
   del taller. Convendría cruzar cada familia con su catálogo. Volvió a pasar en la tanda MEDIA:
   `clima.${id}` dio por buena la familia con solo las claves `clima.err.*`.
3. **Marcadores** (arreglado en la tanda MEDIA): `RE_MARCADOR = /\{\w+\}/` no veía marcadores con
   «ñ» (`{año}`), y nadie miraba el `$` sobrante (M19). Ahora usa `[\p{L}\p{N}_]` y el `$` da error.
4. **Texto fuera de `t()`:** no hay ningún detector. Los scripts de esta auditoría (escáner AST,
   *Proxy* de `DICTS` y detector de texto latino en un idioma no latino) podrían quedar como
   `npm run traducir:auditar`.
5. **`PorIdioma` con solo es/en:** no se comprueba y cae al inglés en silencio (calendario de la demo).

## Orden sugerido

1. **Claves que faltan** (A3, A4, M1c, M8 y las notas del manual): baratas y muy visibles.
2. **Catálogos pintados en crudo:** A7-A11, M1-M5, M9-M13.
3. **Errores con código:** A1, A2 y M16.
4. **Contenido:** el manual (A6), el temario (A7), Dilemas (A13), 100 personas (M17) y la demo.
5. **Fuera de `src/`:** A14 Electron, A15 `og.png`, M20-M22.
6. **Endurecer el verificador** para que esto no vuelva.
