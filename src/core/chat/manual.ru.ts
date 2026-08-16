import type { ManualTraducido } from './manualI18n'

/**
 * Las frases de ejemplo del manual de comandos en ruso, indexadas por
 * su texto español de origen (ver `manualI18n.ts`).
 *
 * Registro: tuteo («ты»), como marca el glosario. Los comandos de logging en
 * primera persona (Comí, Dormí, Gasté…) NO se tradujeron como verbos en
 * pasado: en ruso el pasado marca género (comió él/ella) y asumiríamos el del
 * usuario. Se resolvió con etiquetas nominales o participios pasivos neutros
 * («Приём пищи:», «Потрачено», «Сон:»), igual que ya hace `glosario.mjs` con
 * la arroba de «Pep@». El resto de comandos son imperativos de «ты», que en
 * ruso no marca género.
 */
export const MANUAL_RU: ManualTraducido = {
  frases: {
    '[Comí] {pollo con arroz} en la {cena}':
      '[Приём пищи]: {курица с рисом} на {ужин}',
    '[Tomé] {2 vasos} de [agua]':
      '[Выпито] {2 стакана} [воды]',
    '[Me pesé]: {74 kg}':
      '[Вес]: {74 кг}',
    '[Abre] el {recetario}':
      '[Открой] {книгу рецептов}',
    '[Abre] la {lista del súper}':
      '[Открой] {список покупок}',
    '[Abre] el {diario de comidas}':
      '[Открой] {дневник питания}',
    '[Abre] la {dieta}':
      '[Открой] {диету}',
    '[Abre] las {metas de nutrición}':
      '[Открой] {цели по питанию}',
    'Inventa una [receta] {ligera con atún}':
      'Придумай [рецепт] {лёгкий, с тунцом}',
    'Arma una [dieta] {alta en proteína}':
      'Составь [диету] {с высоким содержанием белка}',
    'Agrega {plátano y avena} a la [lista del súper]':
      'Добавь {банан и овсянку} в [список покупок]',
    '[Entrené] {pierna} {45 min}':
      '[Тренировка]: {ноги} {45 мин}',
    '[Corrí] {5 km}':
      '[Пробежка]: {5 км}',
    '[Abre] el {plan de ejercicio}':
      '[Открой] {план тренировок}',
    '[Abre] {fuerza}':
      '[Открой] {силовые}',
    '[Abre] {cardio}':
      '[Открой] {кардио}',
    '[Abre] {flexibilidad}':
      '[Открой] {гибкость}',
    '[Abre] las {metas de ejercicio}':
      '[Открой] {цели по тренировкам}',
    'Registra mi sesión: {crossfit 40 min, intensidad alta}':
      'Запиши тренировку: {кроссфит 40 мин, высокая интенсивность}',
    '[Dormí] {7 horas}, calidad {4/5}':
      '[Сон]: {7 часов}, качество {4/5}',
    '[Abre] el {despertador}':
      '[Открой] {будильник}',
    '[Abre] {mi sueño}':
      '[Открой] {мой сон}',
    '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}':
      '{Отбой в 23:00, подъём в 7:00, ночных пробуждений — 2}',
    '[Recuerdo]: {tarde de juegos con mi hermana}':
      '[Воспоминание]: {вечер игр с сестрой}',
    '[Abre] mis {anécdotas}':
      '[Открой] мои {воспоминания}',
    '[Abre] el {calendario de ánimo}':
      '[Открой] {календарь настроения}',
    'Anota esta anécdota: {hoy celebramos el cumple de mamá}':
      'Запиши это воспоминание: {сегодня отметили день рождения мамы}',
    '[Gasté] {500} en {el súper}':
      '[Потрачено] {500} в {супермаркете}',
    '[Cobré] {8000} de {la quincena}':
      '[Получено] {8000} за {две недели}',
    '[Abre] el {balance}':
      '[Открой] {баланс}',
    '[Abre] los {gastos fijos}':
      '[Открой] {постоянные расходы}',
    '[Abre] los {movimientos}':
      '[Открой] {операции}',
    '[Abre] las {metas de ahorro}':
      '[Открой] {цели накоплений}',
    '[Abre] las {divisas}':
      '[Открой] {валюту}',
    '[Abre] las {criptomonedas}':
      '[Открой] {криптовалюты}',
    '[Abre] las {materias primas}':
      '[Открой] {сырьевые товары}',
    '{Pagué 250 de luz y 180 de agua}':
      '{Оплачено: 250 за свет и 180 за воду}',
    '[Abre] el {formulario}':
      '[Открой] {сборник формул}',
    '[Abre] la {calculadora}':
      '[Открой] {калькулятор}',
    '[Abre] el {graficador}':
      '[Открой] {построитель графиков}',
    '[Abre] las {hojas de cálculo}':
      '[Открой] {таблицы}',
    '[Resolver ecuación]':
      '[Решить уравнение]',
    '[Convertir unidades]':
      '[Конвертировать единицы]',
    '[Abre] las {matrices}':
      '[Открой] {матрицы}',
    '[Sistema de ecuaciones]':
      '[Система уравнений]',
    '[Convertir a binario]':
      '[Перевести в двоичную систему]',
    '[Propina]':
      '[Чаевые]',
    '[Regla de tres]':
      '[Правило трёх]',
    '[Estudié] {historia romana} {30 min}':
      '[Изучено]: {римская история} {30 мин}',
    '[Abre] las {charlas}':
      '[Открой] {чаты}',
    '[Abre] la {enciclopedia}':
      '[Открой] {энциклопедию}',
    '[Abre] la {sesión de estudio}':
      '[Открой] {учебную сессию}',
    '[Abre] el {resumen de estudio}':
      '[Открой] {сводку по учёбе}',
    'Apunta que aprendí: {los ríos de Europa}':
      'Отметь как изученное: {реки Европы}',
    '[Vi la película] {Dune}':
      '[Просмотр]: {Дюна}',
    '[Jugué] {ajedrez} con mi hermano':
      '[Игра]: {шахматы} с братом',
    '[Abre] el {archivo}':
      '[Открой] {архив}',
    '[Abre] la {mesa de juegos}':
      '[Открой] {игровой стол}',
    '[Quiero jugar] la {viborita}':
      '[Хочу сыграть] в {змейку}',
    '[Juega] {tetris}':
      '[Играй] в {тетрис}',
    '[Juega] una partida de {ajedrez}':
      '[Играй] партию в {шахматы}',
    'Apunta {la serie Dark} como pendiente':
      'Добавь {сериал Тьма} в список «посмотреть»',
    '[Abre] el {mapamundi}':
      '[Открой] {карту мира}',
    '[Abre] {por conocer}':
      '[Открой] {хочу посетить}',
    '[Abre] las {rutas}':
      '[Открой] {маршруты}',
    '[Abre] la {bitácora de viajes}':
      '[Открой] {путевой дневник}',
    '[Visité] {Oaxaca}':
      '[Поездка]: {Оахака}',
    'Quiero conocer {Japón}':
      'Хочу побывать в {Японии}',
    '[Visité] {Roma}: {la fontana de noche es mágica}':
      '[Поездка]: {Рим}: {фонтан ночью — это волшебно}',
    '[Medité] {10 min}':
      '[Медитация]: {10 мин}',
    '[@]{jardin} [agradezco] {mi salud, mi familia y el café}':
      '[@]{jardin} [благодарность за] {здоровье, семью и кофе}',
    '[Abre] la {meditación}':
      '[Открой] {медитацию}',
    '[Abre] la {respiración}':
      '[Открой] {дыхательные практики}',
    '[Abre] los {agradecimientos}':
      '[Открой] {благодарности}',
    'Cambié el [aceite] del {auto}':
      'Замена [масла] в {машине}',
    '[Abre] el {resumen del garage}':
      '[Открой] {сводку по гаражу}',
    '[Abre] {mis vehículos}':
      '[Открой] {мой транспорт}',
    '[Abre] los {titulares}':
      '[Открой] {заголовки}',
    '[Abre] las {efemérides}':
      '[Открой] {день в истории}',
    'Avancé en mi [proyecto] de {acuarela} {40 min}':
      'Прогресс по [проекту] {акварель}: {40 мин}',
    'Practiqué {guitarra} {25 min}':
      'Практика: {гитара} {25 мин}',
    '[Abre] {mis hobbies}':
      '[Открой] {мои хобби}',
    '[Abre] mis {mapas mentales}':
      '[Открой] мои {интеллект-карты}',
    '[Abre] los {mapas conceptuales}':
      '[Открой] {концептуальные карты}',
    '[Hazme un mapa mental] de {la fotosíntesis}':
      '[Сделай интеллект-карту] по теме {фотосинтез}',
    '[Dibuja un diagrama de flujo] de {cómo hacer pan}':
      '[Нарисуй блок-схему] {как испечь хлеб}',
    '[Compara] {café} y {té} en un mapa':
      '[Сравни] {кофе} и {чай} на карте',
    '[Haz un esquema] de {lo que me acabas de explicar}':
      '[Сделай схему] по {только что объяснённому}',
    '[Agenda] una {junta con el cliente} el {martes a las 10}':
      '[Запланируй] {встречу с клиентом} на {вторник в 10:00}',
    '[Apunta el pendiente] {mandar la cotización}':
      '[Добавь задачу] {отправить смету}',
    '[Tengo cita] con el {dentista} el {14 a las 5}':
      '[Запись]: {стоматолог}, {14-е, 17:00}',
    '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}':
      '[Напомни] принять {ибупрофен} в {8:00 и 20:00}',
    '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}':
      '[Сохрани контакт]: {Анна}, {5512345678}, день рождения {3 мая}',
    '[Abre] mis {pendientes}':
      '[Открой] мои {задачи}',
    '[Abre] mis {citas médicas}':
      '[Открой] мои {визиты к врачу}',
    '[Abre] mis {contactos}':
      '[Открой] мои {контакты}',
    '[Vocab] {inglés}: {dog} = {perro}':
      '[Слово] {английский}: {dog} = {собака}',
    '[Repasé] {francés} {15 min}':
      '[Повторение]: {французский} {15 мин}',
    '[Abre] el {tutor}':
      '[Открой] {тьютора}',
    '[Abre] el {repaso}':
      '[Открой] {повторение}',
    '[Abre] el {temario}':
      '[Открой] {программу курса}',
    '[Abre] el {progreso de idiomas}':
      '[Открой] {прогресс по языкам}',
    'Aprendí en {alemán}: {Hund} = {perro}':
      'Новое слово на {немецком}: {Hund} = {собака}',
    '[Construye] un {huerto}':
      '[Построй] {огород}',
    '[Quiero sembrar] {zanahorias}':
      '[Хочу посадить] {морковь}',
    '[Siembra] {maíz} en el huerto':
      '[Посади] {кукурузу} в огороде',
    '[Pon] un {aspersor} en el huerto':
      '[Поставь] {разбрызгиватель} в огороде',
    '[Riega] el {huerto}':
      '[Полей] {огород}',
    '[Cosecha] el {huerto}':
      '[Собери урожай] с {огорода}',
    '[Llévame] al {huerto}':
      '[Отведи меня] в {огород}',
    '[Haz] un {corral}':
      '[Сделай] {загон}',
    '[Pon] {vacas} en la granja':
      '[Поставь] {коров} на ферму',
    '[Alimenta] a los {animales}':
      '[Покорми] {животных}',
    '[Mima] a los {animales}':
      '[Приласкай] {животных}',
    '[Cura] a los {animales}':
      '[Вылечи] {животных}',
    '[Limpia] los {corrales}':
      '[Убери] {загоны}',
    '[Llévame] a la {granja}':
      '[Отведи меня] на {ферму}',
    '[Pon] una {pista de carreras}':
      '[Поставь] {гоночную трассу}',
    '[Traza] las {vías del tren}':
      '[Проложи] {железнодорожные пути}',
    '[Construye] una {montaña rusa}':
      '[Построй] {американские горки}',
    '[Pon] la {meta} de la pista':
      '[Поставь] {финиш} трассы',
    '[Borra] la {pista}':
      '[Удали] {трассу}',
    '[Corre una carrera] de {3 vueltas}':
      '[Устрой заезд] на {3 круга}',
    '[Hagamos una carrera] {contra} un asistente':
      '[Давай устроим заезд] {против} помощника',
    '[Corre una carrera] {fácil} de {5 vueltas}':
      '[Устрой заезд]: {лёгкий}, {5 кругов}',
    '[Quiero montar] el {tren}':
      '[Хочу прокатиться] на {поезде}',
    '[Quiero montar] la {montaña rusa}':
      '[Хочу прокатиться] на {американских горках}',
    '[Llévame] a la {meta}':
      '[Отведи меня] на {финиш}',
    '[Juguemos] {paintball}':
      '[Сыграем] в {пейнтбол}',
    '[Juguemos paintball] {2v2}':
      '[Сыграем в пейнтбол] {2 на 2}',
    '[Reta] a {Luna} a un paintball {1v1}':
      '[Вызови] {Луну} на пейнтбол {1 на 1}',
    '[Paintball] campal en {difícil}':
      '[Пейнтбол] «все против всех» на {сложном} уровне',
    '[Sal] del {paintball}':
      '[Выйди] из {пейнтбола}',
    '[Pon] una {cancha de fútbol}':
      '[Поставь] {футбольное поле}',
    '[Pon] una {cancha de tenis} {azul}':
      '[Поставь] {синий} {теннисный корт}',
    '[Crea] una {cancha de básquet}':
      '[Создай] {баскетбольную площадку}',
    '[Pon] un {campo de béisbol}':
      '[Поставь] {бейсбольное поле}',
    '[Llévame] a la {cancha}':
      '[Отведи меня] на {площадку}',
    '[Abre] la {agenda de hoy}':
      '[Открой] {план на сегодня}',
    '[Abre] {mi semana}':
      '[Открой] {мою неделю}',
    '[Abre] el {cronograma}':
      '[Открой] {расписание}',
    '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}':
      '[Создай рутину] по утрам: {вода, растяжка и благодарность} в {7:00}',
    '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}':
      '[Создай рутину] на {понедельник и среду}: {бег 20 мин}',
    '[Enséñame] las {rutinas}':
      '[Покажи] {рутины}',
    '[Crea un cuarto] llamado {Estudio}':
      '[Создай комнату] под названием {Студия}',
    '[Renombra] la {cocina} a {Oficina}':
      '[Переименуй] {кухню} в {Офис}',
    '[Cambia el ícono] de la {cocina} a {🍳}':
      '[Смени иконку] {кухни} на {🍳}',
    '[Pon] la {cocina} en categoría {cuerpo}':
      '[Помести] {кухню} в категорию {тело}',
    '[Agrega] la {biblioteca} al mapa':
      '[Добавь] {библиотеку} на карту',
    '[Elimina] la {cocina}':
      '[Удали] {кухню}',
    '[Abre] la {cocina}':
      '[Открой] {кухню}',
    '[Pinta] la {cocina} de {azul}':
      '[Покрась] {кухню} в {синий}',
    '[Piso] de la {cocina} de {madera}':
      '{Деревянный} [пол] на {кухне}',
    '[Piso] de la {cocina} {rojo}':
      '{Красный} [пол] на {кухне}',
    '[Techo] de la {cocina} de {tejas rojas}':
      '[Крыша] {кухни} из {красной черепицы}',
    '[Techo a dos aguas] en la {cocina}':
      '[Двускатная крыша] на {кухне}',
    '[Haz] la {cocina} {redonda}':
      '[Сделай] {кухню} {круглой}',
    '[Agranda] la {cocina}':
      '[Увеличь] {кухню}',
    '[Encoge] la {cocina}':
      '[Уменьши] {кухню}',
    '[Mueve] la {cocina} a la {derecha}':
      '[Передвинь] {кухню} {вправо}',
    '[Abre el muro] {norte} de la {cocina}':
      '[Открой] {северную} стену {кухни}',
    '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}':
      '[Поставь дверь] {раздвижную} в {южной} стене {кухни}',
    '[Pon] {ladrillo} en el muro {este} de la {cocina}':
      '[Поставь] {кирпич} на {восточную} стену {кухни}',
    '[Haz más grueso] el muro {norte} de la {cocina}':
      '[Сделай толще] {северную} стену {кухни}',
    '[Apila] la {sala} sobre la {cocina}':
      '[Поставь] {гостиную} над {кухней}',
    '[Agranda el mapa] hacia el {este}':
      '[Расширь карту] на {восток}',
    '[Crea] una {lámpara}':
      '[Создай] {лампу}',
    '[Pinta el último objeto] de {rojo}':
      '[Покрась последний объект] в {красный}',
    '[Gira el último objeto]':
      '[Поверни последний объект]',
    '[Haz el último objeto] más {grande}':
      '[Сделай последний объект] {больше}',
    '[Agrupa los objetos] de la {cocina}':
      '[Сгруппируй объекты] {кухни}',
    '[Quita el último objeto]':
      '[Убери последний объект]',
    '[Genera en 3D] {un dragón morado}':
      '[Сгенерируй в 3D] {фиолетового дракона}',
    '[Genera en 3D] {una fuente de piedra} estilo {minimalista}':
      '[Сгенерируй в 3D] {каменный фонтан} в стиле {минимализм}',
    '[Crea una imagen] de {un atardecer en la playa}':
      '[Создай изображение] {заката на пляже}',
    '[Ponme] {sombrero} {rojo}':
      '[Надень на меня] {красную} {шляпу}',
    '[Quítame] los {lentes}':
      '[Сними с меня] {очки}',
    '[Pinta el torso] del [avatar] de {verde}':
      '[Покрась торс] [аватара] в {зелёный}',
    '[Haz el avatar] más {grande}':
      '[Сделай аватар] {больше}',
    '[Móntame] en la {bici}':
      '[Посади меня] на {велосипед}',
    '[Quiero conducir] el {auto}':
      '[Хочу вести] {машину}',
    '[Bájame]':
      '[Ссади меня]',
    '[Vista en] {primera persona}':
      '[Вид] от {первого лица}',
    '[Vista] {isométrica}':
      '{Изометрический} [вид]',
    '[Cambia el tema] a {navidad}':
      '[Смени тему] на {Рождество}',
    '[Fondo] {nieve}':
      '[Фон] {снег}',
    '[Quita el tema]':
      '[Убери тему]',
    '[Pon música] {relajante}':
      '[Включи музыку] {расслабляющую}',
    '[Música] {chiptune}':
      '[Музыка] {чиптюн}',
    '[Volumen] al {40%}':
      '[Громкость] на {40%}',
    '[Apaga la música]':
      '[Выключи музыку]',
    '[Abre] mi {resumen semanal}':
      '[Открой] мою {недельную сводку}',
    '[Abre] mi {resumen mensual}':
      '[Открой] мою {месячную сводку}',
    '[Modo] {oscuro}':
      '{Тёмный} [режим]',
    '[Apariencia] {transparente}':
      '{Прозрачное} [оформление]',
    '[Cambia el idioma] a {inglés}':
      '[Смени язык] на {английский}',
    '[Tema de interfaz] {neón}':
      '[Тема интерфейса] {неон}',
    '[Tipografía] {serif}':
      '[Шрифт] {с засечками}',
    '[Pon iconos] {profesionales}':
      '[Поставь иконки] {профессиональные}',
    '[Transparencia] al {40%}':
      '[Прозрачность] на {40%}',
    '[Estilo] {cómic}':
      '[Стиль] {комикс}',
    '[Apaga los efectos]':
      '[Выключи эффекты]',
    '[Avísame] de mis {rutinas}':
      '[Напоминай] о моих {рутинах}',
    '[Avísame de mis metas] a las {21:00}':
      '[Напоминай о моих целях] в {21:00}',
    '[Apaga los avisos]':
      '[Выключи уведомления]',
    '[Descarga un respaldo] de mis datos':
      '[Скачай резервную копию] моих данных',
    '[Vuelve a ver la bienvenida]':
      '[Покажи приветствие] ещё раз',
    '[Abre las configuraciones]':
      '[Открой настройки]',
    '[Abre] mi {cuenta}':
      '[Открой] мой {аккаунт}',
    '[Recuerda que] {soy vegetariano}':
      '[Запомни, что] {я вегетарианец}',
    '[@]{cocina} {ensalada de la comida}':
      '[@]{cocina} {салат на обед}',
    '[Cómo funciona] la {cocina}':
      '[Как работает] {кухня}',
    '[Cómo funciona] el {editor}':
      '[Как работает] {редактор}',
    '[Cómo funciona] la {rueda de herramientas}':
      '[Как работает] {колесо инструментов}',
    '[Cómo funciona] el {chat}':
      '[Как работает] {чат}',
    '[Qué hace] el {inventario}':
      '[Что делает] {инвентарь}',
    '[Para qué sirve] la {cámara}':
      '[Для чего нужна] {камера}',
    '[Tutorial de] {ejercicio}':
      '[Обучение по теме] {спортзал}',
    '[Tutorial de] la {biblioteca}':
      '[Обучение по теме] {библиотека}',
    '[Tutorial] {general}':
      '{Общее} [обучение]',
  },
  atajos: {
    'Caminar (también con las flechas)':
      'Ходьба (также стрелками)',
    'Correr (se queda puesto hasta volver a pulsar)':
      'Бег (остаётся включённым, пока не нажмёшь снова)',
    'Saltar':
      'Прыжок',
    'Agacharse (mantener pulsado)':
      'Присесть (удерживать)',
    'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel':
      'То, что перед тобой: войти в комнату, сесть в транспорт или выйти из него, сменить этаж',
    'Levantar la mano derecha / izquierda':
      'Поднять правую / левую руку',
    'Bailar':
      'Танцевать',
    'Mortal':
      'Сальто',
    'Abrir la rueda de herramientas':
      'Открыть колесо инструментов',
    'Abrir el chat y escribir':
      'Открыть чат и написать',
    'Cambiar de vista: isométrica, tercera y primera persona':
      'Сменить вид: изометрический, от третьего и от первого лица',
    'Esconder o mostrar el HUD':
      'Скрыть или показать HUD',
    'Cerrar lo que esté abierto':
      'Закрыть то, что открыто',
    'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa':
      'За рулём НЛО: вверх и вниз. На остальном транспорте пробел — занос',
  },
  teclas: {
    'Mayús': 'Shift',
    'Espacio': 'Пробел',
    'Espacio · Mayús': 'Пробел · Shift',
  },
}
