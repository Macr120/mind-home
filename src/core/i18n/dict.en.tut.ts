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
    'The calculator swaps its whole view: the plotter, bases 2 through 16, matrices, systems of equations, unit conversion, the bill with a tip and the rule of three. The history stays at the bottom in all of them.',
  'tut.app-computo--calculadora.3b.titulo': 'Bases',
  'tut.app-computo--calculadora.3b.texto':
    'Whatever you type is read in the chosen base and shown in all fifteen at once, from 2 to 16, live. It brings bitwise operations, and the 0b, 0o and 0x prefixes let you mix bases in one calculation.',
  'tut.app-computo--calculadora.3c.titulo': 'Matrices and systems',
  'tut.app-computo--calculadora.3c.texto':
    'Matrices works with A and B up to 6×6: sum, product, determinant, inverse, transpose and trace. Its neighbour Systems solves linear equations, reading the unknowns from what you write — up to six equations.',
  'tut.app-computo--calculadora.3d.titulo': 'Units',
  'tut.app-computo--calculadora.3d.texto':
    'Eight categories —from length to data— that convert as you type; each remembers its last pair and «Swap» flips the conversion. Temperature comes out right: 100 °C is 212 °F.',
  'tut.app-computo--calculadora.3e.titulo': 'Tip and rule of three',
  'tut.app-computo--calculadora.3e.texto':
    'The two quick mental ones: Tip is worked out on the bill —not on the total— and splits it between however many of you; Rule of 3, direct or inverse, fills in the x on its own.',
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
  'tut.casa.4.texto': 'Isometric, third and first person (or the V key). Tapping Iso also re-centers the camera on your character: the quick way back if you wandered off exploring.',
  'tut.casa.5.titulo': 'One corner, several owners',
  'tut.casa.5.texto': 'That corner isn\'t just the view cube: get close to something interactive — a chair, a vehicle, a court — and it switches on its own to match what\'s nearby. Nothing activates without you approaching.',
  'tut.casa.6.titulo': 'The tool wheel',
  'tut.casa.6.texto': 'Moves, toys, vehicles and construction, up to 3 equipped at once. Open it here or from that same corner when you\'re empty-handed.',
  'tut.casa.7.titulo': 'The clock',
  'tut.casa.7.texto': 'The home\'s time: tap it and the full calendar opens, with its Missions for the day. The sun or moon next to it controls the passage of time and the light of the scene.',
  'tut.casa.8.titulo': 'The home\'s music',
  'tut.casa.8.texto': 'Each room can have its own theme, or let the home\'s general ambience play. You can turn it off entirely for silence.',
  'tut.casa.9.titulo': 'The chat',
  'tut.casa.9.texto': 'The architect\'s chat: tell it what you did and it logs it in the right app, or ask for changes to the home.',
  'tut.casa.10.texto': 'That\'s the basics. The Editor button up top opens full customization, and every menu and every app has its own ? button with its tutorial.',
  'tut.primeros.1.texto': 'First things first: how the house gets built. Everything starts in the Rooms tab.',
  'tut.primeros.2.titulo': 'Create room',
  'tut.primeros.2.texto': 'This button lets you draw new rooms on the map. To show you the rest of the way, I\'ll create one for you now…',
  'tut.primeros.3.titulo': 'Your new room',
  'tut.primeros.3.texto': 'Here it is! A brand-new room, still without an app: that\'s why its card says + Assign.',
  'tut.primeros.4.titulo': 'Assign an app',
  'tut.primeros.4.texto': 'With + Assign I gave it its app: see how the room took its name, its icon and its furniture. From now on its whole card is the enter button.',
  'tut.primeros.5.titulo': 'Enter',
  'tut.primeros.5.texto': 'We\'re in: this is the room\'s app. While walking around you also enter by crossing its door, and you leave with ‹ Back to the house.',
  'tut.primeros.6.texto': 'The room stays in your house, app and all. That is how you build the rest: one room per thing you want to keep here.',
  'tut.menu-cuartos.1.texto': 'The Rooms tab lists every room in your home, grouped by category.',
  'tut.menu-cuartos.2.titulo': 'Your summary',
  'tut.menu-cuartos.2.texto': 'Your character lives off your real activity: here you see its mood, its level and its streak. Log something in any app and it perks up; a few days with nothing and it turns sad — it never resets or punishes you.',
  'tut.menu-cuartos.3.titulo': 'The cards',
  'tut.menu-cuartos.3.texto': 'Each card is a room: its icon, name and app progress, grouped into Body, Mind, Complement and Settings. Rooms with no app assigned sit at the very end.',
  'tut.menu-cuartos.4.titulo': 'Room options',
  'tut.menu-cuartos.4.texto': 'The gear unfolds the room\'s options in a row: move it up or down the list, delete it, and Edit, which opens its editor for shape, colors, walls and objects.',
  'tut.menu-cuartos.5.titulo': 'The whole card enters',
  'tut.menu-cuartos.5.texto': 'The full card is the button: tap it anywhere and you enter the room\'s app. If it has no app yet, that same card says + Assign and opens the catalog to pick one.',
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
  'tut.inicio.1.texto': 'The button with your home\'s name opens the start screen: your apps in a grid, with the mechanics of a phone.',
  'tut.inicio.2.titulo': 'One tap, one app',
  'tut.inicio.2.texto': 'Only rooms that already have an app show up here, with their level, their streak and their finished lists. The red counter in the corner is their missions still pending today, and tapping the card goes straight in.',
  'tut.inicio.3.titulo': 'Long-press a card',
  'tut.inicio.3.texto': 'A long press lifts it and they all jiggle, like on a phone: drag it to reorder, or tap the pencil on its corner to edit its card.',
  'tut.inicio.4.titulo': 'Your challenge, in sight',
  'tut.inicio.4.texto': 'The two rings are the Sisyphus Mountain: the year\'s rank and the badges earned. Tapping them opens the full mountain, the same one as in the side menu.',
  'tut.inicio.5.titulo': 'Wallpaper and 3D view',
  'tut.inicio.5.texto': 'This button gives the grid a wallpaper, dimmed so the cards stay readable. The one next to it switches between each room\'s icon and its furnished 3D miniature.',
  'tut.inicio.6.texto': 'Creating rooms, deleting them or assigning apps is still the side menu\'s job: this screen is for getting in fast. It closes by tapping outside.',
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
  'tut.navegacion.2.texto': 'In iso you steer the camera with the cube: its corners give the isometric angles and its faces, the flat views. In 3rd/1st its slot is taken by a pad you drag to look around.',
  'tut.navegacion.3.titulo': 'When something\'s nearby',
  'tut.navegacion.3.texto': 'That same corner stops being a camera control once you approach something interactive: a court offers its play button, a vehicle its mount button, a chair its sit button. Only one thing at a time, always by proximity — never automatic.',
  'tut.navegacion.4.titulo': 'Rotate and center',
  'tut.navegacion.4.texto': 'Each arrow turns a quarter turn: the map in iso, your gaze in 3rd/1st. The third button only appears with the map in front, and re-centers it if you got lost exploring.',
  'tut.navegacion.5.titulo': 'Moving',
  'tut.navegacion.5.texto': 'Walk with the joystick, WASD or the arrows. In water you swim; on a mounted vehicle, you drive with the same controls.',
  'tut.navegacion.6.texto': 'The Editor button up top works in any view: open it in 3rd/1st person and you edit while walking, touching objects, walls or characters right where they are.',
  'tut.chat.1.texto': 'The architect\'s chat: log your day, edit the home and get your questions answered, all from the same box.',
  'tut.chat.2.titulo': 'Writing',
  'tut.chat.2.texto': 'Write freely: "ran 20 min", "spent 250 on groceries"… The chip next to it shows which app it will go to. Use @room to force a destination if it guesses wrong.',
  'tut.chat.3.titulo': 'Dictate by voice',
  'tut.chat.3.texto': 'The microphone transcribes what you say into the text box — handy for logging without letting go of what\'s in your hands.',
  'tut.chat.4.titulo': 'Attach',
  'tut.chat.4.texto': 'The + unfolds five options: upload an image or a PDF and take a photo — with AI on, a receipt or the scale gets read on its own — plus two that need no AI: the AR mask and the AR chat.',
  'tut.chat.4b.titulo': 'The AR mask',
  'tut.chat.4b.texto': 'It turns on the camera and puts the mask on your face, following you live — the same one from the home\'s presentation video. Works without AI and without an account.',
  'tut.chat.4c.titulo': 'The AR chat',
  'tut.chat.4c.texto': 'The same conversation as always, but with your camera as the backdrop and the assistant in 3D up front, with emotions that follow what it answers.',
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
  'tut.app-generica.2.titulo': 'Missions',
  'tut.app-generica.2.texto':
    'The Missions button opens today\'s list in this app: your targets, what\'s scheduled and whatever your goals ask for. Each step crosses itself off as soon as you log, and finishing the whole list is what earns the day\'s XP.',
  'tut.app-generica.3.titulo': 'The blocks',
  'tut.app-generica.3.texto': 'This template is built from blocks (notes, lists, counters, habits…). You can change them in Menu › Templates › edit.',
  'tut.app-generica.4.titulo': 'Leaving',
  'tut.app-generica.4.texto': '"Back to the house" closes the app and returns you to 3D. Whatever you logged here is already saved.',
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
  'tut.hoy.1.texto':
    'Missions don\'t live somewhere apart: they live INSIDE each app. In every room\'s header sits its Missions button, with the checklist of what that app asks of you TODAY.',
  'tut.hoy.2.titulo': 'Three sources, one list',
  'tut.hoy.2.texto': 'The app\'s own targets (water, calories), what you scheduled for today in the calendar, and the steps from your active goals: all together, grouped under the plan or the goal each step comes from.',
  'tut.hoy.2b.titulo': 'What you set out to do, on top',
  'tut.hoy.2b.texto': 'Above the checklist live this app\'s goals, with their progress and their deadline. Tapping one opens its plan right here, without leaving the panel, and "+ goal" sets up another.',
  'tut.hoy.3.titulo': 'It crosses off because the data exists',
  'tut.hoy.3.texto': 'The row\'s button logs the REAL data in the app — a glass of water, a meal — and the step crosses itself off simply because that record now exists, not because anyone marked it. Tapping it again once done doesn\'t duplicate anything: the button disappears.',
  'tut.hoy.4.titulo': 'Your number for each day',
  'tut.hoy.4.texto': 'Steps with an adjustable count change it right here. Setting it to 0 turns off that day\'s target without erasing the history of previous days.',
  'tut.hoy.5.titulo': 'From a target to a routine',
  'tut.hoy.5.texto': 'The calendar schedules that same target with a fixed time: it opens the same editor as the clock\'s routines, so it ends up logged in both places at once.',
  'tut.hoy.6.titulo': 'Done doesn\'t disappear',
  'tut.hoy.6.texto': 'It drops down to "Done", collapsed: seeing the log take effect is part of the reward, and you can undo it from there if one slipped in by mistake.',
  'tut.hoy.6b.titulo': 'The whole list is what scores',
  'tut.hoy.6b.texto': 'Completing all of the day\'s missions sets off the celebration and adds the app\'s XP: the level grows by finished lists, not by loose logs.',
  'tut.hoy.7.texto': 'And if something\'s missing, «New checklist» creates your own: a list of this app\'s that repeats every day. The goals these steps come from are planned in the Goals room.',
  'tut.hoy.8.titulo': 'The red orbs',
  'tut.hoy.8.texto':
    'That red badge on a room is its count of missions still pending TODAY: what you have left to do in there. The same number shows up on the home screen, on the enter bubble and on the orb floating above the room\'s furniture — and it turns amber when something is already past its time. No badge means that room is up to date.',
  'tut.hoy.9.titulo': 'And all of them together, in the calendar',
  'tut.hoy.9.texto':
    'The clock\'s Missions button gathers what has to be done today across the WHOLE house, one card per app: on the left what\'s left, on the right what\'s already done. Nothing is logged here — each row takes you to its app, which is where the data gets written.',
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
    'The goals of your hobbies and projects live in the Goals room, each one with its plan and its timeline. Ask the AI for a plan with phases and dates.',
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
  'tut.metas.0.titulo': 'A room for setting things out',
  'tut.metas.0.texto':
    'Goals keeps nothing of its own: it\'s where you set things out and where everything you set out to do can be seen, whatever room it came from. Goals are born in the other apps — running in the Gym, the degree in the Library, saving in the Office — and here they come together, grouped by the app that owns each one.',
  'tut.metas.1.titulo': 'Goals come first',
  'tut.metas.1.texto':
    'The room opens on Goals, grouped by the app that owns them: running under Exercise, the physics degree under Library. “Home” is no app — Pep@ made that category up for the kitchen build.',
  'tut.metas.2.titulo': 'From the goal to its plan',
  'tut.metas.2.texto':
    'Every row reads like a board: its number in the folder, the deadline, the progress and the state — to do, in progress or done, depending on how much is ticked off. One click opens the goal: its plan if it has one (the ✨ says so) and, if not, its sheet with the sub-goals, the dates and the steps.',
  'tut.metas.3.titulo': 'Three plans, three states',
  'tut.metas.3.texto':
    'The kitchen and the next marathon are still proposals; the grad application is already on the timeline. The marathon one was asked for with no deadline: the AI worked out it needs 24 weeks, and says so in its summary.',
  'tut.metas.4.titulo': 'The plan sheet',
  'tut.metas.4.texto':
    'The ✨ on a row announces that the goal already has a plan, and clicking it opens this sheet: the phases and their sub-goals, each with its own window. While it is a proposal the whole thing is editable: rename, move dates, add or drop nodes without throwing the rest off.',
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
    "The timeline is THIS goal's: its sub-goals take up their window on the time axis, with the plan ghosted in violet on top — the proposal and the real thing, together.",
  'tut.metas.9.titulo': 'Each goal, its own axis',
  'tut.metas.9.texto':
    'This axis belongs to a SINGLE goal: here you give dates to whatever has none, hang new sub-goals, and “Back” returns you to its sheet. The Timeline menu up top shows them all together.',
  'tut.metas.10.titulo': 'And from here it reaches the whole house',
  'tut.metas.10.texto':
    'None of this stays locked in: a goal with dates shows up in the clock\'s calendar like anything else scheduled, and its steps for today appear in the Missions of the app that owns it — and in that room\'s red badge. You plan here; you get it done in the app, by logging for real.',
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
    "The Missions button in the header brings up what's due today. Study goals live in the Goals room, grouped by app: «finish thermodynamics before the midterm» is already done; preparing for grad school is still going.",
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
  'tut.app-idiomas--charlas.1.titulo': 'A tutor at your level',
  'tut.app-idiomas--charlas.1.texto':
    'Your tutor is the room\'s assistant: you talk to it in the language you study and it answers at your CEFR level — short sentences with a translation at A1, idioms at C1. Write in your own language and it nudges you to try the one you study.',
  'tut.app-idiomas--charlas.2.titulo': 'They save and file themselves',
  'tut.app-idiomas--charlas.2.texto':
    'Each chat lands on this list with its title, its syllabus topic and its level, set without you doing anything. A chat can also start from a topic —via the chat button on its row— to practice exactly that.',
  'tut.app-idiomas--charlas.3.texto':
    "When the tutor corrects you, the right form goes on its own line with a check mark, and the conversation moves on without scolding. On your way out it offers to extract the vocabulary that came up: you pick which cards to keep and they inherit the chat's topic.",
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
  'tut.app-agenda--esencial.1.titulo': 'Your agenda',
  'tut.app-agenda--esencial.1.texto':
    "The agenda holds what isn't a habit: to-dos, appointments, contacts. It has three menus, and everything with a date lands in the house calendar by itself.",
  'tut.app-agenda--esencial.2.titulo': 'Work',
  'tut.app-agenda--esencial.2.texto':
    'The tray gathers undated to-dos so they never get lost, and the board moves your tasks across columns: to do, in progress and done.',
  'tut.app-agenda--esencial.3.titulo': 'Health',
  'tut.app-agenda--esencial.3.texto':
    'Medical appointments, medication and care routines, in three submenus: You, Loved ones (the people in your care) and Pets.',
  'tut.app-agenda--esencial.4.titulo': 'People',
  'tut.app-agenda--esencial.4.texto':
    'Your address book by relationship. Any birthday you save repeats itself every year in the calendar.',
  'tut.calendario--esencial.1.titulo': 'The house clock',
  'tut.calendario--esencial.1.texto':
    "The calendar isn't a room: it lives in the HUD clock, so it opens from wherever you are without going into anything.",
  'tut.calendario--esencial.2.titulo': 'Everything scheduled, together',
  'tut.calendario--esencial.2.texto':
    'Everything with a date and time lands here: what you create with «+ New» or by drawing on the grid, and what the other apps schedule on their own. The filter up top shows a single app when it gets crowded.',
  'tut.calendario--esencial.3.titulo': 'Day',
  'tut.calendario--esencial.3.texto':
    "The 24-hour grid of a single day: it shows what time each thing is and whether anything overlaps. This button does double duty: it says «Today» and brings you back to the present, or «Day» once you're looking at another date.",
  'tut.calendario--esencial.4.titulo': 'Week',
  'tut.calendario--esencial.4.texto':
    'The same hourly grid, but with the seven days side by side. This is where you see how the week is spread out, and where blocks are dragged from one day to another or stretched to last longer.',
  'tut.calendario--esencial.5.titulo': 'Month',
  'tut.calendario--esencial.5.texto':
    'It drops the hour axis and paints the days as cells with whatever falls on each one. This is the overview: which weeks come loaded and which days are free.',
  'tut.calendario--esencial.6.titulo': 'Year',
  'tut.calendario--esencial.6.texto':
    'All twelve months in one go. At this distance the hours no longer read: what shows is consistency, how much of what you set out to do you kept up over the year.',
  'tut.calendario--esencial.7.titulo': 'And missions, apart',
  'tut.calendario--esencial.7.texto':
    "In red, so it doesn't read as a fifth view: Missions gathers today's checklist from every app on a single screen. Goals and their plans aren't here — they live in their own room.",
  'tut.app-anecdotario--esencial.1.titulo': 'Your personal diary',
  'tut.app-anecdotario--esencial.1.texto':
    'Anecdotario keeps whatever you want to write down, with its mood and its photos. It organizes itself by date, with nothing for you to sort.',
  'tut.app-anecdotario--esencial.2.titulo': 'How to write an entry',
  'tut.app-anecdotario--esencial.2.texto':
    'Pick the mood of the day, write what you want to tell, and attach photos if you have any. A single photo, with no text, is enough on its own.',
  'tut.app-anecdotario--esencial.3.titulo': 'The mood calendar',
  'tut.app-anecdotario--esencial.3.texto':
    'Each day is colored with the mood of its entry, so the whole month reads at a glance. Tap a day to see its entries below.',
  'tut.app-anecdotario--esencial.4.titulo': 'The history',
  'tut.app-anecdotario--esencial.4.texto':
    'Every entry lands here, sorted on its own into folders by year, month and week.',
  'tut.app-biblioteca--esencial.1.titulo': 'Your library',
  'tut.app-biblioteca--esencial.1.texto':
    "The library is your personal encyclopedia: you ask what you don't know, you save what you learn, and you keep track of what you study. There are four menus.",
  'tut.app-biblioteca--esencial.2.titulo': 'Chats',
  'tut.app-biblioteca--esencial.2.texto':
    'Here you ask the Sage about any topic and the conversation is saved. Every chat files itself in its field of knowledge and comes out distilled as an encyclopedia entry.',
  'tut.app-biblioteca--esencial.3.titulo': 'Encyclopedia',
  'tut.app-biblioteca--esencial.3.texto':
    'The tree where everything you learn lives, sorted by field of knowledge. Every entry carries its summary and key points, and you can also write them by hand; with the pencil you grow the index to fit you.',
  'tut.app-biblioteca--esencial.4.titulo': 'Study',
  'tut.app-biblioteca--esencial.4.texto':
    'The clock for studying: pick a field and a length, straight through or in pomodoros, and every stretch is logged on its own. It keeps running even if you leave the room.',
  'tut.app-biblioteca--esencial.5.titulo': 'Overview',
  'tut.app-biblioteca--esencial.5.texto':
    "The big picture of all of the above: how many entries your encyclopedia has and how much of the index you've covered, your study minutes, your streak and the days you studied.",
  'tut.app-cocina--esencial.1.titulo': 'The kitchen',
  'tut.app-cocina--esencial.1.texto':
    'This app handles two things: what you are going to cook and what you end up eating. Each one has its own menu on top, and each menu opens its own tabs.',
  'tut.app-cocina--esencial.2.titulo': 'Recipe book',
  'tut.app-cocina--esencial.2.texto':
    'The cooking side: this is where your recipes live, along with the diets that group them and the grocery list. Three tabs, in that order.',
  'tut.app-cocina--esencial.3.titulo': 'Diet',
  'tut.app-cocina--esencial.3.texto':
    'A diet is a meal plan with its recipes inside and, if you want, its own calorie and macro targets. You save your own next to the ones the app already brings.',
  'tut.app-cocina--esencial.4.titulo': 'Recipes',
  'tut.app-cocina--esencial.4.texto':
    'The recipe book: each recipe keeps ingredients, steps and macros per serving, sorted into folders. From a recipe you can log the meal or send its ingredients to the grocery list.',
  'tut.app-cocina--esencial.5.titulo': 'Groceries',
  'tut.app-cocina--esencial.5.texto':
    'The shopping list, with every item in the aisle it belongs to. You can build a list by pulling what is missing from several recipes and tick off whatever is already in the pantry.',
  'tut.app-cocina--esencial.6.titulo': 'Nutrition control',
  'tut.app-cocina--esencial.6.texto':
    'The other menu tracks what you eat, across four numbered tabs. The first one is Goals: from your weight, height and activity it works out what you need each day and splits the macros.',
  'tut.app-cocina--esencial.7.titulo': 'Log',
  'tut.app-cocina--esencial.7.texto':
    'What already happened: the meals of the day with their calories, the water so far and your weight whenever you weigh in. The tab next to it, Meal plan, is the opposite: the grid of what you intend to eat in the days ahead.',
  'tut.app-cocina--esencial.8.titulo': 'Progress',
  'tut.app-cocina--esencial.8.texto':
    'The statistics for all of the above over the period you pick: calories and macros, water and your weight curve. Below, a colored calendar shows at a glance which days stayed within the target.',
  'tut.app-computo--esencial.1.titulo': 'The computer room',
  'tut.app-computo--esencial.1.texto':
    'This is where you work out whatever needs calculating, in two menus: the Calculator, with its modes and your formula book, and Spreadsheets for anything that goes in a table.',
  'tut.app-computo--esencial.2.titulo': 'Calculator',
  'tut.app-computo--esencial.2.texto':
    'A scientific calculator that shows the result as you type and keeps everything you work out in the history. The keypad below saves you from the phone keyboard, and the notations write the scientific stuff wherever your cursor is.',
  'tut.app-computo--esencial.3.titulo': 'The modes',
  'tut.app-computo--esencial.3.texto':
    'This menu swaps the whole calculator view: graphing, number bases, matrices, systems of equations, unit conversion, tips and rule of three. The history stays at the bottom in every one of them.',
  'tut.app-computo--esencial.4.titulo': 'The formulary',
  'tut.app-computo--esencial.4.texto':
    'Your formula book, folded above the calculator. Maths, Physics and Chemistry come loaded, in folders you can nest. Any formula opens up to fill in its variables, and can be edited or deleted.',
  'tut.app-computo--esencial.5.titulo': 'Spreadsheets',
  'tut.app-computo--esencial.5.texto':
    'Sheets with cell references and formulas in plain language, plus charts over whatever range you select. They export to Excel keeping the formulas live, or to PDF.',
  'tut.app-descanso--esencial.1.titulo': 'Sleep',
  'tut.app-descanso--esencial.1.texto':
    'This app tracks your sleep on a single screen: the score for your last night, your schedule with its reminders, the daily log, and the full history.',
  'tut.app-descanso--esencial.2.titulo': 'The score',
  'tut.app-descanso--esencial.2.texto':
    'Every logged night gets a score that combines how long you slept, what time you went to bed, and how many times you woke up. With no records yet, this section invites you to log your first night.',
  'tut.app-descanso--esencial.3.titulo': 'Schedule and reminders',
  'tut.app-descanso--esencial.3.texto':
    "You set your bedtime and wake-up time by dragging the ends of the day's timeline; the same schedule also shows up as a block on the house calendar. Here you also turn on the alarm with its tone and the reminders to wind down before bed.",
  'tut.app-descanso--esencial.4.titulo': 'Logging the night',
  'tut.app-descanso--esencial.4.texto':
    'The form for noting how you slept: the date, what time you went to bed and woke up, interruptions, and a quality rating, with room for a note.',
  'tut.app-descanso--esencial.5.titulo': 'The history',
  'tut.app-descanso--esencial.5.texto':
    'Every night you log stays here, organized by year, month, and week, so you can review your sleep over time.',
  'tut.app-despacho--esencial.1.titulo': 'Your finances',
  'tut.app-despacho--esencial.1.texto':
    'The study organizes your money in four menus: what you own, what comes in and goes out, your goals, and the markets. Each one opens its own sections below.',
  'tut.app-despacho--esencial.2.titulo': 'Net worth',
  'tut.app-despacho--esencial.2.texto':
    'What you own and what you owe, in two lists: assets and liabilities. The third section projects that snapshot forward using the rate you set on each line.',
  'tut.app-despacho--esencial.3.titulo': 'Flow',
  'tut.app-despacho--esencial.3.texto':
    'The money coming in and going out, split into expenses, income and balance. The balance sums up the period you pick — day, week, month or year — with its budget, its categories and its trend.',
  'tut.app-despacho--esencial.4.titulo': 'Goals',
  'tut.app-despacho--esencial.4.texto':
    'Your money goals in three sections: saving and investing, debt, and calculators that suggest an amount based on your own balance. Any goal can drop into the schedule and take a date.',
  'tut.app-despacho--esencial.5.titulo': 'Markets',
  'tut.app-despacho--esencial.5.texto':
    'Live quotes for currencies, crypto, stocks and commodities; needs a connection. It is a reference board: the app does not recommend what to buy or sell.',
  'tut.app-diario--esencial.1.titulo': "Today's paper",
  'tut.app-diario--esencial.1.texto':
    "The diary brings the day's briefing in two views: headlines and on-this-day facts. It keeps no data of its own: every day brings new content, and at midnight it's replaced entirely.",
  'tut.app-diario--esencial.2.titulo': 'Headlines',
  'tut.app-diario--esencial.2.texto':
    "The day's headlines by category — world, economy, technology, health, sports and entertainment — filterable with the chips above. They come from real press in your language, with outlets that rotate each day.",
  'tut.app-diario--esencial.3.titulo': 'On this day',
  'tut.app-diario--esencial.3.texto':
    "The diary's other half: what happened on a day like today — a work, a book, a species, a word. A reason to open it even when the news doesn't appeal.",
  'tut.app-diario--esencial.4.titulo': 'It renews itself',
  'tut.app-diario--esencial.4.texto':
    'The edition downloads on its own when you open the app and gets fully replaced at midnight: nothing piles up. This button forces an update before that.',
  'tut.app-diario--esencial.5.titulo': 'Delivery',
  'tut.app-diario--esencial.5.texto':
    'Set which sections each assistant delivers to you in their own chat, at a fixed time or a surprise moment of the day.',
  'tut.app-ejercicio--esencial.1.titulo': 'Your training',
  'tut.app-ejercicio--esencial.1.texto':
    "Exercise brings together the body's three modes — strength, endurance and flexibility — plus a goals menu where you decide how much you want to train each week.",
  'tut.app-ejercicio--esencial.2.titulo': 'Goals',
  'tut.app-ejercicio--esencial.2.texto':
    'The room summary: your streak, the days with something logged, and a bar per mode against the weekly target you set here. This is also where you pick the unit system, kilos or pounds.',
  'tut.app-ejercicio--esencial.3.titulo': 'Strength',
  'tut.app-ejercicio--esencial.3.texto':
    "Training with weight: every session stores its exercises with sets, reps and load. From that the app works out the day's volume, charts the progression of each exercise and keeps your records.",
  'tut.app-ejercicio--esencial.4.titulo': 'Catalogue, routines and progress',
  'tut.app-ejercicio--esencial.4.texto':
    'All three modes are laid out the same way. The Catalogue groups the available exercises and builds routines from them, Routines logs the workout for the day you pick above, and Progress sums up the period with its heat map.',
  'tut.app-ejercicio--esencial.5.titulo': 'Endurance',
  'tut.app-ejercicio--esencial.5.texto':
    'Running, cycling, swimming or walking, split into legs with their minutes and distance. The live workout opens from here: it takes the route from GPS and the heart rate from a Bluetooth sensor, and saves the session when you finish.',
  'tut.app-ejercicio--esencial.6.titulo': 'Flexibility',
  'tut.app-ejercicio--esencial.6.texto':
    'Stretching and mobility, with timed sets instead of weighted ones: each pose has its seconds and its reps. The guided player runs the routine pose by pose with a timer that tells you when to switch.',
  'tut.app-entretenimiento--esencial.1.titulo': 'Entertainment',
  'tut.app-entretenimiento--esencial.1.texto':
    "Keeps the movies, shows, books, and video games you're finishing, and brings a digital game table you can play without leaving the house. There are two menus: Board games and Archive.",
  'tut.app-entretenimiento--esencial.2.titulo': 'Board games',
  'tut.app-entretenimiento--esencial.2.texto':
    'The table gathers digital games you play right on screen. A filter separates what works for one or two players from what suits a bigger group.',
  'tut.app-entretenimiento--esencial.3.titulo': 'By family',
  'tut.app-entretenimiento--esencial.3.texto':
    'The catalog is grouped into families — board, puzzle, arcade, cards and casino, and for the group — each with its own color. Tap any card to open the game full screen.',
  'tut.app-entretenimiento--esencial.4.titulo': 'Archive',
  'tut.app-entretenimiento--esencial.4.texto':
    'The archive gathers what you watch, read, and play: each title with its status, its rating, and your review. It can be sorted by genre, category, author, or date.',
  'tut.app-garage--esencial.1.titulo': 'The garage',
  'tut.app-garage--esencial.1.texto':
    'The garage tracks your vehicles: bikes, cars, motorcycles, anything you get around on. Each one keeps its service history and its procedures, and anything with a date books itself onto the house calendar.',
  'tut.app-garage--esencial.2.titulo': 'Overview',
  'tut.app-garage--esencial.2.texto':
    'The landing tab: a traffic light shows at a glance whether something is overdue, coming up, or the garage is all clear.',
  'tut.app-garage--esencial.3.titulo': 'At a glance',
  'tut.app-garage--esencial.3.texto':
    "How many vehicles you have, how many procedures are still active, and how much you've spent this year.",
  'tut.app-garage--esencial.4.titulo': 'Vehicles',
  'tut.app-garage--esencial.4.texto':
    'The full list, with plate, mileage and service count on each card. Tapping one opens its record, with its service history and procedures.',
  'tut.app-garage--esencial.5.titulo': 'Adding a new one',
  'tut.app-garage--esencial.5.texto':
    "Name, type, make, model, year, plates and today's odometer reading. With plates set, the record also unlocks the procedures that only apply to a plated vehicle, like inspection or registration renewal.",
  'tut.app-hobbies--esencial.1.titulo': 'Your pastimes',
  'tut.app-hobbies--esencial.1.texto':
    'Hobbies tracks what you practice for fun: each hobby gathers its sessions, its streak and, if you want, its projects.',
  'tut.app-hobbies--esencial.2.titulo': 'Your hobbies',
  'tut.app-hobbies--esencial.2.texto':
    "Each hobby you register shows up here as a card, with the week's progress and the active streak. Opening one shows its stats, its yearly heatmap, the session log and its projects.",
  'tut.app-hobbies--esencial.3.titulo': 'Adding a hobby',
  'tut.app-hobbies--esencial.3.texto':
    'This button opens the form to add a new hobby: name, emoji, color and, if you want, a weekly goal in practice days.',
  'tut.app-hobbies--esencial.4.titulo': 'Inside each hobby',
  'tut.app-hobbies--esencial.4.texto':
    'There you log sessions with minutes and a note, see your yearly heatmap, and run projects with their own progress. Goals and their timeline live in the Goals room.',
  'tut.app-ideas--esencial.1.titulo': 'Ideas',
  'tut.app-ideas--esencial.1.texto':
    'Ideas keeps whatever crosses your mind and helps it mature: first it gets written down, then ordered into a map and, if needed, compared to decide. Three menus.',
  'tut.app-ideas--esencial.2.titulo': 'Idea diary',
  'tut.app-ideas--esencial.2.texto':
    'The inbox where any occurrence lands, loose or grouped into a brainstorm by topic. It can be filed into folders, starred, and once it matures, turned into a map.',
  'tut.app-ideas--esencial.3.titulo': 'Concept maps',
  'tut.app-ideas--esencial.3.texto':
    'A free canvas to order a topic in whichever format fits best: mind map, tree, flow, timeline, cycle, pyramid, Venn and more.',
  'tut.app-ideas--esencial.4.titulo': 'Decision diagrams',
  'tut.app-ideas--esencial.4.texto':
    'The same canvas, with formats built for deciding: weighted pros and cons, SWOT, Eisenhower, or a weighted matrix that ranks the options on its own.',
  'tut.app-idiomas--esencial.1.titulo': 'Your language school',
  'tut.app-idiomas--esencial.1.texto':
    'Here you pick a language, chat with an AI tutor, save the vocabulary you learn, and review it with a spaced system. There are four menus: Chats, Curriculum, Review, and Progress.',
  'tut.app-idiomas--esencial.2.titulo': 'Chats',
  'tut.app-idiomas--esencial.2.texto':
    'You talk with your tutor in the language you are studying: it responds to your level and corrects you gently. Every chat is saved and classified on its own, and when you leave it offers to extract the new vocabulary as cards.',
  'tut.app-idiomas--esencial.3.titulo': 'Curriculum',
  'tut.app-idiomas--esencial.3.texto':
    'It organizes the language into topics, pronunciation, and grammar, from level A1 to C2. Vocabulary lives inside each topic: every card is stored there, with its translation and example.',
  'tut.app-idiomas--esencial.4.titulo': 'Review',
  'tut.app-idiomas--esencial.4.texto':
    'Spaced review: each card lives in a box and only the ones you are about to forget come up, with exercises — multiple choice, reverse, or filling in the sentence — instead of just looking at cards.',
  'tut.app-idiomas--esencial.5.titulo': 'Progress',
  'tut.app-idiomas--esencial.5.texto':
    'A summary of your progress: how many cards you have mastered, how much you reviewed, and your current level, with a day-by-day history of your reviews.',
  'tut.app-jardin--esencial.1.titulo': 'Your space for calm',
  'tut.app-jardin--esencial.1.texto':
    'The garden holds three practices: meditation, guided breathing, and gratitude. It carries no points or streaks on purpose: nothing punishes missing a day here, it just keeps pace with what you practice.',
  'tut.app-jardin--esencial.2.titulo': 'Meditation',
  'tut.app-jardin--esencial.2.texto':
    'Pick a sound track and a duration, or meditate in silence with a bell at the start and the end. Each session is saved to your history.',
  'tut.app-jardin--esencial.3.titulo': 'Breathing',
  'tut.app-jardin--esencial.3.texto':
    'Two guided breathing patterns, one to center you and one to release the day: the screen breathes along with you as it goes.',
  'tut.app-jardin--esencial.4.titulo': 'Gratitude',
  'tut.app-jardin--esencial.4.texto':
    "Write down what you're grateful for today, even just one thing, and revisit past entries whenever you like. No streaks: missing a day erases nothing.",
  'tut.app-metas--esencial.1.titulo': 'The house planner',
  'tut.app-metas--esencial.1.texto':
    'This room keeps no records of its own: it gathers in one place the goals and plans that are born in the other apps. Three menus, read in this order: what you set out to do, how you plan to split it and when it lands.',
  'tut.app-metas--esencial.2.titulo': 'Goals',
  'tut.app-metas--esencial.2.texto':
    'The list of everything you set out to do, grouped by the app that carries each goal. A goal can hang from another one, and tapping it opens its sheet: there you find its deadline, its steps and the way into its own timeline.',
  'tut.app-metas--esencial.3.titulo': 'Plans',
  'tut.app-metas--esencial.3.texto':
    'A plan is the draft of a schedule: it splits a goal into phases with their dates. While it is a proposal you can tweak it freely; once it convinces you, accept it and its phases become real sub-goals.',
  'tut.app-metas--esencial.4.titulo': 'Timeline',
  'tut.app-metas--esencial.4.texto':
    'The time axis with every goal at once: each one is a bar over the dates. You can zoom in and out by days, weeks, months or years, and a plan can be laid on top to compare it with what is already mapped out.',
  'tut.app-sala--esencial.1.titulo': 'Your travel living room',
  'tut.app-sala--esencial.1.texto':
    'Your travel world lives here: a world map with pins, itineraries of places to see, routes that chain places together, and a logbook of memories. There are four menus.',
  'tut.app-sala--esencial.2.titulo': 'Map',
  'tut.app-sala--esencial.2.texto':
    'Every place you visited or dream of visiting is a pin on the world map. The switch at the top swaps the flat map for a globe you spin by dragging.',
  'tut.app-sala--esencial.3.titulo': 'Itinerary',
  'tut.app-sala--esencial.3.texto':
    'The places you dream of visiting, each with its own day-by-day plan. The ones with a date schedule themselves on the calendar.',
  'tut.app-sala--esencial.4.titulo': 'Routes',
  'tut.app-sala--esencial.4.texto': 'A route chains places together into a trip and draws it on the map.',
  'tut.app-sala--esencial.5.titulo': 'Logbook',
  'tut.app-sala--esencial.5.texto':
    'The memories of the places you visited, in albums by country: photos and stories from each spot.',
  'tut.app-agenda--trabajo.1.titulo': 'The inbox',
  'tut.app-agenda--trabajo.1.texto':
    'Work has two views: the Pending tray and the Board. Pending holds what needs doing but has no day yet, with its priority; nothing forces you to pick a day just to write it down.',
  'tut.app-agenda--trabajo.3.titulo': 'The board',
  'tut.app-agenda--trabajo.3.texto':
    'All your work in three columns —to do, in progress and done—, including what already has a date. Press and hold a card to drag it between columns (dropping it on «Done» also ticks it in the calendar), or move it with the arrows.',
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
  'tut.app-agenda--salud.ciclo.titulo': 'The cycle',
  'tut.app-agenda--salud.ciclo.texto':
    'At the end of You lives the cycle, with its own switch: bleeding, symptoms and mood per day, and from your last periods it estimates the next one and the fertile window. Turning it off keeps everything you logged.',
  'tut.app-agenda--salud.projimos.titulo': 'Loved ones',
  'tut.app-agenda--salud.projimos.texto':
    'The people in your care: contacts from People marked «In my care», each with their appointments by specialty, their care routines and their medication. Pep@ keeps their mother here.',
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
    'The Goals room keeps the four goals Pep@ ticked off — the 5K, the 10K, the half marathon and the marathon — plus the one still open. Goals with a date also show up in the house calendar.',
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
  'tut.app-cocina--cronograma.1.titulo': 'What Kitchen asks of you today',
  'tut.app-cocina--cronograma.1.texto':
    'The Missions button in the header opens the checklist of the day: the water, the meals and any steps coming from your goals. The goals themselves —with the plan the AI suggests for them— live in the Goals room, grouped by the app that owns them.',
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
    'These goals are kept on the axis of time in the Goals room: give one dates and it shows up among your calendar days. With ✨ the AI suggests the payment plan.',
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
  'tut.app-garage--vehiculos.2b.titulo': 'Adding a new one',
  'tut.app-garage--vehiculos.2b.texto':
    "Name, type, make, model, year, plates and today's odometer. With plates on, the garage knows which paperwork to offer you later.",
  'tut.app-garage--vehiculos.3.titulo': 'The everyday bike',
  'tut.app-garage--vehiculos.3.texto':
    'Their real transport: chain, inner tubes, brakes, each in its own row — the same folder-by-year-and-month archive other apps use. Notice how the services bunch up in the last few months: that is marathon training taking its toll.',
  'tut.app-garage--vehiculos.4.titulo': 'And the inherited car',
  'tut.app-garage--vehiculos.4.texto':
    'Here is the month 7 breakdown: stranded, a tow truck, and almost ten thousand pesos they did not have. Every service keeps its cost, its mileage and which garage did it.',
  'tut.app-garage--vehiculos.5.titulo': 'The file',
  'tut.app-garage--vehiculos.5.texto':
    'Make, model, year, plates and current mileage. With plates on, the garage unlocks the paperwork that only applies to a car.',
  'tut.app-garage--tramites.tabs.titulo': 'Three notebooks',
  'tut.app-garage--tramites.tabs.texto':
    "Each vehicle's file splits its papers into three notebooks: Paperwork, Documents and Contacts. The service history stays below, whichever notebook you are looking at.",
  'tut.app-garage--tramites.1.titulo': "What's coming",
  'tut.app-garage--tramites.1.texto':
    'Each item keeps its next due date, how many months it repeats and what it costs. Tick it off and the date jumps to the next one by itself.',
  'tut.app-garage--tramites.2.titulo': 'The bike pays no road tax',
  'tut.app-garage--tramites.2.texto':
    'With no plates only what applies is offered: for the bike, its periodic maintenance. Inspection, road tax or insurance ask for plates, so its Documents notebook sits empty.',
  'tut.app-garage--tramites.2b.titulo': 'The papers, kept apart',
  'tut.app-garage--tramites.2b.texto':
    'The registration card, the policy and the road tax do not mix with what happens at the shop: they get their own notebook, with folio, due date and advance notice.',
  'tut.app-garage--tramites.3.titulo': 'The Contacts notebook',
  'tut.app-garage--tramites.3.texto':
    'The trusted garage, the insurer, the inspection centre, the neighbourhood bike shop and the tow truck from that night — with phone and address one tap away.',
  'tut.app-garage--tramites.4.texto':
    'All that paperwork is in the house calendar too, with its advance warning. And careful: the vehicles you drive around the map are a different thing, they live in the Inventory.',
  'tut.app-sala--mapa.1.titulo': 'Where you have been',
  'tut.app-sala--mapa.1.texto':
    'Four countries and a handful of cities: nearly all from one single trip. Tap any of the three numbers to see the list below the map.',
  'tut.app-sala--mapa.2.titulo': 'The pins',
  'tut.app-sala--mapa.2.texto':
    'The seven pins clustered in Japan are the three weeks of the trip; the amber ones —Seoul, Patagonia, Iceland— are what has not happened yet. To drop a new one, turn on «Visited pin» or «Wishlist pin» and tap the spot on the map.',
  'tut.app-sala--mapa.3.titulo': 'The globe',
  'tut.app-sala--mapa.3.texto':
    'The switch up top swaps the flat map for a globe you spin by dragging, with the same tappable pins. The globe only looks: new pins are placed in the flat view.',
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
    'World, economy, tech, health, sport and entertainment, with the chips up top to filter. The mastheads are real press in your language —each headline names its own— and different outlets rotate in every day.',
  'tut.app-diario--habito.2.titulo': 'It refreshes itself',
  'tut.app-diario--habito.2.texto':
    "The edition downloads on its own and at midnight it is swapped whole: nothing piles up here, just like a real newspaper. And if you change the home's language, it changes press too: each language brings its own outlets.",
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
