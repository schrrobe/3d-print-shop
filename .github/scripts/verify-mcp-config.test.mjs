import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const verifier = resolve('.github/scripts/verify-mcp-config.mjs')
const approvedConfig = JSON.parse(await readFile(resolve('.mcp.json'), 'utf8'))

function cloneConfig() {
  return structuredClone(approvedConfig)
}

async function verify(config) {
  const directory = await mkdtemp(join(tmpdir(), 'verify-mcp-config-'))
  const configPath = join(directory, '.mcp.json')
  await writeFile(configPath, JSON.stringify(config))

  try {
    return spawnSync(process.execPath, [verifier, configPath], { encoding: 'utf8' })
  } finally {
    await rm(directory, { recursive: true })
  }
}

test('accepts the approved MCP configuration', async () => {
  const result = await verify(cloneConfig())
  assert.equal(result.status, 0, result.stderr)
})

const invalidConfigs = [
  ['an extra root key', (config) => (config.extra = {})],
  ['a non-object mcpServers value', (config) => (config.mcpServers = [])],
  ['a missing approved server', (config) => delete config.mcpServers.stripe],
  ['an unknown server', (config) => (config.mcpServers.unknown = config.mcpServers.playwright)],
  ['a wrong transport type', (config) => (config.mcpServers.playwright.type = 'http')],
  ['a wrong command', (config) => (config.mcpServers.playwright.command = 'node')],
  ['a missing argument', (config) => config.mcpServers.playwright.args.pop()],
  ['an extra command argument', (config) => config.mcpServers.playwright.args.push('--headless')],
  ['an incomplete Stripe argument list', (config) => config.mcpServers.stripe.args.shift()],
  [
    'an extra credential argument',
    (config) => config.mcpServers.stripe.args.push('--api-key=secret'),
  ],
  [
    'an unexpected environment key',
    (config) => (config.mcpServers.playwright.env.TOKEN = 'secret'),
  ],
  [
    'an unexpected environment value',
    (config) => (config.mcpServers.stripe.env.STRIPE_SECRET_KEY = '${STRIPE_SECRET_KEY}'),
  ],
]

for (const [description, mutate] of invalidConfigs) {
  test(`rejects ${description}`, async () => {
    const config = cloneConfig()
    mutate(config)
    const result = await verify(config)
    assert.notEqual(result.status, 0, `verifier accepted ${description}`)
  })
}
