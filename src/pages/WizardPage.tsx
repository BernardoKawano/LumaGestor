/* ────────────────────────────────────────────
   WizardPage — container do wizard de Solicitação de Pagamento.
   Gerencia navegação entre passos e estado via useWizard.
   ──────────────────────────────────────────── */

import { useLocation } from 'react-router-dom'
import { WizardProvider, useWizardContext } from '../hooks/useWizard'
import { WizardStepper } from '../components/wizard/WizardStepper'
import { StepIdentificacao } from '../components/wizard/StepIdentificacao'
import { StepItens } from '../components/wizard/StepItens'
import { StepRevisao } from '../components/wizard/StepRevisao'
import { StepPronto } from '../components/wizard/StepPronto'
import type { Obra } from '../types'

function WizardContent() {
  const { state } = useWizardContext()

  return (
    <div className="space-y-8">
      {state.currentStep !== 'pronto' && (
        <WizardStepper currentStep={state.currentStep as 1 | 2 | 3} />
      )}

      {state.currentStep === 1 && <StepIdentificacao />}
      {state.currentStep === 2 && <StepItens />}
      {state.currentStep === 3 && <StepRevisao />}
      {state.currentStep === 'pronto' && <StepPronto />}
    </div>
  )
}

export function WizardPage() {
  const location = useLocation()
  const initialObra = (location.state as { obra?: Obra })?.obra ?? null

  return (
    <WizardProvider initialObra={initialObra}>
      <WizardContent />
    </WizardProvider>
  )
}
