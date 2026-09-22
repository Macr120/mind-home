# HERE: rutas, transporte público, buscador y mapa de «Cómo llegar»

La pestaña **Cómo llegar** de la sala de viajes (`src/rooms/sala/navegacion/`) usa cuatro
APIs de HERE bajo **una sola clave**, elegida porque el plan Base permite apps comerciales
(MPH se vende en tiendas) sin las condiciones «solo no comercial» de los servicios
comunitarios (Transitous, teselas de OSM/CARTO):

| Necesidad | API | Dónde se llama |
|---|---|---|
| Transporte público y combinaciones (a pie + transporte, park & ride, bike & ride) | Intermodal Routing v8 `intermodal.router.hereapi.com/v8/routes` | `here.ts` → `planificar()` |
| Auto, bici y a pie directos, con maniobras traducidas | Routing v8 `router.hereapi.com/v8/routes` | `here.ts` → `planificar()` |
| Sugerencias al escribir y nombre de un punto tocado en el mapa | Geocoding & Search v1 (`autosuggest`, `geocode`, `revgeocode`) | `here.ts` → `geocodificar()`, `nombreDeCoords()` |
| Mapa de calles (claro/oscuro, etiquetas en el idioma de la app) | Raster Tile v3 `maps.hereapi.com/v3/base/mc/…` | `config.ts` → `teselas()` (Leaflet en `MapaCalles.tsx`) |

## Registrar la app y crear la clave

1. Entrar en <https://platform.here.com> con la cuenta ya creada.
2. **Launcher** (la cuadrícula de la esquina) → **Access Manager** → pestaña **Apps** →
   **Register new app** → nombre (p. ej. «MindHaOS Web») → **Register**. Queda un *App ID*.
3. Dentro de la app: pestaña **Credentials** → **API Keys** → **Create API key** (máximo **2 claves
   por app**).
4. Pegar la clave con **`npm run here:clave`** (la pide tapada y la escribe en `.env.local`, que no
   va al repo) o `node scripts/clave-here.mjs <clave>` para pegarla en la misma línea. Después
   **reiniciar Vite**: las variables se leen al arrancar. Sin clave la pestaña muestra un aviso y no
   llama a nada.
5. **Trusted domains** (misma pantalla de Credentials): hasta **20 dominios**, con el interruptor
   *Enable trusted domains*; tarda **hasta 30 minutos** en surtir efecto. Valen formas como
   `mindhaos.com`, `https://app.mindhaos.com:443` o `http://localhost:5173`. Es la única
   restricción que ofrece la clave (no hay filtro por IP ni por *bundle id*).
6. **Un App ID por aplicación**: las condiciones del plan Base prohíben compartir un App ID entre
   aplicaciones distintas (web, móvil y servidor cuentan como distintas) y hacen responsable al
   dueño del consumo de un App ID usado sin permiso. Son **cuatro apps registradas**, una por canal,
   y la clave la elige el **build**, no el runtime: los cuatro archivos usan la misma variable
   `VITE_HERE_KEY` y `scripts/build-canal.mjs` inyecta la del canal en el build (en Vite, una
   variable real del entorno pisa a los archivos `.env`), así que cada artefacto sale con **una sola
   clave dentro** (comprobado compilando y buscando las claves en `dist`). Se hace así, y **no** con
   `vite build --mode android`, porque un modo propio dejaría fuera `.env.production` —las URLs del
   dominio y la clave de RevenueCat—, que es justo lo que el artefacto de tienda necesita. Si falta
   el archivo del canal, el build **para** con instrucciones en vez de colar la clave de la web.

   | App en el portal | Archivo | Se crea con | Lo compila | Trusted domains |
   |---|---|---|---|---|
   | MindHaOS Web | `.env.local` | `npm run here:clave` | `npm run build` (y `npm run dev`) | sí: dominios + puertos de dev |
   | MindHaOS Android | `.env.android.local` | `… --android <clave>` | `npm run build:android` (lo llama `construirWeb` de Gradle) | no: el WebView manda `https://localhost` |
   | MindHaOS iOS | `.env.ios.local` | `… --ios <clave>` | `npm run build:ios` (lo llama la fase «Compilar la web» de Xcode) | no: manda `capacitor://localhost` |
   | MindHaOS Windows | `.env.escritorio.local` | `… --windows <clave>` | `npm run build:escritorio` (lo llaman `escritorio:win/mac/preview`) | no: Electron manda `file://` |

   Los tres archivos de canal están ignorados por git (`*.local`). Si falta el archivo de un canal,
   ese build se queda con la clave de `.env.local`: no se rompe, pero el artefacto saldría con la
   clave de la web, así que conviene comprobarlo antes de publicar.

## Cupo gratis del plan Base

Revisado el **21 sep 2026** en <https://www.here.com/get-started/pricing>. El cupo es **por API y
por mes**, no un bote común, y **no hay límite diario**:

| API | Gratis al mes | Cuándo se gasta en la app |
|---|---|---|
| Raster Tile (mapa) | 30 000 | una por tesela dibujada |
| Geocode / Reverse Geocode | 30 000 | nombre del punto tocado en el mapa; búsqueda sin posición |
| Autosuggest | 5 000 | cada sugerencia del buscador (espera 350 ms sin teclear) |
| Routing (car, bicycle, pedestrian) | 30 000 | un modo directo = una petición |
| Intermodal Routing | **2 500** | 1 por búsqueda con transporte; **2** si además hay bici o auto |
| Public Transit | 5 000 | hoy no se usa (las salidas vienen del intermodal) |

