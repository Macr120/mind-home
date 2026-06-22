import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bindKeyboard } from './core/house/movement'

// Una sola vez al cargar (evita desmontajes de StrictMode que sueltan las teclas).
bindKeyboard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
