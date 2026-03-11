/* ────────────────────────────────────────────
   Persistência de metadados das obras.

   Duas camadas:
   1. localStorage (rápido, mas perde ao trocar de browser)
   2. Google Drive (arquivo _luma-meta.json dentro da pasta da obra)

   Ao selecionar obra: localStorage → Drive (fallback)
   Ao gerar PDF: salva em ambos
   ──────────────────────────────────────────── */

const STORAGE_KEY = 'luma-gestor:obras-meta'
const META_FILENAME = '_luma-meta.json'

export interface ObraMeta {
  clientes: string
  projeto: string
  email?: string
}

/* ────────── localStorage ────────── */

function getAll(): Record<string, ObraMeta> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Busca metadados no localStorage */
export function getObraMetaLocal(folderId: string): ObraMeta | null {
  const all = getAll()
  return all[folderId] ?? null
}

/** Salva metadados no localStorage */
function saveObraMetaLocal(folderId: string, meta: ObraMeta): void {
  const all = getAll()
  all[folderId] = meta
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (err) {
    console.error('Erro ao salvar metadados local:', err)
  }
}

/* ────────── Google Drive ────────── */

function gapi() {
  return window.gapi?.client
}

/**
 * Busca _luma-meta.json dentro da pasta da obra no Drive.
 * Retorna ObraMeta ou null se não existir.
 */
export async function getObraMetaDrive(folderId: string): Promise<ObraMeta | null> {
  const client = gapi()
  if (!client?.getToken()) return null

  try {
    // Buscar o arquivo pelo nome dentro da pasta
    const searchResult = await new Promise<Record<string, unknown>>((resolve) => {
      client.drive.files
        .list({
          q: `'${folderId}' in parents and name='${META_FILENAME}' and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        })
        .execute(resolve)
    })

    const files = (searchResult.files ?? []) as Array<{ id: string }>
    if (files.length === 0) return null

    // Ler o conteúdo do arquivo
    const token = client.getToken()
    if (!token) return null

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      },
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.clientes && typeof data.clientes === 'string') {
      const meta: ObraMeta = {
        clientes: data.clientes,
        projeto: data.projeto ?? '',
        email: typeof data.email === 'string' ? data.email : undefined,
      }
      // Cachear no localStorage para próxima vez ser instantâneo
      saveObraMetaLocal(folderId, meta)
      return meta
    }

    return null
  } catch (err) {
    console.error('Erro ao buscar meta do Drive:', err)
    return null
  }
}

/**
 * Salva _luma-meta.json na pasta da obra no Drive.
 * Se já existir, atualiza. Se não, cria.
 */
async function saveObraMetaDrive(folderId: string, meta: ObraMeta): Promise<void> {
  const client = gapi()
  if (!client?.getToken()) return

  try {
    const token = client.getToken()
    if (!token) return

    // Buscar arquivo existente
    const searchResult = await new Promise<Record<string, unknown>>((resolve) => {
      client.drive.files
        .list({
          q: `'${folderId}' in parents and name='${META_FILENAME}' and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        })
        .execute(resolve)
    })

    const existing = (searchResult.files ?? []) as Array<{ id: string }>
    const body = JSON.stringify(meta, null, 2)
    const blob = new Blob([body], { type: 'application/json' })

    if (existing.length > 0) {
      // Atualizar arquivo existente
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
      // Criar novo arquivo
      const metadata = {
        name: META_FILENAME,
        mimeType: 'application/json',
        parents: [folderId],
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
    console.error('Erro ao salvar meta no Drive:', err)
  }
}

/* ────────── API pública (combina ambas camadas) ────────── */

/**
 * Busca metadados: localStorage primeiro, Drive como fallback.
 * Retorna imediatamente o local; se não encontrar, retorna null
 * (chamador deve chamar getObraMetaDrive separadamente para async).
 */
export function getObraMeta(folderId: string): ObraMeta | null {
  return getObraMetaLocal(folderId)
}

/**
 * Salva metadados em ambas camadas (localStorage + Drive).
 * localStorage é síncrono; Drive é fire-and-forget.
 */
export function saveObraMeta(folderId: string, meta: ObraMeta): void {
  saveObraMetaLocal(folderId, meta)
  // Drive em background (não bloqueia)
  saveObraMetaDrive(folderId, meta).catch(() => {})
}
