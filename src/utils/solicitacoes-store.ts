/* ────────────────────────────────────────────
   Persistência de resumo das solicitações.
   Usado pelo Kanban para listar e atualizar status.

   Camadas:
   1. localStorage (leitura/escrita imediata)
   2. Google Drive (arquivo _luma-solicitacoes.json na raiz)
      Sincronizado em background para funcionar entre browsers.
   ──────────────────────────────────────────── */

import type { SolicitacaoResumo, StatusSolicitacao } from '../types'

const STORAGE_KEY = 'luma-gestor:solicitacoes'

/* ────────── localStorage ────────── */

function getAll(): SolicitacaoResumo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(items: SolicitacaoResumo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Erro ao salvar solicitações:', err)
  }
}

/** Lista todas as solicitações do localStorage */
export function listSolicitacoes(): SolicitacaoResumo[] {
  return getAll().sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  )
}

/** Adiciona ou atualiza uma solicitação */
export function upsertSolicitacao(resumo: SolicitacaoResumo): void {
  const all = getAll()
  const idx = all.findIndex((s) => s.id === resumo.id)
  if (idx >= 0) {
    all[idx] = resumo
  } else {
    all.push(resumo)
  }
  saveAll(all)
  // Sync para Drive em background
  syncToDrive(all).catch(() => {})
}

/** Atualiza apenas o status de uma solicitação */
export function updateSolicitacaoStatus(
  id: string,
  status: StatusSolicitacao,
  extra?: { dataPagamento?: string; drivePdfUrl?: string },
): void {
  const all = getAll()
  const item = all.find((s) => s.id === id)
  if (!item) return
  item.status = status
  if (extra?.dataPagamento) item.dataPagamento = extra.dataPagamento
  if (extra?.drivePdfUrl) item.drivePdfUrl = extra.drivePdfUrl
  saveAll(all)
  syncToDrive(all).catch(() => {})
}

/** Filtra por status */
export function listByStatus(status: StatusSolicitacao): SolicitacaoResumo[] {
  return listSolicitacoes().filter((s) => s.status === status)
}

/* ────────── Google Drive sync ────────── */

const DRIVE_META_FILE = '_luma-solicitacoes.json'

function gapi() {
  return window.gapi?.client
}

/** Sincroniza lista completa para o Drive (fire-and-forget) */
async function syncToDrive(items: SolicitacaoResumo[]): Promise<void> {
  const client = gapi()
  if (!client?.getToken()) return

  const token = client.getToken()
  if (!token) return

  try {
    // Buscar arquivo existente
    const searchResult = await new Promise<Record<string, unknown>>((resolve) => {
      client.drive.files
        .list({
          q: `name='${DRIVE_META_FILE}' and 'root' in parents and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        })
        .execute(resolve)
    })

    const existing = (searchResult.files ?? []) as Array<{ id: string }>
    const body = JSON.stringify(items, null, 2)
    const blob = new Blob([body], { type: 'application/json' })

    if (existing.length > 0) {
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing[0].id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
          },
          body: blob,
        },
      )
    } else {
      const metadata = {
        name: DRIVE_META_FILE,
        mimeType: 'application/json',
        parents: ['root'],
      }
      const form = new FormData()
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
      )
      form.append('file', blob)
      await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token.access_token}` },
          body: form,
        },
      )
    }
  } catch (err) {
    console.error('Erro ao sincronizar solicitações com Drive:', err)
  }
}

/** Carrega solicitações do Drive e mergeia com localStorage */
export async function loadFromDrive(): Promise<SolicitacaoResumo[]> {
  const client = gapi()
  if (!client?.getToken()) return getAll()

  const token = client.getToken()
  if (!token) return getAll()

  try {
    const searchResult = await new Promise<Record<string, unknown>>((resolve) => {
      client.drive.files
        .list({
          q: `name='${DRIVE_META_FILE}' and 'root' in parents and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        })
        .execute(resolve)
    })

    const files = (searchResult.files ?? []) as Array<{ id: string }>
    if (files.length === 0) return getAll()

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      },
    )

    if (!response.ok) return getAll()

    const driveItems: SolicitacaoResumo[] = await response.json()
    const localItems = getAll()

    // Merge: Drive é fonte de verdade para itens que existem em ambos;
    // itens que só existem localmente são mantidos.
    const merged = new Map<string, SolicitacaoResumo>()
    for (const item of driveItems) merged.set(item.id, item)
    for (const item of localItems) {
      if (!merged.has(item.id)) merged.set(item.id, item)
    }

    const result = [...merged.values()]
    saveAll(result)
    return result.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
    )
  } catch {
    return getAll()
  }
}