El techo real lo pone **Intermodal Routing**: una búsqueda «a pie + transporte» gasta 1, y
«transporte + auto» gasta 2, así que el plan gratis da del orden de **1 250–2 500 búsquedas con
transporte al mes** (el mapa y el buscador van por su cuenta y sobran). Pasado el cupo se factura
por transacción (*pay-as-you-grow*; el enlace «Pricing details» de cada API en la página de precios
da los tramos). El consumo se ve en **platform.here.com → Usage**.

## Restricciones de uso del plan Base

<https://www.here.com/get-started/pricing/base-plan-restrictions> excluye del plan Base los casos
de uso de flota: *Asset Management* (localizar, seguir o mostrar en un mapa un «Asset» y calcularle
rutas), *UBI/telemática* y *Optimization*. «Asset» incluye «al usuario de tu aplicación» cuando se
le **gestiona activamente**, así que navegar el trayecto propio —lo que hace «Cómo llegar»— es el
uso de consumo normal del plan, pero si algún día MPH enseña la ubicación en vivo de un usuario a
otro (visitas, buzón), hay que preguntar a HERE antes.

## Nada de HERE se guarda más de 30 días

La cláusula 8 j de los *HERE Platform Terms* prohíbe «cachear o guardar fuera de la plataforma»
resultados de HERE por más de **30 días** (24 h para posicionamiento y para Japón). Por eso
`TrayectoViaje.itinerario` es **opcional**: `NavegarTab` borra el itinerario de los trayectos
guardados al cumplir los 30 días (`cacheVencida()` en `config.ts`) y los recalcula al abrirlos —de
paso los horarios salen frescos—. Lo que se conserva es lo del usuario: nombre, origen, destino y
modos. Si algún día se guardan más respuestas de HERE (sugerencias, geocodificaciones), la misma
regla aplica; guardarlas para siempre exige el producto *Permanent Geocoding*, que no entra en el
plan Base.

Compartir también está recortado por la cláusula 8 h, que prohíbe «entregar resultados o contenido
de HERE a otra persona o entidad». `textoTrayecto.ts` manda solo los **hechos** del viaje —horas,
qué línea se toma, en qué parada se baja, distancias a pie— con la atribución a HERE, y **deja
fuera las frases de maniobra**, que las redacta HERE. Quien recibe el texto ve el plan; las
indicaciones paso a paso se leen en la app, que es donde sí se pueden mostrar. Si HERE confirma que
el reparto entre usuarios finales está permitido (ver la consulta más abajo), volver a incluirlas es
descomentar un bucle.

## La clave viaja en el bundle

Cualquier `VITE_*` queda legible en el JS servido y dentro del APK (por eso Finnhub no tiene
variable y cada usuario pega su clave). Los dominios de confianza frenan el uso desde otras webs,
pero la clave de las apps nativas queda expuesta. Si el consumo se dispara, la salida es mover las
llamadas a una Edge Function de Supabase —como el proxy de IA— y dejar la clave en el servidor.

## Consulta enviada a HERE (21 sep 2026) — pendiente de respuesta

Dos dudas de interpretación que HERE tiene que confirmar. Mientras no contesten, el código va por
la lectura conservadora: el texto compartido no lleva las maniobras y el itinerario guardado caduca
a los 30 días. Canal: <https://www.here.com/contact> → *I have a developer-related or technical
question* → *Developer interest: HERE Location Services or SDKs* (pide nombre, correo, país,
empresa y teléfono, y un mensaje de hasta 2 000 caracteres).

**Enviada el 21 sep 2026** por ese formulario; HERE confirmó en pantalla («We have received your
enquiry and will be in contact shortly»). Contesta un comercial por correo, así que la respuesta
llega al buzón de la cuenta.

**Respuesta recibida:** _(pendiente — apuntarla aquí con la fecha en cuanto llegue)_

<details>
<summary>Texto enviado</summary>

```
We are building MindHaOS, a consumer app (web, Android, iOS and Windows) with an in-app journey planner for end users, built on the Base plan: Intermodal Routing v8, Routing v8, Geocoding & Search v1 and Raster Tile v3. Four apps are registered under the account of the email address above, one per channel.

Two questions about the HERE Platform Terms (effective 18 September 2023), section 8:

1) Clause 8(h), "Provide Results and/or HERE Content to another person or entity". Our app has a Share button so that an end user can send their own planned trip to a friend as plain text: origin and destination, departure and arrival times, which transit line to take, the stop to get off at, walking distances, and the attribution "Routes and timetables: HERE". We deliberately leave out HERE's turn-by-turn instruction sentences. Is this kind of end-user sharing permitted on the Base plan? If it is, may we also include HERE's maneuver instructions verbatim?

2) Clause 8(j), the 30-day caching limit. Users can save a planned trip to consult it offline. We delete the stored HERE itinerary 30 days after it was computed and recompute it when the user opens the trip again. Is that an acceptable way to comply? Does the same 30-day limit apply to a place a user saves as a favourite (title plus coordinates from Geocoding & Search), or does storing it indefinitely require Permanent Geocoding?

Thank you.
```

</details>

## Cobertura

Calles y buscador: mundial. Transporte público: las ciudades que HERE tiene con horarios
(la mayoría de capitales y grandes ciudades de América Latina, Europa y Asia); donde no hay
datos, la búsqueda con transporte devuelve solo las alternativas directas.
