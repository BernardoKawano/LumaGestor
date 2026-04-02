import { describe, expect, it } from 'vitest'
import {
  dismissTutorial,
  hasDismissedTutorial,
  shouldShowTutorial,
  STORAGE_WIZARD_TUTORIAL,
} from '../tutorialStorage'

function mockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  } as Pick<Storage, 'getItem' | 'setItem'>
}

describe('tutorialStorage', () => {
  it('shouldShowTutorial é true até dismiss', () => {
    const s = mockStorage()
    expect(shouldShowTutorial(STORAGE_WIZARD_TUTORIAL, s)).toBe(true)
    dismissTutorial(STORAGE_WIZARD_TUTORIAL, s)
    expect(hasDismissedTutorial(STORAGE_WIZARD_TUTORIAL, s)).toBe(true)
    expect(shouldShowTutorial(STORAGE_WIZARD_TUTORIAL, s)).toBe(false)
  })
})
