import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ConfirmHost } from '@/components/shared/confirm'
import './index.css'

// L'ancienne base de démonstration (mode local) n'existe plus : on libère l'espace qu'elle occupait dans le navigateur.
try { localStorage.removeItem('mutlog.db.v1') } catch { /* stockage indisponible : sans importance */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <ConfirmHost />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
