/* ────────────────────────────────────────────
   Utilitários de data (pt-BR)
   ──────────────────────────────────────────── */

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Retorna data por extenso: "06 de fevereiro de 2026"
 * Usado no rodapé do PDF.
 */
export function formatDateExtended(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/**
 * Retorna data curta: "2026-02-06"
 * Usado em nomes de arquivo.
 */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Retorna data para display: "06/02/2026"
 */
export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}
