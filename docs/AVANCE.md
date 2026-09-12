# Mind Planner Home (MPH) — Estado del avance

Última actualización: **septiembre 2026 (v1.0.4)**. Estado por área. La lista viva de apps y
las reglas duras están en [`CLAUDE.md`](../CLAUDE.md); aquí va qué está hecho y qué queda.

---

## Arquitectura en una frase

La **casa** (`src/core/`) es el controlador: render 3D, navegación, menú, editor de mapa y
registro de plantillas. Cada **app** (`src/rooms/<id>/`) es independiente: solo su UI 2D y los
repos de `repository.ts`. No importan `db` ni Three.js.

Los cuartos son **dinámicos** (los crea el usuario) y una app se **asigna a un objeto** de un
cuarto. No hay cuadrícula fija ni campo `posicion`: eso era el modelo de 2025.

---

## Casa (shell 3D + UI global) — ✅

| Área | Archivos clave | Estado |
|------|----------------|--------|
| Escena 3D | `house/House.tsx`, `Room3D.tsx`, `walls.ts` | ✅ |
| Objetos y recursos | `catalogo.tsx`, `modelosRecursos.tsx` (`SIEMBRA`), `especialesPlantilla.tsx` | ✅ |
| Personaje | `Character.tsx`, `movement.ts`, apariencia, guardarropa | ✅ |
| Cámara | `CameraRig`, `CameraControls`, iso + 3ª + 1ª persona (tecla V) | ✅ |
| Editor de mapa | 4 pestañas (Mapa/Personajes/Objetos/Configuraciones) + editor 3D | ✅ |
| Construcción | Pisos, muros, puertas, ventanas, techos, formas por celda, niveles y sótano | ✅ |
| Construcción libre | Modo «Libre» del constructor: muros, pisos y recintos de vértices arbitrarios (rectos o curvos), edición de vértices en croquis y 3D, puertas/ventanas por tramo, techos sobre recintos (plano, tienda, un agua, dos aguas, con los materiales de techo), y conversión de muros de rejilla y cuartos («liberar la forma») — `formasLibres` (db v137), `house/formasLibre.ts`, `house/TechoLibre3D.tsx`, `state/formaLibreStore.ts` | ✅ |
| Deshacer/rehacer | Pila por pestaña del Editor (`state/historialEditorStore.ts`): Personajes y Objetos escuchan sus stores; Mapa (`state/historialMapa.ts`) cubre la construcción de rejilla, el diseño por cuarto (pisos, techos, colores), las formas libres y los muros libres. Fuera: crecer la rejilla, quitar cuartos, zonas y accesos | ✅ |
| Actuación del avatar | Emotes y bailes en la rueda (`house/emotes*.ts`, `AvatarEmoteMapa`), asistentes que bailan y hacen ejercicio (`house/actuacion.ts`, `AsistenteActuando`, `state/actuacionStore.ts`) | ✅ |
| Enlaces y programas en objetos | Un objeto lleva una página web (`enlaceUrl`) o, en Windows, un programa del equipo (`programa`): burbuja «Visitar»/«Abrir», navegador embebido en el escritorio, visitas en `visitasWeb`. **Con la casa de fondo de pantalla un solo clic abre** la página, el programa o la app del objeto en la ventana normal (`core/abrirObjeto.ts`, canal `mph:abrir-en` con `objeto-<id>`, `mph:programa-*`) | ✅ |
| Infraestructura | Caminos, canchas, huerto, granja, paintball | ✅ |
| Temas y estilos | 7 temas + 5 estilos de postprocesado, luz/niebla/IBL | ✅ |
| Asistentes y chat | Asistentes configurables, TTS, manual de comandos, deep links | ✅ |
| Gamificación | Tamagotchi de actividad real, XP, rachas, Montaña de Sísifo, Wrapped | ✅ |
| Tutoriales | Tours con mago + spotlight: ~63 flujos (núcleo/menús sobre la casa real; apps, calendario, Hoy y progreso sobre la casa demo) | ✅ |
| i18n | ES/EN con `useT`; inglés en `dict.en.ts` con carga diferida | ✅ |
| Rendimiento | Lazy de apps, texturas optimizadas, selectores acotados en la escena | ✅ |

