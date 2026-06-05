/** Bloque de propiedades agrupadas (rotación, color, etc.). */
export function PropiedadGrupo({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-white/40">{titulo}</p>
      {children}
    </div>
  )
}
