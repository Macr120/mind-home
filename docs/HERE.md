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

## Clave

1. Cuenta en <https://platform.here.com> → plan **Base** (250 000 transacciones/mes gratis,
   después $1 por cada 1 000; pide tarjeta al registrarse pero no cobra dentro del cupo).
2. **Access manager → Apps → Register new app** → pestaña **Credentials → API keys → Create**.
3. Pegar la clave en `.env.local` como `VITE_HERE_KEY=…` (nunca en el repo; `.env.example`
   documenta la variable). Sin ella la pestaña muestra un aviso y no llama a nada.
4. Restricciones de la clave (en la misma pantalla): limitar por **referrer** a los dominios de
   la web. OJO: el WebView de Capacitor manda origen `https://localhost` (Android) o
   `capacitor://localhost` (iOS), y el escritorio Electron `file://`; o se añaden esos orígenes
   o se usa una segunda clave para las apps nativas.

## Consumo

Una búsqueda = 1 petición intermodal (2 si hay vehículo hasta la estación) + 1 por cada modo
directo. Cada tesela del mapa y cada sugerencia del buscador también cuentan como
transacción; el buscador espera 350 ms sin teclear antes de preguntar. El consumo se ve en
**platform.here.com → Usage**.

## Cobertura

Calles y buscador: mundial. Transporte público: las ciudades que HERE tiene con horarios
(la mayoría de capitales y grandes ciudades de América Latina, Europa y Asia); donde no hay
datos, la búsqueda con transporte devuelve solo las alternativas directas.
