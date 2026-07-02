import { randomBytes } from 'node:crypto'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'

/**
 * Bitcoin payment provider abstraction.
 *
 * The shop runs against its own wallet: receive addresses are derived from a
 * watch-only xpub (BITCOIN_XPUB) — private keys never touch this system.
 *
 * MVP ships with a MockBitcoinProvider. To connect a real blockchain API
 * (e.g. a self-hosted node, Blockstream Esplora or mempool.space), implement
 * BitcoinProvider and register it in createBitcoinProvider() below.
 * See docs/payments.md.
 */
export interface BitcoinProvider {
  /** Derives/returns a fresh receive address (or payment reference). */
  createReceiveAddress(): Promise<string>
  /** Current chain state for an address: received amount + confirmations. */
  getAddressStatus(address: string): Promise<{
    receivedSats: bigint
    confirmations: number
    txId: string | null
  }>
  /** EUR → sats conversion for a given amount in cents. */
  convertEurCentsToSats(amountCents: number): Promise<bigint>
}

/** Fixed dev rate: 1 EUR = 1667 sats (≈ 60.000 €/BTC). Real providers fetch a live rate. */
const MOCK_SATS_PER_EUR_CENT = 16.67

export class MockBitcoinProvider implements BitcoinProvider {
  async createReceiveAddress(): Promise<string> {
    return `mock_bc1q${randomBytes(16).toString('hex')}`
  }

  /**
   * Reads state from the BitcoinPayment row itself — the dev endpoint
   * POST /api/dev/bitcoin/:paymentId/advance mutates it to simulate the chain.
   */
  async getAddressStatus(address: string) {
    const row = await prisma.bitcoinPayment.findFirst({ where: { address } })
    if (!row) return { receivedSats: 0n, confirmations: 0, txId: null }
    return { receivedSats: row.receivedSats, confirmations: row.confirmations, txId: row.txId }
  }

  async convertEurCentsToSats(amountCents: number): Promise<bigint> {
    return BigInt(Math.ceil(amountCents * MOCK_SATS_PER_EUR_CENT))
  }
}

export function createBitcoinProvider(): BitcoinProvider {
  switch (env.BITCOIN_PROVIDER) {
    case 'mock':
      return new MockBitcoinProvider()
    case 'blockchain-api':
      // Placeholder: implement a real provider against your node / Esplora API
      // using BITCOIN_XPUB for address derivation. Until then fail loudly.
      throw new Error(
        'BITCOIN_PROVIDER=blockchain-api is not implemented yet — see docs/payments.md',
      )
  }
}

export const bitcoinProvider = createBitcoinProvider()
