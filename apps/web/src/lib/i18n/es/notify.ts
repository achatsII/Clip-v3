import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Por aprobar: ${instruction}`,
    body: (who: string) => `${who} solicita tu aprobación.`,
  },
  changes: {
    title: (instruction: string) => `Cambios solicitados: ${instruction}`,
    body: (who: string, text: string) => `${who} pide cambios: «${text}»`,
  },
  published: {
    title: (instruction: string) => `Publicada: ${instruction}`,
    body: 'Ya están todas las firmas: la instrucción está en el puesto.',
  },
  danger: {
    title: (station: string) => `Peligro reportado${station ? ` en ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `por ${who}` : '', text ? `«${text}»` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Desviación registrada${station ? ` en ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `por ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} quisiera: ${what}`,
    body: (target: string) => (target ? `Viene con ${target}. Todo está en Suscripción y créditos.` : 'Todo está en Suscripción y créditos.'),
  },
  test: {
    title: 'Prueba de alertas de CLIP',
    body: 'Las alertas te están llegando.',
  },
  open: 'Abrir en CLIP',
  footer: 'Recibes esta alerta de CLIP porque tu planta lo solicitó. Puedes desactivarla en CLIP, en Mi cuenta.',
}
