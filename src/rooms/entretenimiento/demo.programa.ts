/**
 * El programa «clásicos de ciencia ficción por ver» de Pep@, escrito a mano.
 *
 * Va aparte del contenido generado a propósito: el generador trocea el año en
 * dos llamadas y solo sabe concatenar arrays de primer nivel, así que un
 * objeto como este llegaba siempre a medias. Son diez títulos canónicos —
 * escribirlos cuesta menos que pelearse con el troceo.
 */
export interface ItemPrograma {
  titulo: string
  detalle: string
}

export const PROGRAMA_DEMO: Record<'es' | 'en', { nombre: string; items: ItemPrograma[] }> = {
  es: {
    nombre: 'Clásicos de ciencia ficción pendientes',
    items: [
      { titulo: 'Solaris (1972)', detalle: 'Me la recomendaron cuando dije que Blade Runner me había dejado triste.' },
      { titulo: 'Stalker (1979)', detalle: 'Dicen que es lenta y que ese es justo el punto.' },
      { titulo: '2001: Una odisea del espacio', detalle: 'La he visto a trozos en clase de física; toca completa y sin pausas.' },
      { titulo: 'Metrópolis (1927)', detalle: 'Todo lo que me gusta del género sale de aquí, y no la he visto.' },
      { titulo: 'Primer (2004)', detalle: 'Rodada con casi nada de presupuesto; quiero ver hasta dónde llega la idea.' },
      { titulo: 'La llegada', detalle: 'Va de cómo el idioma te cambia la cabeza. Justo ahora que estudio uno.' },
      { titulo: 'Gattaca', detalle: 'Me la puso mi profesor de laboratorio como ejemplo de ética.' },
      { titulo: 'Akira', detalle: 'Después de Japón tengo pendiente el anime que todo el mundo cita.' },
      { titulo: 'Contact', detalle: 'Sagan otra vez: si el libro me gustó, la película debería.' },
      { titulo: 'Moon (2009)', detalle: 'Una sola persona, una base y una idea. Suena a mi tipo de película.' },
    ],
  },
  en: {
    nombre: 'Sci-fi classics to watch',
    items: [
      { titulo: 'Solaris (1972)', detalle: 'Someone recommended it when I said Blade Runner had left me sad.' },
      { titulo: 'Stalker (1979)', detalle: 'They say it is slow and that this is exactly the point.' },
      { titulo: '2001: A Space Odyssey', detalle: 'I have seen bits of it in physics class; time to watch it whole.' },
      { titulo: 'Metropolis (1927)', detalle: 'Everything I love about the genre comes from here, and I have not seen it.' },
      { titulo: 'Primer (2004)', detalle: 'Shot on almost no budget; I want to see how far the idea goes.' },
      { titulo: 'Arrival', detalle: 'It is about how language rewires you. Right while I am learning one.' },
      { titulo: 'Gattaca', detalle: 'My lab professor showed it to us as an ethics case.' },
      { titulo: 'Akira', detalle: 'After Japan I owe myself the anime everyone quotes.' },
      { titulo: 'Contact', detalle: 'Sagan again: if I liked the book, the film should land.' },
      { titulo: 'Moon (2009)', detalle: 'One person, one base, one idea. Sounds like my kind of film.' },
    ],
  },
}
