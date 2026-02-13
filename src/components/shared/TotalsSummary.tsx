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
    <div className="rounded-xl bg-gray-50 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal Serviço</span>
          <span className="font-mono tabular-nums text-gray-700">
            {formatCurrency(subtotalServico)}
          </span>
        </div>

        {totalReembolso > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Reembolso</span>
            <span className="font-mono tabular-nums text-gray-700">
              {formatCurrency(totalReembolso)}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total Geral</span>
            <span className="font-mono text-base font-semibold tabular-nums text-gray-900">
              {formatCurrency(totalGeral)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
