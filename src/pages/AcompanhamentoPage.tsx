/* ────────────────────────────────────────────
   AcompanhamentoPage — Container principal.
   Seleciona obra → verifica planilha → CreateSheet ou ManageSheet.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { useSetShellContentWidthOverride } from '../context/ShellContentWidthOverrideContext'
import { ObraSelectorCard } from '../components/shared/ObraSelectorCard'
import { AcompanhamentoInAppTutorial } from '../components/acompanhamento/AcompanhamentoInAppTutorial'
import { CreateSheetForm } from '../components/acompanhamento/CreateSheetForm'
import { ManageSheet } from '../components/acompanhamento/ManageSheet'
import { ResumoObra, type ResumoObraData } from '../components/acompanhamento/ResumoObra'
import { findSheetInFolder } from '../services/google-drive'
import type { Obra } from '../types'

type PageState =
  | { view: 'select' }
  | { view: 'loading' }
  | { view: 'create'; obra: Obra }
  | { view: 'manage'; obra: Obra; spreadsheetId: string }

export function AcompanhamentoPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setShellContentWidthOverride = useSetShellContentWidthOverride()
  const [pageState, setPageState] = useState<PageState>({ view: 'select' })
  const [obra, setObra] = useState<Obra | null>(null)
  const [summaryData, setSummaryData] = useState<ResumoObraData | null>(null)
  const [capturing, setCapturing] = useState(false)
  const resumoRef = useRef<HTMLDivElement>(null)
  const initialObraHandledRef = useRef(false)
  const initialObra = (location.state as { obra?: Obra } | null)?.obra ?? null

  const handleObraChange = useCallback(async (selectedObra: Obra) => {
    setObra(selectedObra)
    setSummaryData(null)
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

  const handleSummaryDataChange = useCallback((data: ResumoObraData) => {
    setSummaryData(data)
  }, [])

  const handleGerarImagemResumo = useCallback(async () => {
    const el = resumoRef.current
    if (!el || !summaryData) return

    setCapturing(true)
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })
      if (!blob) throw new Error('Falha ao gerar imagem')

      const safeName = summaryData.obraNome
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50)
      const suggestedName = `resumo-${safeName}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`

      const ClipboardItemCtor = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
      if (ClipboardItemCtor && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItemCtor({ 'image/png': blob }),
          ])
        } catch (clipboardErr) {
          console.warn('Nao foi possivel copiar imagem para clipboard:', clipboardErr)
        }
      }

      let saved = false

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as Window & { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> })
            .showSaveFilePicker({
              suggestedName,
              types: [{ description: 'Imagem PNG', accept: { 'image/png': ['.png'] } }],
            })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          saved = true
        } catch (saveErr) {
          if ((saveErr as Error).name !== 'AbortError') {
            console.warn('Falha ao salvar com seletor nativo, tentando download:', saveErr)
          }
        }
      }

      if (!saved) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = suggestedName
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('Erro ao gerar imagem:', err)
    } finally {
      setCapturing(false)
    }
  }, [summaryData])

  useEffect(() => {
    if (!initialObra || initialObraHandledRef.current) return
    initialObraHandledRef.current = true
    void handleObraChange(initialObra)
  }, [initialObra, handleObraChange])

  /* Seleção / criação de planilha: mesma largura útil do wizard; painel da planilha: coluna padrão */
  useEffect(() => {
    const useWideShell =
      pageState.view === 'select' || pageState.view === 'loading' || pageState.view === 'create'
    setShellContentWidthOverride(useWideShell ? 'wide' : null)
    return () => setShellContentWidthOverride(null)
  }, [pageState.view, setShellContentWidthOverride])

  return (
    <div className="relative">
      {/* Resumo oculto para exportação (renderizado off-screen) */}
      {summaryData && (
        <div
          ref={resumoRef}
          className="fixed left-[-9999px] top-0 z-[-1]"
          aria-hidden
        >
          <ResumoObra data={summaryData} />
        </div>
      )}

      <div className="space-y-6 text-gray-900 dark:text-gray-100">
        <AcompanhamentoInAppTutorial />

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Acompanhamento de Obras</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie pagamentos de funcionários por obra
          </p>
        </div>

      {/* Seletor de obra (sempre visível no topo) */}
      <ObraSelectorCard value={obra} onChange={handleObraChange} />

      {/* Estado: Loading */}
      {pageState.view === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Verificando planilha...</p>
        </div>
      )}

      {/* Estado: Selecionar */}
      {pageState.view === 'select' && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-900">
          <svg className="mx-auto h-10 w-10 text-gray-200 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
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
          obra={pageState.obra}
          onSummaryDataChange={handleSummaryDataChange}
          onCriarSolicitacao={(obra) => navigate('/wizard', { state: { obra } })}
        />
      )}
      </div>

      {/* Botão para gerar imagem resumo */}
      {pageState.view === 'manage' && (
        <button
          type="button"
          onClick={handleGerarImagemResumo}
          disabled={capturing || !summaryData}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl disabled:opacity-70"
          title="Gerar imagem resumo e escolher onde salvar"
        >
          {capturing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Gerando...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
              </svg>
              Gerar resumo (.png)
            </>
          )}
        </button>
      )}
    </div>
  )
}
