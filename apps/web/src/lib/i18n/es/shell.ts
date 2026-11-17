import type { shell as Fr } from '../fr/shell'

/** La estructura de la app: navegación, menús, cuenta, lector de códigos. */
export const shell: typeof Fr = {
  opening: 'Abriendo CLIP…',
  mainNav: 'Navegación principal',
  nav: {
    home: 'Inicio',
    instructions: 'Instrucciones',
    stations: 'Puestos',
    feedback: 'Comentarios',
    stats: 'Estadísticas',
    team: 'Equipo',
    records: 'Registro',
    import: 'Importar documentos',
    billing: 'Plan y créditos',
    settings: 'Ajustes',
    more: 'Más',
  },
  newInstruction: 'Nueva instrucción',
  account: 'Mi cuenta',
  appearance: 'Apariencia',
  signOut: 'Cerrar sesión',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versión ${v}`,
    built: (date: string) => `publicada el ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `App de ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Acerca de CLIP',
    hint: 'El último número sube con cada actualización: compáralo con el que te indicaron.',
  },
  aiConsent: {
    title: 'Antes de usar la IA',
    body: 'Para redactar y editar tus instrucciones, CLIP envía tus fotos, videos, notas de voz y textos a servicios de inteligencia artificial de Google y OpenAI, a través de la plataforma de Intelligence Industrielle.',
    more: 'No se envía nada sin tu consentimiento. Puedes retirarlo en Ajustes › Datos.',
    privacy: 'Política de privacidad',
    accept: 'Acepto',
    refuse: 'Ahora no',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Estás editando ${title ? `«${title}»` : 'una instrucción'} desde ${device === 'app' ? 'la app móvil' : 'otra computadora'}`,
  },
  scan: {
    title: 'Escanear un código',
    prompt: 'Escanea el código del puesto o de la pieza',
    failed: 'No se abrió el lector de códigos',
    aim: 'Apunta al código QR o de barras',
    noCamera: 'La cámara no está disponible. Permítela en tu navegador o escribe el código en la búsqueda.',
  },
}
