/** Le français : la source. Chaque domaine a son fichier ; l'anglais doit avoir les mêmes clés. */
import { common } from './common'
import { catalog } from './catalog'
import { shell } from './shell'
import { auth } from './auth'
import { home } from './home'
import { instructions } from './instructions'
import { capture } from './capture'
import { editor } from './editor'
import { editorTools } from './editorTools'
import { stations } from './stations'
import { feedback } from './feedback'
import { stats } from './stats'
import { settings } from './settings'
import { billing } from './billing'
import { importer } from './importer'
import { publicLinks } from './publicLinks'
import { team } from './team'
import { records } from './records'
import { inbox } from './inbox'
import { notify } from './notify'

export const fr = { common, catalog, shell, auth, home, instructions, capture, editor, editorTools, stations, feedback, stats, settings, billing, importer, publicLinks, team, records, inbox, notify }

export type Messages = typeof fr
