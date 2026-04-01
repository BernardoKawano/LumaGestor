/**
 * Textos e estrutura da landing da Home — dados puros para layout e testes.
 */

export const homeHero = {
  title: 'Gestão financeira das obras, sem planilhas soltas.',
  subtitle:
    'Crie solicitações de pagamento com PDF profissional, acompanhe o status no Kanban e una tudo ao acompanhamento por obra — direto no Google Drive e Sheets.',
} as const

export const processSteps = [
  {
    id: 'solicitar',
    step: 1,
    title: 'Solicitar',
    description:
      'Wizard em três etapas: obra no Drive, itens e notas de reembolso, revisão e PDF com envio para a pasta da obra.',
  },
  {
    id: 'status',
    step: 2,
    title: 'Acompanhar status',
    description:
      'Kanban Gerada, Enviada e Paga. Ao marcar como paga, o valor entra automaticamente na planilha de acompanhamento.',
  },
  {
    id: 'obra',
    step: 3,
    title: 'Ver a obra',
    description:
      'Painel por obra: totais, adicionais, recebimentos do cliente e pagamentos a funcionários, lendo e gravando na planilha.',
  },
] as const

export const productPillars = [
  {
    id: 'drive',
    title: 'Google Drive',
    text: 'PDFs organizados por data, pastas de obras e sincronização de estado entre navegadores via JSON no Drive.',
  },
  {
    id: 'sheets',
    title: 'Google Sheets',
    text: 'Planilhas de acompanhamento por obra: valores, funcionários e vínculo com solicitações pagas.',
  },
  {
    id: 'client',
    title: 'Tudo no navegador',
    text: 'Sem servidor próprio: OAuth2, APIs do Google e dados onde a sua equipe já trabalha.',
  },
] as const
