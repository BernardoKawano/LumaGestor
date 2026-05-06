import { formatCurrency } from './currency'

/** Prefixo da descrição nas linhas de histórico (valor da linha = 0). */
export const ACRESCIMO_HISTORICO_PREFIX = 'Acréscimo contratual'

export function isLinhaHistoricoAcrescimo(valorCentavos: number, descricao: string): boolean {
  return valorCentavos === 0 && descricao.startsWith(ACRESCIMO_HISTORICO_PREFIX)
}

/** Soma o acréscimo ao valor esperado atual (centavos). */
export function novoValorEsperadoComAcrescimo(atualCentavos: number, incrementoCentavos: number): number {
  if (incrementoCentavos <= 0) {
    throw new Error('O acréscimo deve ser maior que zero')
  }
  if (atualCentavos < 0) {
    throw new Error('Valor esperado atual inválido')
  }
  return atualCentavos + incrementoCentavos
}

/** Texto da linha de histórico na aba do colaborador (valor monetário da linha = 0). */
export function buildAcrescimoHistoricoDescricao(incrementoCentavos: number, motivo: string): string {
  const base = `${ACRESCIMO_HISTORICO_PREFIX} +${formatCurrency(incrementoCentavos)}`
  const m = motivo.trim()
  return m ? `${base}: ${m}` : base
}

/**
 * Lê o incremento em centavos gravado na descrição da linha de histórico de acréscimo.
 */
export function parseIncrementoCentavosAcrescimoHistorico(descricao: string): number | null {
  const normalized = descricao.replace(/\u00a0/g, ' ').trim()
  if (!normalized.startsWith(ACRESCIMO_HISTORICO_PREFIX)) return null
  const plusIdx = normalized.indexOf('+R$')
  if (plusIdx < 0) return null
  let amountPart = normalized.slice(plusIdx + 3).trim()
  const colonIdx = amountPart.indexOf(':')
  if (colonIdx >= 0) amountPart = amountPart.slice(0, colonIdx).trim()
  const cleaned = amountPart.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  if (Number.isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

/** Texto após «: » na descrição do acréscimo (motivo livre). */
export function parseMotivoAcrescimoHistorico(descricao: string): string {
  const normalized = descricao.replace(/\u00a0/g, ' ')
  const idx = normalized.indexOf(': ')
  if (idx < 0) return ''
  return normalized.slice(idx + 2).trim()
}
