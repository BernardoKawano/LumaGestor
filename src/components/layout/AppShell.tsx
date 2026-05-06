/* ────────────────────────────────────────────
   AppShell — layout principal da aplicação.
   Header fixo + conteúdo centralizado com whitespace.
   ──────────────────────────────────────────── */

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SetShellContentWidthOverrideContext } from '../../context/ShellContentWidthOverrideContext'
import { useTheme } from '../../context/ThemeContext'
import { AppLogo } from '../shared/AppLogo'
import { applyDocumentTitle } from '../../utils/routeTitle'
import { resolveShellContentWidthClass, type ShellContentWidthOverride } from '../../utils/shellContentWidth'

export function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn, signIn, signOut } = useAuth()
  const { pathname } = useLocation()
  const { mode, toggle } = useTheme()
  const [contentWidthOverride, setContentWidthOverride] = useState<ShellContentWidthOverride>(null)
  const contentWidth = resolveShellContentWidthClass(pathname, contentWidthOverride)

  useEffect(() => {
    applyDocumentTitle(pathname)
  }, [pathname])

  return (
    <SetShellContentWidthOverrideContext.Provider value={setContentWidthOverride}>
    <div className="flex min-h-screen flex-col bg-primary-50 text-primary-950 transition-colors dark:bg-primary-950 dark:text-primary-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-primary-200/80 bg-white/85 backdrop-blur-md transition-colors dark:border-primary-800 dark:bg-primary-900/90">
        <div className={`mx-auto flex ${contentWidth} items-center justify-between gap-3 px-6 py-2 sm:py-2.5`}>
          <Link
            to="/"
            className="flex cursor-pointer items-center leading-none rounded-lg outline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-950 dark:focus-visible:outline-primary-200"
            aria-label="Luma Gestor — Início"
          >
            <AppLogo imgClassName="h-[1.675rem] max-h-[1.675rem] w-auto max-w-[min(100%,150px)] sm:h-[2.125rem] sm:max-h-[2.125rem] sm:max-w-[min(100%,190px)]" />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="cursor-pointer rounded-full border border-primary-200 p-2 text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950 dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-800 dark:focus-visible:outline-primary-300"
              aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {mode === 'dark' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={isSignedIn ? signOut : signIn}
              className="cursor-pointer rounded-full border border-primary-200 px-4 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950 dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-800 dark:focus-visible:outline-primary-300"
            >
              {isSignedIn ? 'Sair' : 'Entrar com Google'}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className={`mx-auto flex-1 ${contentWidth} px-6 py-10 sm:py-12`}>{children}</main>

      <footer
        className={`mx-auto ${contentWidth} border-t border-primary-200/80 px-6 py-8 text-center dark:border-primary-800`}
      >
        <p className="text-xs text-primary-500 dark:text-primary-400">Bernardo Dias Machado Kawano</p>
      </footer>
    </div>
    </SetShellContentWidthOverrideContext.Provider>
  )
}
