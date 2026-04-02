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

/** Tutorial visual da Nova solicitação (apenas na homepage pública). */
export const wizardTutorial = {
  sectionEyebrow: 'Nova solicitação',
  sectionTitle: 'Assistente em três passos',
  sectionSubtitle:
    'Ordem fixa: identificação da obra, valores e PDFs, depois revisão antes de guardar no Drive.',
  steps: [
    {
      id: 'identificacao',
      label: 'Identificação',
      hint: 'Escolha a pasta da obra no Drive e confirme clientes e projeto.',
    },
    {
      id: 'itens',
      label: 'Itens',
      hint: 'Preencha serviço e adicionais; arraste ou clique para anexar PDFs de reembolso.',
    },
    {
      id: 'revisao',
      label: 'Revisão',
      hint: 'Confira totais e gere o PDF — o ficheiro segue para a pasta da obra.',
    },
  ],
} as const

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
