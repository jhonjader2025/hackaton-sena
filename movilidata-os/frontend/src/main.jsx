import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import App from './App'
import './index.css'
import { registerServiceWorker } from './services/pwa'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)

if (import.meta.env.PROD) {
  registerServiceWorker()
}
