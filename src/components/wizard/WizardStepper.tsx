/* ────────────────────────────────────────────
   WizardStepper — indicador visual dos 3 passos.
   Círculos conectados por linha, quiet premium style.
   ──────────────────────────────────────────── */

const STEPS = [
  { num: 1, label: 'Identificação' },
  { num: 2, label: 'Itens' },
  { num: 3, label: 'Revisão' },
] as const

interface Props {
  currentStep: 1 | 2 | 3
}

export function WizardStepper({ currentStep }: Props) {
  return (
    <nav className="flex items-center justify-center gap-0" aria-label="Progresso">
      {STEPS.map((step, i) => {
        const isActive = step.num === currentStep
        const isDone = step.num < currentStep

        return (
          <div key={step.num} className="flex items-center">
            {/* Linha conectora (antes do step, exceto o primeiro) */}
            {i > 0 && (
              <div
                className={`h-px w-12 sm:w-20 ${
                  isDone ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}

            {/* Step */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : isDone
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'border-2 border-gray-200 text-gray-400 dark:border-gray-600 dark:text-gray-500'
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
