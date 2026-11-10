// Configuration Metro de la coquille CLIP.
//
// La coquille est un projet npm autonome (hors des workspaces de la racine) : elle garde ses
// propres node_modules, mais importe le contrat du pont depuis `packages/bridge`, hors de son
// dossier. Metro ne sert que les fichiers de ses `watchFolders` : on y ajoute ce paquet.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const bridgeRoot = path.resolve(projectRoot, '../../packages/bridge')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), bridgeRoot]
// Toute dépendance se résout dans les node_modules de la coquille, même depuis le contrat.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

module.exports = config
