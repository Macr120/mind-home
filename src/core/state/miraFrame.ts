/**
 * Puntería del shooter (mira levantada), en un módulo SIN dependencias: lo leen
 * por frame la cámara (`FollowCamera`, límites de inclinación de `cameraStore`),
 * el avatar (`Character`) y el modo paintball. Vive aparte de `accionFrame`
 * justamente para no meter a `herramientaStore` en el grafo de la cámara.
 * El espejo reactivo para el HUD es `useHerramienta.apuntando`.
 */
export const miraFrame = {
  apuntando: false,
  /**
   * Modo tiro: hay un arma en la mano (o batalla en curso) y la vista es de
   * perspectiva. La cámara se corre al hombro para despejar el centro de la
   * pantalla, donde vive la mira; apuntando se pega todavía más.
   */
  conArma: false,
}
