/**
 * L'instruction d'exemple des démos du site (la même que dans le deck et le film : le nettoyage des
 * rails de la machine 1234), dans les langues d'opérateur que montre la démo du poste. Ce sont des
 * données, comme une instruction traduite dans l'app : chaque langue a ses mots du lecteur, repris de
 * `src/components/player/i18n.ts` quand ils y sont. Aucune fonction : tout passe aux composants client.
 */
import type { PhotoKey } from '../media'

export const DEMO_LANGS = ['fr', 'en', 'es', 'ar'] as const
export type DemoLang = (typeof DEMO_LANGS)[number]

export type WarningLevel = 'danger' | 'caution' | 'info'
export type FeedbackKind = 'unclear' | 'error' | 'danger' | 'idea'

export interface DemoStep {
  title: string
  text: string
  warning: { level: WarningLevel; text: string } | null
  keyPoints: string[]
  photo: PhotoKey
}

export interface DemoWords {
  /** Le nom de la langue, écrit dans la langue elle-même. */
  name: string
  stepOf: string
  next: string
  previous: string
  finish: string
  listen: string
  stop: string
  unclear: string
  keyPoints: string
  warningLevels: Record<WarningLevel, string>
  feedbackTitle: string
  kinds: Record<FeedbackKind, string>
  feedbackSend: string
  feedbackThanks: string
  done: string
  doneText: string
  restart: string
  training: {
    start: string
    startHint: string
    questionOf: string
    right: string
    wrong: string
    next: string
    finish: string
    passed: string
    passedText: string
    failed: string
    failedText: string
    score: string
    retry: string
  }
}

export interface DemoInstruction {
  dir: 'ltr' | 'rtl'
  /** La langue de la voix du navigateur pour « Écouter ». */
  speech: string
  title: string
  steps: DemoStep[]
  words: DemoWords
  quiz: Array<{ q: string; choices: string[]; answer: number }>
}

const PHOTOS: PhotoKey[] = ['lock', 'brushing', 'oiling', 'lock', 'panel']
const withPhotos = (steps: Array<Omit<DemoStep, 'photo'>>): DemoStep[] => steps.map((s, i) => ({ ...s, photo: PHOTOS[i] ?? 'panel' }))

