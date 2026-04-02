import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScrollReveal } from '../ScrollReveal'

describe('ScrollReveal', () => {
  it('renderiza filhos e estado inicial oculto (SSR)', () => {
    const html = renderToStaticMarkup(
      <ScrollReveal>
        <p>Conteúdo revelado ao scroll</p>
      </ScrollReveal>
    )
    expect(html).toContain('Conteúdo revelado ao scroll')
    expect(html).toContain('opacity-0')
    expect(html).toContain('translate-y-8')
  })
})
