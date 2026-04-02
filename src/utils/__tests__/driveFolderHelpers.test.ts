import { describe, expect, it } from 'vitest'
import { isClientesYearFolderName } from '../driveFolderHelpers'

describe('isClientesYearFolderName', () => {
  it('aceita CLIENTES 2026', () => {
    expect(isClientesYearFolderName('CLIENTES 2026')).toBe(true)
  })

  it('aceita variação sem espaço', () => {
    expect(isClientesYearFolderName('CLIENTES2026')).toBe(true)
  })

  it('é case-insensitive', () => {
    expect(isClientesYearFolderName('clientes 2025')).toBe(true)
  })

  it('rejeita ano inválido', () => {
    expect(isClientesYearFolderName('CLIENTES 26')).toBe(false)
  })

  it('rejeita outras pastas', () => {
    expect(isClientesYearFolderName('ALLAN E CAROLINA')).toBe(false)
  })
})
