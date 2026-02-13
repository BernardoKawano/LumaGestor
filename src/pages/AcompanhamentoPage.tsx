/* ────────────────────────────────────────────
   AcompanhamentoPage — Container principal.
   Seleciona obra → verifica planilha → CreateSheet ou ManageSheet.
   ──────────────────────────────────────────── */

import { useCallback, useState } from 'react'
import { ObraSelector } from '../components/shared/ObraSelector'
import { CreateSheetForm } from '../components/acompanhamento/CreateSheetForm'
import { ManageSheet } from '../components/acompanhamento/ManageSheet'
import { findSheetInFolder } from '../services/google-drive'
import type { Obra } from '../types'

type PageState =
  | { view: 'select' }
  | { view: 'loading' }
  | { view: 'create'; obra: Obra }
  | { view: 'manage'; obra: Obra; spreadsheetId: string }

export function AcompanhamentoPage() {
  const [pageState, setPageState] = useState<PageState>({ view: 'select' })
  const [obra, setObra] = useState<Obra | null>(null)

  const handleObraChange = useCallback(async (selectedObra: Obra) => {
    setObra(selectedObra)
    setPageState({ view: 'loading' })

    try {
      const sheetId = await findSheetInFolder(selectedObra.id)

      if (sheetId) {
        setPageState({
          view: 'manage',
          obra: selectedObra,
          spreadsheetId: sheetId,
        })
      } else {
        setPageState({ view: 'create', obra: selectedObra })
      }
    } catch (err) {
      console.error('Erro ao verificar planilha:', err)
      setPageState({ view: 'create', obra: selectedObra })
    }
  }, [])

  const handleSheetCreated = useCallback(
    (spreadsheetId: string) => {
      if (obra) {
        setPageState({ view: 'manage', obra, spreadsheetId })
      }
    },
    [obra],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Acompanhamento de Obras</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie pagamentos de funcionários por obra
        </p>
      </div>

      {/* Seletor de obra (sempre visível no topo) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ObraSelector
          value={obra}
          onChange={handleObraChange}
        />
      </div>

      {/* Estado: Loading */}
      {pageState.view === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="text-sm text-gray-400">Verificando planilha...</p>
        </div>
      )}

      {/* Estado: Selecionar */}
      {pageState.view === 'select' && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="mt-4 text-sm text-gray-400">
            Selecione uma obra acima para começar
          </p>
        </div>
      )}

      {/* Estado: Criar planilha */}
      {pageState.view === 'create' && (
        <CreateSheetForm
          obra={pageState.obra}
          onCreated={handleSheetCreated}
        />
      )}

      {/* Estado: Gerenciar */}
      {pageState.view === 'manage' && (
        <ManageSheet
          spreadsheetId={pageState.spreadsheetId}
          obraNome={pageState.obra.nome}
        />
      )}
    </div>
  )
}
