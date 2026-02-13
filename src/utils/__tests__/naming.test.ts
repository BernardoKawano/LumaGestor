import { describe, it, expect } from 'vitest'
import { nomeSolicitacao, nomeReembolso } from '../naming'

describe('nomeSolicitacao', () => {
  it('gera nome correto para PDF da solicitação', () => {
    const date = new Date(2026, 1, 6)
    expect(nomeSolicitacao('JAIR AVANSI', date)).toBe('OP - JAIR AVANSI - 2026-02-06.pdf')
  })
})

describe('nomeReembolso', () => {
  it('gera nome correto para nota de reembolso', () => {
    const date = new Date(2026, 1, 6)
    expect(nomeReembolso('JAIR AVANSI', 94704, date, 1)).toBe(
      'NR - JAIR AVANSI - 947,04 - 2026-02-06 - 1.pdf',
    )
  })
})
