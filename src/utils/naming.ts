/* ────────────────────────────────────────────
   Geração de nomes de arquivo padronizados
   ──────────────────────────────────────────── */

import { formatDateISO } from './date'
import { formatCurrencyValue } from './currency'

/**
 * Nome do PDF da solicitação de pagamento.
 * Ex: "OP - JAIR AVANSI - 2026-02-06.pdf"
 */
export function nomeSolicitacao(obra: string, data: Date): string {
  return `OP - ${obra} - ${formatDateISO(data)}.pdf`
}

/**
 * Nome de uma nota de reembolso.
 * Ex: "NR - JAIR AVANSI - 947,04 - 2026-02-06 - 1.pdf"
 */
export function nomeReembolso(
  obra: string,
  valorCentavos: number,
  data: Date,
  indice: number,
): string {
  const valor = formatCurrencyValue(valorCentavos)
  return `NR - ${obra} - ${valor} - ${formatDateISO(data)} - ${indice}.pdf`
}
