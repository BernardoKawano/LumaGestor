import { describe, expect, it } from 'vitest'
import { totaisResumoObraCliente } from '../obraFinancialTotals'

describe('totaisResumoObraCliente', () => {
  it('soma adicionais da obra no total geral', () => {
    const t = totaisResumoObraCliente(1_000_000, 400_000, 231_000)
    expect(t.valorOriginal).toBe(1_000_000)
    expect(t.totalAdicionais).toBe(231_000)
    expect(t.totalGeral).toBe(1_231_000)
    expect(t.totalRecebido).toBe(400_000)
    expect(t.saldoDevedor).toBe(831_000)
  })

  it('sem adicionais da obra, total geral = valor original', () => {
    const t = totaisResumoObraCliente(500_000, 100_000, 0)
    expect(t.totalGeral).toBe(500_000)
    expect(t.saldoDevedor).toBe(400_000)
  })
})
