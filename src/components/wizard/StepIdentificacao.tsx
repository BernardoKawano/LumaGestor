/* ────────────────────────────────────────────
   Passo 1 — Identificação
   Obra, Clientes, Projeto/endereço, Data do documento.
   ──────────────────────────────────────────── */

import { useCallback } from 'react'
import { useWizardContext } from '../../hooks/useWizard'
import { ObraSelector } from '../shared/ObraSelector'
import { validateStep1, isValid } from '../../utils/validation'
import { getObraMeta, getObraMetaDrive } from '../../utils/storage'
import type { Obra } from '../../types'

export function StepIdentificacao() {
  const { state, dispatch } = useWizardContext()
  const s = state.solicitacao

  // Ao selecionar obra, busca metadados do Drive se localStorage vazio
  const handleObraChange = useCallback(
    (obra: Obra) => {
      dispatch({ type: 'SET_OBRA', obra })

      // Se localStorage não tinha dados, tenta Drive
      const local = getObraMeta(obra.id)
      if (!local) {
        getObraMetaDrive(obra.id).then((meta) => {
          if (meta) {
            dispatch({ type: 'SET_FIELD', field: 'clientes', value: meta.clientes })
            dispatch({ type: 'SET_FIELD', field: 'projeto', value: meta.projeto })
          }
        })
      }
    },
    [dispatch],
  )

  const handleContinuar = useCallback(() => {
    const errors = validateStep1(s)
    if (!isValid(errors)) {
      dispatch({ type: 'SET_ERRORS', errors })
      return
    }
    dispatch({ type: 'SET_STEP', step: 2 })
  }, [s, dispatch])

  // Formata Date para input date value (YYYY-MM-DD)
  const dataStr = s.data.toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Identificação</h2>

        <div className="space-y-5">
          {/* Obra */}
          <ObraSelector
            value={s.obra}
            onChange={handleObraChange}
            error={state.errors.obra}
          />

          {/* Clientes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
              Clientes
            </label>
            <input
              type="text"
              value={s.clientes}
              onChange={(e) =>
                dispatch({ type: 'SET_FIELD', field: 'clientes', value: e.target.value })
              }
              placeholder="Nome do cliente"
              className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-gray-300 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 ${
                state.errors.clientes
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-gray-200 dark:border-gray-600 dark:focus:ring-gray-600'
              }`}
            />
            {state.errors.clientes && (
              <p className="mt-1 text-xs text-red-500">{state.errors.clientes}</p>
            )}
          </div>

          {/* Projeto / Endereço */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
              Projeto (endereço)
            </label>
            <input
              type="text"
              value={s.projeto}
              onChange={(e) =>
                dispatch({ type: 'SET_FIELD', field: 'projeto', value: e.target.value })
              }
              placeholder="Rua, número, complemento"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
            />
          </div>

          {/* Data */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
              Data do documento
            </label>
            <input
              type="date"
              value={dataStr}
              onChange={(e) =>
                dispatch({ type: 'SET_DATA', data: new Date(e.target.value + 'T12:00:00') })
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          onClick={handleContinuar}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
