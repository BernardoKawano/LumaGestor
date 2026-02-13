/* ────────────────────────────────────────────
   Modal "Marcar como Paga" — versão Kanban
   Confirma data do pagamento e registra na aba RECEBIMENTOS
   da planilha de acompanhamento da obra.
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import type { SolicitacaoResumo } from '../../types'
import { findSheetInFolder } from '../../services/google-drive'
import { appendRecebimento } from '../../services/google-sheets-obras'
import { formatCurrency } from '../../utils/currency'

interface Props {
  item: SolicitacaoResumo
  onConfirm: (dataPagamento: string) => void
  onClose: () => void
}

export function ModalPagaKanban({ item, onConfirm, onClose }: Props) {
  const [dataPgto, setDataPgto] = useState(new Date().toISOString().split('T')[0])
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleConfirmar = useCallback(async () => {
    setLoading(true)
    setErro('')

    try {
      const data = new Date(dataPgto + 'T12:00:00')

      // Registrar na planilha de acompanhamento (se existir)
      if (item.obraId) {
        try {
          const sheetId = await findSheetInFolder(item.obraId)
          if (sheetId) {
            await appendRecebimento(
              sheetId,
              data,
              item.subtotalServico,
              descricao || `Solicitação de Pagamento - ${item.obraNome}`,
              item.drivePdfUrl ?? '',
            )
          } else {
            console.warn('Nenhuma planilha de acompanhamento encontrada para a obra')
          }
        } catch (err) {
          // Não bloquear a mudança de status se falhar o registro na planilha
          console.error('Erro ao registrar recebimento na planilha:', err)
        }
      }

      onConfirm(data.toISOString())
    } catch (err) {
      console.error('Erro ao marcar como paga:', err)
      setErro('Erro ao registrar pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [dataPgto, descricao, item, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Marcar como Paga</h2>
        <p className="mt-1 text-sm text-gray-500">
          O valor de serviço + adicionais será registrado na planilha da obra.
        </p>

        {/* Resumo */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{item.obraNome}</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">
              {formatCurrency(item.subtotalServico)}
            </span>
          </div>
          {item.totalReembolso > 0 && (
            <p className="mt-1 text-[10px] text-gray-400">
              Reembolso de {formatCurrency(item.totalReembolso)} não entra no valor pago
            </p>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {/* Data do pagamento */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500">
              Data do pagamento
            </label>
            <input
              type="date"
              value={dataPgto}
              onChange={(e) => setDataPgto(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {/* Descrição opcional */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-500">
              Descrição <span className="text-gray-300">(opcional)</span>
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Pagamento via transferência"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-500">{erro}</p>
          )}
        </div>

        {/* Botões */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
