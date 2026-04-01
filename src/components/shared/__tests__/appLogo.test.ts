import { describe, expect, it } from 'vitest'
import { APP_LOGO_PATHS } from '../AppLogo'

describe('AppLogo', () => {
  it('tenta SVG e PNG em public/images', () => {
    expect(APP_LOGO_PATHS).toEqual(['/images/logo.svg', '/images/logo.png'])
  })
})
