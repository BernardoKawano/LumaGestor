/* ────────────────────────────────────────────
   Tutorial animado da Nova solicitação (wizard).
   Só usado na homepage pública; decorativo: aria-hidden.
   Pausa com prefers-reduced-motion (index.css).
   ──────────────────────────────────────────── */

import { wizardTutorial } from '../../content/homeLanding'

const [s1, s2, s3] = wizardTutorial.steps

function StepDot({ step, className }: { step: 1 | 2 | 3; className: string }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary-200 bg-white text-xs font-semibold text-primary-800 tabular-nums shadow-sm dark:border-primary-600 dark:bg-gray-800 dark:text-primary-100 sm:h-10 sm:w-10 ${className}`}
    >
      {step}
    </div>
  )
}

function StepLabel({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`hidden min-w-0 text-[10px] font-medium leading-tight text-primary-600 dark:text-primary-400 sm:block sm:max-w-[5.5rem] sm:text-xs ${className}`}
    >
      {text}
    </span>
  )
}

export function WizardTutorialAnimations() {
  return (
    <div className="mt-8 rounded-2xl border border-primary-100 bg-gradient-to-b from-white to-primary-50/90 px-4 py-8 dark:border-primary-700 dark:from-gray-900 dark:to-gray-900/95 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-lg">
        {/* Stepper (decorativo; explicação na lista abaixo) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-hidden>
          <div className="flex items-center gap-2">
            <StepDot step={1} className="home-wt-dot-1" />
            <StepLabel text={s1.label} className="home-wt-label-1" />
          </div>
          <div className="home-wt-conn-1 hidden h-0.5 w-5 rounded-full bg-primary-200 dark:bg-primary-600 sm:block sm:w-8" />
          <div className="flex items-center gap-2">
            <StepDot step={2} className="home-wt-dot-2" />
            <StepLabel text={s2.label} className="home-wt-label-2" />
          </div>
          <div className="home-wt-conn-2 hidden h-0.5 w-5 rounded-full bg-primary-200 dark:bg-primary-600 sm:block sm:w-8" />
          <div className="flex items-center gap-2">
            <StepDot step={3} className="home-wt-dot-3" />
            <StepLabel text={s3.label} className="home-wt-label-3" />
          </div>
        </div>

        {/* Painel de “ecrãs” */}
        <div className="relative mx-auto mt-8 min-h-[140px] max-w-md sm:min-h-[152px]" aria-hidden>
          <div className="home-wt-panel-1 absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-primary-100 bg-white/95 px-4 py-5 shadow-sm dark:border-primary-700 dark:bg-gray-800/95">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-500 dark:text-primary-400">
              Passo 1
            </p>
            <div className="mt-3 w-full max-w-[220px] space-y-2">
              <div className="home-wt-fake-select flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50/80 px-3 py-2.5 text-left text-xs font-medium text-primary-800 dark:border-primary-600 dark:bg-primary-900/60 dark:text-primary-100">
                <span className="truncate">Obra no Drive</span>
                <svg className="h-4 w-4 shrink-0 text-primary-400 dark:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              <div className="h-2 rounded bg-primary-100/80 dark:bg-primary-800/80" />
              <div className="h-2 w-[80%] rounded bg-primary-100/60 dark:bg-primary-800/50" />
            </div>
          </div>

          <div className="home-wt-panel-2 absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-primary-100 bg-white/95 px-4 py-5 shadow-sm dark:border-primary-700 dark:bg-gray-800/95">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-500 dark:text-primary-400">
              Passo 2
            </p>
            <div className="home-wt-dropzone relative mt-3 w-full max-w-[240px] rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 px-3 py-6 text-center dark:border-primary-600 dark:bg-primary-950/40">
              <div className="home-wt-pdf-chip pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-primary-200 bg-white px-2 py-1 shadow-sm dark:border-primary-600 dark:bg-gray-900">
                <span className="text-[9px] font-semibold text-primary-800 dark:text-primary-100">nota.pdf</span>
              </div>
              <p className="relative z-[1] text-[11px] text-primary-500 dark:text-primary-400">Arraste PDFs ou clique</p>
              <p className="relative z-[1] mt-0.5 text-[10px] text-primary-400 dark:text-primary-500">Apenas .pdf</p>
            </div>
          </div>

          <div className="home-wt-panel-3 absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-primary-100 bg-white/95 px-4 py-5 shadow-sm dark:border-primary-700 dark:bg-gray-800/95">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-500 dark:text-primary-400">
              Passo 3
            </p>
            <ul className="mt-3 w-full max-w-[220px] space-y-2 text-left text-xs text-primary-700 dark:text-primary-300">
              <li className="flex items-center gap-2">
                <span className="home-wt-check flex h-4 w-4 items-center justify-center rounded-full bg-primary-950 text-[9px] font-bold text-white dark:bg-primary-100 dark:text-primary-950">
                  ✓
                </span>
                <span>Totais conferidos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="home-wt-check flex h-4 w-4 items-center justify-center rounded-full bg-primary-950 text-[9px] font-bold text-white dark:bg-primary-100 dark:text-primary-950">
                  ✓
                </span>
                <span>PDF para a pasta da obra</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Dicas (texto acessível; realce sincronizado com a animação) */}
        <ol className="mt-8 space-y-3 text-left text-sm text-primary-700 dark:text-primary-300 sm:mt-10">
          <li className="home-wt-hint-1 flex gap-3 rounded-lg border border-transparent px-1 py-0.5 transition-colors">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-900 tabular-nums dark:bg-primary-800 dark:text-primary-100">
              1
            </span>
            <span>
              <span className="font-medium text-primary-950 dark:text-primary-50">{s1.label}.</span> {s1.hint}
            </span>
          </li>
          <li className="home-wt-hint-2 flex gap-3 rounded-lg border border-transparent px-1 py-0.5 transition-colors">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-900 tabular-nums dark:bg-primary-800 dark:text-primary-100">
              2
            </span>
            <span>
              <span className="font-medium text-primary-950 dark:text-primary-50">{s2.label}.</span> {s2.hint}
            </span>
          </li>
          <li className="home-wt-hint-3 flex gap-3 rounded-lg border border-transparent px-1 py-0.5 transition-colors">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-900 tabular-nums dark:bg-primary-800 dark:text-primary-100">
              3
            </span>
            <span>
              <span className="font-medium text-primary-950 dark:text-primary-50">{s3.label}.</span> {s3.hint}
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}
