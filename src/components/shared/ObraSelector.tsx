/* ────────────────────────────────────────────
   ObraSelector — navegador de pastas do Google Drive.
   Permite entrar em pastas (ex: CLIENTES 2026 → ALLAN E CAROLINA),
   com breadcrumbs para voltar e busca por texto.
   ──────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { listSubfolders, type DriveFolder } from '../../services/google-drive'
import type { Obra } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { isClientesYearFolderName } from '../../utils/driveFolderHelpers'

interface Props {
  value: Obra | null
  onChange: (obra: Obra) => void
  error?: string
}

/** Breadcrumb: id + nome de cada nível navegado */
interface Breadcrumb {
  id: string
  name: string
}

export function ObraSelector({ value, onChange, error }: Props) {
  const { isSignedIn } = useAuth()
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Breadcrumbs para navegação hierárquica
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: 'root', name: 'Meu Drive' },
  ])

  // Pasta atual (última do breadcrumb)
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id

  // Carregar subpastas quando muda o nível
  useEffect(() => {
    if (!isSignedIn) return
    setLoading(true)
    listSubfolders(currentFolderId)
      .then(setFolders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isSignedIn, currentFolderId])

  // Filtro de busca
  const filtered = useMemo(() => {
    if (!search.trim()) return folders
    const term = search.toLowerCase()
    return folders.filter((f) => f.name.toLowerCase().includes(term))
  }, [folders, search])

  // Entrar em uma pasta
  const enterFolder = useCallback((folder: DriveFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setSearch('')
  }, [])

  // Voltar para um nível do breadcrumb
  const goToBreadcrumb = useCallback((index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1))
    setSearch('')
  }, [])

  // Selecionar a pasta atual como obra
  const selectCurrentFolder = useCallback(() => {
    const current = breadcrumbs[breadcrumbs.length - 1]
    if (current.id === 'root') return
    onChange({
      id: current.id,
      nome: current.name,
    })
    setIsOpen(false)
    setSearch('')
  }, [breadcrumbs, onChange])

  const selectFolderAsObra = useCallback(
    (folder: DriveFolder) => {
      onChange({ id: folder.id, nome: folder.name })
      setIsOpen(false)
      setSearch('')
    },
    [onChange],
  )

  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name ?? ''
  const parentIsClientesYear = isClientesYearFolderName(currentFolderName)

  return (
    <div className="relative w-full min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-gray-500 dark:text-gray-400">
        Obra
      </label>

      {/* Campo de display / trigger */}
      <div
        className={`flex w-full min-w-0 cursor-pointer items-center rounded-lg border bg-white px-3 py-2.5 transition-colors dark:border-gray-600 dark:bg-gray-900 ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`flex-1 text-sm ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-500'}`}>
          {value?.nome ?? 'Selecione uma obra'}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Dropdown navegável */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
            {breadcrumbs.map((bc, i) => (
              <span key={bc.id} className="flex items-center gap-1">
                {i > 0 && (
                  <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <button
                  onClick={() => goToBreadcrumb(i)}
                  className={`text-xs transition-colors ${
                    i === breadcrumbs.length - 1
                      ? 'font-semibold text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {bc.name}
                </button>
              </span>
            ))}
          </div>

          {/* Busca */}
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pasta..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-gray-500"
              autoFocus
            />
            {parentIsClientesYear && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Clique no nome da pasta do cliente para selecionar a obra. Use a seta à direita para abrir subpastas.
              </p>
            )}
          </div>

          {/* Botão "Selecionar esta pasta" (quando não estamos na raiz) */}
          {currentFolderId !== 'root' && (
            <button
              onClick={selectCurrentFolder}
              className="flex w-full items-center gap-2 border-b border-gray-100 bg-gray-900/5 px-4 py-2.5 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900/10 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10"
            >
              <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Selecionar "{breadcrumbs[breadcrumbs.length - 1].name}"
            </button>
          )}

          {/* Lista de subpastas */}
          <div className="max-h-56 overflow-auto">
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-400">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                {search ? 'Nenhuma pasta encontrada' : 'Pasta vazia'}
              </div>
            ) : (
              filtered.map((folder) => (
                <div
                  key={folder.id}
                  className="flex w-full items-stretch gap-0 border-b border-gray-50 last:border-b-0 dark:border-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => (parentIsClientesYear ? selectFolderAsObra(folder) : enterFolder(folder))}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    <span className="truncate text-gray-700 dark:text-gray-200">{folder.name}</span>
                    {!parentIsClientesYear && (
                      <svg className="ml-auto h-3 w-3 shrink-0 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {parentIsClientesYear && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        enterFolder(folder)
                      }}
                      className="flex w-11 shrink-0 items-center justify-center border-l border-gray-100 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label={`Abrir pasta ${folder.name}`}
                      title="Abrir pasta"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsOpen(false)
            setSearch('')
          }}
        />
      )}
    </div>
  )
}
