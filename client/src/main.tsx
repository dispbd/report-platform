import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ReportPage } from './pages/ReportPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/reports/:reportId" element={<ReportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
