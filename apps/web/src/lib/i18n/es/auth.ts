import type { auth as Fr } from '../fr/auth'

/** Inicio de sesión, registro, contraseña olvidada, bienvenida; apertura de la sesión y la app nativa. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Instrucciones de trabajo',
    hero: {
      film: 'Grábalo.',
      aiWrites: 'La IA lo redacta.',
      floorFollows: 'El piso lo sigue.',
      pitch: 'Una instrucción de trabajo clara y visual en minutos, que cada operador encuentra en su puesto, sin necesidad de cuenta.',
      inputs: 'Videos, fotos, notas de voz o PDF antiguos',
      generated: 'Pasos, clips de video y advertencias generados',
      qrAndTablet: 'Código QR y tableta en el puesto, sin cuenta',
    },
    titles: { login: 'Te damos la bienvenida', signup: 'Crea tu cuenta', forgot: 'Restablece tu contraseña' },
    intros: {
      login: 'Inicia sesión para crear y gestionar tus instrucciones.',
      signup: 'Empieza gratis. Sin tarjeta.',
      forgot: 'Te enviaremos un enlace para elegir una nueva contraseña.',
    },
    sent: {
      title: 'Correo enviado',
      body: (email: string) => `Si existe una cuenta para ${email}, recibirás un enlace en unos minutos.`,
      back: 'Volver al inicio de sesión',
    },
    fullname: 'Tu nombre',
    fullnamePlaceholder: 'Ana Martínez',
    company: 'Planta o empresa',
    optional: 'opcional',
    companyPlaceholder: 'Planta Querétaro',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@empresa.com',
    password: 'Contraseña',
    forgotLink: '¿La olvidaste?',
    submit: { login: 'Iniciar sesión', signup: 'Crear mi cuenta', forgot: 'Enviar el enlace' },
    aiNotice: {
      login: 'Al iniciar sesión, aceptas que la IA de Google analice tus fotos, videos, notas de voz y textos, y que OpenAI reciba una foto cuando pidas una imagen.',
      signup: 'Al crear tu cuenta, aceptas que la IA de Google analice tus fotos, videos, notas de voz y textos, y que OpenAI reciba una foto cuando pidas una imagen.',
    },
    privacy: 'Política de privacidad',
    errors: {
      email: 'Escribe un correo válido.',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
      passwordMissing: 'Escribe tu contraseña.',
    },
    newHere: '¿Eres nuevo?',
    createFreeAccount: 'Crear una cuenta gratis',
    askForInvitation: '¿Aún no tienes cuenta? Pide una invitación a tu administrador.',
    haveAccount: 'Ya tengo una cuenta',
    language: 'Idioma',
  },
  welcome: {
    setup: 'Configuración',
    progress: (step: number, total: number) => `${step.toLocaleString('es-MX')} de ${total.toLocaleString('es-MX')}`,
    name: {
      title: '¿Cómo se llama tu planta?',
      hint: 'Aparecerá en las tabletas de los puestos y en los PDF.',
      placeholder: 'Planta Querétaro',
    },
    goals: {
      title: '¿Qué quieres documentar primero?',
      hint: 'Elige todo lo que quieras. Tu inicio se organiza en torno a ello.',
      sstAndLockout: 'Seguridad y bloqueo',
    },
    approval: {
      title: '¿Quién aprueba las instrucciones?',
      hint: 'Puedes cambiarlo en los ajustes.',
      none: 'Nadie: se publica directamente',
      noneHint: 'Quien la redacta es responsable de ella.',
      one: 'Un aprobador la revisa antes',
      oneHint: 'Supervisor, calidad o seguridad: ven lo que cambió y publican.',
    },
    ready: {
      title: (plant: string) => `¡Todo listo, ${plant}!`,
      hint: 'Tu primera instrucción toma unos minutos: graba a alguien haciendo la tarea mientras la explica.',
      create: 'Crear mi primera instrucción',
      import: 'Importar mis PDF antiguos',
      later: 'Más tarde',
    },
    finish: 'Terminar',
    nothingPublished: 'No se publica nada sin tu aprobación.',
  },
  session: {
    defaultOrgName: 'Mi planta',
    me: 'Yo',
    openFailed: 'No se pudo abrir CLIP',
    serverDown: 'El servidor no responde por ahora. Revisa tu conexión e inténtalo de nuevo.',
  },
  native: {
    unavailable: 'Función nativa no disponible',
    noResponse: 'La app móvil no responde',
  },
}
