import { describe, expect, it } from 'vitest'
import { APP_LOGO_PATHS } from '../AppLogo'

describe('AppLogo', () => {
  it('tenta logo principal e fallbacks em public/images', () => {
    expect(APP_LOGO_PATHS).toEqual(['/images/logo-luma-gestor.png', '/images/logo.svg', '/images/logo.png'])
  })
})
