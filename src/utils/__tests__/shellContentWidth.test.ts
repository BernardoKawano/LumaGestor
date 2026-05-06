import { describe, expect, it } from 'vitest'
import { resolveShellContentWidthClass } from '../shellContentWidth'

describe('resolveShellContentWidthClass', () => {
  it('força wide quando override é wide (ex.: seleção de obra no acompanhamento)', () => {
    expect(resolveShellContentWidthClass('/acompanhamento', 'wide')).toBe('max-w-7xl w-full')
    expect(resolveShellContentWidthClass('/status', 'wide')).toBe('max-w-7xl w-full')
  })

  it('wizard e home seguem pathname quando não há override', () => {
    expect(resolveShellContentWidthClass('/wizard', null)).toBe('max-w-7xl w-full')
    expect(resolveShellContentWidthClass('/', null)).toBe('max-w-5xl w-full')
  })

  it('demais rotas usam coluna padrão sem override', () => {
    expect(resolveShellContentWidthClass('/acompanhamento', null)).toBe('max-w-3xl w-full')
    expect(resolveShellContentWidthClass('/status', null)).toBe('max-w-3xl w-full')
  })
})
