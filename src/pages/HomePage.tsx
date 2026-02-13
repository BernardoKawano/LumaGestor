/* ────────────────────────────────────────────
   HomePage — Dashboard principal.
   3 cards de ação: Nova Solicitação, Orçamento, Status.
   ──────────────────────────────────────────── */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { isReady, isSignedIn, signIn } = useAuth()
  const navigate = useNavigate()

  /* ── Carregando ── */
  if (!isReady) {
    return (
      <div className="flex flex-col items-center gap-4 pt-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    )
  }

  /* ── Não conectado ── */
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-6 pt-32">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-xl font-bold text-white">
          LG
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Luma Gestor</h1>
        <p className="max-w-md text-center text-sm text-gray-500">
          Gestão de solicitações de pagamento para suas obras.
          Conecte seu Google Drive para começar.
        </p>
        <button
          onClick={signIn}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Entrar com Google
        </button>
      </div>
    )
  }

  /* ── Dashboard ── */
  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Painel</h1>
        <p className="mt-1 text-sm text-gray-500">
          O que deseja fazer hoje?
        </p>
      </div>

      {/* Cards de ação */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Nova Solicitação */}
        <button
          onClick={() => navigate('/wizard')}
          className="group flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 transition-transform group-hover:scale-105">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Nova Solicitação</p>
            <p className="mt-1 text-xs text-gray-400">
              Criar solicitação de pagamento
            </p>
          </div>
        </button>

        {/* Acompanhamento de Obras */}
        <button
          onClick={() => navigate('/acompanhamento')}
          className="group flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 transition-transform group-hover:scale-105">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Acompanhamento</p>
            <p className="mt-1 text-xs text-gray-400">
              Pagamentos de funcionários por obra
            </p>
          </div>
        </button>

        {/* Orçamento (placeholder) */}
        <div
          className="relative flex flex-col items-start gap-4 rounded-2xl border border-dashed border-gray-200 bg-white/50 p-6 text-left"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400">Orçamento</p>
            <p className="mt-1 text-xs text-gray-300">
              Em breve
            </p>
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
            Em breve
          </span>
        </div>

        {/* Status / Kanban */}
        <button
          onClick={() => navigate('/status')}
          className="group flex flex-col items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 transition-transform group-hover:scale-105">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a9 9 0 01-9 9m9-9H3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Status</p>
            <p className="mt-1 text-xs text-gray-400">
              Acompanhar solicitações
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
