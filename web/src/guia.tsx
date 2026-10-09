import { createRoot } from 'react-dom/client'
import { cargarGuia } from './guias/datos'
import { GuiaApp } from './guias/GuiaApp'
import { Pose } from './guias/Pose'
import './guias/guia.css'

// Las guías (/guias/<tema> y /<id>/guias/<tema>): una isla React por página.
// El idioma sale de la ruta (o de ?lang= en desarrollo) y el tema del nombre
// de la página. El HTML ya trae el texto pintado (lo indexan los buscadores);
// React lo sustituye al montar. `?pose=<id>` es Pep@ solo, para los memes.
const ruta = location.pathname.replace(/\.html$/, '').replace(/\/$/, '')
const m = /^(?:\/([a-z]{2}))?\/guias\/([\w-]+)$/.exec(ruta)
const tema = m?.[2] ?? 'ejercicio'
const consulta = new URLSearchParams(location.search)
const idioma = consulta.get('lang') ?? m?.[1] ?? 'es'
const pose = consulta.get('pose')

const raiz = document.getElementById('root')!
cargarGuia(tema, idioma).then(({ guion, textos, idioma: id }) => {
  document.documentElement.lang = id
  document.documentElement.dir = id === 'ar' ? 'rtl' : 'ltr'
  raiz.replaceChildren()
  createRoot(raiz).render(
    pose !== null ? (
      <Pose tema={tema} id={pose} />
    ) : (
      <GuiaApp tema={tema} guion={guion} textos={textos} idioma={id} />
    ),
  )
})
