/* ────────────────────────────────────────────
   Tutorial primeira visita — Acompanhamento
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import {
  dismissTutorial,
  STORAGE_ACOMPANHAMENTO_TUTORIAL,
  shouldShowTutorial,
} from '../../utils/tutorialStorage'

const STEPS = [
  {
    title: 'Escolher a obra',
    text: 'Use o seletor do Drive. Dentro de pastas como CLIENTES 2026, um clique na pasta do cliente escolhe a obra; use a seta para abrir subpastas se precisar.',
  },
  {
    title: 'Planilha da obra',
    text: 'Se ainda não existir planilha de acompanhamento na pasta, o assistente ajuda a criar. Depois, os dados passam a ler e gravar no Google Sheets.',
  },
  {
    title: 'Colaboradores e valores',
    text: 'Selecione o funcionário à esquerda para ver histórico e registar pagamentos. Em Recebimentos registe o que o cliente pagou. Em Adicionais obra grave serviços extras que entram no total com o cliente; em Acréscimos colaborador ajuste só o combinado com um colaborador, sem alterar esse total.',
  },
  {
    title: 'Resumo em imagem',
    text: 'O botão flutuante verde gera uma imagem PNG do resumo para partilhar ou guardar.',
  },
] as const

export function AcompanhamentoInAppTutorial() {
  const [visible, setVisible] = useState(() => shouldShowTutorial(STORAGE_ACOMPANHAMENTO_TUTORIAL))

  const close = useCallback(() => {
    dismissTutorial(STORAGE_ACOMPANHAMENTO_TUTORIAL)
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="rounded-2xl border border-primary-200 bg-primary-50/90 p-5 shadow-sm dark:border-primary-700 dark:bg-primary-900/60"
      role="region"
      aria-labelledby="acomp-tutorial-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary-500 dark:text-primary-400">
            Primeiros passos
          </p>
          <h2 id="acomp-tutorial-title" className="mt-1 text-base font-semibold text-primary-950 dark:text-primary-100">
            Como usar o acompanhamento
          </h2>
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
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-semibold tabular-nums text-primary-900 dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-primary-950 dark:text-primary-100">{step.title}</p>
              <p className="mt-0.5 text-primary-600 dark:text-primary-400">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
