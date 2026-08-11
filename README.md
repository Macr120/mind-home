# 🏠 Mind Planner Home (MPH)

Casa isométrica 3D navegable donde cada cuarto es una mini-app 2D independiente pero
interconectada (organización, hábitos, finanzas, aprendizaje…). **21 apps en 1**: 16 de cuarto
y 5 de infraestructura que se construyen sobre el mapa.

## Stack

- **React 19 + TypeScript + Vite** — un solo código para web y móvil
- **React Three Fiber + drei** (Three.js) — casa isométrica 3D
- **Zustand** — estado global (personaje, cámara, mapa, diseño)
- **Tailwind CSS v4** — estilos de las apps 2D
- **Dexie (IndexedDB)** — datos locales (v106); la app funciona 100 % sin cuenta
- **Supabase** — capa opcional de nube: cuenta, IA con créditos, sincronización
- **Capacitor** — Android empaquetado (`android/`); iOS pendiente, requiere Mac

## Comandos

```bash
npm install       # instalar dependencias
npm run dev       # app en http://localhost:5173
npm run dev:web   # landing pública + /cuenta en http://localhost:5174
npm run build     # build de producción
npm run lint      # ESLint
```

Generadores de contenido (necesitan claves en `.env.local`, ver `.env.example`):
`npm run demo:texto`, `demo:imagenes`, `ejemplos:texto`, `ejemplos:imagenes`,
`imagenes:ejercicio`, `imagenes:cocina`.

## Casa 3D y navegación

| Acción | Ratón | Táctil |
|--------|-------|--------|
| Mover personaje | Clic en el suelo | Joystick inferior izquierdo |
| Cambiar de vista (iso / 3ª / 1ª persona) | Tecla **V** | Botón de vista |
| Pan (mover vista) | Botón central + arrastrar | Dos dedos |
| Zoom | Rueda | Pellizco |
| Entrar a una app | Clic en su **objeto principal** | Igual |
| Menú lateral | Botón **Entrar ›** en cada tarjeta | Igual |

- **🏠 MPH** (esquina superior izquierda): abre/cierra el menú de cuartos.
- **🏠** (a su derecha): alterna la vista **con techo** / **sin techo**.
- **‹ Volver a la casa**: esquina superior derecha, dentro de una mini-app.

## Cuartos y apps

Los cuartos son **dinámicos**: los creas tú y colocas en ellos los objetos que quieras. Una app
no ocupa un cuarto — se **asigna a un objeto**, y tocar ese objeto la abre.

| App | Para qué |
|-----|----------|
| Cocina | Nutrición: recetario, compras, dietas, control de alimentación |
| Ejercicio | Fuerza, resistencia, flexibilidad y plan de entrenamiento |
| Recámara | Descanso y sueño |
| Anecdotario | Diario personal con fotos y recuerdos |
| Despacho | Finanzas: presupuesto, metas y mercados |
| Biblioteca | Enciclopedia con árbol vivo, charlas IA y plan de estudio |
| Entretenimiento | Películas, series, libros y 22 juegos de mesa |
| Sala | Viajes: mapamundi, rutas y bitácora |
| Jardín | Meditación, respiración y agradecimientos |
| Garage | Vehículos, mantenimiento, trámites y talleres |
| Diario | Periódico del día (noticias RSS y efemérides) |
| Hobbies | Pasatiempos, proyectos y rachas |
| Idiomas | Tutor MCER, vocabulario SRS y temario |
| Ideas | Diario de ideas, mapas conceptuales y diagramas de decisión |
| Agenda | Trabajo (kanban), Salud (citas, medicamentos, mascotas) y Personas |
| Sala de cómputo | Formulario de fórmulas, calculadora con graficador y hojas de cálculo |

**Infraestructura** (se construye directo en el mapa, no ocupa cuarto): Caminos (pistas,
rieles, montañas rusas), Canchas, Huerto, Granja y Paintball.

## Editor del mapa

- **✏️ Editar mapa**: cuatro pestañas — Mapa, Personajes, Objetos y Configuraciones.
- Construye cuartos, pisos, muros, puertas, ventanas y techos; niveles apilables y sótano.
- Personaliza colores, temas, avatar y objetos; también desde el **editor 3D** en primera y
  tercera persona.
- **Respaldo de datos** (exportar / restaurar / borrar): Configuraciones › Respaldo de datos.

## Casa demo

Hay una casa de muestra completa (un año de vida de Pep@) en una **base de datos paralela**,
que sirve de escenario para los tutoriales. Se entra desde Configuraciones › Tutoriales y se
sale con la píldora «Casa demo». No toca tus datos.

## Desarrollo

- [`CLAUDE.md`](CLAUDE.md) — índice y reglas duras del proyecto
- [`docs/AVANCE.md`](docs/AVANCE.md) — estado por área
- [`docs/COMO-TRABAJAR.md`](docs/COMO-TRABAJAR.md) — cómo acotar tareas por contexto
- [`docs/BACKEND.md`](docs/BACKEND.md) y [`docs/COSTOS.md`](docs/COSTOS.md) — nube y créditos

```
src/
├── core/
│   ├── house/         escena 3D, cuartos, cámara, controles, objetos
│   ├── data/          db.ts (Dexie) + repository.ts + sync/ (Supabase)
│   ├── state/         stores Zustand
│   ├── cuenta/        sesión, créditos, paywall
│   ├── i18n/          useT + diccionarios (EN en carga diferida)
│   ├── ui/            menú, overlay, HUD, editor y planos
│   └── registry.ts    contrato `Plantilla` + lista de las 21 apps
├── rooms/<id>/        una carpeta por app (solo 2D + repos)
└── demo/              casa demo (BD paralela)
web/                   landing pública y /cuenta (segundo build de Vite)
```

## Verificación

```bash
npx tsc -b      # tipos — OJO: `--noEmit` NO valida nada (el tsconfig usa references)
npm run build
npm run lint
```
