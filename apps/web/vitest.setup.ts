// Les tests lisent l'outil en français, la langue source : jsdom annonce un navigateur anglais.
// Un test qui veut l'anglais appelle setLang('en').
try {
  localStorage.setItem('clip_pref_ui_lang', 'fr')
} catch {
  /* environnement node : pas de stockage, la langue par défaut est le français */
}
