import type { shell as Fr } from '../fr/shell'

/** A estrutura do app: navegação, menus, conta, leitor de código. */
export const shell: typeof Fr = {
  opening: 'Abrindo o CLIP…',
  mainNav: 'Navegação principal',
  nav: {
    home: 'Início',
    instructions: 'Instruções',
    stations: 'Postos',
    feedback: 'Retornos',
    stats: 'Estatísticas',
    team: 'Equipe',
    records: 'Registro',
    import: 'Importar documentos',
    billing: 'Plano e créditos',
    settings: 'Configurações',
    more: 'Mais',
  },
  newInstruction: 'Nova instrução',
  account: 'Minha conta',
  appearance: 'Aparência',
  signOut: 'Sair',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versão ${v}`,
    built: (date: string) => `lançada em ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `App para ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Sobre o CLIP',
    hint: 'O último número aumenta a cada atualização: compare-o com o que foi informado a você.',
  },
  aiConsent: {
    title: 'Antes de usar a IA',
    body: 'Para redigir e editar suas instruções, o CLIP envia suas fotos, vídeos, notas de voz e textos a serviços de inteligência artificial do Google e da OpenAI, pela plataforma da Intelligence Industrielle.',
    more: 'Nada é enviado sem o seu consentimento. Você pode retirá-lo em Configurações › Dados.',
    privacy: 'Política de privacidade',
    accept: 'Concordo',
    refuse: 'Agora não',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Você está editando ${title ? `“${title}”` : 'uma instrução'} ${device === 'app' ? 'pelo app' : 'em outro computador'}`,
  },
  scan: {
    title: 'Ler um código',
    prompt: 'Leia o código do posto ou da peça',
    failed: 'O leitor de código não abriu',
    aim: 'Aponte para o QR code ou o código de barras',
    noCamera: 'A câmera não está disponível. Permita o acesso no navegador ou digite o código na busca.',
  },
}
