import { describe, expect, it } from 'vitest'
import { homeHero, processSteps, productPillars, wizardTutorial } from '../homeLanding'

describe('homeLanding', () => {
  it('define hero com título e subtítulo não vazios', () => {
    expect(homeHero.title.length).toBeGreaterThan(10)
    expect(homeHero.subtitle.length).toBeGreaterThan(20)
  })

  it('mantém três passos do fluxo principal com ids únicos', () => {
    expect(processSteps).toHaveLength(3)
    const ids = processSteps.map((s) => s.id)
    expect(new Set(ids).size).toBe(3)
    processSteps.forEach((s, i) => {
      expect(s.step).toBe(i + 1)
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(20)
    })
  })

  it('define pilares do produto', () => {
    expect(productPillars.length).toBeGreaterThanOrEqual(3)
    productPillars.forEach((p) => {
      expect(p.id).toBeTruthy()
      expect(p.title.length).toBeGreaterThan(0)
      expect(p.text.length).toBeGreaterThan(10)
    })
  })

  it('define tutorial da Nova solicitação com três passos e ids únicos', () => {
    expect(wizardTutorial.sectionTitle.length).toBeGreaterThan(5)
    expect(wizardTutorial.sectionSubtitle.length).toBeGreaterThan(30)
    expect(wizardTutorial.steps).toHaveLength(3)
    const ids = wizardTutorial.steps.map((s) => s.id)
    expect(new Set(ids).size).toBe(3)
    wizardTutorial.steps.forEach((s) => {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.hint.length).toBeGreaterThan(20)
    })
  })
})
