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

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">Solicitação gerada</h2>
        <p className="mt-1 text-sm text-gray-500">
          {s.drivePdfUrl
            ? 'PDF salvo no Google Drive com sucesso.'
            : 'PDF gerado localmente.'}
        </p>

        {/* Status badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
          <div
            className={`h-2 w-2 rounded-full ${
              s.status === 'paga'
                ? 'bg-green-500'
                : s.status === 'enviada'
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
            }`}
          />
          <span className="text-xs font-medium capitalize text-gray-600">
            {s.status}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Ações</h3>
        <div className="space-y-3">
          {/* Download PDF */}
          {s.pdfBlobUrl && (
            <a
              href={s.pdfBlobUrl}
              download={`OP - ${s.obra?.nome ?? s.clientes} - ${formatDateISO(s.data)}.pdf`}
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="text-sm text-gray-700">Baixar PDF da Solicitação</span>
            </a>
          )}

          {/* Link Drive */}
          {s.drivePdfUrl && (
            <a
              href={s.drivePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="text-sm text-gray-700">Abrir no Google Drive</span>
            </a>
          )}

          {/* Copiar e-mail */}
          <button
            onClick={handleCopiarEmail}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            <span className="text-sm text-gray-700">
              {copiado ? 'Copiado!' : 'Copiar texto do e-mail'}
            </span>
          </button>

          {/* Ir para acompanhamento da obra */}
          {s.obra && (
            <button
              onClick={() => navigate('/acompanhamento', { state: { obra: s.obra } })}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5V6.75A2.25 2.25 0 0012.75 4.5h-7.5A2.25 2.25 0 003 6.75v10.5A2.25 2.25 0 005.25 19.5h7.5A2.25 2.25 0 0015 17.25V13.5m3-3l3 3m0 0l-3 3m3-3H9" />
              </svg>
              <span className="text-sm text-gray-700">Abrir acompanhamento desta obra</span>
            </button>
          )}

          {/* Marcar como enviada */}
          {s.status === 'gerada' && (
            <button
              onClick={handleMarcarEnviada}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span className="text-sm text-gray-700">Marcar como Enviada</span>
            </button>
          )}
        </div>
      </div>

      {/* CTA Marcar como Paga */}
      {s.status !== 'paga' && (
        <div className="flex justify-end">
          <button
            onClick={() => setModalPaga(true)}
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Marcar como Paga
          </button>
        </div>
      )}

      {/* Modal */}
      {modalPaga && (
        <ModalMarcarPaga onClose={() => setModalPaga(false)} />
      )}
    </div>
  )
}
