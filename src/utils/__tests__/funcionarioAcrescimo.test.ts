import { describe, expect, it } from 'vitest'
import {
  buildAcrescimoHistoricoDescricao,
  isLinhaHistoricoAcrescimo,
  novoValorEsperadoComAcrescimo,
  parseIncrementoCentavosAcrescimoHistorico,
  parseMotivoAcrescimoHistorico,
} from '../funcionarioAcrescimo'

describe('novoValorEsperadoComAcrescimo', () => {
  it('soma centavos', () => {
    expect(novoValorEsperadoComAcrescimo(100_000, 50_000)).toBe(150_000)
  })

  it('rejeita incremento não positivo', () => {
    expect(() => novoValorEsperadoComAcrescimo(100, 0)).toThrow(/maior que zero/)
    expect(() => novoValorEsperadoComAcrescimo(100, -1)).toThrow(/maior que zero/)
  })
})

describe('buildAcrescimoHistoricoDescricao', () => {
  it('inclui motivo quando informado', () => {
    const s = buildAcrescimoHistoricoDescricao(50_000, 'Muro extra — proprietário')
    expect(s).toContain('Muro extra — proprietário')
    expect(s.replace(/\u00a0/g, ' ')).toBe('Acréscimo contratual +R$ 500,00: Muro extra — proprietário')
  })

  it('omite dois-pontos quando motivo vazio', () => {
    expect(buildAcrescimoHistoricoDescricao(25_000, '').replace(/\u00a0/g, ' ')).toBe(
      'Acréscimo contratual +R$ 250,00',
    )
    expect(buildAcrescimoHistoricoDescricao(25_000, '  ').replace(/\u00a0/g, ' ')).toBe(
      'Acréscimo contratual +R$ 250,00',
    )
  })
})

describe('isLinhaHistoricoAcrescimo', () => {
  it('identifica linha de nota de acréscimo', () => {
    expect(isLinhaHistoricoAcrescimo(0, 'Acréscimo contratual +R$ 100,00: extra')).toBe(true)
    expect(isLinhaHistoricoAcrescimo(100, 'Acréscimo contratual +R$ 100,00')).toBe(false)
    expect(isLinhaHistoricoAcrescimo(0, 'Pagamento parcial')).toBe(false)
  })
})

describe('parseIncrementoCentavosAcrescimoHistorico', () => {
  it('extrai centavos com e sem motivo', () => {
    const d1 = buildAcrescimoHistoricoDescricao(50_000, 'Muro')
    expect(parseIncrementoCentavosAcrescimoHistorico(d1.replace(/\u00a0/g, ' '))).toBe(50_000)
    const d2 = buildAcrescimoHistoricoDescricao(123_456, '')
    expect(parseIncrementoCentavosAcrescimoHistorico(d2.replace(/\u00a0/g, ' '))).toBe(123_456)
  })

  it('rejeita descrição inválida', () => {
    expect(parseIncrementoCentavosAcrescimoHistorico('Outro texto')).toBe(null)
  })
})

describe('parseMotivoAcrescimoHistorico', () => {
  it('extrai motivo após dois-pontos', () => {
    expect(parseMotivoAcrescimoHistorico('Acréscimo contratual +R$ 10,00: serviço X')).toBe('serviço X')
    expect(parseMotivoAcrescimoHistorico(buildAcrescimoHistoricoDescricao(100, ''))).toBe('')
  })
})
