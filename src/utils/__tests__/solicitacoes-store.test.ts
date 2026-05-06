import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SolicitacaoResumo } from '../../types'
import {
  listSolicitacoes,
  removeAllSolicitacoes,
  removeSolicitacao,
  upsertSolicitacao,
} from '../solicitacoes-store'

function mockLocalStorage() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
    get length() {
      return map.size
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
  } as Storage
  vi.stubGlobal('localStorage', storage)
  return storage
}

function sampleResumo(partial: Partial<SolicitacaoResumo> & Pick<SolicitacaoResumo, 'id'>): SolicitacaoResumo {
  return {
    obraId: 'o1',
    obraNome: 'Obra teste',
    clientes: 'C',
    projeto: 'P',
    data: '2026-01-01',
    subtotalServico: 100_00,
    totalReembolso: 0,
    totalGeral: 100_00,
    status: 'gerada',
    criadoEm: '2026-01-01T12:00:00.000Z',
    ...partial,
  }
}

describe('solicitacoes-store — remoção', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  it('removeSolicitacao remove um item e mantém os outros', () => {
    upsertSolicitacao(sampleResumo({ id: 'a' }))
    upsertSolicitacao(sampleResumo({ id: 'b', obraNome: 'Outra' }))
    expect(listSolicitacoes()).toHaveLength(2)

    expect(removeSolicitacao('a')).toBe(true)
    const rest = listSolicitacoes()
    expect(rest).toHaveLength(1)
    expect(rest[0].id).toBe('b')
  })

  it('removeSolicitacao retorna false se id não existe', () => {
    upsertSolicitacao(sampleResumo({ id: 'x' }))
    expect(removeSolicitacao('inexistente')).toBe(false)
    expect(listSolicitacoes()).toHaveLength(1)
  })

  it('removeAllSolicitacoes esvazia a lista', () => {
    upsertSolicitacao(sampleResumo({ id: 'a' }))
    upsertSolicitacao(sampleResumo({ id: 'b' }))
    removeAllSolicitacoes()
    expect(listSolicitacoes()).toHaveLength(0)
  })
})
