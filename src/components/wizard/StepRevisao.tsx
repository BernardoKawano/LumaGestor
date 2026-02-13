/* ────────────────────────────────────────────
   Passo 3 — Revisão
   Preview final espelhando o PDF + botão Gerar PDF.
   ──────────────────────────────────────────── */

import { useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useWizardContext } from '../../hooks/useWizard'
import { PreviewTable } from '../shared/PreviewTable'
import { TEMPLATE } from '../../config/template'
import { formatDateExtended } from '../../utils/date'
import { SolicitacaoPdf } from '../pdf/SolicitacaoPdf'
import { useAuth } from '../../context/AuthContext'
import { getOrCreateFolder, uploadFile } from '../../services/google-drive'
import { nomeSolicitacao, nomeReembolso } from '../../utils/naming'
import { formatDateBR } from '../../utils/date'

export function StepRevisao() {
  const { state, dispatch } = useWizardContext()
  const { isSignedIn } = useAuth()
  const s = state.solicitacao

  const handleVoltar = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: 2 })
  }, [dispatch])

  const handleGerarPdf = useCallback(async () => {
    dispatch({ type: 'SET_GENERATING_PDF', value: true })

    try {
      // 1. Gerar blob do PDF
      const blob = await pdf(<SolicitacaoPdf solicitacao={s} />).toBlob()
      const blobUrl = URL.createObjectURL(blob)
      dispatch({ type: 'SET_PDF_BLOB_URL', url: blobUrl })

      // 2. Upload para o Drive (se autenticado e obra definida)
      if (isSignedIn && s.obra) {
        dispatch({ type: 'SET_UPLOADING', value: true })

        try {
          // Buscar/criar pasta "SOLICITAÇÃO DE PAGAMENTO" dentro da obra
          const solPastaId = await getOrCreateFolder(
            s.obra.id,
            'SOLICITAÇÃO DE PAGAMENTO',
          )

          // Criar subpasta com data no formato DD-MM-YYYY
          const dataFolder = formatDateBR(s.data).replace(/\//g, '-')
          const dataPastaId = await getOrCreateFolder(
            solPastaId,
            dataFolder,
          )

          // Upload do PDF principal
          const fileName = nomeSolicitacao(s.obra.nome, s.data)
          const uploaded = await uploadFile(dataPastaId, fileName, blob)
          dispatch({
            type: 'SET_DRIVE_INFO',
            fileId: uploaded.id,
            pdfUrl: uploaded.webViewLink,
          })

          // Upload das notas de reembolso
          for (let i = 0; i < s.reembolsos.length; i++) {
            const r = s.reembolsos[i]
            const nrName = nomeReembolso(s.obra.nome, r.valor, s.data, i + 1)
            await uploadFile(dataPastaId, nrName, r.arquivo)
          }
        } catch (err) {
          console.error('Erro no upload para o Drive:', err)
          // PDF foi gerado com sucesso, continua mesmo sem Drive
        } finally {
          dispatch({ type: 'SET_UPLOADING', value: false })
        }
      }

      dispatch({ type: 'SET_STATUS', status: 'gerada' })
      dispatch({ type: 'SET_STEP', step: 'pronto' })
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    } finally {
      dispatch({ type: 'SET_GENERATING_PDF', value: false })
    }
  }, [s, isSignedIn, dispatch])

  return (
    <div className="space-y-6">
      {/* Card de revisão */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Revisão</h2>

        {/* Cabeçalho do documento */}
        <div className="mb-6 space-y-1.5">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
            {TEMPLATE.titulo}
          </p>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">CLIENTES:</span> {s.clientes}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">PROJETO:</span> {s.projeto}
            </p>
          </div>
        </div>

        {/* Tabela */}
        <PreviewTable solicitacao={s} />

        {/* Dados bancários */}
        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold text-gray-500">
            {TEMPLATE.banco.label}
          </p>
          <div className="space-y-0.5 text-xs text-gray-500">
            <p>{TEMPLATE.banco.nome}</p>
            <p>{TEMPLATE.banco.razaoSocial}</p>
            <p>CNPJ – {TEMPLATE.banco.cnpj}</p>
            <p>AG. {TEMPLATE.banco.agencia}</p>
            <p>C/C {TEMPLATE.banco.conta}</p>
            <p className="my-1 text-gray-300">ou</p>
            <p>PIX chave: {TEMPLATE.banco.pixTipo}</p>
            <p>{TEMPLATE.banco.pixChave}</p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {TEMPLATE.assinatura.cidade}, {formatDateExtended(s.data)}.
          </p>
          <p className="mt-3 text-xs font-medium text-gray-700">
            {TEMPLATE.assinatura.nome}
          </p>
          <p className="text-xs text-gray-400">
            {TEMPLATE.assinatura.registro}
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleVoltar}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          onClick={handleGerarPdf}
          disabled={state.isGeneratingPdf}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.isGeneratingPdf
            ? state.isUploading
              ? 'Enviando ao Drive...'
              : 'Gerando PDF...'
            : 'Gerar PDF'}
        </button>
      </div>
    </div>
  )
}
