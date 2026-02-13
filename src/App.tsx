/* ────────────────────────────────────────────
   App — Roteamento principal
   ──────────────────────────────────────────── */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { WizardPage } from './pages/WizardPage'
import { KanbanPage } from './pages/KanbanPage'
import { AcompanhamentoPage } from './pages/AcompanhamentoPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wizard" element={<WizardPage />} />
            <Route path="/status" element={<KanbanPage />} />
            <Route path="/acompanhamento" element={<AcompanhamentoPage />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  )
}
