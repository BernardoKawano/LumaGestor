import { describe, it, expect } from 'vitest'
import { parseValorFromFilename } from '../parseFilename'

describe('parseValorFromFilename', () => {
  it('extrai valor simples: "ALLAN 53,40.pdf"', () => {
    expect(parseValorFromFilename('ALLAN 53,40.pdf')).toBe(5340)
  })

  it('extrai valor com milhar: "ALLAN 1.210,10.pdf"', () => {
    expect(parseValorFromFilename('ALLAN 1.210,10.pdf')).toBe(121010)
  })

  it('extrai valor grande: "MARIA 12.500,00.pdf"', () => {
    expect(parseValorFromFilename('MARIA 12.500,00.pdf')).toBe(1250000)
  })

  it('extrai valor sem milhar: "NOTA 500,00.pdf"', () => {
    expect(parseValorFromFilename('NOTA 500,00.pdf')).toBe(50000)
  })

  it('extrai valor inteiro sem centavos: "NOTA 500.pdf"', () => {
    expect(parseValorFromFilename('NOTA 500.pdf')).toBe(50000)
  })

  it('retorna 0 para arquivo sem valor: "documento.pdf"', () => {
    expect(parseValorFromFilename('documento.pdf')).toBe(0)
  })

  it('ignora extensão maiúscula: "ALLAN 53,40.PDF"', () => {
    expect(parseValorFromFilename('ALLAN 53,40.PDF')).toBe(5340)
  })

  it('pega o último valor se houver múltiplos números: "NOTA 01 2.500,00.pdf"', () => {
    expect(parseValorFromFilename('NOTA 01 2.500,00.pdf')).toBe(250000)
  })
})
