import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './styles/globals.css'

const useHashRouter = typeof window !== 'undefined' && window.location.protocol === 'file:'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {useHashRouter ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>,
)
