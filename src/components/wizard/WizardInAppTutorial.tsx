/* ────────────────────────────────────────────
   Tutorial primeira visita — Nova solicitação
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import { wizardTutorial } from '../../content/homeLanding'
import { dismissTutorial, STORAGE_WIZARD_TUTORIAL, shouldShowTutorial } from '../../utils/tutorialStorage'

export function WizardInAppTutorial() {
  const [visible, setVisible] = useState(() => shouldShowTutorial(STORAGE_WIZARD_TUTORIAL))

  const close = useCallback(() => {
    dismissTutorial(STORAGE_WIZARD_TUTORIAL)
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="rounded-2xl border border-primary-200 bg-primary-50/90 p-5 shadow-sm dark:border-primary-700 dark:bg-primary-900/60"
      role="region"
      aria-labelledby="wizard-tutorial-inapp-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary-500 dark:text-primary-400">
            {wizardTutorial.sectionEyebrow}
          </p>
          <h2 id="wizard-tutorial-inapp-title" className="mt-1 text-base font-semibold text-primary-950 dark:text-primary-100">
            {wizardTutorial.sectionTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-primary-600 dark:text-primary-300">
            {wizardTutorial.sectionSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-full border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-white dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-800"
        >
          Entendi
        </button>
      </div>
      <ol className="mt-4 space-y-3 border-t border-primary-200/80 pt-4 dark:border-primary-700">
        {wizardTutorial.steps.map((step, i) => (
          <li key={step.id} className="flex gap-3 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-semibold tabular-nums text-primary-900 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-primary-950 dark:text-primary-100">{step.label}</p>
              <p className="mt-0.5 text-primary-600 dark:text-primary-400">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
