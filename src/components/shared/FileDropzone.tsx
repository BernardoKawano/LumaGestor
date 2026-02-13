/* ────────────────────────────────────────────
   FileDropzone — upload múltiplo de PDFs.
   Usa react-dropzone para drag & drop.
   ──────────────────────────────────────────── */

import { useDropzone } from 'react-dropzone'
import { useCallback } from 'react'

interface Props {
  onFilesAdded: (files: File[]) => void
}

export function FileDropzone({ onFilesAdded }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles)
    },
    [onFilesAdded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
        isDragActive
          ? 'border-gray-400 bg-gray-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <svg
          className="h-8 w-8 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
        <p className="text-sm text-gray-500">
          {isDragActive
            ? 'Solte os arquivos aqui'
            : 'Arraste PDFs ou clique para selecionar'}
        </p>
        <p className="text-xs text-gray-300">Apenas arquivos .pdf</p>
      </div>
    </div>
  )
}
