/* ────────────────────────────────────────────
   Utilitários de moeda (BRL)
   Valores internos sempre em CENTAVOS (inteiro)
   para evitar erros de ponto flutuante.
   ──────────────────────────────────────────── */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formata centavos → "R$ 10.000,00" */
export function formatCurrency(centavos: number): string {
  return BRL.format(centavos / 100)
}

/** Formata centavos → "10.000,00" (sem prefixo R$) */
export function formatCurrencyValue(centavos: number): string {
  return formatCurrency(centavos).replace('R$\u00a0', '').replace('R$ ', '')
}

/**
 * Converte string digitada → centavos.
 * Aceita: "10000", "10.000", "10000,00", "10.000,00"
 * Retorna 0 se input inválido.
 */
export function parseCurrency(input: string): number {
  if (!input) return 0
  // Remove tudo que não é dígito ou vírgula
  const cleaned = input.replace(/[^\d,]/g, '')
  // Separa parte inteira e decimal
  const parts = cleaned.split(',')
  const inteiro = parts[0].replace(/\./g, '') || '0'
  const decimal = (parts[1] || '00').padEnd(2, '0').slice(0, 2)
  return parseInt(inteiro, 10) * 100 + parseInt(decimal, 10)
}

/**
 * Aplica máscara de moeda a um input.
 * Recebe o valor bruto em centavos e retorna string formatada.
 */
export function maskCurrency(centavos: number): string {
  if (centavos === 0) return ''
  return formatCurrencyValue(centavos)
}
