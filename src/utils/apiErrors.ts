/** Deteta mensagens 401 / falta de token para orientar re-login. */

export function errorMessageSuggestsReauth(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('401') ||
    m.includes('unauthorized') ||
    m.includes('invalid credentials') ||
    m.includes('sem token')
  )
}
