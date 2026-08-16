import type { ManualTraducido } from './manualI18n'

/**
 * Las frases de ejemplo del manual de comandos en árabe (fuṣḥà / MSA),
 * indexadas por su texto español de origen (ver `manualI18n.ts`).
 *
 * Registro: MSA directo, con imperativo en masculino singular por defecto
 * cuando el comando se dirige al asistente/la app (destinatario de género
 * no especificado; es el uso genérico estándar). La 1ª persona del pasado
 * («comí», «dormí», «gasté»…) NO marca género en árabe (a diferencia de la
 * 2ª y 3ª persona), así que esos registros van en pasado normal sin
 * rodeos. Cifras en dígitos occidentales (0-9), no arábigo-índicos.
 */
export const MANUAL_AR: ManualTraducido = {
  frases: {
    '[Comí] {pollo con arroz} en la {cena}':
      '[أكلت] {دجاج مع أرز} في {العشاء}',
    '[Tomé] {2 vasos} de [agua]':
      '[شربت] {2 أكواب} من [الماء]',
    '[Me pesé]: {74 kg}':
      '[وزنت نفسي]: {74 كغ}',
    '[Abre] el {recetario}':
      '[افتح] {كتاب الوصفات}',
    '[Abre] la {lista del súper}':
      '[افتح] {قائمة التسوق}',
    '[Abre] el {diario de comidas}':
      '[افتح] {سجل الوجبات}',
    '[Abre] la {dieta}':
      '[افتح] {الحمية}',
    '[Abre] las {metas de nutrición}':
      '[افتح] {أهداف التغذية}',
    'Inventa una [receta] {ligera con atún}':
      'ابتكر [وصفة] {خفيفة بالتونة}',
    'Arma una [dieta] {alta en proteína}':
      'ضع [حمية] {غنية بالبروتين}',
    'Agrega {plátano y avena} a la [lista del súper]':
      'أضف {موز وشوفان} إلى [قائمة التسوق]',
    '[Entrené] {pierna} {45 min}':
      '[تدربت] على {الأرجل} {45 دقيقة}',
    '[Corrí] {5 km}':
      '[ركضت] {5 كم}',
    '[Abre] el {plan de ejercicio}':
      '[افتح] {خطة التمرين}',
    '[Abre] {fuerza}':
      '[افتح] {القوة}',
    '[Abre] {cardio}':
      '[افتح] {التحمل}',
    '[Abre] {flexibilidad}':
      '[افتح] {المرونة}',
    '[Abre] las {metas de ejercicio}':
      '[افتح] {أهداف التمرين}',
    'Registra mi sesión: {crossfit 40 min, intensidad alta}':
      'سجّل جلستي: {كروسفيت 40 دقيقة، شدة عالية}',
    '[Dormí] {7 horas}, calidad {4/5}':
      '[نمت] {7 ساعات}، بجودة {4/5}',
    '[Abre] el {despertador}':
      '[افتح] {المنبه}',
    '[Abre] {mi sueño}':
      '[افتح] {نومي}',
    '{Me acosté a las 23, desperté a las 7 y me levanté 2 veces}':
      '{نمت الساعة 23، واستيقظت الساعة 7، ونهضت مرتين}',
    '[Recuerdo]: {tarde de juegos con mi hermana}':
      '[ذكرى]: {أمسية ألعاب مع أختي}',
    '[Abre] mis {anécdotas}':
      '[افتح] {ذكرياتي}',
    '[Abre] el {calendario de ánimo}':
      '[افتح] {تقويم المزاج}',
    'Anota esta anécdota: {hoy celebramos el cumple de mamá}':
      'دوّن هذه الذكرى: {احتفلنا اليوم بعيد ميلاد أمي}',
    '[Gasté] {500} en {el súper}':
      '[أنفقت] {500} في {السوبرماركت}',
    '[Cobré] {8000} de {la quincena}':
      '[قبضت] {8000} من {راتب نصف الشهر}',
    '[Abre] el {balance}':
      '[افتح] {التدفق النقدي}',
    '[Abre] los {gastos fijos}':
      '[افتح] {المصروفات الثابتة}',
    '[Abre] los {movimientos}':
      '[افتح] {المعاملات}',
    '[Abre] las {metas de ahorro}':
      '[افتح] {أهداف الادخار}',
    '[Abre] las {divisas}':
      '[افتح] {العملات}',
    '[Abre] las {criptomonedas}':
      '[افتح] {العملات الرقمية}',
    '[Abre] las {materias primas}':
      '[افتح] {السلع}',
    '{Pagué 250 de luz y 180 de agua}':
      '{دفعت 250 للكهرباء و180 للماء}',
    '[Abre] el {formulario}':
      '[افتح] {كتيب الصيغ}',
    '[Abre] la {calculadora}':
      '[افتح] {الآلة الحاسبة}',
    '[Abre] el {graficador}':
      '[افتح] {الرسم البياني}',
    '[Abre] las {hojas de cálculo}':
      '[افتح] {جداول البيانات}',
    '[Resolver ecuación]':
      '[حل معادلة]',
    '[Convertir unidades]':
      '[تحويل الوحدات]',
    '[Abre] las {matrices}':
      '[افتح] {المصفوفات}',
    '[Sistema de ecuaciones]':
      '[نظام معادلات]',
    '[Convertir a binario]':
      '[التحويل إلى الثنائي]',
    '[Propina]':
      '[الإكرامية]',
    '[Regla de tres]':
      '[قاعدة الثلاثة]',
    '[Estudié] {historia romana} {30 min}':
      '[درست] {التاريخ الروماني} {30 دقيقة}',
    '[Abre] las {charlas}':
      '[افتح] {المحادثات}',
    '[Abre] la {enciclopedia}':
      '[افتح] {الموسوعة}',
    '[Abre] la {sesión de estudio}':
      '[افتح] {جلسة الدراسة}',
    '[Abre] el {resumen de estudio}':
      '[افتح] {ملخص الدراسة}',
    'Apunta que aprendí: {los ríos de Europa}':
      'دوّن أنني تعلمت: {أنهار أوروبا}',
    '[Vi la película] {Dune}':
      '[شاهدت الفيلم] {ديون}',
    '[Jugué] {ajedrez} con mi hermano':
      '[لعبت] {الشطرنج} مع أخي',
    '[Abre] el {archivo}':
      '[افتح] {الأرشيف}',
    '[Abre] la {mesa de juegos}':
      '[افتح] {طاولة الألعاب}',
    '[Quiero jugar] la {viborita}':
      '[أريد أن ألعب] {الثعبان}',
    '[Juega] {tetris}':
      '[العب] {تتريس}',
    '[Juega] una partida de {ajedrez}':
      '[العب] مباراة {شطرنج}',
    'Apunta {la serie Dark} como pendiente':
      'أضف {مسلسل Dark} إلى قائمة الانتظار',
    '[Abre] el {mapamundi}':
      '[افتح] {خريطة العالم}',
    '[Abre] {por conocer}':
      '[افتح] {خطة الرحلة}',
    '[Abre] las {rutas}':
      '[افتح] {المسارات}',
    '[Abre] la {bitácora de viajes}':
      '[افتح] {يوميات الرحلة}',
    '[Visité] {Oaxaca}':
      '[زرت] {واخاكا}',
    'Quiero conocer {Japón}':
      'أريد زيارة {اليابان}',
    '[Visité] {Roma}: {la fontana de noche es mágica}':
      '[زرت] {روما}: {النافورة ليلًا سحرية}',
    '[Medité] {10 min}':
      '[تأملت] {10 دقائق}',
    '[@]{jardin} [agradezco] {mi salud, mi familia y el café}':
      '[@]{jardin} [الامتنان لـ] {صحتي وعائلتي والقهوة}',
    '[Abre] la {meditación}':
      '[افتح] {التأمل}',
    '[Abre] la {respiración}':
      '[افتح] {التنفس}',
    '[Abre] los {agradecimientos}':
      '[افتح] {الامتنان}',
    'Cambié el [aceite] del {auto}':
      'غيّرت [الزيت] في {السيارة}',
    '[Abre] el {resumen del garage}':
      '[افتح] {ملخص المرآب}',
    '[Abre] {mis vehículos}':
      '[افتح] {مركباتي}',
    '[Abre] los {titulares}':
      '[افتح] {العناوين}',
    '[Abre] las {efemérides}':
      '[افتح] {أحداث هذا اليوم}',
    'Avancé en mi [proyecto] de {acuarela} {40 min}':
      'تقدمت في [مشروع] {الألوان المائية}: {40 دقيقة}',
    'Practiqué {guitarra} {25 min}':
      'تدربت على {الغيتار} {25 دقيقة}',
    '[Abre] {mis hobbies}':
      '[افتح] {هواياتي}',
    '[Abre] mis {mapas mentales}':
      '[افتح] {خرائطي الذهنية}',
    '[Abre] los {mapas conceptuales}':
      '[افتح] {الخرائط المفاهيمية}',
    '[Hazme un mapa mental] de {la fotosíntesis}':
      '[اصنع لي خريطة ذهنية] عن {التمثيل الضوئي}',
    '[Dibuja un diagrama de flujo] de {cómo hacer pan}':
      '[ارسم مخططًا انسيابيًا] عن {كيفية صنع الخبز}',
    '[Compara] {café} y {té} en un mapa':
      '[قارن] بين {القهوة} و{الشاي} في خريطة',
    '[Haz un esquema] de {lo que me acabas de explicar}':
      '[اصنع مخططًا] لـ{ما شرحته للتو}',
    '[Agenda] una {junta con el cliente} el {martes a las 10}':
      '[حدد موعدًا] لـ{اجتماع مع العميل} يوم {الثلاثاء الساعة 10}',
    '[Apunta el pendiente] {mandar la cotización}':
      '[أضف المهمة] {إرسال عرض السعر}',
    '[Tengo cita] con el {dentista} el {14 a las 5}':
      '[لدي موعد] مع {طبيب الأسنان} يوم {14 الساعة 17:00}',
    '[Recuérdame] tomar {ibuprofeno} a las {8 y a las 20}':
      '[ذكّرني] بتناول {الإيبوبروفين} الساعة {8 و20}',
    '[Guarda el contacto] de {Ana}: {5512345678}, cumple el {3 de mayo}':
      '[احفظ جهة اتصال] {آنا}: {5512345678}، عيد ميلادها {3 مايو}',
    '[Abre] mis {pendientes}':
      '[افتح] {مهامي}',
    '[Abre] mis {citas médicas}':
      '[افتح] {مواعيدي الطبية}',
    '[Abre] mis {contactos}':
      '[افتح] {جهات اتصالي}',
    '[Vocab] {inglés}: {dog} = {perro}':
      '[مفردة] {إنجليزي}: {dog} = {كلب}',
    '[Repasé] {francés} {15 min}':
      '[راجعت] {الفرنسية} {15 دقيقة}',
    '[Abre] el {tutor}':
      '[افتح] {المعلم}',
    '[Abre] el {repaso}':
      '[افتح] {المراجعة}',
    '[Abre] el {temario}':
      '[افتح] {المنهج}',
    '[Abre] el {progreso de idiomas}':
      '[افتح] {التقدم في اللغات}',
    'Aprendí en {alemán}: {Hund} = {perro}':
      'تعلمت بـ{الألمانية}: {Hund} = {كلب}',
    '[Construye] un {huerto}':
      '[ابنِ] {حديقة خضروات}',
    '[Quiero sembrar] {zanahorias}':
      '[أريد أن أزرع] {جزرًا}',
    '[Siembra] {maíz} en el huerto':
      '[ازرع] {الذرة} في الحديقة',
    '[Pon] un {aspersor} en el huerto':
      '[ضع] {رشاشًا} في الحديقة',
    '[Riega] el {huerto}':
      '[اسقِ] {الحديقة}',
    '[Cosecha] el {huerto}':
      '[احصد] {الحديقة}',
    '[Llévame] al {huerto}':
      '[خذني] إلى {الحديقة}',
    '[Haz] un {corral}':
      '[اصنع] {حظيرة}',
    '[Pon] {vacas} en la granja':
      '[ضع] {أبقارًا} في المزرعة',
    '[Alimenta] a los {animales}':
      '[أطعم] {الحيوانات}',
    '[Mima] a los {animales}':
      '[داعب] {الحيوانات}',
    '[Cura] a los {animales}':
      '[عالج] {الحيوانات}',
    '[Limpia] los {corrales}':
      '[نظّف] {الحظائر}',
    '[Llévame] a la {granja}':
      '[خذني] إلى {المزرعة}',
    '[Pon] una {pista de carreras}':
      '[ضع] {حلبة سباق}',
    '[Traza] las {vías del tren}':
      '[ارسم] {سكة القطار}',
    '[Construye] una {montaña rusa}':
      '[ابنِ] {أفعوانية}',
    '[Pon] la {meta} de la pista':
      '[ضع] {خط نهاية} الحلبة',
    '[Borra] la {pista}':
      '[امحُ] {الحلبة}',
    '[Corre una carrera] de {3 vueltas}':
      '[أقم سباقًا] من {3 لفات}',
    '[Hagamos una carrera] {contra} un asistente':
      '[لنتسابق] {ضد} مساعد',
    '[Corre una carrera] {fácil} de {5 vueltas}':
      '[أقم سباقًا] {سهلًا} من {5 لفات}',
    '[Quiero montar] el {tren}':
      '[أريد أن أركب] {القطار}',
    '[Quiero montar] la {montaña rusa}':
      '[أريد أن أركب] {الأفعوانية}',
    '[Llévame] a la {meta}':
      '[خذني] إلى {خط النهاية}',
    '[Juguemos] {paintball}':
      '[لنلعب] {بينتبول}',
    '[Juguemos paintball] {2v2}':
      '[لنلعب بينتبول] {2 ضد 2}',
    '[Reta] a {Luna} a un paintball {1v1}':
      '[تحدَّ] {لونا} في بينتبول {1 ضد 1}',
    '[Paintball] campal en {difícil}':
      '[بينتبول] معركة جماعية بمستوى {صعب}',
    '[Sal] del {paintball}':
      '[اخرج] من {البينتبول}',
    '[Pon] una {cancha de fútbol}':
      '[ضع] {ملعب كرة قدم}',
    '[Pon] una {cancha de tenis} {azul}':
      '[ضع] {ملعب تنس} {أزرق}',
    '[Crea] una {cancha de básquet}':
      '[أنشئ] {ملعب كرة سلة}',
    '[Pon] un {campo de béisbol}':
      '[ضع] {ملعب بيسبول}',
    '[Llévame] a la {cancha}':
      '[خذني] إلى {الملعب}',
    '[Abre] la {agenda de hoy}':
      '[افتح] {خطة اليوم}',
    '[Abre] {mi semana}':
      '[افتح] {أسبوعي}',
    '[Abre] el {cronograma}':
      '[افتح] {الجدول الزمني}',
    '[Crea una rutina] de mañana: {agua, estiramiento y gratitud} a las {7:00}':
      '[أنشئ روتينًا] صباحيًا: {ماء وإطالة وامتنان} الساعة {7:00}',
    '[Crea una rutina] de {lunes y miércoles}: {correr 20 min}':
      '[أنشئ روتينًا] يومي {الاثنين والأربعاء}: {الركض 20 دقيقة}',
    '[Enséñame] las {rutinas}':
      '[أرني] {الروتينات}',
    '[Crea un cuarto] llamado {Estudio}':
      '[أنشئ غرفة] باسم {استوديو}',
    '[Renombra] la {cocina} a {Oficina}':
      '[أعد تسمية] {المطبخ} إلى {المكتب}',
    '[Cambia el ícono] de la {cocina} a {🍳}':
      '[غيّر أيقونة] {المطبخ} إلى {🍳}',
    '[Pon] la {cocina} en categoría {cuerpo}':
      '[ضع] {المطبخ} في فئة {الجسد}',
    '[Agrega] la {biblioteca} al mapa':
      '[أضف] {المكتبة} إلى الخريطة',
    '[Elimina] la {cocina}':
      '[احذف] {المطبخ}',
    '[Abre] la {cocina}':
      '[افتح] {المطبخ}',
    '[Pinta] la {cocina} de {azul}':
      '[لوّن] {المطبخ} باللون {الأزرق}',
    '[Piso] de la {cocina} de {madera}':
      '[أرضية] {المطبخ} من {الخشب}',
    '[Piso] de la {cocina} {rojo}':
      '[أرضية] {المطبخ} {حمراء}',
    '[Techo] de la {cocina} de {tejas rojas}':
      '[سقف] {المطبخ} من {القرميد الأحمر}',
    '[Techo a dos aguas] en la {cocina}':
      '[سقف مزدوج الميل] في {المطبخ}',
    '[Haz] la {cocina} {redonda}':
      '[اجعل] {المطبخ} {دائريًا}',
    '[Agranda] la {cocina}':
      '[كبّر] {المطبخ}',
    '[Encoge] la {cocina}':
      '[صغّر] {المطبخ}',
    '[Mueve] la {cocina} a la {derecha}':
      '[حرّك] {المطبخ} إلى {اليمين}',
    '[Abre el muro] {norte} de la {cocina}':
      '[افتح الجدار] {الشمالي} لـ{المطبخ}',
    '[Pon una puerta] {corredera} en el muro {sur} de la {cocina}':
      '[ضع بابًا] {منزلقًا} في الجدار {الجنوبي} لـ{المطبخ}',
    '[Pon] {ladrillo} en el muro {este} de la {cocina}':
      '[ضع] {طوبًا} في الجدار {الشرقي} لـ{المطبخ}',
    '[Haz más grueso] el muro {norte} de la {cocina}':
      '[اجعل أسمك] الجدار {الشمالي} لـ{المطبخ}',
    '[Apila] la {sala} sobre la {cocina}':
      '[ضع] {غرفة المعيشة} فوق {المطبخ}',
    '[Agranda el mapa] hacia el {este}':
      '[وسّع الخريطة] نحو {الشرق}',
    '[Crea] una {lámpara}':
      '[أنشئ] {مصباحًا}',
    '[Pinta el último objeto] de {rojo}':
      '[لوّن آخر عنصر] باللون {الأحمر}',
    '[Gira el último objeto]':
      '[أدر آخر عنصر]',
    '[Haz el último objeto] más {grande}':
      '[اجعل آخر عنصر] {أكبر}',
    '[Agrupa los objetos] de la {cocina}':
      '[جمّع عناصر] {المطبخ}',
    '[Quita el último objeto]':
      '[أزل آخر عنصر]',
    '[Genera en 3D] {un dragón morado}':
      '[أنشئ بتقنية 3D] {تنينًا بنفسجيًا}',
    '[Genera en 3D] {una fuente de piedra} estilo {minimalista}':
      '[أنشئ بتقنية 3D] {نافورة حجرية} بأسلوب {بسيط}',
    '[Crea una imagen] de {un atardecer en la playa}':
      '[أنشئ صورة] لـ{غروب الشمس على الشاطئ}',
    '[Ponme] {sombrero} {rojo}':
      '[ضع لي] {قبعة} {حمراء}',
    '[Quítame] los {lentes}':
      '[انزع عني] {النظارة}',
    '[Pinta el torso] del [avatar] de {verde}':
      '[لوّن جذع] [الشخصية] باللون {الأخضر}',
    '[Haz el avatar] más {grande}':
      '[اجعل الشخصية] {أكبر}',
    '[Móntame] en la {bici}':
      '[أركبني] {الدراجة}',
    '[Quiero conducir] el {auto}':
      '[أريد أن أقود] {السيارة}',
    '[Bájame]':
      '[أنزلني]',
    '[Vista en] {primera persona}':
      '[منظور] {الشخص الأول}',
    '[Vista] {isométrica}':
      '[منظور] {متساوي القياس}',
    '[Cambia el tema] a {navidad}':
      '[غيّر السمة] إلى {عيد الميلاد}',
    '[Fondo] {nieve}':
      '[الخلفية] {الثلج}',
    '[Quita el tema]':
      '[أزل السمة]',
    '[Pon música] {relajante}':
      '[شغّل موسيقى] {مهدئة}',
    '[Música] {chiptune}':
      '[موسيقى] {chiptune}',
    '[Volumen] al {40%}':
      '[مستوى الصوت] {40%}',
    '[Apaga la música]':
      '[أوقف الموسيقى]',
    '[Abre] mi {resumen semanal}':
      '[افتح] {ملخصي الأسبوعي}',
    '[Abre] mi {resumen mensual}':
      '[افتح] {ملخصي الشهري}',
    '[Modo] {oscuro}':
      '[الوضع] {الداكن}',
    '[Apariencia] {transparente}':
      '[المظهر] {الشفاف}',
    '[Cambia el idioma] a {inglés}':
      '[غيّر اللغة] إلى {الإنجليزية}',
    '[Tema de interfaz] {neón}':
      '[سمة الواجهة] {نيون}',
    '[Tipografía] {serif}':
      '[الخط] {سيريف}',
    '[Pon iconos] {profesionales}':
      '[استخدم أيقونات] {احترافية}',
    '[Transparencia] al {40%}':
      '[الشفافية] {40%}',
    '[Estilo] {cómic}':
      '[الأسلوب] {الكوميكس}',
    '[Apaga los efectos]':
      '[أوقف التأثيرات]',
    '[Avísame] de mis {rutinas}':
      '[نبّهني] لـ{روتيناتي}',
    '[Avísame de mis metas] a las {21:00}':
      '[نبّهني لأهدافي] الساعة {21:00}',
    '[Apaga los avisos]':
      '[أوقف الإشعارات]',
    '[Descarga un respaldo] de mis datos':
      '[نزّل نسخة احتياطية] من بياناتي',
    '[Vuelve a ver la bienvenida]':
      '[أعد مشاهدة الترحيب]',
    '[Abre las configuraciones]':
      '[افتح الإعدادات]',
    '[Abre] mi {cuenta}':
      '[افتح] {حسابي}',
    '[Recuerda que] {soy vegetariano}':
      '[تذكّر أنني] {نباتي}',
    '[@]{cocina} {ensalada de la comida}':
      '[@]{cocina} {سلطة الغداء}',
    '[Cómo funciona] la {cocina}':
      '[كيف يعمل] {المطبخ}',
    '[Cómo funciona] el {editor}':
      '[كيف يعمل] {المحرر}',
    '[Cómo funciona] la {rueda de herramientas}':
      '[كيف تعمل] {عجلة الأدوات}',
    '[Cómo funciona] el {chat}':
      '[كيف تعمل] {الدردشة}',
    '[Qué hace] el {inventario}':
      '[ماذا يفعل] {المخزون}',
    '[Para qué sirve] la {cámara}':
      '[ما فائدة] {الكاميرا}',
    '[Tutorial de] {ejercicio}':
      '[شرح] {صالة الرياضة}',
    '[Tutorial de] la {biblioteca}':
      '[شرح] {المكتبة}',
    '[Tutorial] {general}':
      '[شرح] {عام}',
  },
  atajos: {
    'Caminar (también con las flechas)':
      'المشي (أيضًا بالأسهم)',
    'Correr (se queda puesto hasta volver a pulsar)':
      'الجري (يبقى مفعّلًا حتى الضغط مرة أخرى)',
    'Saltar':
      'القفز',
    'Agacharse (mantener pulsado)':
      'الانحناء (اضغط مطولًا)',
    'Lo que tengas delante: entrar al cuarto, subirte o bajarte del vehículo, cambiar de nivel':
      'ما أمامك: دخول الغرفة، ركوب المركبة أو النزول منها، تغيير الطابق',
    'Levantar la mano derecha / izquierda':
      'رفع اليد اليمنى / اليسرى',
    'Bailar':
      'الرقص',
    'Mortal':
      'الشقلبة',
    'Abrir la rueda de herramientas':
      'فتح عجلة الأدوات',
    'Abrir el chat y escribir':
      'فتح الدردشة والكتابة',
    'Cambiar de vista: isométrica, tercera y primera persona':
      'تبديل المنظور: متساوي القياس، الشخص الثالث والشخص الأول',
    'Esconder o mostrar el HUD':
      'إخفاء واجهة HUD أو إظهارها',
    'Cerrar lo que esté abierto':
      'إغلاق ما هو مفتوح',
    'Conduciendo el OVNI: subir y bajar. En los demás vehículos, Espacio derrapa':
      'عند قيادة الصحن الطائر: الصعود والنزول. في باقي المركبات، المسافة للانزلاق',
  },
  teclas: {
    'Mayús': 'Shift',
    'Espacio': 'مسافة',
    'Espacio · Mayús': 'مسافة · Shift',
  },
}
