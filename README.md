# 🏠 Mind Planner Home (MPH)

Casa isométrica 3D navegable donde cada cuarto es una mini-app 2D independiente
pero interconectada (organización, hábitos, finanzas, etc.). **12 apps en 1.**

## Stack

- **React + TypeScript + Vite** — base, un solo código para web y (futuro) móvil
- **React Three Fiber + drei** (Three.js) — casa isométrica 3D
- **Zustand** — estado global (personaje, cámara, cuarto activo)
- **Tailwind CSS v4** — estilos de las apps 2D
- **Dexie (IndexedDB)** — datos locales; migrable a Supabase sin tocar las apps
- **Capacitor** (pendiente) — empaquetado iOS/Android

## Comandos

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción
npm run lint     # ESLint
```

## Casa 3D y navegación

| Acción | Ratón | Táctil |
|--------|-------|--------|
| Mover personaje | Clic en el suelo (atraviesa paredes) | Joystick inferior izquierdo |
| Pan (mover vista) | Botón central + arrastrar | Dos dedos |
| Zoom | Rueda | Pellizco (juntar/separar) |
| Centrar vista | Doble clic con botón central | — |
| Entrar a un cuarto | Clic en el **mueble principal** → diálogo (p. ej. «Descansar») | Igual |
| Menú lateral | Botón **Entrar ›** en cada tarjeta | Igual |

- **🏠 MPH** (esquina superior izquierda): abre/cierra el menú de cuartos.
- **🏠** (a su derecha): alterna vista **con techo** / **sin techo** en los cuartos.
- **‹ Volver a la casa**: en la esquina superior derecha al estar dentro de una mini-app.

## Editor del mapa

- **✏️ Editar mapa** (esquina superior derecha del mapa): arrastra cuartos, personaliza colores/nombres/avatar/perfil, edita paredes y puertas.
- **⚙️ Editar** en el menú lateral: edita un cuarto (paredes, tamaño, objetos, color del mueble).
- La cámara se centra a la izquierda del panel de edición; controles de vista abajo a la izquierda (rotar, zoom, reiniciar).
- En edición las sombras se desactivan para evitar artefactos al mover objetos.

## Desarrollo (contextos)

Para no mezclar la casa 3D con las mini-apps al trabajar con IA:

- [`docs/AVANCE.md`](docs/AVANCE.md) — qué está hecho (casa + 12 apps)
- [`docs/COMO-TRABAJAR.md`](docs/COMO-TRABAJAR.md) — etiquetas `[CASA]`, `[COCINA]`, etc.

## Estructura

```
src/
├── core/
│   ├── house/             # escena 3D, cuartos, cámara, controles, muebles
│   ├── data/
│   │   ├── db.ts          # Dexie: único punto que toca la BD
│   │   └── repository.ts  # repositorios reactivos
│   ├── state/             # Zustand (casa, layout, cámara, diseño, interacción)
│   ├── ui/                # menú lateral, overlay, editor, diálogo de interacción
│   └── registry.ts        # contrato RoomModule + lista de cuartos
├── rooms/                 # una carpeta por cuarto (12 mini-apps)
│   ├── cocina/            # Nutrición
│   ├── ejercicio/         # Rutinas
│   ├── recamara/          # Sueño + anecdotario
│   ├── despacho/          # Finanzas
│   ├── biblioteca/        # Enciclopedia
│   ├── entretenimiento/   # Archivo multimedia + juegos de mesa
│   ├── sala/              # Viajes
│   ├── jardin/            # Mindfulness
│   ├── garage/            # Vehículos
│   ├── diario/            # Noticias
│   ├── bodega/            # Inventario y respaldo de datos
│   └── hobbies/           # Pasatiempos y proyectos creativos
```

## Cómo agregar un cuarto nuevo

1. Crear carpeta `src/rooms/<cuarto>/` con su `App` (componente React 2D).
2. Crear `src/rooms/<cuarto>/index.tsx` que exporte un `RoomModule`:

   ```tsx
   import type { RoomModule } from '../../core/registry'
   import { MiApp } from './MiApp'

   const cuarto: RoomModule = {
     id: 'cocina',
     nombre: 'Cocina · Nutrición',
     icon: '🍳',
     categoria: 'cuerpo',
     posicion: [-9, 0, -6],
     color: '#f59e0b',
     App: MiApp,
   }
   export default cuarto
   ```

3. Registrarlo en `src/core/registry.ts` y en `DESCRIPCIONES`.
4. Añadir el mueble en `src/core/house/muebles.ts` y `Furniture.tsx`.
5. Añadir la acción de interacción en `src/core/ui/roomInteract.ts` (p. ej. `Cocinar`).
6. Si guarda datos: tabla en `src/core/data/db.ts` + repo en `repository.ts` (nueva versión Dexie).

## Cuartos

| Cuarto | App | Interacción 3D |
|--------|-----|----------------|
| Cocina | Nutrición | Cocinar |
| Ejercicio | Rutinas | Entrenar |
| Recámara | Sueño + Anecdotario | Descansar |
| Despacho | Finanzas | Finanzas |
| Biblioteca | Enciclopedia | Estudiar |
| Entretenimiento | Multimedia + mesa | Entretenerse |
| Sala | Viajes | Planear viaje |
| Jardín | Mindfulness | Meditar |
| Garage | Vehículos | Mantenimiento |
| Diario | Noticias | Leer noticias |
| Bodega | Inventario y respaldo | Revisar bodega |
| Hobbies | Pasatiempos | Practicar |

Colores, avatar, objetos y perfil: **✏️ Editar mapa** (panel derecho), no un cuarto aparte.

## Migración a la nube (futuro)

Toda la app habla con los **repositorios** (`repository.ts`), nunca con la BD
directa. Para sincronizar entre dispositivos, se reimplementa `db.ts` +
`repository.ts` con Supabase manteniendo las mismas firmas. Ninguna app cambia.
