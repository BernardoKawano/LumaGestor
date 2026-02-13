/* ────────────────────────────────────────────
   Passo 2 — Itens
   Serviço + Adicionais + Reembolsos + Totais.
   ──────────────────────────────────────────── */

import { useCallback } from 'react'
import { useWizardContext } from '../../hooks/useWizard'
import { CurrencyInput } from '../shared/CurrencyInput'
import { FileDropzone } from '../shared/FileDropzone'
import { TotalsSummary } from '../shared/TotalsSummary'
import { validateStep2, isValid } from '../../utils/validation'
import {
  calcSubtotalServico,
  calcTotalReembolso,
  calcTotalGeral,
} from '../../types'

export function StepItens() {
  const { state, dispatch } = useWizardContext()
  const s = state.solicitacao

  const handleContinuar = useCallback(() => {
    const errors = validateStep2(s)
    if (!isValid(errors)) {
      dispatch({ type: 'SET_ERRORS', errors })
      return
    }
    dispatch({ type: 'SET_STEP', step: 3 })
  }, [s, dispatch])

  const handleVoltar = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: 1 })
  }, [dispatch])

  return (
    <div className="space-y-6">
      {/* ── Serviço ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-gray-900">Serviço</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500">
              Empresa / Loja
            </label>
            <input
              type="text"
              value={s.servico.empresa}
              onChange={(e) =>
                dispatch({ type: 'SET_SERVICO_EMPRESA', empresa: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500">
              Valor do serviço
            </label>
            <CurrencyInput
              value={s.servico.valor}
              onChange={(v) => dispatch({ type: 'SET_SERVICO_VALOR', valor: v })}
              error={state.errors.servicoValor}
            />
          </div>
        </div>
      </div>

      {/* ── Adicionais ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Adicionais</h2>
          <button
            onClick={() => dispatch({ type: 'ADD_ADICIONAL' })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            + Adicional
          </button>
        </div>

        {s.adicionais.length === 0 ? (
          <p className="text-sm text-gray-300">Nenhum adicional. Clique em "+ Adicional" para incluir.</p>
        ) : (
          <div className="space-y-3">
            {s.adicionais.map((ad) => (
              <div
                key={ad.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={ad.nome}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_ADICIONAL',
                        id: ad.id,
                        field: 'nome',
                        value: e.target.value,
                      })
                    }
                    placeholder="Nome / descrição"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <CurrencyInput
                    value={ad.valor}
                    onChange={(v) =>
                      dispatch({
                        type: 'UPDATE_ADICIONAL',
                        id: ad.id,
                        field: 'valor',
                        value: v,
                      })
                    }
                  />
                </div>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_ADICIONAL', id: ad.id })}
                  className="mt-1 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400"
                  title="Remover"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reembolsos ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Notas de Reembolso</h2>

        <FileDropzone
          onFilesAdded={(files) => {
            files.forEach((f) => dispatch({ type: 'ADD_REEMBOLSO', arquivo: f }))
          }}
        />

        {s.reembolsos.length > 0 && (
          <div className="mt-4 space-y-3">
            {s.reembolsos.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{r.nomeOriginal}</p>
                </div>

                <CurrencyInput
                  value={r.valor}
                  onChange={(v) =>
                    dispatch({ type: 'UPDATE_REEMBOLSO_VALOR', id: r.id, valor: v })
                  }
                  error={state.errors[`reembolso_${i}`]}
                  className="w-40"
                />

                <button
                  onClick={() => dispatch({ type: 'REMOVE_REEMBOLSO', id: r.id })}
                  className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400"
                  title="Remover"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Totais ── */}
      <TotalsSummary
        subtotalServico={calcSubtotalServico(s)}
        totalReembolso={calcTotalReembolso(s)}
        totalGeral={calcTotalGeral(s)}
      />

      {/* ── CTAs ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleVoltar}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          onClick={handleContinuar}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
