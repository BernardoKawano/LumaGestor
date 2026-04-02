/* ────────────────────────────────────────────
   Tela Pós-Geração — Pronto
   Links do PDF, status, copiar e-mail, marcar como paga.
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardContext } from '../../hooks/useWizard'
import { ModalMarcarPaga } from '../modals/ModalMarcarPaga'
import { TEMPLATE } from '../../config/template'
import { formatDateISO } from '../../utils/date'
import { formatCurrency } from '../../utils/currency'
import { calcTotalGeral } from '../../types'

export function StepPronto() {
  const navigate = useNavigate()
  const { state, dispatch } = useWizardContext()
  const s = state.solicitacao
  const [modalPaga, setModalPaga] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const handleCopiarEmail = useCallback(() => {
    const total = formatCurrency(calcTotalGeral(s))
    const data = formatDateISO(s.data)
    const obra = s.obra?.nome ?? s.clientes

    const assunto = TEMPLATE.email.assuntoTemplate
      .replace('{OBRA}', obra)
      .replace('{DATA}', data)

    const corpo = TEMPLATE.email.corpoTemplate
      .replace('{OBRA}', obra)
      .replace('{TOTAL}', total)

    const texto = `Assunto: ${assunto}\n\n${corpo}`

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }, [s])

  const handleMarcarEnviada = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: 'enviada' })
  }, [dispatch])

  const actionRow =
    'flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80'

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/50">
          <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Solicitação gerada</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {s.drivePdfUrl
            ? 'PDF salvo no Google Drive com sucesso.'
            : 'PDF gerado localmente.'}
        </p>

        {/* Status badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
          <div
            className={`h-2 w-2 rounded-full ${
              s.status === 'paga'
                ? 'bg-green-500'
                : s.status === 'enviada'
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
            }`}
          />
          <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-300">
            {s.status}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Ações</h3>
        <div className="space-y-3">
          {/* Download PDF */}
          {s.pdfBlobUrl && (
            <a
              href={s.pdfBlobUrl}
              download={`OP - ${s.obra?.nome ?? s.clientes} - ${formatDateISO(s.data)}.pdf`}
              className={actionRow}
            >
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-200">Baixar PDF da Solicitação</span>
            </a>
          )}

          {/* Link Drive */}
          {s.drivePdfUrl && (
            <a
              href={s.drivePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionRow}
            >
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-200">Abrir no Google Drive</span>
            </a>
          )}

          {/* Copiar e-mail */}
          <button
            type="button"
            onClick={handleCopiarEmail}
            className={actionRow}
          >
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {copiado ? 'Copiado!' : 'Copiar texto do e-mail'}
            </span>
          </button>

          {/* Marcar como enviada */}
          {s.status === 'gerada' && (
            <button
              type="button"
              onClick={handleMarcarEnviada}
              className={actionRow}
            >
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-200">Marcar como Enviada</span>
            </button>
          )}

          {s.status !== 'paga' && (
            <button type="button" onClick={() => setModalPaga(true)} className={actionRow}>
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0-12h-9m9 0h3.375c.621 0 1.125.504 1.125 1.125V18.75m-16.5-12V9m0 0h9m-9 0H3.375c-.621 0-1.125.504-1.125 1.125v3.026c0 1.621 1.129 3.026 2.684 3.374l6.128 1.471m0 0-.006.052m-.006-.052L8.25 9.75m10.5 6v.75m-.75.75H18a2.25 2.25 0 01-2.25-2.25V15m-1.5 9.75H6A2.25 2.25 0 013.75 18.75V9A2.25 2.25 0 016 6.75h1.5m9 0h9"
                />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-200">Marcar como Paga</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {s.obra && (
          <button
            type="button"
            onClick={() => navigate('/acompanhamento', { state: { obra: s.obra } })}
            className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            Ir para acompanhamento da obra
          </button>
        )}
      </div>

      {/* Modal */}
      {modalPaga && (
        <ModalMarcarPaga onClose={() => setModalPaga(false)} />
      )}
    </div>
  )
}
