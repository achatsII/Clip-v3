import type { importer as Fr } from '../fr/importer'

/** La importación en lote de documentos antiguos. */
export const importer: typeof Fr = {
  title: 'Importa tus instrucciones antiguas',
  subtitle: 'Suelta tus PDF y documentos de Word, incluso por docenas: cada uno se convierte en un borrador estructurado, listo para revisar.',
  readOnly: 'Tu rol no permite importar.',
  unavailableTitle: 'La importación en lote no está disponible por ahora',
  unavailableText: 'Puedes soltar un documento en una nueva instrucción.',
  drop: {
    title: 'Arrastra tus archivos aquí o toca para elegirlos',
    formats: 'PDF o Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) o PowerPoint (.pptx)',
  },
  onlyDocuments: 'Aquí solo se importan PDF y documentos de Word',
  onlyDocumentsText: 'Los videos y las fotos van en una nueva instrucción.',
  slides: 'Guarda tus archivos de PowerPoint como PDF',
  slidesText: 'En PowerPoint: Archivo › Exportar › PDF. Luego suelta aquí el PDF: sus imágenes se convierten en los medios de los pasos.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('es-MX')} de ${total.toLocaleString('es-MX')} listos`,
    resume: (pending: number) => `Reanudar el análisis (${pending.toLocaleString('es-MX')})`,
    running: 'En curso: mantén abierta esta pestaña',
    review: 'Revisar',
  },
  status: {
    waiting: 'En espera',
    uploading: 'Enviando y convirtiendo…',
    uploaded: 'Listo para analizar',
    analyzing: 'La IA lo está reestructurando…',
    server: 'La IA lo está analizando en el servidor: puedes cerrar la app',
    done: 'Borrador creado',
    error: 'Falló',
  },
  errors: {
    interrupted: 'Envío interrumpido: suelta de nuevo el archivo.',
    upload: 'No se pudo enviar',
    analysis: 'No se pudo analizar',
  },
}