export const DEMO: Record<DemoLang, DemoInstruction> = {
  fr: {
    dir: 'ltr',
    speech: 'fr-CA',
    title: 'Nettoyage des rails — Machine 1234',
    steps: withPhotos([
      {
        title: 'Cadenassez la machine',
        text: 'Coupez le sectionneur, puis posez votre cadenas et votre étiquette.',
        warning: { level: 'danger', text: 'Ne jamais ouvrir la porte sans cadenas.' },
        keyPoints: ['Vérifiez l’arrêt complet de la broche'],
      },
      {
        title: 'Retirez les copeaux des rails',
        text: 'Brossez chaque rail de l’avant vers l’arrière.',
        warning: { level: 'caution', text: 'Jamais d’air comprimé sur les rails.' },
        keyPoints: ['Brosse en nylon seulement', 'Gants anticoupure'],
      },
      {
        title: 'Huilez les rails',
        text: 'Huilez chaque rail d’un mince filet, puis essuyez l’excédent.',
        warning: { level: 'info', text: 'Un mince filet d’huile suffit.' },
        keyPoints: ['Huile pour glissières seulement'],
      },
      { title: 'Retirez votre cadenas', text: 'Fermez la porte, puis retirez votre cadenas et votre étiquette.', warning: null, keyPoints: [] },
      { title: 'Remettez en marche', text: 'Appuyez sur le bouton vert et vérifiez que les axes se déplacent sans bruit.', warning: null, keyPoints: [] },
    ]),
    words: {
      name: 'Français',
      stepOf: 'Étape {n} sur {total}',
      next: 'Suivant',
      previous: 'Précédent',
      finish: 'Terminer',
      listen: 'Écouter',
      stop: 'Arrêter la lecture',
      unclear: 'Pas clair ?',
      keyPoints: 'Points clés',
      warningLevels: { danger: 'Danger', caution: 'Attention', info: 'Bon à savoir' },
      feedbackTitle: 'Qu’est-ce qui ne va pas ?',
      kinds: { unclear: 'Pas clair', error: 'Erreur', danger: 'Danger', idea: 'Idée' },
      feedbackSend: 'Envoyer le retour',
      feedbackThanks: 'Merci ! Votre retour est transmis à la personne responsable.',
      done: 'Terminé !',
      doneText: 'Bravo, l’instruction est complétée.',
      restart: 'Recommencer',
      training: {
        start: 'Valider ma formation',
        startHint: '{n} questions sur cette instruction',
        questionOf: 'Question {i} sur {n}',
        right: 'Bonne réponse',
        wrong: 'Pas tout à fait',
        next: 'Question suivante',
        finish: 'Voir mon résultat',
        passed: 'Formation validée',
        passedText: 'Bravo : c’est noté.',
        failed: 'À reprendre',
        failedText: 'Relisez l’instruction, puis réessayez.',
        score: '{good} sur {total}',
        retry: 'Réessayer',
      },
    },
    quiz: [
      { q: 'Que faites-vous avant d’ouvrir la porte ?', choices: ['Je pose mon cadenas et mon étiquette', 'Je souffle les rails à l’air comprimé', 'J’appuie sur le bouton vert'], answer: 0 },
      { q: 'Avec quoi nettoyez-vous les rails ?', choices: ['De l’air comprimé', 'Une brosse en nylon', 'Un chiffon mouillé'], answer: 1 },
      { q: 'Combien d’huile mettez-vous sur chaque rail ?', choices: ['Un mince filet, puis j’essuie l’excédent', 'Le plus possible', 'Aucune'], answer: 0 },
    ],
  },
  en: {
    dir: 'ltr',
    speech: 'en-CA',
    title: 'Rail cleaning — Machine 1234',
    steps: withPhotos([
      {
        title: 'Lock out the machine',
        text: 'Turn off the disconnect switch, then apply your lock and tag.',
        warning: { level: 'danger', text: 'Never open the door without your lock.' },
        keyPoints: ['Check that the spindle has fully stopped'],
      },
      {
        title: 'Remove chips from the rails',
        text: 'Brush each rail from front to back.',
        warning: { level: 'caution', text: 'Never use compressed air on the rails.' },
        keyPoints: ['Nylon brush only', 'Cut-resistant gloves'],
      },
      {
        title: 'Oil the rails',
        text: 'Apply a thin bead of oil to each rail, then wipe off the excess.',
        warning: { level: 'info', text: 'A thin bead of oil is enough.' },
        keyPoints: ['Slideway oil only'],
      },
      { title: 'Remove your lock', text: 'Close the door, then remove your lock and tag.', warning: null, keyPoints: [] },
      { title: 'Restart the machine', text: 'Press the green button and check that the axes move without noise.', warning: null, keyPoints: [] },
    ]),
    words: {
      name: 'English',
      stepOf: 'Step {n} of {total}',
      next: 'Next',
      previous: 'Back',
      finish: 'Finish',
      listen: 'Listen',
      stop: 'Stop reading',
      unclear: 'Not clear?',
      keyPoints: 'Key points',
      warningLevels: { danger: 'Danger', caution: 'Caution', info: 'Good to know' },
      feedbackTitle: 'What is wrong?',
      kinds: { unclear: 'Not clear', error: 'Mistake', danger: 'Dangerous', idea: 'Better way' },
      feedbackSend: 'Send feedback',
      feedbackThanks: 'Thank you! Your feedback was sent to the person in charge.',
      done: 'Done!',
      doneText: 'Well done, the instruction is complete.',
      restart: 'Start over',
      training: {
        start: 'Validate my training',
        startHint: '{n} questions on this instruction',
        questionOf: 'Question {i} of {n}',
        right: 'Right answer',
        wrong: 'Not quite',
        next: 'Next question',
        finish: 'See my result',
        passed: 'Training validated',
        passedText: 'Well done: it’s recorded.',
        failed: 'To redo',
        failedText: 'Read the instruction again, then retry.',
        score: '{good} of {total}',
        retry: 'Try again',
      },
    },
    quiz: [
      { q: 'What do you do before opening the door?', choices: ['I apply my lock and tag', 'I blow the rails with compressed air', 'I press the green button'], answer: 0 },
      { q: 'What do you clean the rails with?', choices: ['Compressed air', 'A nylon brush', 'A wet rag'], answer: 1 },
      { q: 'How much oil goes on each rail?', choices: ['A thin bead, then I wipe off the excess', 'As much as possible', 'None'], answer: 0 },
    ],
  },
  es: {
    dir: 'ltr',
    speech: 'es',
    title: 'Limpieza de los rieles — Máquina 1234',
    steps: withPhotos([
      {
        title: 'Bloquee la máquina',
        text: 'Corte el seccionador y luego coloque su candado y su etiqueta.',
        warning: { level: 'danger', text: 'Nunca abra la puerta sin candado.' },
        keyPoints: ['Verifique que el husillo esté completamente detenido'],
      },
      {
        title: 'Retire las virutas de los rieles',
        text: 'Cepille cada riel de adelante hacia atrás.',
        warning: { level: 'caution', text: 'Nunca use aire comprimido en los rieles.' },
        keyPoints: ['Solo cepillo de nailon', 'Guantes anticorte'],
      },
      {
        title: 'Lubrique los rieles',
        text: 'Aplique un hilo fino de aceite en cada riel y luego limpie el exceso.',
        warning: { level: 'info', text: 'Basta con un hilo fino de aceite.' },
        keyPoints: ['Solo aceite para guías'],
      },
      { title: 'Retire su candado', text: 'Cierre la puerta y luego retire su candado y su etiqueta.', warning: null, keyPoints: [] },
      { title: 'Vuelva a arrancar la máquina', text: 'Presione el botón verde y verifique que los ejes se muevan sin ruido.', warning: null, keyPoints: [] },
    ]),
    words: {
      name: 'Español',
      stepOf: 'Paso {n} de {total}',
      next: 'Siguiente',
      previous: 'Anterior',
      finish: 'Terminar',
      listen: 'Escuchar',
      stop: 'Detener la lectura',
      unclear: '¿No está claro?',
      keyPoints: 'Puntos clave',
      warningLevels: { danger: 'Peligro', caution: 'Precaución', info: 'Dato útil' },
      feedbackTitle: '¿Qué está mal?',
      kinds: { unclear: 'No está claro', error: 'Error', danger: 'Peligroso', idea: 'Mejor manera' },
      feedbackSend: 'Enviar',
      feedbackThanks: '¡Gracias! Tu comentario fue enviado al responsable.',
      done: '¡Listo!',
      doneText: 'Muy bien, la instrucción está completa.',
      restart: 'Volver a empezar',
      training: {
        start: 'Validar mi formación',
        startHint: '{n} preguntas sobre esta instrucción',
        questionOf: 'Pregunta {i} de {n}',
        right: 'Respuesta correcta',
        wrong: 'No del todo',
        next: 'Siguiente pregunta',
        finish: 'Ver mi resultado',
        passed: 'Formación validada',
        passedText: 'Bravo: queda registrado.',
        failed: 'Por repetir',
        failedText: 'Vuelva a leer la instrucción y luego inténtelo de nuevo.',
        score: '{good} de {total}',
        retry: 'Reintentar',
      },
    },
    quiz: [
      { q: '¿Qué hace antes de abrir la puerta?', choices: ['Coloco mi candado y mi etiqueta', 'Soplo los rieles con aire comprimido', 'Presiono el botón verde'], answer: 0 },
      { q: '¿Con qué limpia los rieles?', choices: ['Con aire comprimido', 'Con un cepillo de nailon', 'Con un trapo mojado'], answer: 1 },
      { q: '¿Cuánto aceite pone en cada riel?', choices: ['Un hilo fino y luego limpio el exceso', 'Lo más posible', 'Nada'], answer: 0 },
    ],
  },
  ar: {
    dir: 'rtl',
    speech: 'ar',
    title: 'تنظيف المجاري الانزلاقية — الآلة 1234',
    steps: withPhotos([
      {
        title: 'اعزل الآلة وأقفلها',
        text: 'افصل القاطع الرئيسي، ثم ضع قفلك وبطاقتك.',
        warning: { level: 'danger', text: 'لا تفتح الباب أبدًا دون قفل.' },
        keyPoints: ['تأكد من توقف عمود الدوران تمامًا'],
      },
      {
        title: 'أزل النشارة المعدنية عن المجاري',
        text: 'نظّف كل مجرى بالفرشاة من الأمام إلى الخلف.',
        warning: { level: 'caution', text: 'لا تستعمل الهواء المضغوط على المجاري أبدًا.' },
        keyPoints: ['فرشاة نايلون فقط', 'قفازات مقاومة للقطع'],
      },
      { title: 'زيّت المجاري', text: 'ضع خطًا رفيعًا من الزيت على كل مجرى، ثم امسح الزائد.', warning: { level: 'info', text: 'يكفي خط رفيع من الزيت.' }, keyPoints: ['زيت المجاري الانزلاقية فقط'] },
      { title: 'أزل قفلك', text: 'أغلق الباب، ثم أزل قفلك وبطاقتك.', warning: null, keyPoints: [] },
      { title: 'أعد تشغيل الآلة', text: 'اضغط على الزر الأخضر وتأكد من أن المحاور تتحرك دون ضجيج.', warning: null, keyPoints: [] },
    ]),
    words: {
      name: 'العربية',
      stepOf: 'الخطوة {n} من {total}',
      next: 'التالي',
      previous: 'السابق',
      finish: 'إنهاء',
      listen: 'استمع',
      stop: 'إيقاف القراءة',
      unclear: 'غير واضح؟',
      keyPoints: 'نقاط أساسية',
      warningLevels: { danger: 'خطر', caution: 'تنبيه', info: 'معلومة مفيدة' },
      feedbackTitle: 'ما المشكلة؟',
      kinds: { unclear: 'غير واضح', error: 'خطأ', danger: 'خطير', idea: 'طريقة أفضل' },
      feedbackSend: 'إرسال',
      feedbackThanks: 'شكرًا! وصلت ملاحظتك إلى المسؤول.',
      done: 'تم!',
      doneText: 'أحسنت، اكتملت التعليمات.',
      restart: 'ابدأ من جديد',
      training: {
        start: 'تحقق من تدريبي',
        startHint: '{n} أسئلة عن هذه التعليمات',
        questionOf: 'السؤال {i} من {n}',
        right: 'إجابة صحيحة',
        wrong: 'ليس تمامًا',
        next: 'السؤال التالي',
        finish: 'عرض نتيجتي',
        passed: 'تم التحقق من التدريب',
        passedText: 'أحسنت: تم التسجيل.',
        failed: 'أعد المحاولة',
        failedText: 'أعد قراءة التعليمات، ثم حاول مرة أخرى.',
        score: '{good} من {total}',
        retry: 'حاول مجددًا',
      },
    },
    quiz: [
      { q: 'ماذا تفعل قبل فتح الباب؟', choices: ['أضع قفلي وبطاقتي', 'أنفخ المجاري بالهواء المضغوط', 'أضغط على الزر الأخضر'], answer: 0 },
      { q: 'بماذا تنظف المجاري؟', choices: ['بالهواء المضغوط', 'بفرشاة نايلون', 'بقطعة قماش مبللة'], answer: 1 },
      { q: 'كم من الزيت تضع على كل مجرى؟', choices: ['خطًا رفيعًا، ثم أمسح الزائد', 'أكبر قدر ممكن', 'لا شيء'], answer: 0 },
    ],
  },
}

/** Les langues de la démo, la langue du site d'abord. */
export const demoLangsFor = (siteLang: 'fr' | 'en'): DemoLang[] => [siteLang, ...DEMO_LANGS.filter((l) => l !== siteLang)]
