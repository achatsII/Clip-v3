import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Work instructions',
    hero: {
      film: 'Film it.',
      aiWrites: 'AI writes it.',
      floorFollows: 'The floor follows.',
      pitch: 'A clear, visual work instruction in minutes, found at the right station by every operator, no account needed.',
      inputs: 'Videos, photos, voice notes or old PDFs',
      generated: 'Generated steps, video clips and warnings',
      qrAndTablet: 'QR code and station tablet, no account',
    },
    titles: { login: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password' },
    intros: {
      login: 'Sign in to create and manage your instructions.',
      signup: 'Free to start. No card required.',
      forgot: 'We’ll send you a link to choose a new password.',
    },
    sent: {
      title: 'Email sent',
      body: (email: string) => `If an account exists for ${email}, you’ll get a link within a few minutes.`,
      back: 'Back to sign in',
    },
    fullname: 'Your name',
    fullnamePlaceholder: 'Emily Tremblay',
    company: 'Plant or company',
    optional: 'optional',
    companyPlaceholder: 'Bellechasse Plant',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    forgotLink: 'Forgot?',
    submit: { login: 'Sign in', signup: 'Create my account', forgot: 'Send the link' },
    errors: {
      email: 'Enter a valid email.',
      passwordTooShort: 'Your password must be at least 8 characters.',
      passwordMissing: 'Enter your password.',
    },
    newHere: 'New here?',
    createFreeAccount: 'Create a free account',
    askForInvitation: 'No account yet? Ask your administrator for an invitation.',
    haveAccount: 'I already have an account',
    language: 'Language',
  },
  welcome: {
    setup: 'Setup',
    progress: (step: number, total: number) => `${step.toLocaleString('en-CA')} of ${total.toLocaleString('en-CA')}`,
    name: {
      title: 'What’s your plant called?',
      hint: 'It will appear on station tablets and PDFs.',
      placeholder: 'Bellechasse Plant',
    },
    goals: {
      title: 'What do you want to document first?',
      hint: 'Pick as many as you like. Your home page is organized around them.',
      sstAndLockout: 'H&S and lockout',
    },
    approval: {
      title: 'Who approves instructions?',
      hint: 'You can change your mind in settings.',
      none: 'No one: publish directly',
      noneHint: 'Whoever writes it is responsible for it.',
      one: 'An approver checks first',
      oneHint: 'Supervisor, quality or H&S: they see what changed and publish.',
    },
    ready: {
      title: (plant: string) => `All set, ${plant}!`,
      hint: 'Your first instruction takes a few minutes: film someone doing the task while they explain it.',
      create: 'Create my first instruction',
      import: 'Import my old PDFs',
      later: 'Later',
    },
    finish: 'Finish',
    nothingPublished: 'Nothing gets published without you.',
  },
  session: {
    defaultOrgName: 'My plant',
    me: 'Me',
    openFailed: 'Couldn’t open CLIP',
    serverDown: 'The server isn’t responding right now. Check your connection, then try again.',
  },
  native: {
    unavailable: 'Native feature unavailable',
    noResponse: 'The mobile app isn’t responding',
  },
}
