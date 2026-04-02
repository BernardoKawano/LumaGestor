/** Chaves localStorage para tutoriais in-app (versão no sufixo permite reexibir após mudanças grandes). */

export const STORAGE_WIZARD_TUTORIAL = 'luma:tutorial:wizard:v1'
export const STORAGE_ACOMPANHAMENTO_TUTORIAL = 'luma:tutorial:acompanhamento:v1'

export function hasDismissedTutorial(storageKey: string, storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  return storage.getItem(storageKey) === '1'
}

export function dismissTutorial(storageKey: string, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(storageKey, '1')
}

export function shouldShowTutorial(storageKey: string, storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  return !hasDismissedTutorial(storageKey, storage)
}
