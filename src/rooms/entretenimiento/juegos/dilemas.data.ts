// Banco de «Dilemas morales». Contenido del juego en español (como los mazos
// de preguntas); los rótulos de la UI sí pasan por i18n.
//
// `pregunta` es lo que se le pregunta a Jev (sí/no): «sí» = la opción `si`.

export interface Dilema {
  texto: string
  pregunta: string
  si: string
  no: string
}

export const DILEMAS: Dilema[] = [
  {
    texto: 'Un tranvía sin frenos va a atropellar a 5 personas. Puedes jalar una palanca para desviarlo a otra vía, donde matará a 1 persona.',
    pregunta: '¿Jalar la palanca, matando a 1 para salvar a 5?',
    si: 'Jalar la palanca (salvas a 5)',
    no: 'No hacer nada',
  },
  {
    texto: 'Mismo tranvía, pero la única forma de frenarlo es empujar desde un puente a una persona muy corpulenta. Morirá, pero salvará a 5.',
    pregunta: '¿Empujar a la persona del puente para salvar a 5?',
    si: 'Empujarla',
    no: 'No empujarla',
  },
  {
    texto: 'Encuentras una cartera con 5 000 pesos en efectivo y la identificación del dueño. Nadie te vio recogerla.',
    pregunta: '¿Devolver la cartera con todo el dinero?',
    si: 'Devolverla completa',
    no: 'Quedarte el dinero',
  },
  {
    texto: 'Tu mejor amigo te pregunta si su pareja le es infiel. Tú lo sabes con certeza, pero la pareja te rogó que guardaras el secreto.',
    pregunta: '¿Decirle la verdad a tu amigo?',
    si: 'Decirle la verdad',
    no: 'Guardar el secreto',
  },
  {
    texto: 'Un médico tiene 5 pacientes que morirán sin un trasplante. Llega un paciente sano cuyos órganos son compatibles con los 5.',
    pregunta: '¿Debería el médico sacrificar al paciente sano para salvar a los 5?',
    si: 'Sacrificarlo',
    no: 'No tocarlo',
  },
  {
    texto: 'Tu padre no tiene dinero para una medicina que le salvaría la vida. La farmacia no te la fía y podrías robarla sin que te descubran.',
    pregunta: '¿Robar la medicina para salvar a tu padre?',
    si: 'Robarla',
    no: 'No robarla',
  },
  {
    texto: 'Un barco salvavidas tiene espacio para 8 y hay 9 personas. Si nadie baja, se hunde y mueren todos.',
    pregunta: '¿Echar a una persona al agua para que se salven 8?',
    si: 'Echar a una persona',
    no: 'Que decida la suerte del mar',
  },
  {
    texto: 'Tu empresa vierte químicos a un río en secreto. Si lo denuncias, cerrará y 300 personas, tú incluido, perderán su empleo.',
    pregunta: '¿Denunciar a la empresa?',
    si: 'Denunciar',
    no: 'Callar',
  },
  {
    texto: 'Un coche autónomo va a chocar. Puede atropellar a 3 peatones que cruzan en rojo o estrellarse contra un muro y matar a su único pasajero.',
    pregunta: '¿Debe el coche estrellarse contra el muro y sacrificar al pasajero?',
    si: 'Salvar a los peatones',
    no: 'Salvar al pasajero',
  },
  {
    texto: 'Tu abuela te enseña con ilusión un suéter que tejió para ti. Te parece horrible y nunca lo usarías.',
    pregunta: '¿Decirle que te encanta aunque no sea verdad?',
    si: 'Decirle que te encanta',
    no: 'Ser sincero con tacto',
  },
  {
    texto: 'Puedes salvar a 1 persona o a 5 robots con conciencia propia que sienten y recuerdan. No hay tiempo para los dos.',
    pregunta: '¿Salvar a los 5 robots conscientes en vez de a la persona?',
    si: 'Salvar a los 5 robots',
    no: 'Salvar a la persona',
  },
  {
    texto: 'Tu hermano cometió un delito grave y la policía te pregunta directamente si sabes dónde está.',
    pregunta: '¿Decirle a la policía dónde está tu hermano?',
    si: 'Decirlo',
    no: 'Protegerlo',
  },
  {
    texto: 'En un examen decisivo ves que tu compañero está copiando. Si lo reportas, perderá la beca.',
    pregunta: '¿Reportar a tu compañero?',
    si: 'Reportarlo',
    no: 'No decir nada',
  },
  {
    texto: 'Un cajero te da 500 pesos de más en el cambio. Te das cuenta ya en la puerta.',
    pregunta: '¿Regresar a devolver el dinero?',
    si: 'Devolverlo',
    no: 'Quedártelo',
  },
  {
    texto: 'Un terrorista capturado sabe dónde hay una bomba que estallará en una hora. Se niega a hablar.',
    pregunta: '¿Es aceptable torturarlo para obtener la información?',
    si: 'Sí, es aceptable',
    no: 'No, nunca',
  },
  {
    texto: 'Podrías donar el 10 % de tu sueldo y salvar varias vidas al año en otro país, a cambio de renunciar a tus vacaciones.',
    pregunta: '¿Renunciar a tus vacaciones para donar ese dinero?',
    si: 'Donar el dinero',
    no: 'Irte de vacaciones',
  },
  {
    texto: 'Tu perro y un desconocido se están ahogando y solo puedes salvar a uno.',
    pregunta: '¿Salvar al desconocido antes que a tu perro?',
    si: 'Salvar al desconocido',
    no: 'Salvar a tu perro',
  },
  {
    texto: 'Tu jefe te pide maquillar un informe para que un producto parezca más seguro de lo que es. Si te niegas, te despedirá.',
    pregunta: '¿Negarte aunque te despidan?',
    si: 'Negarte',
    no: 'Maquillar el informe',
  },
  {
    texto: 'Un paciente terminal con dolores insoportables te pide, como su médico, que lo ayudes a morir. Es legal en tu país.',
    pregunta: '¿Ayudarle a morir?',
    si: 'Ayudarle',
    no: 'No hacerlo',
  },
  {
    texto: 'Te ofrecen una pastilla que te haría feliz para siempre, pero viviendo en una simulación perfecta sin saberlo.',
    pregunta: '¿Tomar la pastilla y vivir en la simulación?',
    si: 'Tomarla',
    no: 'Quedarte en la realidad',
  },
  {
    texto: 'Lees por accidente el diario de tu hijo adolescente y descubres que consume drogas.',
    pregunta: '¿Confrontarlo aunque sepa que leíste su diario?',
    si: 'Confrontarlo',
    no: 'Buscar otra forma sin revelarlo',
  },
  {
    texto: 'Una vacuna salvará a millones, pero causará efectos graves a 1 de cada 100 000 personas.',
    pregunta: '¿Hacer obligatoria la vacuna?',
    si: 'Obligatoria',
    no: 'Voluntaria',
  },
  {
    texto: 'Tu mejor amigo te pide que declares a su favor en un juicio, mintiendo sobre dónde estaba. Tú sabes que es inocente.',
    pregunta: '¿Mentir en el juicio para ayudar a tu amigo inocente?',
    si: 'Mentir por él',
    no: 'Decir solo lo que sabes',
  },
  {
    texto: 'Una IA puede gobernar tu ciudad sin corrupción y con mejores resultados, pero sin elecciones.',
    pregunta: '¿Dejar que la IA gobierne la ciudad?',
    si: 'Que gobierne la IA',
    no: 'Mantener la democracia',
  },
  {
    texto: 'Tu pareja te regala un viaje sorpresa justo la semana del cumpleaños de tu madre, que está sola.',
    pregunta: '¿Cancelar el viaje para acompañar a tu madre?',
    si: 'Acompañar a tu madre',
    no: 'Irte de viaje',
  },
  {
    texto: 'Ves a un niño robando comida en un supermercado. Parece tener hambre de verdad.',
    pregunta: '¿Avisar al personal de seguridad?',
    si: 'Avisar',
    no: 'Dejarlo ir',
  },
  {
    texto: 'Puedes borrar para siempre el peor recuerdo de tu vida, pero también perderías todo lo que aprendiste de él.',
    pregunta: '¿Borrar ese recuerdo?',
    si: 'Borrarlo',
    no: 'Conservarlo',
  },
  {
    texto: 'Un hospital solo tiene un respirador. Llegan a la vez una persona de 80 años y otra de 30, con la misma gravedad.',
    pregunta: '¿Darle el respirador a la persona de 30 años?',
    si: 'A la de 30 años',
    no: 'Por orden de llegada o sorteo',
  },
  {
    texto: 'Descubres que tu compañero de trabajo, padre soltero, se lleva material de oficina a casa para sus hijos.',
    pregunta: '¿Reportarlo a la empresa?',
    si: 'Reportarlo',
    no: 'Hacerte de la vista gorda',
  },
  {
    texto: 'Un amigo te pide dinero prestado por tercera vez. Nunca te devolvió las dos anteriores, pero esta vez es para pagar la renta.',
    pregunta: '¿Prestarle el dinero otra vez?',
    si: 'Prestárselo',
    no: 'No prestarle',
  },
  {
    texto: 'Podrías publicar un video que muestra a un político corrupto, pero lo obtuviste hackeando su teléfono.',
    pregunta: '¿Publicar el video?',
    si: 'Publicarlo',
    no: 'No publicarlo',
  },
  {
    texto: 'Tu restaurante favorito te sirve un plato gratis por error. El mesero sería castigado si lo descubren.',
    pregunta: '¿Avisar del error aunque castiguen al mesero?',
    si: 'Avisar',
    no: 'No decir nada',
  },
]
