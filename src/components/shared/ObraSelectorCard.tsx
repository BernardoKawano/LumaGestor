/* ────────────────────────────────────────────
   Cartão padrão em volta do seletor de obra
   (mesmo bloco visual em Acompanhamento e Nova solicitação).
   ──────────────────────────────────────────── */

import type { Obra } from '../../types'
import { ObraSelector } from './ObraSelector'

interface Props {
  value: Obra | null
  onChange: (obra: Obra) => void
  error?: string
}

export function ObraSelectorCard({ value, onChange, error }: Props) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <ObraSelector value={value} onChange={onChange} error={error} />
    </div>
  )
}
