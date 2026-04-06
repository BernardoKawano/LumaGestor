import { describe, expect, it } from 'vitest'
import { demoCaptureFromEnv } from '../demoCapture'

describe('demoCaptureFromEnv', () => {
  it('ativa só com DEV e VITE_DEMO_CAPTURE=1', () => {
    expect(demoCaptureFromEnv({ DEV: true, VITE_DEMO_CAPTURE: '1' })).toBe(true)
    expect(demoCaptureFromEnv({ DEV: true, VITE_DEMO_CAPTURE: '0' })).toBe(false)
    expect(demoCaptureFromEnv({ DEV: false, VITE_DEMO_CAPTURE: '1' })).toBe(false)
    expect(demoCaptureFromEnv({ DEV: true })).toBe(false)
  })
})
