/* ────────────────────────────────────────────
   HomePage — Landing editorial + atalhos ao app.
   Explica o fluxo (wizard → kanban → obra) e integrações.
   ──────────────────────────────────────────── */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeHero, processSteps, productPillars, wizardTutorial } from '../content/homeLanding'
import { ProcessFlowAnimations } from '../components/home/ProcessFlowAnimations'
import { ScrollReveal } from '../components/home/ScrollReveal'
import { WizardTutorialAnimations } from '../components/home/WizardTutorialAnimations'
import { AppLogo } from '../components/shared/AppLogo'

function RoutePathHint({ path }: { path: string }) {
  if (!import.meta.env.DEV) return null
  return (
    <span className="mt-2 block font-mono text-[10px] text-primary-400 dark:text-primary-500" title="Caminho desta área na aplicação">
      {path}
    </span>
  )
}

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
                  ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-semibold text-primary-900 tabular-nums dark:border-primary-700 dark:bg-gray-800 dark:text-primary-100'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-sm font-semibold text-primary-900 tabular-nums dark:border-primary-700 dark:bg-gray-800 dark:text-primary-100'
              }
            >
              {item.step}
            </span>
            <div className="min-w-0 pt-0.5 sm:pt-0">
              <h3
                className={
                  compact
                    ? 'text-sm font-semibold tracking-tight text-primary-950 dark:text-primary-50'
                    : 'text-base font-semibold tracking-tight text-primary-950 dark:text-primary-50'
                }
              >
                {item.title}
              </h3>
              <p
                className={
                  compact
                    ? 'mt-1.5 text-xs leading-relaxed text-primary-600 dark:text-primary-400'
                    : 'mt-2 text-sm leading-relaxed text-primary-600 dark:text-primary-400'
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
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900 dark:border-primary-700 dark:border-t-primary-100"
          aria-hidden
        />
        <p className="text-sm text-primary-500 dark:text-primary-400">A preparar a aplicação…</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-20 pb-16 sm:space-y-24 sm:pb-20">
        <ScrollReveal>
          <header className="mx-auto max-w-2xl pt-2 text-center sm:pt-4">
            <div className="flex justify-center leading-none">
              <AppLogo imgClassName="h-[4.95rem] w-auto max-w-[min(100%,288px)] sm:h-[5.85rem] sm:max-w-[min(100%,360px)]" />
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-primary-950 dark:text-primary-50 sm:mt-5 sm:text-5xl sm:leading-[1.08]">
              {homeHero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-primary-600 dark:text-primary-400 sm:text-lg">
              {homeHero.subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12">
              <button
                type="button"
                onClick={signIn}
                className="rounded-full bg-primary-950 px-8 py-3.5 text-sm font-medium text-white shadow-sm transition-[transform,box-shadow,background-color] duration-200 ease-out hover:bg-primary-900 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950 active:scale-[0.98] dark:bg-primary-100 dark:text-primary-950 dark:hover:bg-white dark:focus-visible:outline-primary-200"
              >
                Entrar com Google
              </button>
              <span className="text-xs text-primary-500 dark:text-primary-400">
                Usa o seu Drive e Sheets — sem outra conta.
              </span>
            </div>
          </header>
        </ScrollReveal>

        <ScrollReveal className="block" delayMs={80}>
        <section
          className="rounded-3xl border border-primary-100 bg-white/80 px-6 py-12 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-primary-800 dark:bg-gray-900/70 sm:px-10 sm:py-14"
          aria-labelledby="fluxo-heading"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="fluxo-heading"
              className="text-xs font-medium uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400"
            >
              Fluxo
            </h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-primary-950 dark:text-primary-50 sm:text-2xl">
              Três passos, do pedido ao painel da obra
            </p>
          </div>
          <ProcessFlowAnimations />
          <div className="mx-auto mt-12 max-w-5xl border-t border-primary-100 pt-12 dark:border-primary-800">
            <ProcessFlowList />
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal className="block" delayMs={140}>
        <section
          className="rounded-3xl border border-primary-100 bg-white/80 px-6 py-12 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-primary-800 dark:bg-gray-900/70 sm:px-10 sm:py-14"
          aria-labelledby="wizard-tutorial-heading"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="wizard-tutorial-heading"
              className="text-xs font-medium uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400"
            >
              {wizardTutorial.sectionEyebrow}
            </h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-primary-950 dark:text-primary-50 sm:text-2xl">
              {wizardTutorial.sectionTitle}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-primary-600 dark:text-primary-400 sm:text-base">
              {wizardTutorial.sectionSubtitle}
            </p>
          </div>
          <WizardTutorialAnimations />
        </section>
        </ScrollReveal>

        <ScrollReveal className="block" delayMs={200}>
        <section className="space-y-8" aria-labelledby="pilares-heading">
          <h2
            id="pilares-heading"
            className="text-center text-xs font-medium uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400"
          >
            O que está por trás
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {productPillars.map((pillar) => (
              <li
                key={pillar.id}
                className="rounded-2xl border border-primary-100 bg-primary-50/60 px-5 py-6 transition-colors duration-200 hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-900/40 dark:hover:bg-primary-900/60"
              >
                <h3 className="text-sm font-semibold text-primary-950 dark:text-primary-100">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-600 dark:text-primary-400">{pillar.text}</p>
              </li>
            ))}
          </ul>
        </section>
        </ScrollReveal>
      </div>
    )
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      <ScrollReveal>
      <header className="max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-primary-950 dark:text-primary-50 sm:text-3xl">
          Início
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-primary-600 dark:text-primary-400 sm:text-base">
          O fluxo começa na solicitação, passa pelo quadro de status e fecha no acompanhamento da obra —
          sempre ligado ao Drive e às planilhas.
        </p>
      </header>
      </ScrollReveal>

      <ScrollReveal className="block" delayMs={60}>
      <section aria-labelledby="acoes-heading">
        <h2 id="acoes-heading" className="text-sm font-semibold text-primary-950 dark:text-primary-50">
          O que deseja fazer?
        </h2>
        <p className="mt-1 text-xs text-primary-500 dark:text-primary-400">Atalhos para cada parte do sistema</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/wizard')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99] dark:border-primary-800 dark:bg-gray-900 dark:hover:border-primary-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105 dark:bg-primary-100 dark:text-primary-950">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950 dark:text-primary-50">Nova solicitação</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500 dark:text-primary-400">
                Abrir o assistente de pagamento e gerar o PDF
              </p>
              <RoutePathHint path="/wizard" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/acompanhamento')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99] dark:border-primary-800 dark:bg-gray-900 dark:hover:border-primary-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105 dark:bg-primary-100 dark:text-primary-950">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950 dark:text-primary-50">Acompanhamento</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500 dark:text-primary-400">
                Planilha da obra, funcionários e saldos
              </p>
              <RoutePathHint path="/acompanhamento" />
            </div>
          </button>

          <div className="relative flex flex-col items-start gap-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-6 text-left dark:border-primary-700 dark:bg-primary-900/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-200/80 dark:bg-primary-800/80">
              <svg className="h-5 w-5 text-primary-400 dark:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-400 dark:text-primary-500">Orçamento</p>
              <p className="mt-1 text-xs text-primary-400 dark:text-primary-500">Em breve</p>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-500 dark:bg-primary-800 dark:text-primary-400">
              Em breve
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/status')}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-primary-100 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary-200 hover:shadow-md active:scale-[0.99] dark:border-primary-800 dark:bg-gray-900 dark:hover:border-primary-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-950 text-white transition-transform duration-200 ease-out group-hover:scale-105 dark:bg-primary-100 dark:text-primary-950">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a9 9 0 01-9 9m9-9H3"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950 dark:text-primary-50">Status</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-500 dark:text-primary-400">
                Kanban das solicitações
              </p>
              <RoutePathHint path="/status" />
            </div>
          </button>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal className="block" delayMs={120}>
      <section
        className="rounded-3xl border border-primary-100 bg-white/90 px-5 py-8 dark:border-primary-800 dark:bg-gray-900/80 sm:px-8 sm:py-10"
        aria-labelledby="fluxo-logado-heading"
      >
        <h2
          id="fluxo-logado-heading"
          className="text-xs font-medium uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400"
        >
          Como os módulos se encaixam
        </h2>
        <p className="mt-2 text-base font-semibold text-primary-950 dark:text-primary-50">Resumo do percurso</p>
        <div className="mt-8 border-t border-primary-100 pt-8 dark:border-primary-800">
          <ProcessFlowList compact />
        </div>
      </section>
      </ScrollReveal>
    </div>
  )
}
