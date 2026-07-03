import { describe, expect, it } from 'vitest'
import { extractReplyText, isAutoReply, parseTicketReplyAddress } from '../src/email-reply.js'

const DOMAIN = 'reply.example.com'

describe('parseTicketReplyAddress', () => {
  it('extracts the token from a bare address', () => {
    expect(parseTicketReplyAddress(['ticket+abc123-XY_z@reply.example.com'], DOMAIN)).toBe(
      'abc123-XY_z',
    )
  })

  it('handles "Name <addr>" form and preserves token case', () => {
    expect(
      parseTicketReplyAddress(['Print Shop Support <ticket+AbC123@reply.example.com>'], DOMAIN),
    ).toBe('AbC123')
  })

  it('scans all recipients for the reply address', () => {
    expect(
      parseTicketReplyAddress(
        ['someone@else.com', 'ticket+tok42@reply.example.com', 'third@x.com'],
        DOMAIN,
      ),
    ).toBe('tok42')
  })

  it('matches the domain case-insensitively', () => {
    expect(parseTicketReplyAddress(['ticket+tok@Reply.Example.COM'], DOMAIN)).toBe('tok')
  })

  it('rejects wrong domains, missing prefix and malformed input', () => {
    expect(parseTicketReplyAddress(['ticket+tok@other.example.com'], DOMAIN)).toBeNull()
    expect(parseTicketReplyAddress(['support@reply.example.com'], DOMAIN)).toBeNull()
    expect(parseTicketReplyAddress(['not-an-address'], DOMAIN)).toBeNull()
    expect(parseTicketReplyAddress([], DOMAIN)).toBeNull()
  })

  it('is disabled when the reply domain is empty', () => {
    expect(parseTicketReplyAddress(['ticket+tok@reply.example.com'], '')).toBeNull()
  })
})

describe('extractReplyText', () => {
  it('keeps a plain reply unchanged', () => {
    expect(extractReplyText('Danke, das passt so!')).toBe('Danke, das passt so!')
  })

  it('cuts Gmail-style English quotes', () => {
    const text = 'Sounds good.\n\nOn Mon, Jul 3, 2026 at 9:00 AM Support <s@x.com> wrote:\n> old'
    expect(extractReplyText(text)).toBe('Sounds good.')
  })

  it('cuts Gmail-style German quotes', () => {
    const text =
      'Passt, danke!\n\nAm Mo., 3. Juli 2026 um 09:00 Uhr schrieb Print Shop Support:\n> alte Nachricht'
    expect(extractReplyText(text)).toBe('Passt, danke!')
  })

  it('cuts Apple-Mail German quotes', () => {
    const text = 'Alles klar.\n\nAm 03.07.2026 um 09:12 schrieb Support:\n\n> Hallo'
    expect(extractReplyText(text)).toBe('Alles klar.')
  })

  it('cuts at the signature delimiter', () => {
    expect(extractReplyText('Hier meine Antwort.\n-- \nMax Mustermann\nTel 123')).toBe(
      'Hier meine Antwort.',
    )
  })

  it('cuts Outlook Von/Gesendet blocks and original-message separators', () => {
    expect(
      extractReplyText('Ok!\n\nVon: Support <s@x.com>\nGesendet: Montag, 3. Juli 2026\nBetreff: Re'),
    ).toBe('Ok!')
    expect(extractReplyText('Ok!\n-----Original Message-----\nFrom: x')).toBe('Ok!')
    expect(extractReplyText('Ok!\n________________________________\nFrom: x')).toBe('Ok!')
  })

  it('drops interleaved quoted lines', () => {
    expect(extractReplyText('> Wann liefert ihr?\nMorgen!\n> Sicher?\nJa.')).toBe('Morgen!\nJa.')
  })

  it('returns null for all-quoted or empty input', () => {
    expect(extractReplyText('> nur Zitat\n> noch eins')).toBeNull()
    expect(extractReplyText('   \n\n  ')).toBeNull()
    expect(extractReplyText('On Mon wrote:')).toBeNull()
  })

  it('normalizes CRLF input', () => {
    expect(extractReplyText('Zeile 1\r\nZeile 2\r\n-- \r\nSig')).toBe('Zeile 1\nZeile 2')
  })
})

describe('isAutoReply', () => {
  it('detects auto-submitted, precedence and x-autoreply headers', () => {
    expect(isAutoReply({ 'Auto-Submitted': 'auto-replied' })).toBe(true)
    expect(isAutoReply({ 'auto-submitted': 'auto-generated' })).toBe(true)
    expect(isAutoReply({ Precedence: 'bulk' })).toBe(true)
    expect(isAutoReply({ 'X-Autoreply': 'yes' })).toBe(true)
  })

  it('ignores regular mail', () => {
    expect(isAutoReply({ 'auto-submitted': 'no' })).toBe(false)
    expect(isAutoReply({ Subject: 'Re: Ticket' })).toBe(false)
    expect(isAutoReply({})).toBe(false)
  })
})
