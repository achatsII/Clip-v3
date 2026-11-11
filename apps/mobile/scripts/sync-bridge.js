#!/usr/bin/env node
// Recopie le contrat du pont (packages/bridge, la source) dans la coquille (src/bridge/contract.ts).
// La coquille doit rester autonome : la publication Expo Go (EAS Update) et certains outils ne
// copient que ce dossier. Un test échoue si la copie diffère de la source.
const fs = require('fs')
const path = require('path')

const SOURCE = path.resolve(__dirname, '../../../packages/bridge/src/index.ts')
const TARGET = path.resolve(__dirname, '../src/bridge/contract.ts')
const HEADER =
  '// Copie générée de packages/bridge/src/index.ts : ne pas la modifier ici.\n' +
  '// Changer la source, puis lancer `npm run sync-bridge` dans apps/mobile.\n\n'

function expected() {
  return HEADER + fs.readFileSync(SOURCE, 'utf8')
}

if (require.main === module) {
  fs.writeFileSync(TARGET, expected())
  console.log(`Contrat du pont recopié dans ${path.relative(process.cwd(), TARGET)}`)
}

module.exports = { SOURCE, TARGET, HEADER, expected }
