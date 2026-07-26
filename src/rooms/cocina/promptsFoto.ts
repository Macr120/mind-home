import type { DietaGuardada, Receta } from '../../core/data/db'

/** Prompts de las portadas de cocina (fuera del .tsx para no romper fast-refresh). */

const SIN_TEXTO = 'Fotografía realista, luz natural suave, sin texto, sin letras, sin marcas de agua.'

/** Prompt de foto de un platillo, a partir de la receta. */
export function promptReceta(r: Pick<Receta, 'nombre' | 'ingredientes'>): string {
  return [
    `Fotografía cenital apetitosa del platillo "${r.nombre}" servido en un plato bonito sobre una mesa de madera.`,
    r.ingredientes.length ? `Lleva: ${r.ingredientes.slice(0, 6).join(', ')}.` : '',
    'Estilo food photography profesional, colores vivos y naturales,',
    SIN_TEXTO,
  ]
    .filter(Boolean)
    .join(' ')
}

/** Prompt de portada de una dieta (bodegón del estilo de alimentación). */
export function promptDieta(d: Pick<DietaGuardada, 'nombre' | 'descripcion'>): string {
  return [
    `Bodegón cenital de los alimentos típicos de la dieta "${d.nombre}".`,
    d.descripcion ? `Se caracteriza por: ${d.descripcion}` : '',
    'Ingredientes frescos bien acomodados sobre una superficie clara, estilo revista de nutrición,',
    SIN_TEXTO,
  ]
    .filter(Boolean)
    .join(' ')
}