---

## Datos — Dexie **v137**

`db.ts` es el único punto que toca IndexedDB; las apps usan los repos de `repository.ts`.
149 tablas declaradas, 131 sincronizables.

**Sincronización opcional** (`src/core/data/sync/`, plan Pro): cada tabla lleva `&uid`, se
declara en `syncables.ts` (`TABLAS_SYNC`), y sus claves foráneas numéricas en `FK` +
`ORDEN_TOPO`. El middleware genera tombstones para los borrados.

**Respaldo** (`data/respaldo.ts` + Configuraciones › Respaldo de datos): exporta todas las
tablas menos las internas `_`. La Bodega, que antes alojaba esto, se eliminó en jul 2026.

---

## Apps — 21 de cuarto + 5 de infraestructura

La tabla viva está en [`CLAUDE.md`](../CLAUDE.md) › Cuartos. Todas registradas, abriendo y con
persistencia real; el grado de pulido «premium» varía por app.

De cuarto: Cocina, Ejercicio, Recámara (descanso), Anecdotario, Despacho, Biblioteca,
Entretenimiento, Sala, Jardín, Garage, Diario (noticias), Hobbies, Idiomas, Ideas, Agenda,
Sala de cómputo, Metas y las cuatro del **Studio** (Escritura, Arte, Audio y Video). El
calendario no es un cuarto: vive en el reloj del HUD.

De infraestructura (se construyen en el mapa, `tipo: 'infraestructura'`): Caminos, Canchas,
Huerto, Granja y Paintball.

---

## Studio de video — ✅ (sep 2026)

Editor multipista con obra y guion (`rooms/video/obra.ts`, `GuionObra`), planos con cámara
(`pelicula/efectosCamara.ts`, actores = avatar en modo escena), narración (TTS del sistema o
del proxy), grabación de pantalla de la propia app, exportación a velocidad constante con
WebCodecs/mediabunny y **publicación en redes** desde el Studio (YouTube, TikTok, Meta; Edge
Functions `redes-oauth` y `redes-publicar`, tokens cifrados). Los trámites de alta en cada
plataforma y su estado están en [`TRAMITES-REDES.md`](TRAMITES-REDES.md).

---

## Nube y monetización — ✅

Backend Supabase completo: cuenta y sesión, proxy de IA con **créditos por operación** y
reservas, RevenueCat (suscripción y recargas), sincronización solo-Pro y borrado de cuenta.
33 migraciones en `supabase/migrations/`, 9 Edge Functions activas (`alta-tienda` se retiró;
`redes-oauth` y `redes-publicar` llegaron en sep 2026). La cuenta del dueño tiene IA ilimitada
(`cuentas_ilimitadas`, BACKEND.md §3g). Detalle y runbook en [`BACKEND.md`](BACKEND.md);
tarifas y márgenes en [`COSTOS.md`](COSTOS.md).

**Web pública** (`web/`, segundo build de Vite): la raíz redirige a la app y la landing vive
en `/acerca`; `/cuenta`, términos, privacidad y soporte, todo en 16 idiomas (80 páginas).

---

## Plataformas — web ✅ · Windows ✅ · macOS ✅ · Android ✅ · iOS ✅ (proyecto, sin build)

Versión **1.1.0** en las tres fuentes (`package.json`, `versionCode 7` / `1.1.0` en Android,
`MARKETING_VERSION 1.1.0` build 3 en iOS). Estado por canal (12-sep-2026):

- **Web**: dos proyectos de Cloudflare Pages por subida manual con wrangler
  (`mindplannerhome-app` ← `dist`, `mindplannerhome` ← `dist-web`). Las dos desplegadas con
  la 1.1.0; la Edge Function `ia-chat` también (system partido para el caché).
