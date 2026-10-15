import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ConfirmHost } from '@/components/shared/confirm'
import './index.css'

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
