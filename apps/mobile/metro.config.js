// Configuration Metro de la coquille CLIP : celle d'Expo, sans rien de plus. La coquille est
// autonome (le contrat du pont y est recopié, voir scripts/sync-bridge.js) : aucun dossier hors
// d'apps/mobile n'est servi, ce qui permet de la publier depuis une simple copie de ce dossier.
const { getDefaultConfig } = require('expo/metro-config')

module.exports = getDefaultConfig(__dirname)
