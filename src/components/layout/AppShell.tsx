/* ────────────────────────────────────────────
   AppShell — layout principal da aplicação.
   Header fixo + conteúdo centralizado com whitespace.
   ──────────────────────────────────────────── */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn, signIn, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-70">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
              LG
            </div>
            <span className="text-sm font-semibold tracking-tight text-gray-900">
              Luma Gestor
            </span>
          </Link>

          <button
            onClick={isSignedIn ? signOut : signIn}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {isSignedIn ? 'Sair' : 'Entrar com Google'}
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {children}
      </main>
    </div>
  )
}
