import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCurrencyValue, parseCurrency, maskCurrency } from '../currency'

describe('formatCurrency', () => {
  it('formata centavos para R$ com separador de milhar', () => {
    expect(formatCurrency(1000000)).toBe('R$\u00a010.000,00')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('formata centavos quebrados', () => {
    expect(formatCurrency(94704)).toBe('R$\u00a0947,04')
  })

  it('formata valor grande', () => {
    expect(formatCurrency(1094704)).toBe('R$\u00a010.947,04')
  })
})

describe('formatCurrencyValue', () => {
  it('retorna sem prefixo R$', () => {
    expect(formatCurrencyValue(1000000)).toBe('10.000,00')
  })
})

describe('parseCurrency', () => {
  it('parse "10000" como R$ 100,00 (10000 centavos)', () => {
    expect(parseCurrency('10000')).toBe(1000000)
  })

  it('parse "10.000,00"', () => {
    expect(parseCurrency('10.000,00')).toBe(1000000)
  })

  it('parse "947,04"', () => {
    expect(parseCurrency('947,04')).toBe(94704)
  })

  it('parse string vazia retorna 0', () => {
    expect(parseCurrency('')).toBe(0)
  })

  it('parse "0" retorna 0', () => {
    expect(parseCurrency('0')).toBe(0)
  })
})

describe('maskCurrency', () => {
  it('retorna string formatada para valor positivo', () => {
    expect(maskCurrency(1000000)).toBe('10.000,00')
  })

  it('retorna string vazia para zero', () => {
    expect(maskCurrency(0)).toBe('')
  })
})
