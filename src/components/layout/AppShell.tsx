/* ────────────────────────────────────────────
   AppShell — layout principal da aplicação.
   Header fixo + conteúdo centralizado com whitespace.
   ──────────────────────────────────────────── */

import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppLogo } from '../shared/AppLogo'

export function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn, signIn, signOut } = useAuth()
  const { pathname } = useLocation()
  const contentWidth = pathname === '/' ? 'max-w-5xl' : 'max-w-3xl'

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-primary-200/80 bg-white/85 backdrop-blur-md">
        <div className={`mx-auto flex ${contentWidth} items-center justify-between px-6 py-4`}>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg outline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-950"
          >
            <AppLogo imgClassName="h-8 max-h-8 w-auto max-w-[140px]" />
            <span className="text-sm font-semibold tracking-tight text-primary-950">
              Luma Gestor
            </span>
          </Link>

          <button
            type="button"
            onClick={isSignedIn ? signOut : signIn}
            className="rounded-full border border-primary-200 px-4 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950"
          >
            {isSignedIn ? 'Sair' : 'Entrar com Google'}
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className={`mx-auto ${contentWidth} px-6 py-10 sm:py-12`}>
        {children}
      </main>
    </div>
  )
}
