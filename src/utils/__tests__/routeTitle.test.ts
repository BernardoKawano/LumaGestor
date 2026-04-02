import { describe, expect, it } from 'vitest'
import { documentTitleForPathname } from '../routeTitle'

describe('documentTitleForPathname', () => {
  it('mapeia rotas conhecidas', () => {
    expect(documentTitleForPathname('/')).toContain('Início')
    expect(documentTitleForPathname('/wizard')).toContain('Nova solicitação')
    expect(documentTitleForPathname('/status')).toContain('Status')
    expect(documentTitleForPathname('/acompanhamento')).toContain('Acompanhamento')
  })
})
