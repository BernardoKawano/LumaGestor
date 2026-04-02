import { describe, expect, it } from 'vitest'
import { wizardTutorial } from '../homeLanding'

describe('wizardTutorial (conteúdo reutilizado no assistente)', () => {
  it('define três passos com id, label e hint', () => {
    expect(wizardTutorial.steps).toHaveLength(3)
    for (const step of wizardTutorial.steps) {
      expect(step.id).toBeTruthy()
      expect(step.label.length).toBeGreaterThan(0)
      expect(step.hint.length).toBeGreaterThan(0)
    }
  })
})
