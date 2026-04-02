import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WizardTutorialAnimations } from '../WizardTutorialAnimations'
import { wizardTutorial } from '../../../content/homeLanding'

describe('WizardTutorialAnimations', () => {
  it('renderiza os três passos e respetivas dicas do conteúdo', () => {
    const html = renderToStaticMarkup(<WizardTutorialAnimations />)
    wizardTutorial.steps.forEach((s) => {
      expect(html).toContain(s.label)
      expect(html).toContain(s.hint.slice(0, 24))
    })
    expect(html).toContain('Arraste PDFs ou clique')
  })
})
