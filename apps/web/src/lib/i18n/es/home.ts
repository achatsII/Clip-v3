import type { home as Fr } from '../fr/home'

/** El inicio. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Hola, ${name}`,
    morning: (name: string) => `Buenos días, ${name}`,
    afternoon: (name: string) => `Buenas tardes, ${name}`,
    evening: (name: string) => `Buenas noches, ${name}`,
  },
  hero: {
    eyebrow: 'Nueva instrucción',
    line1: 'Grábalo. Dilo.',
    line2: 'La IA lo redacta.',
    video: 'Video',
    voiceNote: 'Nota de voz',
    document: 'PDF o Word',
  },
  reader: {
    find: 'Buscar una instrucción',
    myStations: 'Mis puestos',
  },
  setup: {
    title: 'Pon en marcha tu planta',
    hint: 'Unos minutos, un paso a la vez.',
    publish: 'Publicar una primera instrucción',
    station: 'Crear un puesto y su código QR',
    logo: 'Agregar el logotipo de la planta',
    invite: 'Invitar a un compañero',
    standard: 'Ajustar tu estándar de redacción',
    hide: 'Ocultar la configuración',
    hideShort: 'Ocultar',
    show: 'Mostrar',
    compact: (done: number, total: number) => `Configuración: ${done} de ${total}`,
  },
  tiles: {
    published: 'Publicadas',
    coverage: (percent: number) => `${percent.toLocaleString('es-MX')} % de los puestos cubiertos`,
    noStation: 'Aún no hay puestos',
    views: 'Consultas · 7 días',
    viewsHint: 'Tabletas, códigos QR y enlaces',
    stations: 'Puestos',
    stationsHint: 'Con sus instrucciones',
    streak: 'Racha',
    streakWeeks: (weeks: number) => `semana${weeks !== 1 ? 's' : ''} seguida${weeks !== 1 ? 's' : ''} con algo publicado`,
    streakStart: 'Publica esta semana para empezar tu racha',
  },
  renewal: {
    title: (count: number) => `Por revisar (${count.toLocaleString('es-MX')})`,
    hint: 'Se acerca su fecha de revisión. ¿No cambió nada? Confírmalo con un toque.',
  },
  review: {
    title: (count: number) => `Por aprobar (${count.toLocaleString('es-MX')})`,
    hint: 'Los pasos modificados están marcados en el editor.',
  },
  feedback: {
    title: 'Comentarios de los operadores',
    seeAll: 'Ver todos',
    quote: (comment: string) => `«${comment}»`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Paso ${step.toLocaleString('es-MX')} · ${ago}`),
    none: 'Sin comentarios nuevos.',
  },
  drafts: { title: 'Retomar', hint: 'Tus borradores en curso' },
  forYou: { title: 'Para ti', hint: 'Según tus responsabilidades' },
  library: {
    count: (n: number) => `${n.toLocaleString('es-MX')} instrucción${n !== 1 ? 'es' : ''} publicada${n !== 1 ? 's' : ''}`,
    hint: 'Tu piso de producción tiene una biblioteca viva. Mantenla al día con los comentarios de los operadores.',
  },
}
