import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'

if (!localStorage.getItem('wiped_once_v1')) {
  localStorage.clear();
  localStorage.setItem('wiped_once_v1', 'true');
  window.location.reload();
}


const router = getRouter()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
