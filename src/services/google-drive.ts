/* ────────────────────────────────────────────
   Google Drive API — wrapper
   Lista obras (pastas), cria subpastas, faz upload.
   ──────────────────────────────────────────── */

import type { Obra } from '../types'
import { isDemoCaptureEnabled } from '../demo/demoCapture'

/* ---------- helpers ---------- */

function gapi() {
  return window.gapi!.client
}

function driveFiles() {
  return gapi().drive.files
}

function execute<T>(request: { execute: (cb: (r: T) => void) => void }): Promise<T> {
  return new Promise((resolve) => request.execute(resolve))
}

/* ---------- Listar pastas ---------- */

/** Tipo genérico de pasta (Drive folder) */
export interface DriveFolder {
  id: string
  name: string
}

/**
 * Lista subpastas dentro de um parent.
 * Se parentId = 'root', lista pastas da raiz do Drive.
 */
export async function listSubfolders(parentId = 'root'): Promise<DriveFolder[]> {
  /* DEMO remotion — remover com src/demo/ */
  if (isDemoCaptureEnabled()) {
    if (parentId === 'root') {
      return [{ id: 'demo-CLIENTES-2026', name: 'CLIENTES 2026' }]
    }
    if (parentId === 'demo-CLIENTES-2026') {
      return [
        { id: 'demo-obra-1', name: 'Obra demo — Residencial Aurora' },
        { id: 'demo-obra-2', name: 'Obra demo — Ed. Horizonte' },
      ]
    }
    return []
  }
  const response = await execute<Record<string, unknown>>(
    driveFiles().list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 200,
    }),
  )

  return (response.files ?? []) as DriveFolder[]
}

/**
 * Lista pastas da raiz do Drive do usuário.
 * Mantido por compatibilidade (HomePage usa).
 */
export async function listObras(): Promise<Obra[]> {
  const folders = await listSubfolders('root')
  return folders.map((f) => ({
    id: f.id,
    nome: f.name,
  }))
}

/* ---------- Buscar/criar subpasta ---------- */

/**
 * Busca uma subpasta pelo nome dentro de um parent.
 * Retorna o ID se existir, ou cria e retorna o novo ID.
 */
export async function getOrCreateFolder(
  parentId: string,
  folderName: string,
): Promise<string> {
  if (isDemoCaptureEnabled()) {
    const slug = `${parentId}__${folderName}`.replace(/\s+/g, '-')
    return `demo-folder-${slug.slice(0, 80)}`
  }
  // Buscar existente
  const search = await execute<Record<string, unknown>>(
    driveFiles().list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id)',
      pageSize: 1,
    }),
  )

  const existing = (search.files ?? []) as Array<{ id: string }>
  if (existing.length > 0) {
    return existing[0].id
  }

  // Criar nova pasta
  const created = await execute<Record<string, unknown>>(
    driveFiles().create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    }),
  )

  return created.id as string
}

/* ---------- Upload de arquivo ---------- */

/**
 * Faz upload de um arquivo (PDF) para uma pasta no Drive.
 * Usa multipart upload via fetch (gapi client não suporta blobs nativamente).
 * Retorna { id, webViewLink }.
 */
export async function uploadFile(
  parentId: string,
  fileName: string,
  blob: Blob,
  mimeType = 'application/pdf',
): Promise<{ id: string; webViewLink: string }> {
  if (isDemoCaptureEnabled()) {
    void parentId
    void fileName
    void blob
    void mimeType
    return {
      id: 'demo-file-id',
      webViewLink: 'https://drive.google.com/file/d/demo-file-id/view',
    }
  }
  const token = gapi().getToken()
  if (!token) throw new Error('Sem token de autenticação')

  const metadata = {
    name: fileName,
    mimeType,
    parents: [parentId],
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  )
  form.append('file', blob)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      body: form,
    },
  )

  if (!response.ok) {
    throw new Error(`Upload falhou: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/* ---------- Buscar Google Sheet dentro de uma pasta ---------- */

/**
 * Procura o primeiro Google Sheet dentro de uma pasta (obra).
 * Retorna o ID ou null.
 */
export async function findSheetInFolder(folderId: string): Promise<string | null> {
  if (isDemoCaptureEnabled()) {
    return null
  }
  const response = await execute<Record<string, unknown>>(
    driveFiles().list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1,
    }),
  )

  const files = (response.files ?? []) as Array<{ id: string }>
  return files.length > 0 ? files[0].id : null
}
