# Mind Home

App de una **casa isométrica 3D estilo Roblox** donde cada cuarto es una mini-app 2D
independiente pero interconectada ("10 apps en 1"). Web (Vite + React), futuro móvil
con Capacitor.

## Stack
- **React 19 + TypeScript + Vite**
- **React Three Fiber + @react-three/drei** (Three.js) para la casa 3D
- **Zustand** para estado global (`src/core/state/houseStore.ts`)
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`) para las apps 2D
- **Dexie (IndexedDB)** para datos locales — migrable a Supabase después

## Estructura
```
src/
  core/
    house/      escena 3D (House, Room3D, Character, RoomMarker, walls.ts)
    data/       db.ts (Dexie) + repository.ts (repos reactivos)
    state/      houseStore.ts (Zustand)
    ui/         HUD, RoomOverlay
    registry.ts contrato RoomModule + lista de los 12 cuartos
  rooms/<id>/   UNA CARPETA POR CUARTO (la mini-app 2D)
```

## Reglas duras (no romper)
1. **Datos**: las apps de los cuartos NUNCA importan `db` directamente. Usan los
   repositorios de `src/core/data/repository.ts` (`useAll`, `add`, `update`, `remove`).
   Para datos nuevos: agrega la tabla en `db.ts` (sube `this.version(n)`) y crea un repo.
   `db.ts` es el único punto que toca IndexedDB (para migrar a Supabase se reescribe solo ese archivo).
2. **Geometría de paredes**: `src/core/house/walls.ts` es la ÚNICA fuente. La usan
   tanto el render (`Room3D`) como las colisiones (`Character`). No dupliques esa geometría.
3. **Contrato de cuarto**: cada `src/rooms/<id>/index.tsx` exporta por defecto un
   `RoomModule` y se registra en `src/core/registry.ts`.
4. **Idioma**: todo el texto de UI y los comentarios en **español**.
5. **Estilo**: tema oscuro (fondo `#0f1115`), Tailwind utility-first, sin librerías de
   UI externas. Las gráficas se hacen con divs/SVG (sin librería de charts).

## Agregar un cuarto nuevo
1. Crear `src/rooms/<id>/MiApp.tsx` — componente React 2D con Tailwind, tema oscuro.
2. Crear `src/rooms/<id>/index.tsx` exportando un `RoomModule`:
   - `id`: único, kebab/lowercase
   - `categoria`: `'cuerpo' | 'mente' | 'complemento' | 'config'`
   - `posicion`: celda en cuadrícula 4×3 (cols x: -9 -3 3 9 · filas z: -6 0 6)
3. Registrar en `src/core/registry.ts` (reemplazar placeholder `proximo(...)` si existe).
4. Datos nuevos: tabla en `db.ts` + repo en `repository.ts`.
5. Mueble 3D: `case '<id>':` en `src/core/house/Furniture.tsx`.

## Cuartos
| # | Cuarto | App | Estado |
|---|--------|-----|--------|
| 1 | Cocina | Nutrición | ⬜ |
| 2 | Ejercicio | Rutinas | ⬜ |
| 3 | Recámara | Descanso + Anecdotario | ✅ |
| 4 | Sala entretenimiento | Películas + Juegos | ⬜ |
| 5 | Biblioteca | Aprendizaje | ⬜ |
| 6 | Despacho | Finanzas | ✅ |
| 7 | Sala | Viajes | ⬜ |
| 8 | Jardín | Mindfulness | ⬜ |
| 9 | Garage/Taller | Máquinas | ⬜ |
| 10 | Diario | **Noticias que se actualizan cada día** (NO es el anecdotario) | ⬜ |
| A | Configuraciones | menú | ⬜ |
| B | Diseño de casa | menú | ⬜ |

## Calidad "premium"
Cada cuarto debe acercarse a apps premium del mercado. Antes de construir/pulir un cuarto,
analiza qué features tiene la competencia e impleméntalas (ej. Finanzas: presupuestos,
gráficas, categorías con iconos, metas de ahorro).

## Verificación
```bash
npm run dev      # http://localhost:5173
npx tsc --noEmit # tipos
npm run build    # build de producción
```
Los tres deben pasar sin errores antes de dar por hecho un cambio.

## Notas
- iOS con Capacitor requiere Mac; desarrollo principal en Windows.
- Ver `README.md` para detalles y tabla completa.
