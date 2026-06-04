# 🏠 Mind Home

Casa isométrica 3D navegable donde cada cuarto es una mini-app 2D independiente
pero interconectada (organización, hábitos, finanzas, etc.). **10 apps en 1.**

## Stack

- **React + TypeScript + Vite** — base, un solo código para web y (futuro) móvil
- **React Three Fiber + drei** (Three.js) — casa isométrica 3D
- **Zustand** — estado global (personaje, cuarto activo)
- **Tailwind CSS v4** — estilos de las apps 2D
- **Dexie (IndexedDB)** — datos locales; migrable a Supabase sin tocar las apps
- **Capacitor** (pendiente) — empaquetado iOS/Android

## Comandos

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción
```

## Estructura

```
src/
├── core/                  # núcleo compartido (se construye 1 vez)
│   ├── house/             # escena 3D, personaje, cámara, marcadores
│   ├── data/              # capa de datos
│   │   ├── db.ts          # Dexie: ÚNICO punto que toca la BD (cambiar aquí para la nube)
│   │   └── repository.ts  # repositorios reactivos (useAll/add/update/remove)
│   ├── state/             # stores Zustand
│   ├── ui/                # HUD y overlay compartidos
│   └── registry.ts        # contrato RoomModule + lista de cuartos
├── rooms/                 # UNA CARPETA POR APP (trabajar una a la vez)
│   ├── despacho/          # ✅ Finanzas
│   └── recamara/          # ✅ Cama (Descanso) + Escritorio (Anecdotario)
└── config/                # menús Configuraciones / Diseño de casa (pendiente)
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
     categoria: 'cuerpo',
     posicion: [-3, 0, 3], // ubicación en la casa
     color: '#f59e0b',
     App: MiApp,
   }
   export default cuarto
   ```

3. Registrarlo en `src/core/registry.ts` (importar + agregar al array `rooms`).
   La casa dibuja su plataforma y botón "Entrar" automáticamente.

4. Si guarda datos: agregar la tabla en `src/core/data/db.ts` y un repo en
   `repository.ts`.

## Cuartos planificados

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
| 10 | Diario | Noticias (se actualizan cada día) | ⬜ |
| A | Configuraciones | menú | ⬜ |
| B | Diseño de casa | menú | ⬜ |

## Migración a la nube (futuro)

Toda la app habla con los **repositorios** (`repository.ts`), nunca con la BD
directa. Para sincronizar entre dispositivos, se reimplementa `db.ts` +
`repository.ts` con Supabase manteniendo las mismas firmas. Ninguna app cambia.
