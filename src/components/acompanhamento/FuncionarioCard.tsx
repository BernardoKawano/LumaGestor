/* ────────────────────────────────────────────
   FuncionarioCard — Card individual de funcionário.
   Mostra nome, barra de progresso, saldo restante.
   ──────────────────────────────────────────── */

import { formatCurrency } from '../../utils/currency'
import type { FuncionarioSummary } from '../../services/google-sheets-obras'

interface Props {
  summary: FuncionarioSummary
  isSelected: boolean
  onClick: () => void
}

export function FuncionarioCard({ summary, isSelected, onClick }: Props) {
  const { nome, valorEsperado, totalPago, saldoRestante, isMarjorie } = summary
  const percent = valorEsperado > 0 ? Math.min(100, (totalPago / valorEsperado) * 100) : 0
  const isOverpaid = saldoRestante < 0

  return (
    <button
      onClick={onClick}
      className={`flex w-full min-w-[200px] flex-col rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? isMarjorie
            ? 'border-amber-400 bg-amber-50/50 shadow-sm dark:border-amber-500 dark:bg-amber-950/40'
            : 'border-gray-900 bg-white shadow-sm dark:border-gray-100 dark:bg-gray-800'
          : isMarjorie
            ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/20 dark:hover:border-amber-600'
            : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
      }`}
    >
      {/* Nome */}
      <div className="flex items-center gap-2">
        {isMarjorie && (
          <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        )}
        <span
          className={`text-sm font-semibold ${isMarjorie ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-gray-100'}`}
        >
          {nome}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all ${
            isOverpaid
              ? 'bg-red-400'
              : percent >= 100
                ? 'bg-green-500'
                : isMarjorie
                  ? 'bg-amber-400'
                  : 'bg-gray-900'
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {/* Valores */}
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {formatCurrency(totalPago)}
        </span>
        <span className="font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
          / {formatCurrency(valorEsperado)}
        </span>
      </div>

      {/* Saldo */}
      <div className="mt-1">
        <span
          className={`text-xs font-medium ${
            isOverpaid
              ? 'text-red-500 dark:text-red-400'
              : saldoRestante === 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {isOverpaid
            ? `Excedido ${formatCurrency(Math.abs(saldoRestante))}`
            : saldoRestante === 0
              ? 'Quitado'
              : `Restante: ${formatCurrency(saldoRestante)}`}
        </span>
      </div>
    </button>
  )
}
