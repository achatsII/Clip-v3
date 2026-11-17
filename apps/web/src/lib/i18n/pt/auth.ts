import type { auth as Fr } from '../fr/auth'

/** Login, cadastro, senha esquecida, boas-vindas; abertura da sessão e estrutura nativa. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Instruções de trabalho',
    hero: {
      film: 'Filme.',
      aiWrites: 'A IA redige.',
      floorFollows: 'O chão de fábrica segue.',
      pitch: 'Uma instrução de trabalho clara e visual em minutos, encontrada no posto certo por cada operador, sem precisar de conta.',
      inputs: 'Vídeos, fotos, notas de voz ou PDFs antigos',
      generated: 'Etapas, trechos de vídeo e avisos gerados',
      qrAndTablet: 'QR code e tablet no posto, sem conta',
    },
    titles: { login: 'Bem-vindo de volta', signup: 'Crie sua conta', forgot: 'Redefina sua senha' },
    intros: {
      login: 'Entre para criar e gerenciar suas instruções.',
      signup: 'Comece de graça. Sem cartão.',
      forgot: 'Vamos enviar um link para você escolher uma nova senha.',
    },
    sent: {
      title: 'E-mail enviado',
      body: (email: string) => `Se existir uma conta para ${email}, você receberá um link em alguns minutos.`,
      back: 'Voltar para o login',
    },
    fullname: 'Seu nome',
    fullnamePlaceholder: 'Maria Souza',
    company: 'Fábrica ou empresa',
    optional: 'opcional',
    companyPlaceholder: 'Fábrica Bellechasse',
    email: 'E-mail',
    emailPlaceholder: 'voce@empresa.com',
    password: 'Senha',
    forgotLink: 'Esqueceu?',
    submit: { login: 'Entrar', signup: 'Criar minha conta', forgot: 'Enviar o link' },
    /** Consentimento para a IA, dado ao entrar (regra 5.1.2(i) da Apple). */
    aiNotice: {
      login: 'Ao entrar, você concorda que a IA do Google analise suas fotos, vídeos, notas de voz e textos, e que a OpenAI receba uma foto quando você pedir uma imagem.',
      signup: 'Ao criar sua conta, você concorda que a IA do Google analise suas fotos, vídeos, notas de voz e textos, e que a OpenAI receba uma foto quando você pedir uma imagem.',
    },
    privacy: 'Política de privacidade',
    errors: {
      email: 'Informe um e-mail válido.',
      passwordTooShort: 'Sua senha deve ter pelo menos 8 caracteres.',
      passwordMissing: 'Informe sua senha.',
    },
    newHere: 'Primeira vez aqui?',
    createFreeAccount: 'Criar uma conta gratuita',
    askForInvitation: 'Ainda não tem conta? Peça um convite ao seu administrador.',
    haveAccount: 'Já tenho uma conta',
    language: 'Idioma',
  },
  welcome: {
    setup: 'Configuração',
    progress: (step: number, total: number) => `${step.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`,
    name: {
      title: 'Qual é o nome da sua fábrica?',
      hint: 'Ele aparecerá nos tablets dos postos e nos PDFs.',
      placeholder: 'Fábrica Bellechasse',
    },
    goals: {
      title: 'O que você quer documentar primeiro?',
      hint: 'Escolha quantos quiser. Sua página inicial se organiza em torno deles.',
      sstAndLockout: 'SST e bloqueio',
    },
    approval: {
      title: 'Quem aprova as instruções?',
      hint: 'Você pode mudar de ideia nas configurações.',
      none: 'Ninguém: publicar direto',
      noneHint: 'Quem redige é o responsável.',
      one: 'Um aprovador verifica antes',
      oneHint: 'Supervisor, qualidade ou SST: eles veem o que mudou e publicam.',
    },
    ready: {
      title: (plant: string) => `Tudo pronto, ${plant}!`,
      hint: 'Sua primeira instrução leva alguns minutos: filme alguém fazendo a tarefa enquanto explica.',
      create: 'Criar minha primeira instrução',
      import: 'Importar meus PDFs antigos',
      later: 'Depois',
    },
    finish: 'Concluir',
    nothingPublished: 'Nada é publicado sem você.',
  },
  session: {
    defaultOrgName: 'Minha fábrica',
    me: 'Eu',
    openFailed: 'Não foi possível abrir o CLIP',
    serverDown: 'O servidor não está respondendo no momento. Verifique sua conexão e tente novamente.',
  },
  native: {
    unavailable: 'Recurso nativo indisponível',
    noResponse: 'O app não está respondendo',
  },
}
