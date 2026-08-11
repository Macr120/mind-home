/**
 * Carátulas de las obras del año demo, por título (en los dos idiomas).
 *
 * Se guardan aquí y no en `demo.data.ts` porque ese lo regenera
 * `npm run demo:texto` y borraría las URLs. Son las mismas que devuelve
 * `buscarPortada` (Wikipedia EN y Open Library), congeladas para que la demo no
 * dependa de la red ni tarde en poblarse.
 *
 * Para rehacerlas: borra este archivo y vuelve a lanzar la búsqueda en lote desde
 * el Archivo con la demo cargada.
 */
export const PORTADAS_DEMO: Record<string, string> = {
  "Blade Runner 2049": "https://upload.wikimedia.org/wikipedia/en/9/9b/Blade_Runner_2049_poster.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "The Left Hand of Darkness": "https://covers.openlibrary.org/b/id/10618463-M.jpg",
  "La mano izquierda de la oscuridad": "https://covers.openlibrary.org/b/id/10618463-M.jpg",
  "Arrival": "https://upload.wikimedia.org/wikipedia/en/d/df/Arrival%2C_Movie_Poster.jpg",
  "La llegada": "https://upload.wikimedia.org/wikipedia/en/d/df/Arrival%2C_Movie_Poster.jpg",
  "Cosmos": "https://covers.openlibrary.org/b/id/8283901-M.jpg",
  "Outer Wilds": "https://upload.wikimedia.org/wikipedia/en/f/f6/Outer_Wilds_Steam_artwork.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "2001: A Space Odyssey": "https://upload.wikimedia.org/wikipedia/en/1/11/2001_A_Space_Odyssey_%281968%29.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "2001: Una odisea del espacio": "https://upload.wikimedia.org/wikipedia/en/1/11/2001_A_Space_Odyssey_%281968%29.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Cowboy Bebop": "https://upload.wikimedia.org/wikipedia/en/a/a9/Cowboy_Bebop_key_visual.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Metropolis": "https://upload.wikimedia.org/wikipedia/en/thumb/9/97/Metropolis_%28German_three-sheet_poster%29.jpg/330px-Metropolis_%28German_three-sheet_poster%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Metrópolis": "https://upload.wikimedia.org/wikipedia/en/thumb/9/97/Metropolis_%28German_three-sheet_poster%29.jpg/330px-Metropolis_%28German_three-sheet_poster%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "The Martian": "https://covers.openlibrary.org/b/id/11447888-M.jpg",
  "El marciano": "https://covers.openlibrary.org/b/id/11447888-M.jpg",
  "Akira": "https://upload.wikimedia.org/wikipedia/en/5/5d/AKIRA_%281988_poster%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Portal 2": "https://upload.wikimedia.org/wikipedia/en/f/f9/Portal2cover.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Solaris": "https://upload.wikimedia.org/wikipedia/en/b/bf/Solaris2002poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Alien": "https://upload.wikimedia.org/wikipedia/en/c/c3/Alien_movie_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Moon": "https://upload.wikimedia.org/wikipedia/en/a/af/Moon_%282009_film%29.jpg",
  "Children of Men": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fc/Children_of_men_ver4.jpg/330px-Children_of_men_ver4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Hijos de los hombres": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fc/Children_of_men_ver4.jpg/330px-Children_of_men_ver4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Gattaca": "https://upload.wikimedia.org/wikipedia/en/d/de/Gattaca_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Death Stranding": "https://upload.wikimedia.org/wikipedia/en/2/22/Death_Stranding.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Planetes": "https://upload.wikimedia.org/wikipedia/en/b/b0/Planetes_manga_vol_1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "Godzilla": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Godzilla_English_Logo.png/330px-Godzilla_English_Logo.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Ghost in the Shell": "https://upload.wikimedia.org/wikipedia/en/1/11/Ghost_in_the_Shell_%282017_film%29.png",
  "Tokyo Story": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Tokyo_monogatari_poster.jpg/330px-Tokyo_monogatari_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "Cuentos de Tokio": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Tokyo_monogatari_poster.jpg/330px-Tokyo_monogatari_poster.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  "The Three-Body Problem": "https://covers.openlibrary.org/b/id/10526598-M.jpg",
  "El problema de los tres cuerpos": "https://covers.openlibrary.org/b/id/10526598-M.jpg",
  "The Order of Time": "https://upload.wikimedia.org/wikipedia/en/7/7e/ManifoldTime.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "El orden del tiempo": "https://upload.wikimedia.org/wikipedia/en/7/7e/ManifoldTime.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
  "The Dispossessed": "https://covers.openlibrary.org/b/id/6979680-M.jpg",
  "Los desposeídos": "https://covers.openlibrary.org/b/id/6979680-M.jpg",
  "Anathem": "https://covers.openlibrary.org/b/id/6304233-M.jpg",
  "Blindsight": "https://covers.openlibrary.org/b/id/524560-M.jpg",
  "Visión ciega": "https://covers.openlibrary.org/b/id/524560-M.jpg",
  "Citizen Sleeper": "https://upload.wikimedia.org/wikipedia/en/3/31/Citizen_Sleeper_cover_art.jpg",
  "Pluto": "https://upload.wikimedia.org/wikipedia/en/4/4d/Pluto_%282023%29.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
}
