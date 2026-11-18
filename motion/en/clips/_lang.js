// Les ancres de la voix ANGLAISE. Chaque scène demande l'heure d'un mot par une clé (le mot de la scène française :
// W('v04','nulle')) ; cette table dit quel mot la voix anglaise prononce à ce moment-là. Une entrée {w, n} = la n-ième
// occurrence du mot dans la phrase. Une autre langue = une autre table, les scènes ne changent pas pour leurs ancres.
const LANG='en';
const ANCHORS={
  v01:{jacques:'Jacques', machine:'machine', personne:'anyone'},          // Jacques knows his machine better than anyone.
  v02:{retraite:'retires'},                                               // In a year, he retires.
  v03:{'2030':'2030', vingt:'twenty', trente:'thirty', technologues:'technologists', partiront:'retire'},
  v04:{nulle:'written'},                                                  // …isn't written down anywhere : la pastille sur « written »
  v05:{voici:'Meet', clip:'Clip'},                                        // Meet… Clip.
  v06:{filmez:'Film', clip:'Clip', telephone:'phone'},                    // Film the expert… Clip records it all, right on the phone.
  v07:{photos:'photos', vocale:'note', pdf:'PDF', word:'Word'},          // Add photos, a voice note, or… in PDF and Word.
  v08:{bouton:'button', "l'IA":'AI', redige:'writes', "l'instruction":'the', travail:'instruction'},  // …AI writes | the work | instruction.
  v09:{action:'action', etape:'step', extrait:'video', mises:{w:'the', n:2}, garde:'at'},  // …the right video clip, the warnings at the right time.
  v10:{retouchez:'Edit', mot:'word', annotez:'Annotate', traduisez:'Translate', quelques:'in', secondes:'seconds'},
  v11:{instructions:'instructions', deposez:'Drop', dizaines:'dozen', modernisees:'modernized'},
  v12:{approuver:'approved', deployez:'deploy', poste:'workstation', qr:'QR', compte:'account'},
  v13:{etape:'step', voix:'read', signale:'flags', clair:'clear'},        // …follows each step, hears it read aloud, and flags what isn't clear.
  v14:{clic:'click', pdf:'PDF'},                                          // And with one click, it exports to PDF.
  v15:{clip:'Clip', 'savoir-faire':'experts', poste:'workstation', quelques:'minutes'},  // Clip. Your experts' know-how, at the workstation, in minutes.
  v16:{demandez:'Book'},                                                  // Book a demo.
};
