/* ────────────────────────────────────────────
   CurrencyInput — input monetário brasileiro.
   Exibe "R$ " como prefixo, mascara para formato BRL.
   Valor interno em centavos (inteiro).
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import { maskCurrency, parseCurrency } from '../../utils/currency'

interface Props {
  value: number          // centavos
  onChange: (centavos: number) => void
  placeholder?: string
  error?: string
  className?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  error,
  className = '',
}: Props) {
  const [display, setDisplay] = useState(() => maskCurrency(value))

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Permite apenas dígitos, vírgula e ponto
      const sanitized = raw.replace(/[^\d.,]/g, '')
      setDisplay(sanitized)

      const centavos = parseCurrency(sanitized)
      onChange(centavos)
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    // Ao sair do campo, formata bonito
    if (value > 0) {
      setDisplay(maskCurrency(value))
    } else {
      setDisplay('')
    }
  }, [value])

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full rounded-lg border py-2.5 pl-10 pr-4 text-right font-mono text-sm tabular-nums transition-colors placeholder:text-gray-300 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:ring-red-200'
            : 'border-gray-200 focus:ring-gray-200'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
