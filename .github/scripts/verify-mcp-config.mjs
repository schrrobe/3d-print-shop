import { readFile } from 'node:fs/promises'

const APPROVED_PACKAGES = {
  playwright: '@playwright/mcp@0.0.78',
  stripe: '@stripe/mcp@0.3.3',
}

const config = JSON.parse(await readFile(new URL('../../.mcp.json', import.meta.url), 'utf8'))
const failures = []

for (const [serverName, approvedPackage] of Object.entries(APPROVED_PACKAGES)) {
  const args = config.mcpServers?.[serverName]?.args
  const packagePrefix = approvedPackage.replace(/@[^@]+$/, '@')
  const packageArgs = Array.isArray(args)
    ? args.filter((arg) => typeof arg === 'string' && arg.startsWith(packagePrefix))
    : []
  if (packageArgs.length !== 1 || packageArgs[0] !== approvedPackage) {
    failures.push(`${serverName} must use approved package ${approvedPackage}`)
  }
}

const stripe = config.mcpServers?.stripe
if (stripe?.args?.some((arg) => arg.startsWith('--tools'))) {
  failures.push('@stripe/mcp does not support --tools; permissions belong on its restricted key')
}
if (stripe?.env?.STRIPE_SECRET_KEY !== '${STRIPE_MCP_RESTRICTED_KEY}') {
  failures.push('Stripe MCP must source STRIPE_SECRET_KEY from STRIPE_MCP_RESTRICTED_KEY')
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('MCP package pins and Stripe key boundary verified')