- **Windows** (`electron/`): Microsoft Store **aceptada el 27-ago-2026** (Store ID
  `9N893LFZHR0T`, 1.0.0 publicada); el `.appx` 1.1.0 (202 MB) está construido y copiado en
  `C:\Users\macr1\mph-paquetes\` a falta de subirlo a Partner Center. El `.exe` NSIS (sin
  firmar, 146 MB) está en la release **v1.1.0 publicada** en GitHub. Modo fondo de pantalla
  con paneles y clic en los objetos. Runbook en [`ESCRITORIO.md`](ESCRITORIO.md).
- **macOS**: `.dmg`/`.zip` universales notarizados en GitHub Releases (v1.0.0–v1.0.3 del
  27-ago); la 1.1.0 se construye en el Mac con el guion de
  [`CONTEXTO-MAC.md`](CONTEXTO-MAC.md) y se sube a la release ya publicada. La landing
  enlaza el `.dmg` por nombre: cambiar en cada versión.
- **Android** (`android/`): empaquetado con widgets, deep link OAuth y build de release que
  recompila la web solo (`construirWeb`). AAB 1.1.0 (`versionCode 7`, 51 MB) construido y
  firmado con el keystore de subida, copia en `mph-paquetes\`; a falta de subirlo a Play
  Console (Play tiene el 4; el 6 de la 1.0.4 nunca se subió).
- **iOS** (`ios/`, requiere Mac): proyecto Capacitor con los 8 plugins, deep link OAuth por el
  mismo esquema `com.macr120.mindhome://oauth`, permisos traducidos a los 16 idiomas
  (`<id>.lproj/InfoPlist.strings`), icono y splash desde los SVG de la marca
  (`npm run ios:iconos`), fase de build que recompila la web en Release y los **tres widgets**
  en el target `MPHWidgets` (WidgetKit). App creada en App Store Connect (6804840611) con la
  ficha completa en 16 idiomas. **Pendiente**: archive → TestFlight (guion en
  `CONTEXTO-MAC.md`), y los gestos del titular (acuerdo de licencia, precio, revisor). Runbook
  en [`IOS.md`](IOS.md).
- **Descargas** (`core/descargarArchivo.ts`, ago 2026): el `<a download>` no
  funciona en el WebView de Capacitor —ni iOS ni Android registran gestor de
  descargas—, así que respaldo, hojas de cálculo e imágenes salen por la hoja de
  compartir (`@capacitor/filesystem` + `@capacitor/share`). En el navegador
  sigue el enlace de siempre.

---

## Casa demo — un año de Pep@ ✅

Demo completa en una **BD paralela** (`mind-home-demo`, solo lectura salvo minijuegos) con un
año de vida ficticia: maratón, −7 kg, piano, Japón en el mes 9 y el bache del mes 7. Entrada
desde Configuraciones › Tutoriales; salida con la píldora «Casa demo». Todo en `src/demo/`,
con contenido bilingüe generado por `npm run demo:texto`.

---

## Deuda conocida (sep 2026)

Lo que está identificado y sin cerrar, por orden de impacto:

0. **Lanzamiento**: los trámites de redes siguen en revisión (Google enviado el 6-sep, TikTok
   «In review», Meta con verificación de negocio reenviada; ver `TRAMITES-REDES.md`); los
   tags `v1.0.0`–`v1.0.3` apuntan a `master` (viejo), no a sus commits reales (cosmético, no
   reescribir); `dist-escritorio/` acumula ~900 MB de builds 1.0.0–1.0.3 que se pueden borrar;
   las capturas de la Store en 15 idiomas siguen siendo las inglesas.

