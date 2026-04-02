/* ────────────────────────────────────────────
   PreviewTable — tabela que espelha o PDF.
   Usada no Step 3 (Revisão) e potencialmente inline.
   Numeração auto-sequencial; TOTAL sem índice.
   ──────────────────────────────────────────── */

import type { SolicitacaoPagamento } from '../../types'
import { calcTotalReembolso, calcTotalGeral } from '../../types'
import { formatCurrency } from '../../utils/currency'

interface Props {
  solicitacao: SolicitacaoPagamento
}

interface TabelaItem {
  indice: string
  descricao: string
  valor: string
  isBold?: boolean
  isTotal?: boolean
}

export function PreviewTable({ solicitacao }: Props) {
  const s = solicitacao

  // Montar itens da tabela com numeração sequencial
  const items: TabelaItem[] = []
  let seq = 1

  // 1. Serviço principal
  items.push({
    indice: String(seq).padStart(2, '0'),
    descricao: s.servico.empresa,
    valor: formatCurrency(s.servico.valor),
  })
  seq++

  // 2. Adicionais
  for (const ad of s.adicionais) {
    if (ad.nome && ad.valor > 0) {
      items.push({
        indice: String(seq).padStart(2, '0'),
        descricao: ad.nome,
        valor: formatCurrency(ad.valor),
      })
      seq++
    }
  }

  // 3. Notas de reembolso (linha única consolidada)
  const totalReembolso = calcTotalReembolso(s)
  if (totalReembolso > 0) {
    items.push({
      indice: String(seq).padStart(2, '0'),
      descricao: 'NOTAS DE REEMBOLSO',
      valor: formatCurrency(totalReembolso),
      isBold: true,
    })
  }

  // 4. Total
  const totalGeral = calcTotalGeral(s)
  items.push({
    indice: '',
    descricao: 'TOTAL',
    valor: formatCurrency(totalGeral),
    isTotal: true,
  })

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_auto] border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-800/80">
        <span />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Empresa / Loja
        </span>
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Valor
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={i}
          className={`grid grid-cols-[3rem_1fr_auto] px-4 py-2.5 ${
            item.isTotal
              ? 'border-t-2 border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800/80'
              : i < items.length - 1
                ? 'border-b border-gray-100 dark:border-gray-700'
                : ''
          }`}
        >
          <span className="font-mono text-sm text-gray-400 dark:text-gray-500">{item.indice}</span>
          <span
            className={`text-sm ${
              item.isTotal
                ? 'font-bold text-gray-900 dark:text-gray-100'
                : item.isBold
                  ? 'font-semibold text-gray-700 dark:text-gray-200'
                  : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {item.descricao}
          </span>
          <span
            className={`text-right font-mono text-sm tabular-nums ${
              item.isTotal ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {item.valor}
          </span>
        </div>
      ))}
    </div>
  )
}
