import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { resolve } from 'node:path'

const APPROVED_CONFIG = {
  mcpServers: {
    playwright: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@playwright/mcp@0.0.78', '--browser', 'chromium'],
      env: {},
    },
    stripe: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@stripe/mcp@0.3.3'],
      env: {
        STRIPE_SECRET_KEY: '${STRIPE_MCP_RESTRICTED_KEY}',
      },
    },
  },
}

function validateConfig(config) {
  const failures = []

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return ['MCP config must be a JSON object']
  }

  const rootKeys = Object.keys(config).sort()
  if (!isDeepStrictEqual(rootKeys, ['mcpServers'])) {
    failures.push('MCP config may only contain the mcpServers root key')
  }

  const serverNames =
    config.mcpServers && typeof config.mcpServers === 'object' && !Array.isArray(config.mcpServers)
      ? Object.keys(config.mcpServers).sort()
      : []
  const approvedServerNames = Object.keys(APPROVED_CONFIG.mcpServers).sort()

  if (!isDeepStrictEqual(serverNames, approvedServerNames)) {
    failures.push(`MCP servers must be exactly: ${approvedServerNames.join(', ')}`)
  }

  for (const serverName of approvedServerNames) {
    if (
      !isDeepStrictEqual(config.mcpServers?.[serverName], APPROVED_CONFIG.mcpServers[serverName])
    ) {
      failures.push(`${serverName} must exactly match its approved type, command, args, and env`)
    }
  }

  return failures
}

const configSource = process.argv[2]
  ? resolve(process.argv[2])
  : new URL('../../.mcp.json', import.meta.url)
const config = JSON.parse(await readFile(configSource, 'utf8'))
const failures = validateConfig(config)

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Exact MCP server allowlist and Stripe key boundary verified')