1. **Arranque: 1 097 KB gz** en 7 archivos, repartidos en `index` (415), `three` (333) y
   `chat` (343). El siguiente candidato es el registro: los 21 `rooms/*/index.tsx` arrastran
   de forma eager sus `tutorial.ts`, `ejemplos.ts` y `demo.ts` (~156 KB gz medidos aislando
   el chunk `registry`), cuando solo hacen falta al abrir cada app.
   **Cuidado con `advancedChunks`**: no difiere nada, solo agrupa. Un grupo con un único
   módulo del grafo eager se descarga entero — así es como el grupo `editor` metía 609 KB gz
   de código común en el arranque. Verificar por los `modulepreload` de `dist/index.html`,
   nunca por el tamaño del chunk.
2. **Duplicación con sitio natural en `src/rooms/_shared/`**: `BarraEjemplo` (agenda y despacho
   sin migrar al de `_shared/ejemplos/`), `sala/fotos.tsx`, `campana.ts`, `ids.ts`, helpers de
   fecha (`hoyISO` ×9, `sumarDias` ×7) y el heatmap anual ×3.
3. **Contenido sin traducir**: HECHO (20 ago 2026, misión «catálogos 2026», ver
   `TRADUCIR.md` §16): catálogo y rutinas de Ejercicio (traducir al pintar por slug,
   `rooms/ejercicio/nombres.ts`), pilares de Biblioteca, siembras de Cocina/Garage
   (sembrar traducido + retraducción de filas intactas), preguntas de cartas, Ahorcado
   (bancos nativos) y `ComandoApp.etiqueta` (`room.*.cmd.*`). El 21-ago se cerraron los
   tres huecos que quedaban: los WIDGETS de Android (`res/values-<id>/`, que Android
   localiza por su cuenta y no viajan en el snapshot), los asistentes de fábrica
   (`asistente.*.nombre`) y el idioma objetivo del ejemplo de Idiomas. `web/cuenta` ya
   estaba en 15 idiomas. Queda solo: los alias `nombres[]` del parser del chat
   (fuera de alcance a propósito).
4. **`categoriasCardio`** no se puede borrar todavía: su lectura en el seed de Ejercicio es la
   única migración de esos datos a `gruposCardio` y solo corre al sembrar ese cuarto.
5. **Créditos**: el peor caso real de COGS es el `chat` con TOOLS_EDITOR (~$14/mes con 700
   créditos), no `texto_largo`. Ver la corrección en `COSTOS.md`. Aplicados los límites de
   entrada; pendiente medir el p95 de salida de `modelo3d` antes del 31-ago-2026, cuando
   acaba el precio introductorio de Sonnet 5.
6. **Auditoría de tutoriales (ago 2026), a medias**: se reescribieron y ampliaron los 18 tours
   de núcleo/HUD (`core/tutorial/menus.ts`, `calendario.ts`, `nucleo.ts`) — Sísifo, Wrapped,
   la lista Hoy, IA/cuenta, música, respaldo, plantillas propias, chips de enlace y el hueco
   contextual del cubo ya tienen tutorial. **Quedan sin tocar los 45 tours de `rooms/*/tutorial.ts`**
   (los 3 lotes de la auditoría original: cocina/despacho/entretenimiento/hobbies/garage/ideas,
   las pestañas con 0 pasos de biblioteca/ejercicio/idiomas/sala/agenda, y el resto de apps e
   infraestructura) — sus datos de ejemplo y su IA siguen sin mención. `tutorial.ts` + `menus.ts`
   + `calendario.ts` + `nucleo.ts` pesan ~48 KB gz sin comprimir en el bundle (eager, ver #1);
   seguirá creciendo si se completan los lotes pendientes.

**Cerrado en ago 2026**: los 49 warnings de lint (0 errores, 0 warnings), el histórico de
hábitos pausados, el `dispose()` de las geometrías de `MuroRender`, el alias `RoomModule`, la
tabla fantasma `perfilUsuario` (v107), `setRoomPisoImagen`, las cuatro tablas muertas que
viajaban por el sync, las 7 claves foráneas que el sync no traducía y el panel de respaldo,
que llevaba muerto desde la v64.
