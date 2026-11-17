import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'Otevírá se CLIP…',
  mainNav: 'Hlavní navigace',
  nav: {
    home: 'Domů',
    instructions: 'Instrukce',
    stations: 'Pracoviště',
    feedback: 'Zpětná vazba',
    stats: 'Statistiky',
    team: 'Tým',
    records: 'Registr',
    import: 'Import dokumentů',
    billing: 'Tarif a kredity',
    settings: 'Nastavení',
    more: 'Více',
  },
  newInstruction: 'Nová instrukce',
  account: 'Můj účet',
  appearance: 'Vzhled',
  signOut: 'Odhlásit se',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Verze ${v}`,
    built: (date: string) => `vydáno ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `Aplikace pro ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'O aplikaci CLIP',
    hint: 'Poslední číslo se zvyšuje při každé aktualizaci: porovnejte ho s tím, které vám bylo sděleno.',
  },
  aiConsent: {
    title: 'Než začnete používat AI',
    body: 'Aby CLIP mohl psát a upravovat vaše instrukce, odesílá vaše fotky, videa, hlasové poznámky a texty službám umělé inteligence od Google a OpenAI prostřednictvím platformy Intelligence Industrielle.',
    more: 'Bez vašeho souhlasu se nic neodesílá. Souhlas můžete odvolat v Nastavení › Data.',
    privacy: 'Zásady ochrany osobních údajů',
    accept: 'Souhlasím',
    refuse: 'Teď ne',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `${title ? `Upravujete „${title}“` : 'Upravujete instrukci'} ${device === 'app' ? 'v mobilní aplikaci' : 'na jiném počítači'}`,
  },
  scan: {
    title: 'Naskenovat kód',
    prompt: 'Naskenujte kód pracoviště nebo dílu',
    failed: 'Čtečku kódů se nepodařilo otevřít',
    aim: 'Namiřte na QR kód nebo čárový kód',
    noCamera: 'Fotoaparát není dostupný. Povolte ho v prohlížeči, nebo kód napište do vyhledávání.',
  },
}
