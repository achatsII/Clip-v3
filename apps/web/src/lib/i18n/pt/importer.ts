import type { importer as Fr } from '../fr/importer'

/** A importação em lote dos documentos antigos. */
export const importer: typeof Fr = {
  title: 'Importe suas instruções antigas',
  subtitle: 'Solte seus PDFs e documentos Word, até às dezenas: cada um vira um rascunho estruturado, pronto para revisão.',
  readOnly: 'Seu perfil não permite importar.',
  unavailableTitle: 'A importação em lote não está disponível no momento',
  unavailableText: 'Você pode soltar um documento em uma nova instrução.',
  drop: {
    title: 'Arraste seus arquivos até aqui ou toque para escolhê-los',
    formats: 'PDF ou Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) ou PowerPoint (.pptx)',
  },
  onlyDocuments: 'Aqui só se importam PDFs e documentos Word',
  onlyDocumentsText: 'Vídeos e fotos vão em uma nova instrução.',
  slides: 'Salve seus arquivos PowerPoint como PDF',
  slidesText: 'No PowerPoint: Arquivo › Exportar › PDF. Depois solte o PDF aqui: as imagens dele viram a mídia das etapas.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} concluídos`,
    resume: (pending: number) => `Retomar a análise (${pending.toLocaleString('pt-BR')})`,
    running: 'Em andamento — mantenha esta aba aberta',
    review: 'Revisar',
  },
  status: {
    waiting: 'Aguardando',
    uploading: 'Enviando e convertendo…',
    uploaded: 'Pronto para analisar',
    analyzing: 'A IA está reestruturando…',
    server: 'A IA está analisando no servidor: você pode fechar o app',
    done: 'Rascunho criado',
    error: 'Falhou',
  },
  errors: {
    interrupted: 'Envio interrompido: solte o arquivo novamente.',
    upload: 'Não foi possível enviar',
    analysis: 'Não foi possível analisar',
  },
}
