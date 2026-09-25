import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { IndraRuntimeProvider } from './context/IndraRuntimeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IndraRuntimeProvider>
      <App />
    </IndraRuntimeProvider>
  </StrictMode>,
)
