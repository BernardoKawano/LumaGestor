import { describe, it, expect } from 'vitest'
import { formatDateExtended, formatDateISO, formatDateBR } from '../date'

describe('formatDateExtended', () => {
  it('retorna data por extenso em pt-BR', () => {
    const date = new Date(2026, 1, 6) // 6 de fevereiro de 2026
    expect(formatDateExtended(date)).toBe('06 de fevereiro de 2026')
  })

  it('retorna janeiro corretamente', () => {
    const date = new Date(2026, 0, 15)
    expect(formatDateExtended(date)).toBe('15 de janeiro de 2026')
  })
})

describe('formatDateISO', () => {
  it('retorna YYYY-MM-DD', () => {
    const date = new Date(2026, 1, 6)
    expect(formatDateISO(date)).toBe('2026-02-06')
  })
})

describe('formatDateBR', () => {
  it('retorna DD/MM/YYYY', () => {
    const date = new Date(2026, 1, 6)
    expect(formatDateBR(date)).toBe('06/02/2026')
  })
})
