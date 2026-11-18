/**
 * La politique de confidentialité de la marque publique (Kiplo), en français et en anglais : les autres
 * langues du site montrent l'anglais (un texte juridique ne se traduit pas à la machine). Elle nomme
 * l'entreprise qui exploite le produit (`PRODUCT.legal`), comme la loi l'exige, et rien d'autre de
 * l'entreprise. CLIP garde la politique d'Intelligence Industrielle (`privacyHref`).
 *
 * Ce qu'elle dit est ce que l'app fait (src/lib/ai/consent.ts, la suppression du compte, la bannière des
 * témoins, Stripe) ; à faire relire par un juriste avant de la donner pour définitive.
 */
import type { Product } from '@/lib/brand/product'

export interface PrivacySection {
  title: string
  paragraphs: string[]
}
export interface PrivacyText {
  title: string
  updated: string
  intro: string
  sections: PrivacySection[]
}

export const PRIVACY_UPDATED = '2026-11-17'

export function privacyText(lang: 'fr' | 'en', p: Product): PrivacyText {
  const { entity, address, email } = p.legal
  if (lang === 'fr')
    return {
      title: `Politique de confidentialité de ${p.name}`,
      updated: 'Mise à jour le 17 novembre 2026',
      intro: `${p.name} aide les usines à rédiger, traduire et suivre leurs instructions de travail. Cette politique dit quels renseignements nous recueillons, pourquoi, avec qui nous les partageons et comment exercer vos droits.`,
      sections: [
        { title: 'Qui est responsable', paragraphs: [`${p.name} est exploité par ${entity}, ${address}, responsable de vos renseignements personnels. Pour toute question ou demande : ${email}.`] },
        {
          title: 'Ce que nous recueillons',
          paragraphs: [
            'Votre compte : nom, adresse courriel, organisation et rôle.',
            'Ce que vous créez : les photos, vidéos, notes vocales, textes et documents que vous ajoutez, et les instructions qui en sont tirées. Au poste, les retours, relevés et formations des opérateurs, avec le nom ou le code qu’ils choisissent.',
            'Le paiement : il passe par Stripe, qui traite votre carte ; nous ne voyons jamais son numéro.',
            'Sur le site, seulement avec votre accord : la mesure d’audience (Google Analytics).',
          ],
        },
        {
          title: 'Pourquoi nous les utilisons',
          paragraphs: ['Pour vous donner le service : rédiger, traduire et afficher vos instructions, avertir les bonnes personnes, facturer votre abonnement, vous aider et garder le service sûr. Nous ne vendons pas vos renseignements.'],
        },
        {
          title: 'L’intelligence artificielle',
          paragraphs: [
            'Seulement avec votre accord, donné à la connexion et retirable en tout temps dans Réglages › Données : les contenus que vous soumettez à l’IA sont transmis à Google (texte, photos, vidéos, voix) et, pour les images que vous demandez, à OpenAI, qui les traitent pour produire la réponse.',
          ],
        },
        {
          title: 'Avec qui nous les partageons',
          paragraphs: ['Avec nos fournisseurs, seulement pour faire fonctionner le service : hébergement et stockage infonuagiques, Stripe (paiement), Google et OpenAI (IA, avec votre accord), l’envoi des courriels et des notifications. Ces fournisseurs peuvent traiter les renseignements hors du Québec et du Canada.'],
        },
        { title: 'Combien de temps', paragraphs: ['Tant que votre compte existe. Vous pouvez supprimer votre compte vous-même, dans Mon compte ; ce qui vous concerne est alors effacé, sauf ce que la loi nous oblige à garder (par exemple les factures).'] },
        { title: 'Vos droits', paragraphs: [`Vous pouvez demander l’accès à vos renseignements, leur correction, leur suppression ou leur portabilité, et retirer votre consentement. Écrivez-nous : ${email}. Vous pouvez aussi vous adresser à l’autorité de protection des renseignements personnels de chez vous (au Québec, la Commission d’accès à l’information).`] },
        { title: 'Les témoins', paragraphs: ['Le site ne mesure l’audience qu’avec votre accord, donné ou refusé dans la bannière des témoins, et modifiable par le lien « Témoins » du pied de page. L’app garde dans votre appareil seulement ce qu’il faut pour fonctionner (session, langue, préférences).'] },
        { title: 'Les changements', paragraphs: ['Nous publions ici toute nouvelle version, avec sa date.'] },
      ],
    }
  return {
    title: `${p.name} privacy policy`,
    updated: 'Updated November 17, 2026',
    intro: `${p.name} helps plants write, translate and follow their work instructions. This policy explains what information we collect, why, who we share it with and how to exercise your rights.`,
    sections: [
      { title: 'Who is responsible', paragraphs: [`${p.name} is operated by ${entity}, ${address}, which is responsible for your personal information. For any question or request: ${email}.`] },
      {
        title: 'What we collect',
        paragraphs: [
          'Your account: name, email address, organization and role.',
          'What you create: the photos, videos, voice notes, text and documents you add, and the instructions made from them. At the workstation, operators’ feedback, readings and training, with the name or code they choose.',
          'Payment: it goes through Stripe, which processes your card; we never see its number.',
          'On the website, only with your consent: audience measurement (Google Analytics).',
        ],
      },
      { title: 'Why we use it', paragraphs: ['To provide the service: write, translate and display your instructions, notify the right people, bill your subscription, help you and keep the service secure. We do not sell your information.'] },
      {
        title: 'Artificial intelligence',
        paragraphs: ['Only with your consent, given when you sign in and withdrawable at any time in Settings › Data: the content you submit to the AI is sent to Google (text, photos, videos, voice) and, for the images you ask for, to OpenAI, which process it to produce the response.'],
      },
      { title: 'Who we share it with', paragraphs: ['With our providers, only to run the service: cloud hosting and storage, Stripe (payment), Google and OpenAI (AI, with your consent), email and notification delivery. These providers may process information outside Québec and Canada.'] },
      { title: 'How long we keep it', paragraphs: ['As long as your account exists. You can delete your account yourself, in My account; what concerns you is then erased, except what the law requires us to keep (for example invoices).'] },
      { title: 'Your rights', paragraphs: [`You can ask to access, correct, delete or port your information, and withdraw your consent. Write to us: ${email}. You can also contact the data protection authority where you live.`] },
      { title: 'Cookies', paragraphs: ['The website measures its audience only with your consent, given or refused in the cookie banner and changeable through the “Cookies” link in the footer. The app keeps on your device only what it needs to work (session, language, preferences).'] },
      { title: 'Changes', paragraphs: ['We publish any new version here, with its date.'] },
    ],
  }
}
