import { describe, it, expect } from 'vitest'
import { validateStep1, validateStep2, isValid } from '../validation'
import type { SolicitacaoPagamento } from '../../types'

function baseSolicitacao(overrides: Partial<SolicitacaoPagamento> = {}): SolicitacaoPagamento {
  return {
    obra: { id: '1', nome: 'Teste' },
    clientes: 'Cliente Teste',
    projeto: 'Rua Teste 123',
    data: new Date(),
    servico: { empresa: 'MaMM Gestão e Engenharia', valor: 100000 },
    adicionais: [],
    reembolsos: [],
    status: 'rascunho',
    ...overrides,
  }
}

describe('validateStep1', () => {
  it('valida quando todos os campos estão preenchidos', () => {
    const errors = validateStep1(baseSolicitacao())
    expect(isValid(errors)).toBe(true)
  })

  it('retorna erro quando obra é null', () => {
    const errors = validateStep1(baseSolicitacao({ obra: null }))
    expect(errors.obra).toBeDefined()
    expect(isValid(errors)).toBe(false)
  })

  it('retorna erro quando clientes está vazio', () => {
    const errors = validateStep1(baseSolicitacao({ clientes: '' }))
    expect(errors.clientes).toBeDefined()
  })

  it('retorna erro quando clientes é só espaços', () => {
    const errors = validateStep1(baseSolicitacao({ clientes: '   ' }))
    expect(errors.clientes).toBeDefined()
  })
})

describe('validateStep2', () => {
  it('valida quando serviço tem valor > 0', () => {
    const errors = validateStep2(baseSolicitacao())
    expect(isValid(errors)).toBe(true)
  })

  it('retorna erro quando valor do serviço é 0', () => {
    const errors = validateStep2(
      baseSolicitacao({ servico: { empresa: 'MaMM', valor: 0 } }),
    )
    expect(errors.servicoValor).toBeDefined()
  })

  it('retorna erro para reembolso sem valor', () => {
    const errors = validateStep2(
      baseSolicitacao({
        reembolsos: [
          { id: '1', arquivo: new File([], 'nota.pdf'), nomeOriginal: 'nota.pdf', valor: 0 },
        ],
      }),
    )
    expect(errors.reembolso_0).toBeDefined()
  })

  it('valida quando reembolso tem valor > 0', () => {
    const errors = validateStep2(
      baseSolicitacao({
        reembolsos: [
          { id: '1', arquivo: new File([], 'nota.pdf'), nomeOriginal: 'nota.pdf', valor: 50000 },
        ],
      }),
    )
    expect(isValid(errors)).toBe(true)
  })
})
