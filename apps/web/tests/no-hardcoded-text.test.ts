// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('les écrans', () => {
  it('n’écrivent aucun texte en dur : tout passe par les dictionnaires de src/lib/i18n', () => {
    let out = ''
    try {
      execFileSync(process.execPath, ['scripts/find-hardcoded-text.mjs', 'src/app', 'src/components'], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
    } catch (e) {
      out = String((e as { stdout?: string }).stdout ?? e)
    }
    expect(out.trim().split('\n').filter(Boolean)).toEqual([])
  })
})
