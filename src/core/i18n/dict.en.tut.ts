import type { Dict } from './dict'

/**
 * Textos de PASO de los tutoriales en inglés. Capa aparte de `dict.en.ts`
 * porque solo hacen falta con un tour corriendo: `useTutorial.iniciar` los
 * espera junto al chunk de los pasos, así que la tarjeta nunca aparece en
 * español mientras llegan. Los títulos y resúmenes NO están aquí: los pinta el
 * selector sin abrir nada.
 */
export const EN_TUT: Dict = {
  'tut.app-computo--formulario.1.titulo': 'It hangs off the calculator',
  'tut.app-computo--formulario.1.texto':
    'The whole formula book lives in this menu, one tap from where you calculate. Mathematics, Physics and Chemistry come loaded and grouped by topic, in folders you nest as you like. Pep@ also has Physics II with its midterms, the café numbers and the running ones.',
  'tut.app-computo--formulario.2.titulo': 'It is all yours',
  'tut.app-computo--formulario.2.texto':
    'There is no “included” and “mine”: every formula opens, edits and deletes the same way. The search box at the top searches all of them.',
  'tut.app-computo--formulario.3.titulo': 'Make it your own',
  'tut.app-computo--formulario.3.texto':
    'Editing a formula lets you change its expression, rename its variables or pin a value you always use.',
  'tut.app-computo--formulario.4.texto':
    'The curve shows up between the formula and the variables, and dragging any slider moves it straight away. “Open full size” sends it to the Plot mode, and the print button pulls the whole folder into a PDF with the formulas properly typeset.',
  'tut.app-computo--calculadora.1.titulo': 'Type the operation',
  'tut.app-computo--calculadora.1.texto':
    'The result is worked out as you type. The keypad below keeps the phone keyboard out of the way, and the scientific keys no longer live there: they are in the notation palette.',
  'tut.app-computo--calculadora.2.titulo': 'The notation',
  'tut.app-computo--calculadora.2.texto':
    'Everything scientific is here and quite a bit more: pick the group — basics, calculus, matrices, trigonometry, symbols — and the buttons change. They are written wherever your cursor is and the gap is left ready to type in.',
  'tut.app-computo--calculadora.3.titulo': 'Special modes',
  'tut.app-computo--calculadora.3.texto':
    'The calculator swaps its whole view: the plotter, binary and hexadecimal, matrices, systems of equations, unit conversion, the bill with a tip and the rule of three. The history stays at the bottom in all of them.',
  'tut.app-computo--calculadora.4.titulo': 'The formula book, right there',
  'tut.app-computo--calculadora.4.texto':
    'Your formulas hang off this menu, with their variables ready to fill in: it is what makes saving them worth it.',
  'tut.app-computo--calculadora.5.titulo': 'Plotting',
  'tut.app-computo--calculadora.5.texto':
    'Everything that gets drawn goes through here, with the plot on top and the keypad below to write the functions. Drag to move, pinch to zoom and touch to read a point.',
  'tut.app-computo--calculadora.6.titulo': 'Four ways to draw',
  'tut.app-computo--calculadora.6.texto':
    'Functions of x, polar curves like this rose (r as a function of the angle), parametric ones where x and y both depend on the same parameter, and two-variable surfaces you spin with your finger.',
  'tut.app-computo--calculadora.7.titulo': 'Solving equations',
  'tut.app-computo--calculadora.7.texto':
    'Write the equation with its equals sign. If it is a polynomial you get the exact roots; if not, it searches inside the interval you are looking at and tells you which one it was.',
  'tut.app-computo--hojas.1.titulo': 'Your spreadsheets',
  'tut.app-computo--hojas.1.texto':
    'Each sheet is its own document. Pep@ has the Japan budget, the 18-week marathon plan and the Physics II grades.',
  'tut.app-computo--hojas.2.titulo': 'Starting with something',
  'tut.app-computo--hojas.2.texto':
    'The app comes with three sheets already built with their formulas — budget, weighted average and measurement log — so you never start blank. They are yours: change them or delete them.',
  'tut.app-computo--hojas.3.titulo': 'The formula bar',
  'tut.app-computo--hojas.3.texto':
    'The cell is edited up here, not in the grid: on a phone it is the only way to type without a fight. While writing a formula, touching a cell inserts its reference.',
  'tut.app-computo--hojas.4.titulo': 'Charting what you select',
  'tut.app-computo--hojas.4.texto':
    'Select a range and press the chart button: bars, lines, area, pie or scatter. The chart stores the RANGE, so it moves on its own when a number changes.',
  'tut.app-computo--hojas.5.titulo': 'Exporting',
  'tut.app-computo--hojas.5.texto':
    'Excel gets a real .xlsx with live formulas and the charts as actual Excel charts. PDF goes through the browser printer.',
  'tut.casa.1.texto': 'This is your home: each room holds an app. Let me show you the basic controls.',
  'tut.casa.2.titulo': 'The main menu',
  'tut.casa.2.texto': 'This button opens the menu: your rooms, the template catalog (apps) and the object inventory.',
  'tut.casa.3.titulo': 'Moving around',
  'tut.casa.3.texto': 'Walk with the joystick, WASD or the arrow keys. Cross a room\'s door to enter it and its app opens on its own.',
  'tut.casa.4.titulo': 'Three ways to look',
  'tut.casa.4.texto': 'Isometric, third and first person (or the V key). In 3rd/1st person a button also appears to edit the world while walking through it.',
  'tut.casa.5.titulo': 'One corner, several owners',
  'tut.casa.5.texto': 'That corner isn\'t just the view cube: get close to something interactive — a chair, a vehicle, a court — and it switches on its own to match what\'s nearby. Nothing activates without you approaching.',
  'tut.casa.6.titulo': 'The tool wheel',
  'tut.casa.6.texto': 'Moves, toys, vehicles and construction, up to 3 equipped at once. Open it here or from that same corner when you\'re empty-handed.',
  'tut.casa.7.titulo': 'The clock',
  'tut.casa.7.texto': 'The home\'s time. From here you open the full calendar and the routines panel with what you still owe today.',
  'tut.casa.8.titulo': 'The home\'s music',
  'tut.casa.8.texto': 'Each room can have its own theme, or let the home\'s general ambience play. You can turn it off entirely for silence.',
  'tut.casa.9.titulo': 'The chat',
  'tut.casa.9.texto': 'The architect\'s chat: tell it what you did and it logs it in the right app, or ask for changes to the home.',
  'tut.casa.10.texto': 'That\'s the basics. The Editor button up top opens full customization, and every menu and every app has its own ? button with its tutorial.',
  'tut.primeros.1.texto': 'First things first: how the house gets built. Everything starts in the Rooms tab.',
  'tut.primeros.2.titulo': 'Create room',
  'tut.primeros.2.texto': 'This button lets you draw new rooms on the map. To show you the rest of the way, I\'ll create one for you now…',
  'tut.primeros.3.titulo': 'Your new room',
  'tut.primeros.3.texto': 'Here it is! A brand-new room, still without an app: that\'s why its button says + Assign.',
  'tut.primeros.4.titulo': 'Assign an app',
  'tut.primeros.4.texto': 'With + Assign I gave it its app: see how the room took its name, its icon and its furniture, and its button now says Enter.',
  'tut.primeros.5.titulo': 'Enter',
  'tut.primeros.5.texto': 'We\'re in: this is the room\'s app. While walking around you also enter by crossing its door, and you leave with ‹ Back to the house.',
  'tut.primeros.6.texto': 'The room stays in your house, app and all. That is how you build the rest: one room per thing you want to keep here.',
  'tut.menu-cuartos.1.texto': 'The Rooms tab lists every room in your home, grouped by category.',
  'tut.menu-cuartos.2.titulo': 'Your summary',
  'tut.menu-cuartos.2.texto': 'Your character lives off your real activity: here you see its mood, its level and its streak. Log something in any app and it perks up; a few days with nothing and it turns sad — it never resets or punishes you.',
  'tut.menu-cuartos.3.titulo': 'The cards',
  'tut.menu-cuartos.3.texto': 'Each card is a room: its icon, name and app progress, grouped into Body, Mind, Complement and Settings. Rooms with no app assigned sit at the very end.',
  'tut.menu-cuartos.4.titulo': 'Edit',
  'tut.menu-cuartos.4.texto': 'Edit opens the room\'s editor: shape, colors, walls and objects. (Don\'t press it now: it would close this menu.)',
  'tut.menu-cuartos.5.titulo': 'Enter and Assign',
  'tut.menu-cuartos.5.texto': 'Enter opens the room\'s app. If a room has no app yet, you\'ll see + Assign there instead, to pick one from the catalog.',
  'tut.menu-cuartos.6.titulo': 'Create room',
  'tut.menu-cuartos.6.texto': 'Create room opens the map editor with the brush ready to draw the new room: shape, size and placement are all yours. On the phone the handier route is the tool wheel shortcut › Building › Rooms, which draws straight onto the map without opening the panel.',
  'tut.menu-cuartos.7.texto': 'In short: Edit to customize, Enter to use the app. The other tabs in this menu have their own tutorial.',
  'tut.menu-plantillas.1.texto': 'A template is an app (Kitchen, Exercise, Finance…). It\'s assigned to an object in a room and opens when you enter.',
  'tut.menu-plantillas.2.titulo': 'Two views',
  'tut.menu-plantillas.2.texto': 'Rooms are the usual apps, each in its own object. Infrastructure is different: tracks, courts, the garden, the farm or paintball get built straight on the terrain, without taking up a room.',
  'tut.menu-plantillas.3.titulo': 'The catalog',
  'tut.menu-plantillas.3.texto': 'Built-in apps and your own, organized in groups. Tap one to assign it to a room or, under Infrastructure, to build it on the map.',
  'tut.menu-plantillas.4.titulo': 'Your own templates',
  'tut.menu-plantillas.4.texto': 'Create your own templates from blocks: notes, checklists, counters, habits, galleries… This button opens its own editor with its own tutorial.',
  'tut.menu-plantillas.5.texto': 'A single room can hold several apps: entering shows a launcher to pick which one to open.',
  'tut.plantillas-custom.1.texto': 'This editor builds an app of your own from scratch: shape it with a name, emoji and blocks, and it lands in the catalog next to the built-in ones.',
  'tut.plantillas-custom.2.titulo': 'Name, emoji and color',
  'tut.plantillas-custom.2.texto': 'What it\'s called and what color it paints in the menu, the catalog and the calendar if you schedule something of its own.',
  'tut.plantillas-custom.3.titulo': 'The tools',
  'tut.plantillas-custom.3.texto': 'Twelve block types: notes, checklist, counter, habit, sessions, countdown, gallery, log, rating, progress, list and links. Every one you add becomes a section of your app.',
  'tut.plantillas-custom.4.titulo': 'Order matters',
  'tut.plantillas-custom.4.texto':
    'Added blocks reorder with the arrows and remove with the ✕ — removing one deletes its data on save, so double-check before confirming. The “Menu” dropdown moves them from one tab to another without losing anything.',
  'tut.plantillas-custom.5.titulo': 'Save',
  'tut.plantillas-custom.5.texto': 'With a name and at least one block, Save drops it into the catalog, ready. From there it\'s assigned to an object just like any built-in template.',
  'tut.plantillas-custom.6.texto': 'You can edit it again anytime: its blocks and data stay put, only what you change actually changes.',
  'tut.menu-inventario.1.texto': 'The inventory: every object you can place in your home, ready to drag.',
  'tut.menu-inventario.2.titulo': 'Objects',
  'tut.menu-inventario.2.texto': 'Your object library, by categories and folders. You can rename and organize them to find them fast next time.',
  'tut.menu-inventario.3.titulo': 'Special objects',
  'tut.menu-inventario.3.texto': 'The ones that do something, not just decorate: rideable vehicles, toy blasters, fountains, playground rides and lights.',
  'tut.menu-inventario.4.titulo': 'Placing',
  'tut.menu-inventario.4.texto': 'With this menu open, drag a thumbnail straight into the 3D scene to place it wherever you like.',
  'tut.menu-inventario.5.texto': 'To move, paint or delete what\'s already placed, use the Editor (Objects tab) — this menu is only for bringing new things into the scene.',
  'tut.editor-mapa.1.texto': 'The home editor has 4 tabs: Map, Characters, Objects and Settings. This tour is the Map one; the other three have their own.',
  'tut.editor-mapa.2.titulo': 'The blueprint',
  'tut.editor-mapa.2.texto': 'You draw on a top-down grid: rooms, walls, doors, windows and floors, with the modes and brushes in the top bar. What you trace shows up in 3D instantly, no reload needed.',
  'tut.editor-mapa.3.texto': 'Roofs are per cell: each one can have its own shape or material, so a single room can mix different roof pitches instead of one flat roof.',
  'tut.editor-mapa.4.texto': 'The home also has levels: stackable floors going up and a basement going down. Every new level is born with its own way up —a staircase or a gap in the slab— that cuts through the floor above.',
  'tut.editor-mapa.5.titulo': 'Done',
  'tut.editor-mapa.5.texto': 'Everything saves itself as you edit. Done closes the editor and returns you to the game with the home just as you left it.',
  'tut.editor-personajes.1.texto': 'Your main character and your assistants live in the same editor: pick who to edit up top, and the tools change to fit what makes sense for each.',
  'tut.editor-personajes.2.titulo': 'Face and photo',
  'tut.editor-personajes.2.texto': 'Expression, hairstyle and hair color, or straight-up a photo of you so the character looks like you. Not every body supports a custom face.',
  'tut.editor-personajes.3.titulo': 'Clothes by category',
  'tut.editor-personajes.3.texto': 'Every piece goes on, comes off and changes color on its own: shirt, pants, footwear, accessories. They combine freely.',
  'tut.editor-personajes.4.titulo': 'Saved outfits',
  'tut.editor-personajes.4.texto': 'Save a full clothing combo as an outfit and switch your whole look with one tap, instead of rebuilding it piece by piece every time.',
  'tut.editor-personajes.5.titulo': 'Wardrobe by room',
  'tut.editor-personajes.5.texto': 'Assign a different outfit to each room: your avatar walks into Exercise dressed to run and switches on its own when it steps into the kitchen.',
  'tut.editor-personajes.6.texto': 'Body, color and size edit the same as always; with AI enabled you can also generate your own 3D model instead of picking one of the presets.',
  'tut.editor-objetos.1.texto': 'Tap an object in the scene (or the list) to edit it: color, size and rotation are the three settings every object shares.',
  'tut.editor-objetos.2.texto': 'Objects with an app assigned open their template when you enter the room; the rest are just decoration — both edit the same way.',
  'tut.editor-objetos.3.texto': 'The ⚙️ gear on an object turns it into a piece-by-piece editable model: build your own by combining basic shapes, or ask the AI for one by describing it.',
  'tut.editor-config.1.texto': 'Eight collapsible sections, not one long list: tap a title to open only the one you care about.',
  'tut.editor-config.2.titulo': 'Account and AI',
  'tut.editor-config.2.texto': 'Sign in, your plan and how much AI you\'ve used this month; right next to it, the price table for every operation. Both have their own detailed tutorial.',
  'tut.editor-config.3.titulo': 'Visual style',
  'tut.editor-config.3.texto': 'The map\'s theme (light, fog, lighting) and the postprocessing styles, all loaded on demand so they don\'t add weight upfront.',
  'tut.editor-config.4.titulo': 'Interface and language',
  'tut.editor-config.4.texto': 'Language, interface theme (light/dark/automatic), icon style and density — everything that changes HOW the home looks, not what it holds.',
  'tut.editor-config.5.titulo': 'Notifications',
  'tut.editor-config.5.texto': 'Which alerts arrive and which stay quiet: routines, plan reminders and notices can each be turned off separately.',
  'tut.editor-config.6.texto': 'Music and Tutorials have their own walkthrough; so does Data backup, and it\'s the one most worth checking before switching devices.',
  'tut.respaldo.1.titulo': 'Where your home lives',
  'tut.respaldo.1.texto': 'Without an account or sync, your data lives only on this device. The notice above says whether the browser has permission to protect it from an automatic cleanup.',
  'tut.respaldo.2.titulo': 'Export',
  'tut.respaldo.2.texto': 'Downloads a single JSON file with every table: rooms, goals, logs, everything. It\'s your manual backup copy.',
  'tut.respaldo.3.titulo': 'Restore',
  'tut.respaldo.3.texto': 'Restoring REPLACES all current data with the file\'s — it asks for confirmation first and shows how many records it carries, so there are no surprises.',
  'tut.respaldo.4.texto': 'Worth backing up before switching devices, changing browsers, or just now and then: it\'s the only copy you have without an account.',
  'tut.editor-cuarto.1.texto': 'You\'re editing a specific room: the blueprint and the camera focus on it, not the whole home.',
  'tut.editor-cuarto.2.titulo': 'What you can edit',
  'tut.editor-cuarto.2.texto': 'Shape, floor, walls, doors, color and name of the room, and its objects. The assigned app also changes from here: it\'s what brings most people to this panel.',
  'tut.editor-cuarto.3.titulo': 'Back to the map',
  'tut.editor-cuarto.3.texto': 'This arrow returns to the full map without closing the editor, so you can keep working on another room.',
  'tut.editor-cuarto.4.texto': 'There\'s also a floating "Exit room" button over the room itself in 3D, in case you\'d rather tap it there.',
  'tut.herramientas.1.texto': 'This button opens your character\'s tool wheel.',
  'tut.herramientas.2.titulo': 'Two levels',
  'tut.herramientas.2.texto': 'First pick a category, then the specific tool inside it. You can equip up to 3 tools at once, from the same category or different ones.',
  'tut.herramientas.3.titulo': 'The fourth category',
  'tut.herramientas.3.texto': 'Construction doesn\'t equip a toy: it turns on the map\'s drawing mode (rooms, walls, doors, windows, floors, roofs) without going through the full editor. Same blueprint, just a faster way in.',
  'tut.herramientas.4.titulo': 'The center',
  'tut.herramientas.4.texto': 'The center drops everything equipped and returns the corner control to normal (the view cube or another contextual one, depending on what\'s nearby).',
  'tut.herramientas.5.texto': 'It closes by tapping outside the wheel. Try it whenever you like: none of this is saved as permanent, it only lasts while you\'re wearing it.',
  'tut.navegacion.1.texto': 'Three cameras: Iso (dollhouse view), 3rd and 1st person. Switch here or with the V key.',
  'tut.navegacion.2.titulo': 'Orienting',
  'tut.navegacion.2.texto': 'In iso, the cube turns the camera by faces; in 3rd/1st, drag the pad to look around.',
  'tut.navegacion.3.titulo': 'When something\'s nearby',
  'tut.navegacion.3.texto': 'That same corner stops being a camera control once you approach something interactive: a court offers its play button, a vehicle its mount button, a chair its sit button. Only one thing at a time, always by proximity — never automatic.',
  'tut.navegacion.4.titulo': 'Rotate and center',
  'tut.navegacion.4.texto': 'Rotate the view sideways or center it back on the map if you wandered off exploring.',
  'tut.navegacion.5.titulo': 'Moving',
  'tut.navegacion.5.texto': 'Walk with the joystick, WASD or the arrows. In water you swim; on a mounted vehicle, you drive with the same controls.',
  'tut.navegacion.6.texto': 'In 3rd/1st person the 3D Editor button appears: touch objects, walls or characters to edit them right where they are, without switching to isometric view.',
  'tut.chat.1.texto': 'The architect\'s chat: log your day, edit the home and get your questions answered, all from the same box.',
  'tut.chat.2.titulo': 'Writing',
  'tut.chat.2.texto': 'Write freely: "ran 20 min", "spent 250 on groceries"… The chip next to it shows which app it will go to. Use @room to force a destination if it guesses wrong.',
  'tut.chat.3.titulo': 'Dictate by voice',
  'tut.chat.3.texto': 'The microphone transcribes what you say into the text box — handy for logging without letting go of what\'s in your hands.',
  'tut.chat.4.titulo': 'Send a photo',
  'tut.chat.4.texto': 'With AI on, a photo of the receipt, the dish or the scale gets read on its own. Without AI, this button stays disabled.',
  'tut.chat.5.titulo': 'Assistants',
  'tut.chat.5.texto': 'Your assistant gives the replies a face and a voice. Tap it to see the conversation, switch assistants or create more.',
  'tut.chat.6.titulo': 'The manual',
  'tut.chat.6.texto': 'The manual lists the commands: add or remove rooms, create objects, remember things…',
  'tut.chat.7.titulo': 'The AI model',
  'tut.chat.7.texto': 'This icon picks which AI answers and stores your key if you use your own. With none configured, the chat still works by keyword matching, without understanding free language.',
  'tut.chat.8.texto': 'You can also ask "how does the kitchen work?" or request "exercise tutorial" right here, and what got saved is covered in the Records tour.',
  'tut.chat-registros.1.texto': 'Chats shows who you talked to; Records shows what got saved from those conversations.',
  'tut.chat-registros.2.titulo': 'What it remembers about you',
  'tut.chat-registros.2.texto': 'Details the assistant decided were worth remembering between sessions —an allergy, a goal, a preference— so it doesn\'t ask again. Forget one by tapping its ✕.',
  'tut.chat-registros.3.texto': 'What you logged in your apps (meals, expenses, sessions) lives in each app, not here: this tab is only the memory of the conversation itself.',
  'tut.app-generica.1.texto': 'The header shows the room and the open app. If the room holds several apps, the ‹ arrow returns to the launcher.',
  'tut.app-generica.2.titulo': "Today's steps",
  'tut.app-generica.2.texto':
    'Your steps for today in this app: your targets, whatever you scheduled and whatever your goals ask for. Tap to unfold it — each step crosses itself off as soon as you log.',
  'tut.app-generica.3.titulo': 'The blocks',
  'tut.app-generica.3.texto': 'This template is built from blocks (notes, lists, counters, habits…). You can change them in Menu › Templates › edit.',
  'tut.app-generica.4.titulo': 'Leaving',
  'tut.app-generica.4.texto': '"Back to the house" closes the app and returns you to 3D. Whatever you logged here is already saved.',
  'tut.rutinas.1.texto': 'Pep@\'s routines panel: today\'s stuff on top, the full catalog below to pause, edit or delete.',
  'tut.rutinas.2.titulo': 'What\'s due today',
  'tut.rutinas.2.texto': 'The cafeteria shift, the physics class, the morning run, piano at night: every card is a routine with its steps. The one spilling over in amber is the one that should already be underway and is still pending.',
  'tut.rutinas.3.titulo': 'Checking it off isn\'t always needed',
  'tut.rutinas.3.texto': 'The step with the ⚡ bolt logs itself: the morning run crosses off because that run is already saved in Exercise, not because someone checked it by hand. The rest of the steps do need a tap.',
  'tut.rutinas.4.titulo': 'The full catalog',
  'tut.rutinas.4.texto': 'Every routine is here, due today or not. ON/OFF pauses a routine without erasing its history: what\'s done up to today stays, and from tomorrow it stops being asked for. Edit and ✕ change or delete the whole routine.',
  'tut.rutinas.5.titulo': 'Creating a routine',
  'tut.rutinas.5.texto': 'Name, the app it belongs to (or none, for a loose home event), schedule and color. Steps are optional: without them it\'s just an event on the calendar.',
  'tut.rutinas.6.titulo': 'Once, every week or forever',
  'tut.rutinas.6.texto': 'Piano is indefinite with no days marked (every day); running only repeats on the days Pep@ marked. Monthly, yearly or range repeats aren\'t chosen here: they come from tracing the goal straight onto the calendar grid.',
  'tut.rutinas.7.titulo': 'The reminder at its time',
  'tut.rutinas.7.texto': 'With permission granted it arrives as a system notification; if not, the assistant says it inside the app next time you open it.',
  'tut.rutinas.8.texto': 'Everything scheduled here also shows up on the calendar grid and, in each step\'s app, on its Today list.',
  'tut.enlaces.1.titulo': 'From the goal to its app',
  'tut.enlaces.1.texto': 'Any goal or plan step can carry a chip with an app\'s icon: it answers "and where does this get logged?".',
  'tut.enlaces.2.titulo': 'Set it or change it',
  'tut.enlaces.2.texto': 'Link app opens the selector: first you pick the app, then which part of it, if it has more than one place to log.',
  'tut.enlaces.3.titulo': 'The chip once it\'s set',
  'tut.enlaces.3.texto': 'With the chip in place, tapping it opens that app straight to that section. Removing it doesn\'t delete the goal or its dates: it just drops the link.',
  'tut.enlaces.4.texto': 'Only apps assigned to an object in a room show up as a destination: linking to one with no room would be a chip that leads nowhere.',
  'tut.musica.1.texto': 'This button opens the home\'s music control.',
  'tut.musica.2.titulo': 'On or off',
  'tut.musica.2.texto': 'One switch for all the home\'s ambient music. Off, the home stays silent except for the sounds of specific actions.',
  'tut.musica.3.titulo': 'Theme per room',
  'tut.musica.3.texto': 'Each room can sound different: automatic based on its app, one you pick by hand, or total silence in that room without touching the rest of the home.',
  'tut.musica.4.titulo': 'Where the sound comes from',
  'tut.musica.4.texto': 'Generated (composes on its own to match the mood), My tracks (whatever you uploaded) or System (whatever you\'re already playing outside the app, without being overridden).',
  'tut.musica.5.titulo': 'Separate volumes',
  'tut.musica.5.texto': 'Music and action sounds (footsteps, clicks, achievements) adjust separately — you can lower the music and keep the effects, or the other way around.',
  'tut.musica.6.texto': 'The HUD button can be removed from the main screen; it\'s still available in Editor › Settings › Music.',
  'tut.cuenta-ia.1.texto': 'This is where the home\'s AI turns on: without it, the chat still works by keyword, and features like generating a recipe, a plan or an image stay off.',
  'tut.cuenta-ia.2.titulo': 'With or without an account',
  'tut.cuenta-ia.2.texto': 'You can use AI with your own provider key (no account, no credits) or with an account that comes with credits and syncs across devices.',
  'tut.cuenta-ia.3.titulo': 'AI pricing',
  'tut.cuenta-ia.3.texto': 'This table is informative even without an account: it\'s exactly what you need to decide if it\'s worth it. Shown room by room, operation by operation.',
  'tut.cuenta-ia.4.titulo': 'The one lever',
  'tut.cuenta-ia.4.texto': 'Image quality is the only thing that changes the whole table\'s pricing: Fast is good and cheap (the default); Good gives more detail and better text inside the image.',
  'tut.cuenta-ia.5.titulo': 'One unit, many operations',
  'tut.cuenta-ia.5.texto': 'A reply costs 1 credit, a long plan 4, an image or a 3D model 10 — the rule is the same across every room, this table just unpacks it one by one.',
  'tut.ejemplos.1.texto': 'This bar shows up in almost every app while it still has none of your own data: a button to see it full of example content instead of starting on an empty screen.',
  'tut.ejemplos.2.texto': 'Viewing an example doesn\'t delete or mix in anything of yours: it\'s its own rows, marked as example, hidden (not deleted) when you turn it off. Turning it back on brings them back exactly as they were.',
  'tut.ejemplos.3.texto': 'Inside the demo home this bar doesn\'t appear: Pep@\'s whole year already plays that role, so there\'s no need for a separate example.',
  'tut.hoy.1.texto': 'In every app\'s header, next to the music button, lives its daily checklist chip: it only carries the day\'s count and it\'s born closed, so it doesn\'t eat up the screen.',
  'tut.hoy.2.titulo': 'Three sources, one list',
  'tut.hoy.2.texto': 'The app\'s own targets (water, calories), what you scheduled for today in the calendar, and the steps from your active goals: all together, grouped under the plan or the goal each step comes from.',
  'tut.hoy.3.titulo': 'It crosses off because the data exists',
  'tut.hoy.3.texto': 'The row\'s button logs the REAL data in the app — a glass of water, a meal — and the step crosses itself off simply because that record now exists, not because anyone marked it. Tapping it again once done doesn\'t duplicate anything: the button disappears.',
  'tut.hoy.4.titulo': 'Your number for each day',
  'tut.hoy.4.texto': 'Steps with an adjustable count change it right here. Setting it to 0 turns off that day\'s target without erasing the history of previous days.',
  'tut.hoy.5.titulo': 'From a target to a routine',
  'tut.hoy.5.texto': 'The calendar schedules that same target with a fixed time: it opens the same editor as the clock\'s routines, so it ends up logged in both places at once.',
  'tut.hoy.6.titulo': 'Done doesn\'t disappear',
  'tut.hoy.6.texto': 'It drops down to "Done", collapsed: seeing the log take effect is part of the reward, and you can undo it from there if one slipped in by mistake.',
  'tut.hoy.7.texto': 'And if something\'s missing, «New checklist» creates your own: a list of this app\'s that repeats every day. At the foot of the panel you hide what\'s finished or turn the whole checklist off in the apps where you don\'t want it.',
  'tut.progreso.1.texto': 'Your character\'s card: Pep@ has a whole year of real activity behind them, so every number here has a real story explaining it.',
  'tut.progreso.2.titulo': 'The character',
  'tut.progreso.2.texto': 'Tapping it opens the character editor. Its mood —happy, content, sad or asleep— rises with every new log and only drops if days pass with none; it never resets all at once.',
  'tut.progreso.3.titulo': 'The Sisyphus rank',
  'tut.progreso.3.texto': 'Twelve ranks of ascent: every day with activity climbs one step out of 365. Pep@ has already earned several ranks; tap it to see the whole mountain.',
  'tut.progreso.4.titulo': 'Steps and grace days',
  'tut.progreso.4.texto': 'Every 7 steps earns a badge, every stretch of weeks climbs the rank. Missing a day breaks nothing: there are 2 grace days a month before slipping back to the start of the current rank.',
  'tut.progreso.5.titulo': '52 badges by family',
  'tut.progreso.5.texto': 'Grouped by geological family, kept a mystery until earned: no name or description shows until you unlock one.',
  'tut.progreso.6.titulo': 'Your recap',
  'tut.progreso.6.texto': 'Wrapped builds the recap of your week, month or year in slides — it has its own tour, with plenty of data in a year like Pep@\'s.',
  'tut.progreso.7.titulo': 'The radar by room',
  'tut.progreso.7.texto': 'Every vertex is a room in the home, and its size is the sum of XP from the apps assigned to it. A room with no activity shows at a glance: its vertex sinks toward the center.',
  'tut.wrapped.1.texto': 'Stories-style: tap the right side to move forward, the left to go back, and hold to pause on a slide.',
  'tut.wrapped.2.titulo': 'Week, month or year',
  'tut.wrapped.2.texto': 'Each type builds its own slides with its own data — Pep@\'s yearly recap is the longest, with the highest and lowest moments of the whole year.',
  'tut.wrapped.3.titulo': 'Moving through periods',
  'tut.wrapped.3.texto': 'The ‹ › arrows move through periods that already closed: you can\'t go past today, so you\'re always comparing against something real.',
  'tut.wrapped.4.titulo': 'Sharing a slide',
  'tut.wrapped.4.texto': 'Copies the text of the slide you\'re looking at, ready to paste anywhere — no screenshots needed.',
  'tut.wrapped.5.texto': 'A dot next to the button that opens it warns when there\'s a new recap you haven\'t seen; opening it turns the dot off.',
  'tut.infra-huerto--ciclo.8.texto':
    "This is Pep@'s sanctuary: the pens on one side and, on the other, the garden that feeds them. Let's head to the plots.",
  'tut.infra-huerto--ciclo.1.texto':
    "This is the sanctuary garden of Pep@: real plots with a year of work on them. None of this is an example — it is alive, grows in real time and you can touch it.",
  'tut.infra-huerto--ciclo.2.texto':
    'Food and Farm share one editor: what you harvest here fills the pantry of the animals next door. It is a single chain.',
  'tut.infra-huerto--ciclo.3.titulo': 'Watering rules',
  'tut.infra-huerto--ciclo.3.texto':
    'Look at the plots: a fresh seed, plants half grown, a sunflower ready… and a carrot Pep@ left to wither on purpose. The blue drop warns of thirst; withered crops cannot be saved.',
  'tut.infra-huerto--ciclo.4.titulo': 'Automatic watering',
  'tut.infra-huerto--ciclo.4.texto':
    'The tomato has a sprinkler: it waters its cell and the eight neighbors forever. That is how you leave the garden alone without losing anything.',
  'tut.infra-huerto--ciclo.5.titulo': 'Harvest',
  'tut.infra-huerto--ciclo.5.texto':
    'The sunflower is ready: one tap and into the basket. You can also harvest by walking over whatever is ready, without opening this editor.',
  'tut.infra-huerto--ciclo.6.titulo': 'A year in the basket',
  'tut.infra-huerto--ciclo.6.texto':
    'Each plot keeps its harvest count and the basket holds the whole year — over 400 pieces. This is what the sanctuary animals eat.',
  'tut.infra-huerto--ciclo.7.texto':
    'Everything keeps running when you leave. In the demo you can water, harvest and plant for real: try it before you go.',
  'tut.infra-huerto--parcelas.1.titulo': 'Soil first',
  'tut.infra-huerto--parcelas.1.texto':
    'With Plot you tap a map cell and it becomes ready soil. The sanctuary has two empty plots waiting for you.',
  'tut.infra-huerto--parcelas.2.titulo': 'Pick what to plant',
  'tut.infra-huerto--parcelas.2.texto':
    'Six species, and under each one how long it takes and how often it asks for water: the carrot in 3 minutes, the pumpkin in 2 hours.',
  'tut.infra-huerto--parcelas.3.titulo': 'The fast one',
  'tut.infra-huerto--parcelas.3.texto':
    'To see the full cycle today, plant a carrot in a free plot: it will be ready before you finish your stroll.',
  'tut.infra-huerto--parcelas.4.titulo': 'Undo',
  'tut.infra-huerto--parcelas.4.texto':
    'Remove works one layer at a time on the same cell: first the plant, then the sprinkler, finally the plot.',
  'tut.infra-huerto--parcelas.5.texto':
    'That is the whole trade: soil, species and patience. Whatever you plant in the demo really grows while you explore.',
  'tut.infra-granja--cuidar.8.texto':
    "This is Pep@'s sanctuary: the pens of the rescues and, to the south, the garden they eat from. Let's go down with them.",
  'tut.infra-granja--cuidar.1.texto':
    "These are Pep@'s rescues: each with a name, hunger and mood running in real time. Nothing is an example — you can truly care for them.",
  'tut.infra-granja--cuidar.2.titulo': "The year's pantry",
  'tut.infra-granja--cuidar.2.texto':
    'Feeding takes from the basket, and the basket fills by harvesting the garden next door. Pep@ left a year of reserves: use them.',
  'tut.infra-granja--cuidar.3.titulo': 'Feed',
  'tut.infra-granja--cuidar.3.texto':
    'One tap on the pen feeds everyone who is hungry, hungriest first. The hen asks every 4 hours; the cow lasts 12.',
  'tut.infra-granja--cuidar.4.titulo': 'Pet',
  'tut.infra-granja--cuidar.4.texto':
    'Six hours without affection and they get bored (twice as fast in a dirty pen). One tap pets the whole pen.',
  'tut.infra-granja--cuidar.5.titulo': 'The dirty pen',
  'tut.infra-granja--cuidar.5.texto':
    'The small pen has gone eight days without cleaning — you can tell by the straw. Tap it with Clean and leave it like new: the demo allows it.',
  'tut.infra-granja--cuidar.6.titulo': 'The newcomer',
  'tut.infra-granja--cuidar.6.texto':
    'The pig arrived sick this morning. A sick animal stops eating and only Heal brings it back — it has a week before it is too late. Heal it yourself.',
  'tut.infra-granja--cuidar.7.texto':
    'For day to day you do not need this editor: walk next to a pen and its bubble shows Feed and Pet, and you can also ask me in chat.',
  'tut.infra-granja--corrales.1.titulo': 'The pen',
  'tut.infra-granja--corrales.1.texto':
    'Tap a free cell and a 1×1 pen is born; tap an adjacent one and it stretches. Three animals fit per cell: see the two sanctuary pens, a big grazing one and a small one for birds.',
  'tut.infra-granja--corrales.2.titulo': 'The species',
  'tut.infra-granja--corrales.2.texto':
    'Six species, each with its hunger window. Tap inside a pen with room and it appears, name included.',
  'tut.infra-granja--corrales.3.titulo': 'Toys',
  'tut.infra-granja--corrales.3.texto':
    'Mud, tub and ball, one per cell: animals go on their own and playing lifts their mood. The sanctuary already has all three.',
  'tut.infra-granja--corrales.4.titulo': 'Names',
  'tut.infra-granja--corrales.4.texto':
    'With Name you tap a pen and see its list with the used capacity; tap an animal to rename it.',
  'tut.infra-granja--corrales.5.texto':
    'That is the whole craft: pen, capacity, toys and affection. In the demo you can even expand the sanctuary.',
  'tut.infra-caminos--carrera.1.texto':
    "This is Pep@'s track: an asphalt oval with a checkered finish line. It is the only finish line on the map — the whole race mode revolves around it.",
  'tut.infra-caminos--carrera.2.texto':
    'There is the finish line. Walk up to the bike or the car in the yard and mount with its button; with the vehicle on, cross this line and the traffic light appears.',
  'tut.infra-caminos--carrera.3.texto':
    'Hug the oval and drift the corners to keep your speed. You can also race an assistant, items included: banana, turbo and bomb.',
  'tut.infra-caminos--carrera.4.texto':
    "Next to the line lives the time table: Pep@'s bike holds 38 wins and a 41.8 s best lap. Beat it — records you set in the demo are saved.",
  'tut.infra-caminos--carrera.5.texto':
    'The rail circling the map and the fair coaster are paths too: walk onto the track and "Ride" appears. Each stroke is its own network.',
  'tut.infra-caminos--trazos.1.texto':
    'There are three strokes, and from up here you can see all three: track (racing), rail (the train circling the map) and coaster (the roller coaster, with heights per cell). They never mix even when touching: each looks for neighbors of its own kind.',
  'tut.infra-caminos--trazos.2.texto':
    'The fair coaster climbs up to six levels and the ramps between cells interpolate on their own. Hop on: the cart runs the closed circuit.',
  'tut.infra-caminos--trazos.3.texto':
    'In your own home you draw them cell by cell with the Circuits editor, or freehand with sector-based free drawing. Here in the demo the map comes pre-drawn.',
  'tut.infra-canchas--jugar.1.texto':
    "This is Pep@'s sports complex: football, basketball, tennis and baseball, side by side. Each court is a rectangle on the map — walking into it starts its game.",
  'tut.infra-canchas--jugar.2.texto':
    'The charge button appears in the navigation-cube slot and shoots where your character faces: aim first, charge after.',
  'tut.infra-canchas--jugar.3.texto':
    'Below, the baseball field and the tennis court: tennis has rebound and rallies, and baseball is pure batting, against machine or pitcher.',
  'tut.infra-canchas--jugar.5.texto':
    'Up top, the football and basketball courts. Football plays with dribbling and shooting; basketball, by measuring the power of your shot.',
  'tut.infra-canchas--jugar.4.texto':
    'The scoreboard is saved per court: Pep@ left a 21-15 in basketball and an 18-rally streak in tennis. Demo matches count — top them.',
  'tut.infra-paintball--batalla.1.texto':
    'Open the tools wheel: Paintball lives there, in the building-and-games category, next to the vehicles.',
  'tut.infra-paintball--batalla.2.texto':
    'Pick the mode: 1v1, 2v2 or free-for-all. Your rivals are the assistants on the map — Laika counts — and it is played on the ground floor.',
  'tut.infra-paintball--batalla.3.texto':
    'The whole house is the arena: take cover behind walls, peek out to shoot and watch your back. Splats stay painted for the battle.',
  'tut.infra-paintball--batalla.4.texto':
    "Pep@'s scoreboard stands at 47 wins to 23 losses. Demo battles count for real: raise it before you leave.",
  'tut.app-anecdotario--diario.1.texto':
    "This is Pep@'s journal: a whole year, two or three entries a week. The WHOLE arc is told here — from the burnout of month 1 to the marathon two weeks ago.",
  'tut.app-anecdotario--diario.2.titulo': 'How you write',
  'tut.app-anecdotario--diario.2.texto':
    'Pick the mood of the day, add a title if you want, write and attach photos. A photo alone is enough: no text required.',
  'tut.app-anecdotario--diario.3.titulo': 'The year in colors',
  'tut.app-anecdotario--diario.3.texto':
    'Each day is painted with its mood. Notice the month-7 slump (the injury) and how bright Japan looks. Tap a day to filter its entries.',
  'tut.app-anecdotario--diario.4.titulo': 'The archive',
  'tut.app-anecdotario--diario.4.texto':
    'Entries file themselves into folders by year, month and week. Open the Japan weeks and read the whole trip.',
  'tut.app-anecdotario--fotos.1.texto':
    "The milestones of Pep@'s year carry photos: the used keyboard, Laika's arrival, two postcards from Japan and the marathon medal.",
  'tut.app-anecdotario--fotos.2.titulo': 'Find them in the history',
  'tut.app-anecdotario--fotos.2.texto':
    'Open month 2 (the keyboard), month 9 (Japan) or two weeks ago (the medal). Tap any photo and it opens full screen.',
  'tut.app-anecdotario--fotos.3.texto':
    'Every entry feeds the streak and wakes the character: writing here is also caring for the house.',
  'tut.app-jardin--practicar.1.titulo': 'Accumulated calm',
  'tut.app-jardin--practicar.1.texto':
    "Every minute of practice waters this garden. Pep@'s grew for a whole year: from seed to forest.",
  'tut.app-jardin--practicar.2.titulo': 'Meditate with sound',
  'tut.app-jardin--practicar.2.texto':
    'Pick a track (forest, sea, rain, bowls) and a length, or meditate in silence with a bell. The session saves itself when it ends.',
  'tut.app-jardin--practicar.3.titulo': 'A year of sessions',
  'tut.app-jardin--practicar.3.texto':
    "Here is Pep@'s year: it started at three a week, and in month 7 — the injury, the car bill — practice became almost daily. It's what held the slump together.",
  'tut.app-jardin--practicar.4.titulo': 'Breathe',
  'tut.app-jardin--practicar.4.texto':
    'Two guided patterns: box 4-4-4-4 to center yourself and 4-7-8 to let the day go. The screen breathes with you.',
  'tut.app-jardin--gratitud.1.titulo': 'Today I am grateful for…',
  'tut.app-jardin--gratitud.1.texto':
    'Three lines a day. One is enough; three is better. One entry per day, editable as you go.',
  'tut.app-jardin--gratitud.2.titulo': "Pep@'s",
  'tut.app-jardin--gratitud.2.texto':
    "Ninety days of real gratitude: the keyboard, Laika asleep on the notes, the knee healing, coming back from Japan. Read them slowly.",
  'tut.app-jardin--gratitud.3.texto':
    "This room keeps no streaks and never punishes a missed day — on purpose. Calm isn't a competition.",
  'tut.app-hobbies--piano.1.titulo': 'Two hobbies, one year',
  'tut.app-hobbies--piano.1.texto':
    "Pep@ tracked two: piano (the project of the year, 4 days a week) and astrophotography. Each card shows the current week and the streak.",
  'tut.app-hobbies--piano.2.titulo': 'Inside the piano',
  'tut.app-hobbies--piano.2.texto':
    'Streak, best streak, total practiced, active days and average. A year at the keys — with the honest pause for Japan.',
  'tut.app-hobbies--piano.3.titulo': 'The heatmap',
  'tut.app-hobbies--piano.3.texto':
    'Every square is a day. You can see the month-2 start, how piano HELD the month-7 slump, and the three-week gap in Japan.',
  'tut.app-hobbies--piano.4.titulo': 'The sessions',
  'tut.app-hobbies--piano.4.texto':
    'Each practice with its minutes and, often, a note: from "my hands hurt" to playing Clair de Lune whole.',
  'tut.app-hobbies--piano.5.titulo': 'Projects',
  'tut.app-hobbies--piano.5.texto':
    'Practice with direction: the first piece (finished in month 5) and Clair de Lune, played for the family a week ago.',
  'tut.app-hobbies--proyectos.1.titulo': 'The piano projects',
  'tut.app-hobbies--proyectos.1.texto':
    'A project gathers the sessions you gave it: here you see how many, and how many minutes each one carries.',
  'tut.app-hobbies--proyectos.2.titulo': 'Progress in photos',
  'tut.app-hobbies--proyectos.2.texto':
    'Clair de Lune keeps the annotated sheet music. In astrophotography, the twelve-full-moons project gathers the best shots of the year.',
  'tut.app-hobbies--proyectos.3.texto':
    'You can also log sessions by chat ("practiced piano 30 min") and plan project goals with the planner.',
  'tut.app-hobbies--gestion.1.titulo': 'Adding a hobby',
  'tut.app-hobbies--gestion.1.texto':
    'Name, emoji, color and —optional— a weekly target in days. That form is all it takes to start tracking it.',
  'tut.app-hobbies--gestion.2.titulo': 'The weekly target',
  'tut.app-hobbies--gestion.2.texto':
    'Piano was set to 4 days a week: the week\'s row fills in with every day practiced, and up top it says how many you\'ve got against the target.',
  'tut.app-hobbies--gestion.3.titulo': 'Logging a session',
  'tut.app-hobbies--gestion.3.texto':
    'Quick minutes with one tap, or the exact number; the project is optional and the note is for whatever you want to remember about that session.',
  'tut.app-hobbies--gestion.4.texto':
    'The goals of your hobbies and projects live in the Goals button of the header: the same Goals · Plans · Timeline planner from the calendar, scoped to this app. Ask the AI for a plan with phases and dates.',
  'tut.app-ideas--diario.1.titulo': 'The inbox',
  'tut.app-ideas--diario.1.texto':
    "Write the thought and done. Pep@ dropped ~90 ideas here over the year: physics, the coffee shop, training. The star marks favorites.",
  'tut.app-ideas--diario.2.titulo': 'Themed brainstorms',
  'tut.app-ideas--diario.2.texto':
    "A brainstorm groups everything under a theme. Find Pep@'s: names for the cat (Laika won), how to pay for Japan, what to pack.",
  'tut.app-ideas--diario.3.texto':
    'When a brainstorm ripens, one button turns it into a mind map and you keep sorting it on the canvas.',
  'tut.app-ideas--mapas.1.titulo': 'Ten formats',
  'tut.app-ideas--mapas.1.texto':
    "Each format draws differently. Below are the maps Pep@ made during the year: the morning routine as a flow, thermodynamics as a tree, physics and music as a Venn.",
  'tut.app-ideas--mapas.2.titulo': '"My ideal life"',
  'tut.app-ideas--mapas.2.texto':
    "The FIRST map of the year, from month 1: the life Pep@ wanted. Look closely — almost everything on it ended up happening.",
  'tut.app-ideas--mapas.3.texto':
    'On the canvas: tap a node to select it, tap again to type; drag it, pinch to zoom, and add ideas with the bottom bar.',
  'tut.app-ideas--mapas.4.titulo': 'A whole map, from one topic',
  'tut.app-ideas--mapas.4.texto':
    'Give the AI a topic and it builds the full map, nodes already organized: a starting point for a topic you don\'t know how to sort out.',
  'tut.app-ideas--mapas.5.titulo': 'Expanding a node with AI',
  'tut.app-ideas--mapas.5.texto':
    'Once inside a map, any node can be expanded: the AI proposes sub-nodes based on what you already wrote around it, without breaking your structure.',
  'tut.app-ideas--decidir.1.titulo': 'Eight ways to decide',
  'tut.app-ideas--decidir.1.texto':
    'Pep@ used them for real: an Eisenhower during midterms, a SWOT at mid-year and a matrix to choose a camera.',
  'tut.app-ideas--decidir.2.titulo': 'Grad school or a job?',
  'tut.app-ideas--decidir.2.texto':
    "THE open decision of the year's end: each side weighted 1 to 5 with the total below. Still undecided — this is what thinking seriously looks like.",
  'tut.app-ideas--decidir.3.texto':
    'In region-based formats each element lives in a zone: pick it below before adding, or drag the element to another and it moves itself.',
  'tut.app-ideas--decidir.4.titulo': 'The weighted matrix',
  'tut.app-ideas--decidir.4.texto':
    'Not a canvas, a table: every option against every criterion, weighted 1 to 5 by how much that criterion matters to you. The total ranks the options on its own.',
  'tut.calendario.1.titulo': 'The clock',
  'tut.calendario.1.texto':
    'The calendar is not a room: it lives in the home’s clock, so it opens from wherever you are.',
  'tut.calendario.2.titulo': 'A real week',
  'tut.calendario.2.texto':
    'Coffee shop shifts, physics classes, running at dawn, piano at night. Each block is a routine with its time and colour; drag them to move, stretch them to change how long they last.',
  'tut.calendario.3.titulo': 'Four ways to look',
  'tut.calendario.3.texto':
    'Day and Week show the hourly grid; Month and Year give the whole picture. The first button does double duty: it says "Today" and brings you to the present, or "Day" once you are already looking at another date.',
  'tut.calendario.4.titulo': 'Where each block comes from',
  'tut.calendario.4.texto':
    'The apps schedule on their own: appointments from the Agenda, sleep from Rest, study slots from the Library. The filter lets you show just one app.',
  'tut.calendario.5.titulo': 'Moving through the year',
  'tut.calendario.5.texto':
    "The ‹ › arrows walk through the period and Today brings you back. Pep@'s whole year is in here, week by week. + New creates an event, or you can draw it straight on the grid.",
  'tut.calendario.6.titulo': 'Habit by habit',
  'tut.calendario.6.texto':
    'Each row is a routine and each column a day: green means done. You can tick straight from here, and the percentage on top sums up the period you are looking at.',
  'tut.calendario.7.titulo': 'The arc of the year',
  'tut.calendario.7.texto':
    'In Year view the graph tells the whole story: Pep@ started keeping about a third of what they set out to do and finished above 85%. Consistency was built, not found.',
  'tut.calendario.8.titulo': 'The dips count too',
  'tut.calendario.8.texto':
    'Both holes are real: the knee injury in month 7 and the three weeks in Japan. Missing days does not erase progress — the panel shows the year as it was, not as it should have been. And a routine only counts from the day you created it.',
  'tut.metas.1.titulo': 'Goals come first',
  'tut.metas.1.texto':
    'The view opens on Goals, grouped by the app that owns them: running under Exercise, the physics degree under Library. “Home” is no app — Pep@ made that category up for the kitchen build.',
  'tut.metas.2.titulo': 'From the goal to its plan',
  'tut.metas.2.texto':
    'Every row reads like a board: its number in the folder, the deadline, the progress and the state — to do, in progress or done, depending on how much is ticked off. One click opens the goal: its plan if it has one (the ✨ says so) and, if not, its sheet with the sub-goals, the dates and the steps.',
  'tut.metas.3.titulo': 'Three plans, three states',
  'tut.metas.3.texto':
    'The kitchen and the next marathon are still proposals; the grad application is already on the timeline. The marathon one was asked for with no deadline: the AI worked out it needs 24 weeks, and says so in its summary.',
  'tut.metas.4.titulo': 'The plan sheet',
  'tut.metas.4.texto':
    'Six phases and their sub-goals, each with its own window. While it is a proposal the whole thing is editable: rename, move dates, add or drop nodes without throwing the rest off.',
  'tut.metas.5.titulo': 'Tick without committing',
  'tut.metas.5.texto':
    "A proposal's ticks live in the sheet, not in your goals: you can mark what's done without touching your timeline. The bars fill upwards on their own — the kitchen planning is already closed.",
  'tut.metas.6.titulo': 'Move to real timeline',
  'tut.metas.6.texto':
    'This button turns every phase and sub-goal into real goals, with their dates set, hanging off the original goal. Whatever the goal already had is kept.',
  'tut.metas.7.titulo': 'Accepted: a single truth',
  'tut.metas.7.texto':
    "The grad plan has already moved. Its ticks are now the real sub-goals' ticks and the bar is your timeline's: the sheet stops keeping a separate count.",
  'tut.metas.8.titulo': 'And there they are, on the axis',
  'tut.metas.8.texto':
    'The sub-goals born from the plan take up their window on the timeline, with the plan ghosted in violet on top: the proposal and the real thing on the same axis.',
  'tut.app-biblioteca--enciclopedia.1.titulo': 'A year of studies, as a tree',
  'tut.app-biblioteca--enciclopedia.1.texto':
    'Pep@ studies Physics: mechanics early in the year, thermodynamics towards the month 6 midterm, relativity and astrophysics at the end. Each branch opens to show its cards.',
  'tut.app-biblioteca--enciclopedia.2.titulo': 'The tree grows with you',
  'tut.app-biblioteca--enciclopedia.2.texto':
    'Catalogue topics come built in; the loose ones were opened by a chat. Tap a card to read its summary, its key points and its illustration.',
  'tut.app-biblioteca--enciclopedia.3.texto':
    'A card is written by hand or distilled from a conversation. The black hole one and the piano physics one carry a drawing: the app can illustrate them for you.',
  'tut.app-biblioteca--charlas.1.titulo': "The year's questions",
  'tut.app-biblioteca--charlas.1.texto':
    'Here are the conversations Pep@ had while studying: entropy, time dilation, why a piano sounds like a piano. Each one was kept.',
  'tut.app-biblioteca--charlas.2.titulo': 'From chat to tree',
  'tut.app-biblioteca--charlas.3.texto':
    'That way the encyclopedia does not fill with copied theory, but with what you actually asked.',
  'tut.app-biblioteca--enciclopedia.4.titulo': 'The index is yours',
  'tut.app-biblioteca--enciclopedia.4.texto':
    'The + on each row writes an entry right there, with its field and topic already set. And the pencil button grows the tree: that same + adds branches, the one on the Seed creates new fields, and you can rename, reorder and delete. The number with the little branch tells you how many sub-indexes hang below.',
  'tut.app-biblioteca--estudio.2.titulo': 'The study plan',
  'tut.app-biblioteca--estudio.2.texto':
    "Goals live in the Goals button of the header, the calendar's own timeline: «finish thermodynamics before the midterm» is already done; preparing for grad school is still going.",
  'tut.app-biblioteca--estudio.3.texto':
    'You can ask any goal for a plan: the AI asks for your target date and your available hours, and schedules the study slots in your calendar.',
  'tut.app-biblioteca--resumen.1.texto':
    'How many entries your encyclopedia holds and how many of the index fields and topics you already cover. Topics opened by a chat are counted separately.',
  'tut.app-biblioteca--resumen.2.titulo': 'Four numbers',
  'tut.app-biblioteca--resumen.2.texto':
    'Chats with the Sage, study minutes in total and this week, and your streak of consecutive study days.',
  'tut.app-biblioteca--resumen.3.titulo': 'Where the imbalance is',
  'tut.app-biblioteca--resumen.3.texto':
    'The longest bar is the field that took most of your attention — for Pep@, thermodynamics during midterm week.',
  'tut.app-biblioteca--resumen.4.titulo': 'The study days',
  'tut.app-biblioteca--resumen.4.texto':
    'One square per day: the cramming before the midterm and the gap of the three weeks in Japan show up without opening the full history.',
  'tut.app-biblioteca--resumen.5.titulo': 'Where the hours went',
  'tut.app-biblioteca--resumen.5.texto':
    'The same as above but in minutes: having many cards in a field is one thing, having actually spent time on it is another.',
  'tut.app-biblioteca--resumen.6.titulo': 'A year of sessions',
  'tut.app-biblioteca--resumen.6.texto':
    'And if you want the detail, the history keeps every session with its minutes and its field, filed by year, month and week.',
  'tut.app-idiomas--repaso.1.titulo': "What's due today",
  'tut.app-idiomas--repaso.1.texto':
    'Pep@ has been at this for a year and still has reviews pending: the system does not ask for all your vocabulary, only what you are about to forget.',
  'tut.app-idiomas--repaso.3.titulo': 'A year of consistency',
  'tut.app-idiomas--repaso.3.texto':
    'The history keeps how many you reviewed each day and how many you got right. Pep@ started missing plenty and ended getting almost everything — and reviewed more than ever in Japan.',
  'tut.app-idiomas--vocabulario.2.titulo': 'Two languages at once',
  'tut.app-idiomas--vocabulario.2.texto':
    'The language switcher is up top: besides the main one, Pep@ built survival Japanese between month 4 and the trip. After coming back it was almost dropped, and the boxes show it.',
  'tut.app-idiomas--temario.1.titulo': 'Three areas, six levels',
  'tut.app-idiomas--temario.1.texto':
    'From A1 to C2, each level with its vocabulary topics, its pronunciation points and its grammar. You know what you are missing without looking for a course elsewhere.',
  'tut.app-idiomas--temario.2.titulo': 'Where you stand',
  'tut.app-idiomas--temario.2.texto':
    'Mastered cards, reviews this month and your current level. Pep@ started the year at A2 and is now around B1.',
  'tut.app-agenda--trabajo.1.titulo': 'The inbox',
  'tut.app-agenda--trabajo.1.texto':
    'Things you have to do but have not dated yet live here, with their priority. Nothing forces you to pick a day just to write it down.',
  'tut.app-agenda--trabajo.3.titulo': 'The board',
  'tut.app-agenda--trabajo.3.texto':
    'The same to-dos in three columns: to do, in progress and done. Press and hold a card to drag it to another column —dropping it on «done» also ticks it in the calendar— or move it with the arrows.',
  'tut.app-agenda--salud.1.titulo': 'The year of the knee',
  'tut.app-agenda--salud.1.texto':
    'Nutrition every few months, the dentist, and the six physiotherapy sessions of month 7: the injury that stopped Pep@ is recorded here.',
  'tut.app-agenda--salud.2.titulo': 'Medication',
  'tut.app-agenda--salud.2.texto':
    'Each medication creates one calendar block per dose. The anti-inflammatory from the injury lasted three weeks and was archived; the vitamin is still going.',
  'tut.app-agenda--salud.3.titulo': 'Laika',
  'tut.app-agenda--salud.3.texto':
    'The cat has her own file with weight and vet, and her recurring care: a yearly shot, deworming every three months, a bath every month. Ticking one off recalculates the next date by itself.',
  'tut.app-agenda--salud.4.titulo': 'What repeats',
  'tut.app-agenda--salud.4.texto':
    'The yearly checkup, the dental visit, the blood tests: care with its own cycle. Mark them done and the next date jumps ahead by itself, so the calendar never points at something you already did.',
  'tut.app-agenda--personas.1.titulo': "Pep@'s circle",
  'tut.app-agenda--personas.1.texto':
    'Family, friends, people from work and from university, each in their folder. With their phone, their address and whatever you do not want to forget.',
  'tut.app-agenda--personas.2.titulo': 'Birthdays you never miss',
  'tut.app-agenda--personas.2.texto':
    'Save a date of birth and the birthday repeats every year in the calendar and reminds you. The app works out the age on its own.',
  'tut.app-agenda--personas.3.texto':
    'Plans with people are linked to their contact: that way you can see when you last saw someone.',
  'tut.app-ejercicio--anio.1.titulo': 'A year in three numbers',
  'tut.app-ejercicio--anio.1.texto':
    'The streak counts days in a row with something logged, and adherence compares your active days with the ones you aimed for. Pep@ started the year unable to jog two blocks.',
  'tut.app-ejercicio--anio.2.titulo': 'The three disciplines',
  'tut.app-ejercicio--anio.2.texto':
    'The bars measure what you have done against your targets: strength sessions, running minutes and mobility minutes. The goal adjusts to the period you pick above.',
  'tut.app-ejercicio--anio.3.titulo': 'The goals of the year',
  'tut.app-ejercicio--anio.3.texto':
    'The Goals button in the header keeps the four goals Pep@ ticked off — the 5K, the 10K, the half marathon and the marathon — plus the one still open. Goals with a date also show up in the house calendar.',
  'tut.app-ejercicio--carrera.1.titulo': 'Catalogue, routines and progress',
  'tut.app-ejercicio--carrera.1.texto':
    'Every discipline works the same way: the exercise catalogue, your routines with their history, and progress. Let us start with what Pep@ already ran.',
  'tut.app-ejercicio--carrera.2.titulo': 'Every run is written down',
  'tut.app-ejercicio--carrera.2.texto':
    'The history is grouped by year, month and week. Big races also keep the shape of the route and its splits: there is the marathon, with its ten-kilometre splits.',
  'tut.app-ejercicio--carrera.3.titulo': 'The heatmap does not lie',
  'tut.app-ejercicio--carrera.3.texto':
    'The gaps tell the story too: the month of the knee injury is empty and the three weeks in Japan nearly so. Next to it: total distance, longest run and best pace.',
  'tut.app-ejercicio--fuerza.1.titulo': 'Sets, reps and weight',
  'tut.app-ejercicio--fuerza.1.texto':
    'Each session keeps its exercises with the weight you lifted. The app remembers last time so you do not have to look it up, and adds up the day’s total volume.',
  'tut.app-ejercicio--fuerza.2.titulo': 'A year-long curve',
  'tut.app-ejercicio--fuerza.2.texto':
    'Pick an exercise and watch it climb: Pep@’s squat went from forty kilos to seventy. During the injury month only upper body was trained, and that curve never noticed.',
  'tut.app-ejercicio--fuerza.3.titulo': 'Your records, unasked',
  'tut.app-ejercicio--fuerza.3.texto':
    'For each exercise it keeps your best weight, your top reps and an estimated 1RM. Bodyweight moves, like pull-ups, are marked separately.',
  'tut.app-ejercicio--flexibilidad.1.titulo': 'Stretching and mobility',
  'tut.app-ejercicio--flexibilidad.1.texto':
    'The catalog comes with the usual exercises —hamstrings, hips, shoulders— each with its illustrated thumbnail, generated by AI the first time it is needed.',
  'tut.app-ejercicio--flexibilidad.2.titulo': 'Sets by time, not by weight',
  'tut.app-ejercicio--flexibilidad.2.texto':
    'Each exercise takes seconds and reps instead of weight. The guided Player runs the routine exercise by exercise with a timer that tells you when to switch.',
  'tut.app-ejercicio--flexibilidad.3.titulo': 'The same heat map',
  'tut.app-ejercicio--flexibilidad.3.texto':
    'The month\'s minutes and sessions, with the same heatmap as the other two modalities: mobility consistency reads as easily as running.',
  'tut.app-ejercicio--flexibilidad.4.texto':
    'All three modalities share the watch\'s live Cardio: when you run or pedal with the timer on, the minute-by-minute saves itself when you finish.',
  'tut.app-cocina--alimentacion.1.titulo': 'Step 1: where you are heading',
  'tut.app-cocina--alimentacion.1.texto':
    'From your weight, height and activity the app works out your daily needs and splits the macros. Pep@ settled on 2,400 calories and a weight goal that is less than a kilo away.',
  'tut.app-cocina--alimentacion.2.titulo': 'Step 2: what you ate today',
  'tut.app-cocina--alimentacion.2.texto':
    'Breakfast, lunch, dinner and something in between: each entry fills the day’s rings. Water has its own goal, and that is the one the house checks to call the day done.',
  'tut.app-cocina--alimentacion.3.titulo': 'Step 3: 74 kilos, 67 kilos',
  'tut.app-cocina--alimentacion.3.texto':
    'The whole year’s curve, with its plateau during the injury month and the kilo gained in Japan. Below, the pace you are keeping and when you would arrive at it.',
  'tut.app-cocina--alimentacion.4.titulo': 'A year in colours',
  'tut.app-cocina--alimentacion.4.texto':
    'Green is a day inside your target, amber one that went a little over and red one that went right past it. The travel month shows at a glance. Tap any day to open it.',
  'tut.app-cocina--recetario.1.titulo': 'Diets, not magazine diets',
  'tut.app-cocina--recetario.1.texto':
    'A diet here is a plan with its recipes inside. Pep@ saved two: marathon week and the light one after Japan, alongside the ones the app ships with.',
  'tut.app-cocina--recetario.2.titulo': 'The recipe book',
  'tut.app-cocina--recetario.2.texto':
    'Each recipe keeps ingredients, steps and macros per serving, sorted into folders. From a recipe you can log the meal or send its ingredients to the shopping list.',
  'tut.app-cocina--recetario.3.titulo': 'Asking the AI for the recipe',
  'tut.app-cocina--recetario.3.texto':
    'Describe what you want to cook and the AI builds the full recipe with a photo of the dish. This is done by AI: turn it on in Editor › Settings › Account.',
  'tut.app-cocina--recetario.4.titulo': 'From recipe to shopping list',
  'tut.app-cocina--recetario.4.texto':
    'Create list gathers what\'s missing from several recipes into one trip: every ingredient guesses its category (produce, dairy…) and can be edited.',
  'tut.app-cocina--recetario.5.titulo': 'The saved lists',
  'tut.app-cocina--recetario.5.texto':
    'Each list keeps what is still missing and what is already in the cupboard. Add prices and the total can be sent to your expenses in Study.',
  'tut.app-cocina--cronograma.1.titulo': 'The weight goal, in phases',
  'tut.app-cocina--cronograma.1.texto':
    'The Goals button in the header opens the same timeline the home calendar uses, scoped to Kitchen\'s goals: create a goal (e.g. "Lose 3 kilos") and ask the AI for the plan — it asks your target date and schedules sub-goals with their own date.',
  'tut.app-cocina--cronograma.2.texto':
    'This is done by AI: turn it on in Editor › Settings › Account. Without it, goals are still created and edited the same way, just by hand.',
  'tut.app-descanso--noche.1.titulo': 'A hundred points, three parts',
  'tut.app-descanso--noche.1.texto':
    'Duration is worth fifty, sticking to your bedtime thirty and interruptions twenty. Sleeping a lot one day does not make up for going to bed at odd hours every other one.',
  'tut.app-descanso--noche.2.titulo': 'The last week',
  'tut.app-descanso--noche.2.texto':
    'Seven bars against your goal line. This is the view that tells you at a glance whether this week you are sleeping what you meant to.',
  'tut.app-descanso--noche.3.titulo': 'The whole year',
  'tut.app-descanso--noche.3.texto':
    'The history is kept by year, month and week. Scroll back to Pep@’s first months and compare: bed past one in the morning and five hours of sleep.',
  'tut.app-descanso--horario.1.titulo': 'Half past eleven to seven',
  'tut.app-descanso--horario.1.texto':
    'Drag the ends of the bar to move your bedtime and wake-up time; the sky above changes with them. This block also appears in the calendar, crossing midnight.',
  'tut.app-descanso--horario.2.titulo': 'Alarm and reminders',
  'tut.app-descanso--horario.2.texto':
    'You can pick the alarm tone, ask to be told when it is time for bed and put the screens away an hour earlier. The reminders are optional: here they come switched off.',
  'tut.app-descanso--horario.3.titulo': 'Logging the night',
  'tut.app-descanso--horario.3.texto':
    'Each morning you note when you went to bed, when you woke up, how many times you woke and how it went. That is all the app needs for everything else.',
  'tut.app-despacho--anio.1.titulo': 'One year, four lenses',
  'tut.app-despacho--anio.1.texto':
    'Pick day, week, month or year and move with the arrows. Go back a few months and you will find the month the car broke down and the month of the flight to Japan, both in red.',
  'tut.app-despacho--anio.2.titulo': 'The shape of the year',
  'tut.app-despacho--anio.2.texto':
    'Six periods back, in bars. Blue ones are the months with money left over; red ones are the months that hurt. The slump and the comeback are right there.',
  'tut.app-despacho--anio.3.titulo': 'Where does it go?',
  'tut.app-despacho--anio.3.texto':
    'The breakdown by category for the period you are looking at. Pep@ types their own categories: the app knows the common ones and gives the rest their own colour.',
  'tut.app-despacho--anio.4.titulo': "The month's ceiling",
  'tut.app-despacho--anio.4.texto':
    'One monthly budget and a bar that turns red when you go over. If you look by week or by year, the app scales it for you.',
  'tut.app-despacho--anio.5.titulo': 'What you have today',
  'tut.app-despacho--anio.5.texto':
    "Your net worth comes straight from the Net worth tab: assets minus liabilities. Here the period's balance is added or subtracted, so you see where you would end up.",
  'tut.app-despacho--anio.6.titulo': 'And a year from now',
  'tut.app-despacho--anio.6.texto':
    'It projects twelve months using your fixed items at their due dates and your average for everything else, in two scenarios: with net worth and without it.',
  'tut.app-despacho--captura.1.titulo': "Pep@'s fixed costs",
  'tut.app-despacho--captura.1.texto':
    'Rent, internet, phone, streaming and the car insurance: five entries from month 2, when they decided to get organised. Each one has counted itself ever since.',
  'tut.app-despacho--captura.2.titulo': 'How you log one',
  'tut.app-despacho--captura.2.texto':
    'The form goes step by step: amount, whether it is variable or fixed, category (type your own, it suggests the usual ones), how often it repeats and the note.',
  'tut.app-despacho--captura.3.titulo': 'A year of entries',
  'tut.app-despacho--captura.3.texto':
    'Hundreds of expenses filed by year and month. Look for month 7: that is the breakdown that took almost ten thousand pesos in one go.',
  'tut.app-despacho--captura.4.titulo': 'Where the money comes from',
  'tut.app-despacho--captura.4.texto':
    'Two fortnightly wages from the coffee shop, the physics tutoring they started when the trip was decided, and the weekly tips, never the same twice.',
  'tut.app-despacho--captura.5.texto':
    'In your own house you can also log by chat: «spent 250 on groceries» and it is filed.',
  'tut.app-despacho--metas.1.titulo': 'The goal they hit',
  'tut.app-despacho--metas.1.texto':
    'The trip to Japan, at 100%: eleven months of saving, the private lessons, the Christmas bonus and their birthday money. Below, the emergency fund started on their return and a small investment.',
  'tut.app-despacho--metas.2.titulo': 'The goal over time',
  'tut.app-despacho--metas.2.texto':
    'The Goals button in the header keeps these goals on the timeline: give one dates and it shows up among your calendar days. With ✨ the AI suggests the payment plan.',
  'tut.app-despacho--metas.3.titulo': 'What they owed',
  'tut.app-despacho--metas.3.texto':
    'The car breakdown went on the credit card and took months to clear. Debts sit apart because you read them backwards: here, going down is winning.',
  'tut.app-despacho--metas.4.titulo': 'Markets',
  'tut.app-despacho--metas.4.texto':
    'Pep@ has watched the yen since deciding on the trip, and now the won, for the next one. Currencies, crypto, stocks and commodities live (needs internet).',
  'tut.app-despacho--patrimonio.1.titulo': 'What it\'s worth today',
  'tut.app-despacho--patrimonio.1.texto':
    'Assets minus liabilities. When a line has a rate, this number is what it\'s worth TODAY, not what it was worth the day you wrote it down — and below you can see the breakdown, or go back to what you typed.',
  'tut.app-despacho--patrimonio.2.titulo': 'Where it comes from',
  'tut.app-despacho--patrimonio.2.texto':
    'The last two years of this group. Open any line and you\'ll see what it depends on: how much it\'s worth, since when, and how much it rises or falls per year. What you write is never rewritten on its own.',
  'tut.app-despacho--patrimonio.3.titulo': 'And where it goes',
  'tut.app-despacho--patrimonio.3.texto':
    'The third tab follows that same line forward: solid for what happened, dotted for what your rates would give.',
  'tut.app-despacho--patrimonio.4.titulo': 'Three lines',
  'tut.app-despacho--patrimonio.4.texto':
    'What you own in green, what you owe in red and the net in blue. The vertical line is today: to its left is what really happened.',
  'tut.app-despacho--patrimonio.5.titulo': 'Move it all',
  'tut.app-despacho--patrimonio.5.texto':
    'How many months, how much inflation you assume, and whether to add what you save each month with its own growth rate. None of this touches your data: try things without fear.',
  'tut.app-despacho--calculadoras.1.texto':
    'Four personal-finance rules, each in its own tab: emergency fund, financial freedom, 50/30/20 and the car down payment (20/4/10).',
  'tut.app-despacho--calculadoras.2.titulo': 'Already primed with your balance',
  'tut.app-despacho--calculadoras.2.texto':
    'The fields arrive pre-filled with your real income or expense for the month — tap them to simulate another figure without losing sight of the real one.',
  'tut.app-despacho--calculadoras.3.titulo': 'From calculation to goal',
  'tut.app-despacho--calculadoras.3.texto':
    'With one tap, the result becomes a real savings goal, ready to drop into the timeline and get a date. (Don\'t press it in the demo: it would create a real goal.)',
  'tut.app-garage--vehiculos.1.titulo': 'Is anything urgent?',
  'tut.app-garage--vehiculos.1.texto':
    'One traffic light so you never have to read two lists: red if something is overdue, amber if it is coming up, green if the garage is at peace.',
  'tut.app-garage--vehiculos.2.titulo': 'What you have spent',
  'tut.app-garage--vehiculos.2.texto':
    'How many vehicles, how many live paperwork items and what you have spent this year. The car cost Pep@ dearly.',
  'tut.app-garage--vehiculos.3.titulo': 'The everyday bike',
  'tut.app-garage--vehiculos.3.texto':
    'Their real transport: chain, inner tubes, brakes, each in its own row — the same folder-by-year-and-month archive other apps use. Notice how the services bunch up in the last few months: that is marathon training taking its toll.',
  'tut.app-garage--vehiculos.4.titulo': 'And the inherited car',
  'tut.app-garage--vehiculos.4.texto':
    'Here is the month 7 breakdown: stranded, a tow truck, and almost ten thousand pesos they did not have. Every service keeps its cost, its mileage and which garage did it.',
  'tut.app-garage--vehiculos.5.titulo': 'The file',
  'tut.app-garage--vehiculos.5.texto':
    'Make, model, year, plates and current mileage. With plates on, the garage unlocks the paperwork that only applies to a car.',
  'tut.app-garage--tramites.1.titulo': "What's coming",
  'tut.app-garage--tramites.1.texto':
    'Each item keeps its next due date, how many months it repeats and what it costs. Tick it off and the date jumps to the next one by itself.',
  'tut.app-garage--tramites.2.titulo': 'The bike pays no road tax',
  'tut.app-garage--tramites.2.texto':
    'With no plates, the garage hides the paperwork that does not apply: the bike is only offered its periodic tune-up.',
  'tut.app-garage--tramites.3.titulo': 'The address book',
  'tut.app-garage--tramites.3.texto':
    'The trusted garage, the insurer, the inspection centre, the neighbourhood bike shop and the tow truck from that night — with phone and address one tap away.',
  'tut.app-garage--tramites.4.texto':
    'All that paperwork is in the house calendar too, with its advance warning. And careful: the vehicles you drive around the map are a different thing, they live in the Inventory.',
  'tut.app-sala--mapa.1.titulo': 'Where you have been',
  'tut.app-sala--mapa.1.texto':
    'Four countries and a handful of cities: nearly all from one single trip. Tap any of the three numbers to see the list below the map.',
  'tut.app-sala--mapa.2.titulo': 'The pins',
  'tut.app-sala--mapa.2.texto':
    'The seven pins clustered in Japan are the three weeks of the trip. The amber ones —Seoul, Patagonia, Iceland— are what has not happened yet. Tap the map to drop a new pin anywhere.',
  'tut.app-sala--japon.1.titulo': 'The albums',
  'tut.app-sala--japon.1.texto':
    'One folder per country, with its cover photo. Inside, a card per place and, inside each one, what Pep@ wrote that day.',
  'tut.app-sala--japon.2.titulo': 'What they wrote out there',
  'tut.app-sala--japon.2.texto':
    'Eight entries from the trip, each with its photo: Fuji at dawn, the Arashiyama bamboo, the deer in Nara. Written on the spot, with the smell still on them.',
  'tut.app-sala--japon.3.texto':
    'Inside each place, the «Itinerary» button opens the trip sheet: day by day, from where to where, where they slept, how they got around and what it cost.',
  'tut.app-sala--proximo.1.titulo': "What's pending",
  'tut.app-sala--proximo.1.texto':
    'Three dreams written down. Seoul already has a date and a plan; Patagonia and Iceland are still just an idea. The ones with a date show up in your calendar.',
  'tut.app-sala--proximo.2.titulo': 'From the sheet to the goal',
  'tut.app-sala--proximo.2.texto':
    'The eight days in Korea add up to what the trip would cost, and that total is saved as a savings goal in the study: watching it grow there is watching it get closer here.',
  'tut.app-sala--proximo.3.titulo': 'Routes',
  'tut.app-sala--proximo.3.texto':
    'A route chains places in order and draws them on the map. The Japan one is the journey already made; the Korea one is the journey they want.',
  'tut.app-entretenimiento--archivo.1.titulo': 'Thirty works, one year',
  'tut.app-entretenimiento--archivo.1.texto':
    'Films, series, books and games, ordered by when they were finished. There is a binge in month 7 (a hurt knee leaves plenty of sofa time) and a three-week gap: Japan.',
  'tut.app-entretenimiento--archivo.2.titulo': 'The entry',
  'tut.app-entretenimiento--archivo.2.texto':
    'Title, author or director, genre, status and stars. The review is what Pep@ thought, not a plot summary: a year from now that is the only part that helps.',
  'tut.app-entretenimiento--archivo.3.titulo': 'By date or by genre',
  'tut.app-entretenimiento--archivo.3.texto':
    'Switch the view: by date it files them into year and month folders; by genre, into themed ones. Anything pending stays up top, waiting its turn.',
  'tut.app-entretenimiento--juegos.1.texto':
    '1–2 players or 3+: the filter hides whatever won\'t work for the group in front of you. Games marked "2+" work in both sections.',
  'tut.app-entretenimiento--juegos.2.titulo': 'By family',
  'tut.app-entretenimiento--juegos.2.texto':
    'Board, Puzzle, Arcade, Cards & casino, For the group: each family has its own color. Chess, checkers, dominoes, blackjack, tetris, minesweeper and over a dozen more.',
  'tut.app-entretenimiento--juegos.3.titulo': 'One tap and you\'re playing',
  'tut.app-entretenimiento--juegos.3.texto':
    'Every card opens the game full-screen; the ones that support it bring their own difficulty selector up top. Going back returns you right here, without losing your place.',
  'tut.app-diario--habito.1.titulo': "Today's headlines",
  'tut.app-diario--habito.1.texto':
    'World, economy, tech, health, sport and entertainment, from real sources. The chips up top filter by section.',
  'tut.app-diario--habito.2.titulo': 'It refreshes itself',
  'tut.app-diario--habito.2.texto':
    'The edition downloads on its own and at midnight it is swapped whole: nothing piles up here, just like a real newspaper.',
  'tut.app-diario--habito.3.titulo': 'A day in history',
  'tut.app-diario--habito.3.texto':
    'The other half: what happened on a day like today, a work of art, a book, a species, a word. A good excuse to open it when the news does not appeal.',
  'tut.app-diario--habito.4.texto':
    'Pep@ read it around two hundred days this year: a lot at first, almost never in the bad month, and every single day of the last three weeks. Their streak lives on that.',
  'tut.app-diario--reparto.1.titulo': 'The delivery round',
  'tut.app-diario--reparto.1.texto':
    'This is where you set who brings you what. It is not just another notification: it arrives as a message from the assistant, in their own voice.',
  'tut.app-diario--reparto.2.titulo': 'Two paper rounds',
  'tut.app-diario--reparto.2.texto':
    'The wizard brings world, tech and economy at 7:30. Laika delivers the light stuff whenever she feels like it. Each assistant picks their sections and their mode.',
}
