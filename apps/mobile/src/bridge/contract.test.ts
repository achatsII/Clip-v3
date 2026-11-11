// La coquille n'a pas les types de Node : fs et le script de copie se chargent par jest.requireActual.
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs = jest.requireActual<any>('fs')
const { SOURCE, TARGET, expected } = jest.requireActual<any>('../../scripts/sync-bridge.js')

describe('contrat du pont', () => {
  // Dans le dépôt, la copie de la coquille doit être identique à la source partagée avec le web.
  const inRepo: boolean = fs.existsSync(SOURCE)
  ;(inRepo ? it : it.skip)('la copie de la coquille est celle de packages/bridge (sinon : npm run sync-bridge)', () => {
    expect(fs.readFileSync(TARGET, 'utf8')).toBe(expected())
  })
})
