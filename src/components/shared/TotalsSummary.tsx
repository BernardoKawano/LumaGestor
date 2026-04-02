/* ────────────────────────────────────────────
   TotalsSummary — card com subtotais e total geral.
   Sempre visível no rodapé do passo de Itens.
   ──────────────────────────────────────────── */

import { formatCurrency } from '../../utils/currency'

interface Props {
  subtotalServico: number  // centavos
  totalReembolso: number   // centavos
  totalGeral: number       // centavos
}

export function TotalsSummary({ subtotalServico, totalReembolso, totalGeral }: Props) {
  return (
    <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800/80">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal Serviço</span>
          <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200">
            {formatCurrency(subtotalServico)}
          </span>
        </div>

        {totalReembolso > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total Reembolso</span>
            <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200">
              {formatCurrency(totalReembolso)}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-2 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total Geral</span>
            <span className="font-mono text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatCurrency(totalGeral)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
