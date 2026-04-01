/* ────────────────────────────────────────────
   HomePage — Landing editorial + atalhos ao app.
   Explica o fluxo (wizard → kanban → obra) e integrações.
   ──────────────────────────────────────────── */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeHero, processSteps, productPillars } from '../content/homeLanding'
import { ProcessFlowAnimations } from '../components/home/ProcessFlowAnimations'
import { AppLogo } from '../components/shared/AppLogo'

function ProcessFlowList({ compact }: { compact?: boolean }) {
  return (
    <ol
      className={
        compact
          ? 'grid gap-6 sm:grid-cols-3 sm:gap-8'
          : 'grid gap-10 sm:grid-cols-3 sm:gap-8'
      }
    >
      {processSteps.map((item) => (
        <li key={item.id} className="flex flex-col">
          <div className="flex gap-4 sm:flex-col sm:gap-5">
            <span
              className={
                compact
                  ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-semibold text-primary-900 tabular-nums'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-sm font-semibold text-primary-900 tabular-nums'
              }
            >
              {item.step}
            </span>
            <div className="min-w-0 pt-0.5 sm:pt-0">
              <h3
                className={
                  compact
                    ? 'text-sm font-semibold tracking-tight text-primary-950'
                    : 'text-base font-semibold tracking-tight text-primary-950'
                }
              >
                {item.title}
              </h3>
              <p
                className={
                  compact
                    ? 'mt-1.5 text-xs leading-relaxed text-primary-600'
                    : 'mt-2 text-sm leading-relaxed text-primary-600'
                }
              >
                {item.description}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function HomePage() {
  const { isReady, isSignedIn, signIn } = useAuth()
  const navigate = useNavigate()

  if (!isReady) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900"
          aria-hidden
        />
        <p className="text-sm text-primary-500">A preparar a aplicação…</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-20 pb-16 sm:space-y-24 sm:pb-20">
        <header className="mx-auto max-w-2xl pt-6 text-center sm:pt-10">
          <div className="flex justify-center">
            <AppLogo imgClassName="h-14 w-auto max-w-[min(100%,220px)] sm:h-[4.25rem]" />
          </div>
          <h1 className="mt-8 text-balance text-3xl font-semibold tracking-tight text-primary-950 sm:mt-10 sm:text-5xl sm:leading-[1.08]">
            {homeHero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-primary-600 sm:text-lg">
            {homeHero.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12">
            <button
              type="button"
              onClick={signIn}
              className="rounded-full bg-primary-950 px-8 py-3.5 text-sm font-medium text-white shadow-sm transition-[transform,box-shadow,background-color] duration-200 ease-out hover:bg-primary-900 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950 active:scale-[0.98]"
            >
              Entrar com Google
            </button>
            <span className="text-xs text-primary-500">
              Usa o seu Drive e Sheets — sem outra conta.
            </span>
          </div>
        </header>

        <section
          className="rounded-3xl border border-primary-100 bg-white/80 px-6 py-12 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-sm sm:px-10 sm:py-14"
          aria-labelledby="fluxo-heading"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="fluxo-heading"
              className="text-xs font-medium uppercase tracking-[0.18em] text-primary-500"
            >
              Fluxo
            </h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-primary-950 sm:text-2xl">
              Três passos, do pedido ao painel da obra
            </p>
          </div>
          <ProcessFlowAnimations />
          <div className="mx-auto mt-12 max-w-5xl border-t border-primary-100 pt-12">
            <ProcessFlowList />
          </div>
        </section>

        <section className="space-y-8" aria-labelledby="pilares-heading">
          <h2
            id="pilares-heading"
            className="text-center text-xs font-medium uppercase tracking-[0.18em] text-primary-500"
          >
            O que está por trás
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {productPillars.map((pillar) => (
              <li
                key={pillar.id}
                className="rounded-2xl border border-primary-100 bg-primary-50/60 px-5 py-6 transition-colors duration-200 hover:bg-primary-50"
              >
                <h3 className="text-sm font-semibold text-primary-950">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-600">{pillar.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      <header className="max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-primary-950 sm:text-3xl">
          Início
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-primary-600 sm:text-base">
          O fluxo começa na solicitação, passa pelo quadro de status e fecha no acompanhamento da obra —
          sempre ligado ao Drive e às planilhas.
        </p>
      </header>

      <section
        className="rounded-3xl border border-primary-100 bg-white/90 px-5 py-8 sm:px-8 sm:py-10"
        aria-labelledby="fluxo-logado-heading"
      >
        <h2
          id="fluxo-logado-heading"
          className="text-xs font-medium uppercase tracking-[0.18em] text-primary-500"
        >
          Como os módulos se encaixam
        </h2>
        <p className="mt-2 text-base font-semibold text-primary-950">Resumo do percurso</p>
        <ProcessFlowAnimations compact />
        <div className="mt-8 border-t border-primary-100 pt-8">
          <ProcessFlowList compact />
        </div>
      </section>

      <section aria-labelledby="acoes-heading">
        <h2 id="acoes-heading" className="text-sm font-semibold text-primary-950">
          O que deseja fazer?
        </h2>
        <p className="mt-1 text-xs text-primary-500">Atalhos para cada parte do sistema</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/wizard')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">Nova solicitação</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500">
                Abrir o assistente de pagamento e gerar o PDF
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/acompanhamento')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">Acompanhamento</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500">
                Planilha da obra, funcionários e saldos
              </p>
            </div>
          </button>

          <div className="relative flex flex-col items-start gap-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-6 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-200/80">
              <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-400">Orçamento</p>
              <p className="mt-1 text-xs text-primary-400">Em breve</p>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-500">
              Em breve
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/status')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a9 9 0 01-9 9m9-9H3"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">Status</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500">
                Kanban das solicitações
              </p>
            </div>
          </button>
        </div>
      </section>
    </div>
  )
}
